# -*- coding: utf-8 -*-
# 复用slim2逻辑：4096贴图降1024+重打包BIN。支持多文件
import struct, io, os, sys
from PIL import Image

def slim(src, dst):
    b = open(src,'rb').read()
    magic, ver, total = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67
    jl, = struct.unpack('<I', b[12:16])
    js = b[20:20+jl].decode('utf-8')
    import json; J = json.loads(js)
    bl, = struct.unpack('<I', b[20+jl:24+jl])
    bin_off = 24+jl  # BIN chunk头起点；数据起点
    bin0 = bin_off+8
    bin1 = b[bin0:bin0+bl]
    # 每张图片：decode->resize->re-encode
    newimgs=[]; newbin_parts=[]; cursor=0
    # 顶点数据先原样进新bin
    img_starts = {}
    # 找出image->bufferView映射（bufferView含byteOffset/byteLength）
    for idx,im in enumerate(J.get('images',[])):
        bv = J['bufferViews'][im['bufferView']]
        seg = bin1[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
        pim = Image.open(io.BytesIO(seg))
        if pim.width>1088: pim = pim.resize((1024,1024), Image.LANCZOS)
        out = io.BytesIO()
        if im['mimeType']=='image/png': pim.save(out,'PNG',optimize=True)
        else: pim.save(out,'JPEG',quality=85,optimize=True)
        newimgs.append(out.getvalue())
        img_starts[idx]=(bv['byteOffset'], bv['byteLength'], out)
    # 确定bufferViews布局：非图片的bufferView保持偏移，图片的重排到尾部
    img_bvs = {im['bufferView']:J['bufferViews'][im['bufferView']] for im in J.get('images',[])}
    # 新bin：先放所有非图片数据（原偏移压缩排列），再放图片
    nbin = bytearray(); reloc = {}
    for i,bv in enumerate(J['bufferViews']):
        if i in img_bvs: continue
        seg = bin1[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
        # 4字节对齐
        while len(nbin)%4: nbin += b'\x00'
        reloc[i] = len(nbin)
        nbin += seg
    newimg_bv = []
    for k,(off,ln,ob) in enumerate(img_starts.values() if isinstance(img_starts,dict) else []): pass
    # 图片bufferView新偏移
    img_order = sorted(img_starts.keys())
    for idx in img_order:
        off,ln,ob = img_starts[idx]
        while len(nbin)%4: nbin += b'\x00'
        # 图片对应的bufferView索引
        im = J['images'][idx]
        bvi = im['bufferView']
        reloc[bvi] = len(nbin)
        nbin += ob.getvalue()
    # 更新bufferViews
    for i,bv in enumerate(J['bufferViews']):
        if i in reloc:
            newln = bv['byteLength']
            if i in img_bvs:
                # 图片长度=新编码长度
                pass
            bv['byteOffset'] = reloc[i]
    for idx in img_starts:
        bvi = J['images'][idx]['bufferView']
        J['bufferViews'][bvi]['byteLength'] = len(img_starts[idx][2].getvalue())
    # buffer总长
    J['buffers'][0]['byteLength'] = len(nbin)
    njs = json.dumps(J, separators=(',',':'), ensure_ascii=False)
    while len(njs.encode())%4: njs += ' '
    nb = njs.encode()
    nbl = len(nbin)
    while nbl%4: nbin += b'\x00'; nbl = len(nbin)
    out = struct.pack('<III', 0x46546C67, 2, 12+8+len(nb)+8+nbl)
    out += struct.pack('<I', len(nb)) + b'JSON' + nb
    out += struct.pack('<I', nbl) + b'BIN\x00' + bytes(nbin)
    open(dst,'wb').write(out)
    return (os.path.getsize(src)/1048576, os.path.getsize(dst)/1048576)

for src,dst in [('tmp_render/ct50.bak','assets/models/ct50-cleaver.glb'),
                ('tmp_render/miller.bak','assets/models/miller-pliers.glb')]:
    s,d = slim(src,dst)
    print('%s: %.2fMB -> %.2fMB'%(src,s,d))
