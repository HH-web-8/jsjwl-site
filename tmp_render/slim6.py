# -*- coding: utf-8 -*-
# slim6: 分部件大模型瘦身（阶段A：贴图降采样；阶段B由 gltfpack 减面）
# 用法: python3 slim6.py <src.glb> <dst.glb> [max_px=768]
# 贴图全部降采样到 max_px 以内，JPEG q82；几何区原位不动+字节校验
import struct, io, os, json, sys
from PIL import Image

def parse_chunks(b):
    off = 12
    json_str = None; bin_start = -1; bin_len = 0
    while off + 8 <= len(b):
        clen, = struct.unpack('<I', b[off:off+4])
        ctype = b[off+4:off+8]
        if ctype == b'JSON': json_str = b[off+8:off+8+clen].decode()
        elif ctype == b'BIN\x00': bin_start = off + 8; bin_len = clen
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

def resize_textures(src, dst, max_px=768):
    b = open(src, 'rb').read()
    json_str, bin_start, bin_len = parse_chunks(b)
    assert bin_start >= 0, 'no BIN chunk'
    J = json.loads(json_str)
    bin1 = b[bin_start:bin_start+bin_len]

    img_bvs = {}
    for im in J.get('images', []):
        bvi = im['bufferView']
        if bvi in img_bvs: continue  # 多材质共用图
        bv = J['bufferViews'][bvi]
        real, kind = find_magic(bin1, bv['byteOffset'], bv['byteLength'])
        assert real is not None, 'no magic near %d' % bv['byteOffset']
        seg = bin1[real:real+bv['byteLength']+64]
        pim = Image.open(io.BytesIO(seg))
        if pim.mode in ('RGBA', 'LA') or (im.get('mimeType','').endswith('png') and kind=='png'):
            fmt = 'PNG'
            if max(pim.size) > max_px:
                r = max_px / max(pim.size)
                pim = pim.resize((int(pim.width*r), int(pim.height*r)), Image.LANCZOS)
        else:
            fmt = 'JPEG'
            if pim.mode != 'RGB': pim = pim.convert('RGB')
            if max(pim.size) > max_px:
                r = max_px / max(pim.size)
                pim = pim.resize((int(pim.width*r), int(pim.height*r)), Image.LANCZOS)
        out = io.BytesIO()
        if fmt == 'PNG': pim.save(out, 'PNG', optimize=True)
        else: pim.save(out, 'JPEG', quality=82, optimize=True)
        img_bvs[bvi] = out.getvalue()
        im['mimeType'] = 'image/png' if fmt == 'PNG' else 'image/jpeg'
        print('  bv%-3d %-4s %dx%d -> %dKB' % (bvi, fmt, pim.width, pim.height, len(img_bvs[bvi])//1024))

    # 几何区原位不动；图片全部重排到尾部
    non_img_end = max(bv['byteOffset'] + bv['byteLength']
                      for i, bv in enumerate(J['bufferViews']) if i not in img_bvs)
    nbin = bytearray(bin1[:non_img_end])
    for bvi, data in img_bvs.items():
        while len(nbin) % 4: nbin += b'\x00'
        J['bufferViews'][bvi]['byteOffset'] = len(nbin)
        J['bufferViews'][bvi]['byteLength'] = len(data)
        nbin += data
    # 保险：任何引用图片bv的bufferView之外还有空隙截断风险已由 max 覆盖
    J['buffers'][0]['byteLength'] = len(nbin)

    njs = json.dumps(J, separators=(',', ':'), ensure_ascii=False)
    while len(njs.encode()) % 4: njs += ' '
    nb = njs.encode()
    outb = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(nb) + 8 + len(nbin))
            + struct.pack('<I', len(nb)) + b'JSON' + nb
            + struct.pack('<I', len(nbin)) + b'BIN\x00' + bytes(nbin))
    open(dst, 'wb').write(outb)

    # 字节校验
    b2 = open(dst, 'rb').read()
    js2, bs2, bl2 = parse_chunks(b2)
    J2 = json.loads(js2); bin2 = b2[bs2:bs2+bl2]
    bad = 0
    for i, bv in enumerate(J2['bufferViews']):
        if i in img_bvs: continue
        if bin1[bv['byteOffset']:bv['byteOffset']+bv['byteLength']] != bin2[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]:
            bad += 1; print('  !! bv%d MISMATCH' % i)
    assert bad == 0, 'GEOMETRY MISMATCH!'
    print('  几何区字节校验通过')

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    max_px = int(sys.argv[3]) if len(sys.argv) > 3 else 768
    print(src, '->', dst, 'max_px=', max_px)
    resize_textures(src, dst, max_px)
    print('  %.1fMB -> %.1fMB' % (os.path.getsize(src)/1048576, os.path.getsize(dst)/1048576))
