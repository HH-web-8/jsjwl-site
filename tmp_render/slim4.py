# -*- coding: utf-8 -*-
# slim4: 修复bufferView偏移——魔数扫描定位真实图片起点
import struct, io, os, json
from PIL import Image

def find_magic(bin1, hint_off, hint_len):
    # 在hint_off±40范围扫描魔数
    lo=max(0,hint_off-40); hi=min(len(bin1),hint_off+40)
    seg=bin1[lo:hi]
    for i in range(len(seg)-8):
        if seg[i]==0xFF and seg[i+1]==0xD8 and seg[i+2]==0xFF: return lo+i,'jpeg'
        if seg[i]==0x89 and seg[i+1]==0x50 and seg[i+2]==0x4E and seg[i+3]==0x47: return lo+i,'png'
    return None,None

def slim(src,dst):
    b=open(src,'rb').read()
    jl,=struct.unpack('<I',b[12:16])
    J=json.loads(b[20:20+jl].decode())
    bl,=struct.unpack('<I',b[20+jl:24+jl])
    bin0=24+jl+8
    bin1=b[bin0:bin0+bl]
    img_bvs={}
    for im in J.get('images',[]):
        bv=J['bufferViews'][im['bufferView']]
        real,kind=find_magic(bin1,bv['byteOffset'],bv['byteLength'])
        assert real is not None,'no magic near %d'%bv['byteOffset']
        # 从真实起点解码（PIL自己找EOI/IEND）
        seg=bin1[real:real+bv['byteLength']+64]
        pim=Image.open(io.BytesIO(seg))
        if pim.width>1088: pim=pim.resize((1024,1024),Image.LANCZOS)
        out=io.BytesIO()
        if kind=='png': pim.save(out,'PNG',optimize=True)
        else: pim.save(out,'JPEG',quality=85,optimize=True)
        img_bvs[im['bufferView']]={'bvi':im['bufferView'],'data':out.getvalue(),'off':real-bv['byteOffset']}
        print('  img %s: magic@+%d %s %dx%d -> %dKB'%(im.get('name',''),img_bvs[im['bufferView']]['off'],kind,pim.width,pim.height,len(out.getvalue())//1024))
    # 重组bin：非图片bv原样（保偏移），图片bv重排尾部
    nbin=bytearray(bin1)  # 先全量copy保住顶点段
    # 尾部追加新图片
    reloc={}
    for bvi,info in img_bvs.items():
        while len(nbin)%4: nbin+=b'\x00'
        reloc[bvi]=len(nbin)
        nbin+=info['data']
    # 更新bufferViews
    for bvi,info in img_bvs.items():
        J['bufferViews'][bvi]['byteOffset']=reloc[bvi]
        J['bufferViews'][bvi]['byteLength']=len(info['data'])
    # 截断：新bin长度=旧bin尾部的图片区可以砍掉（旧图片区起点=最小旧图片offset）
    old_img_start=min(J['bufferViews'][bvi] and img_bvs[bvi] and bin1 and 0 for bvi in [])if False else min(v['off']-0 for v in [0])if False else None
    # 直接：旧图片起始=原bv4 off(472800)，截断到非图片区尾
    non_img_end=max(bv['byteOffset']+bv['byteLength'] for i,bv in enumerate(J['bufferViews']) if i not in img_bvs)
    nbin2=bytearray(nbin[:non_img_end])
    for bvi,info in img_bvs.items():
        while len(nbin2)%4: nbin2+=b'\x00'
        J['bufferViews'][bvi]['byteOffset']=len(nbin2)
        nbin2+=info['data']
    nbin=nbin2
    J['buffers'][0]['byteLength']=len(nbin)
    njs=json.dumps(J,separators=(',',':'),ensure_ascii=False)
    while len(njs.encode())%4: njs+=' '
    nb=njs.encode()
    nbl=len(nbin)
    out=struct.pack('<III',0x46546C67,2,12+8+len(nb)+8+nbl)+struct.pack('<I',len(nb))+b'JSON'+nb+struct.pack('<I',nbl)+b'BIN\x00'+bytes(nbin)
    open(dst,'wb').write(out)
    return os.path.getsize(src)/1048576, os.path.getsize(dst)/1048576

for src,dst in [('tmp_render/ct50.bak','assets/models/ct50-cleaver.glb'),
                ('tmp_render/miller.bak','assets/models/miller-pliers.glb')]:
    print(src)
    s,d=slim(src,dst)
    print('  %.2fMB -> %.2fMB'%(s,d))
