# -*- coding: utf-8 -*-
# slim5: 修正 slim4 的 BIN 起点偏移 bug（bin0=24+jl+8 错，应为 20+jl+8）
# 核心改进：
# 1. chunk 遍历法精确定位 BIN data 起点（不手算偏移）
# 2. 生成后逐字节校验：非图片 bufferView 的数据必须与原版完全一致
import struct, io, os, json, sys
from PIL import Image

def parse_chunks(b):
    """标准 chunk 遍历，返回 (json_str, bin_start, bin_len)"""
    off = 12
    json_str = None; bin_start = -1; bin_len = 0
    while off + 8 <= len(b):
        clen, = struct.unpack('<I', b[off:off+4])
        ctype = b[off+4:off+8]
        if ctype == b'JSON':
            json_str = b[off+8:off+8+clen].decode()
        elif ctype == b'BIN\x00':
            bin_start = off + 8; bin_len = clen
        off += 8 + clen
        while off % 4 and off < len(b): off += 1
    return json_str, bin_start, bin_len

def find_magic(bin1, hint_off, hint_len):
    lo = max(0, hint_off-40); hi = min(len(bin1), hint_off+40)
    seg = bin1[lo:hi]
    for i in range(len(seg)-8):
        if seg[i] == 0xFF and seg[i+1] == 0xD8 and seg[i+2] == 0xFF: return lo+i, 'jpeg'
        if seg[i] == 0x89 and seg[i+1] == 0x50 and seg[i+2] == 0x4E and seg[i+3] == 0x47: return lo+i, 'png'
    return None, None

def slim(src, dst):
    b = open(src, 'rb').read()
    json_str, bin_start, bin_len = parse_chunks(b)
    assert bin_start >= 0, 'no BIN chunk in ' + src
    J = json.loads(json_str)
    bin1 = b[bin_start:bin_start+bin_len]  # ← 精确定位，无手算偏移

    img_bvs = {}
    for im in J.get('images', []):
        bv = J['bufferViews'][im['bufferView']]
        real, kind = find_magic(bin1, bv['byteOffset'], bv['byteLength'])
        assert real is not None, 'no magic near %d' % bv['byteOffset']
        seg = bin1[real:real+bv['byteLength']+64]
        pim = Image.open(io.BytesIO(seg))
        if pim.width > 1088: pim = pim.resize((1024, 1024), Image.LANCZOS)
        out = io.BytesIO()
        if kind == 'png': pim.save(out, 'PNG', optimize=True)
        else: pim.save(out, 'JPEG', quality=85, optimize=True)
        img_bvs[im['bufferView']] = {'bvi': im['bufferView'], 'data': out.getvalue()}
        print('  img bv%d: %s %dx%d -> %dKB' % (im['bufferView'], kind, pim.width, pim.height, len(out.getvalue())//1024))

    # 重组：非图片区原样（保留原偏移，数据零移动），图片重排尾部
    non_img_end = max(bv['byteOffset'] + bv['byteLength']
                      for i, bv in enumerate(J['bufferViews']) if i not in img_bvs)
    nbin = bytearray(bin1[:non_img_end])  # 非图片区=原版前缀，逐字节一致
    for bvi, info in img_bvs.items():
        while len(nbin) % 4: nbin += b'\x00'
        J['bufferViews'][bvi]['byteOffset'] = len(nbin)
        J['bufferViews'][bvi]['byteLength'] = len(info['data'])
        nbin += info['data']
    # buffers 声明=实际BIN长度（顺手修 slim3 的超界声明）
    J['buffers'][0]['byteLength'] = len(nbin)

    njs = json.dumps(J, separators=(',', ':'), ensure_ascii=False)
    while len(njs.encode()) % 4: njs += ' '
    nb = njs.encode()
    outb = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(nb) + 8 + len(nbin))
            + struct.pack('<I', len(nb)) + b'JSON' + nb
            + struct.pack('<I', len(nbin)) + b'BIN\x00' + bytes(nbin))
    open(dst, 'wb').write(outb)

    # ===== 字节级校验：重新解析输出文件 =====
    b2 = open(dst, 'rb').read()
    js2, bs2, bl2 = parse_chunks(b2)
    assert bs2 > 0, 'output parse fail'
    J2 = json.loads(js2)
    bin2 = b2[bs2:bs2+bl2]
    ok = 0; bad = 0
    for i, bv in enumerate(J2['bufferViews']):
        if i in img_bvs: continue  # 图片内容变了，跳过
        o1 = bin1[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
        o2 = bin2[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
        if o1 == o2: ok += 1
        else: bad += 1; print('  !! bv%d MISMATCH off=%d len=%d' % (i, bv['byteOffset'], bv['byteLength']))
    print('  字节校验: 非图片bufferView %d 个一致, %d 个不一致 (必须为0)' % (ok, bad))
    assert bad == 0, 'BYTE MISMATCH — 修复失败!'
    return os.path.getsize(src)/1048576, os.path.getsize(dst)/1048576

jobs = [('tmp_render/miller.bak', 'assets/models/miller-pliers.glb'),
        ('tmp_render/ct50.bak', 'assets/models/ct50-cleaver.glb')]
if len(sys.argv) > 2: jobs = [(sys.argv[1], sys.argv[2])]
for src, dst in jobs:
    print(src, '->', dst)
    s, d = slim(src, dst)
    print('  %.2fMB -> %.2fMB' % (s, d))
