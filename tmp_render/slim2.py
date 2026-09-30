import json,struct,io
from PIL import Image

def slim(src,dst):
    b=open(src,'rb').read()
    jlen=struct.unpack('<I',b[12:16])[0]
    j=json.loads(b[20:20+jlen])
    bin_off=20+jlen+8
    bindata=b[bin_off:]
    new_imgs={}
    for im in j.get('images',[]):
        bv=j['bufferViews'][im['bufferView']]
        off=bv.get('byteOffset',0); length=bv['byteLength']
        img=Image.open(io.BytesIO(bindata[off:off+length]))
        w,h=img.size
        if max(w,h)>1024:
            r=1024/max(w,h)
            img=img.resize((max(1,int(w*r)),max(1,int(h*r))),Image.LANCZOS)
        buf=io.BytesIO()
        if im['mimeType']=='image/jpeg':
            img.convert('RGB').save(buf,'JPEG',quality=82,optimize=True)
        else:
            img.save(buf,'PNG',optimize=True)
        new_imgs[im['bufferView']]=buf.getvalue()
    img_bvs=set(new_imgs.keys())
    cut=min(j['bufferViews'][k].get('byteOffset',0) for k in img_bvs) if img_bvs else len(bindata)
    new_bin=bytearray(bindata[:cut])
    for k in sorted(img_bvs,key=lambda k:j['bufferViews'][k].get('byteOffset',0)):
        while len(new_bin)%4: new_bin.append(0)
        start=len(new_bin)
        new_bin.extend(new_imgs[k])
        bv=j['bufferViews'][k]
        bv['byteOffset']=start
        bv['byteLength']=len(new_imgs[k])
    while len(new_bin)%4: new_bin.append(0)
    new_json=json.dumps(j,separators=(',',':')).encode()
    while len(new_json)%4: new_json+=b' '
    total=12+8+len(new_json)+8+len(new_bin)
    out=bytearray()
    out+=struct.pack('<III',0x46546C67,2,total)
    out+=struct.pack('<I',len(new_json))+b'JSON'
    out+=new_json
    out+=struct.pack('<I',len(new_bin))+b'BIN\x00'
    out+=new_bin
    open(dst,'wb').write(bytes(out))
    print(dst,'->',f'{len(out)/1048576:.2f}MB','(was',f'{len(b)/1048576:.2f}MB)')

slim('tmp_render/88s.bak','assets/models/fujikura-88s.glb')
slim('tmp_render/alcohol.bak','assets/models/alcohol-bottle.glb')
