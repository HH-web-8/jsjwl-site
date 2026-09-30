import json,struct,io
from PIL import Image

def slim(path):
    b=bytearray(open(path,'rb').read())
    jlen=struct.unpack('<I',b[12:16])[0]
    j=json.loads(bytes(b[20:20+jlen]))
    bin_off=20+jlen+8
    saved=0
    for im in j.get('images',[]):
        bv=j['bufferViews'][im['bufferView']]
        off=bv.get('byteOffset',0); length=bv['byteLength']
        img=Image.open(io.BytesIO(bytes(b[bin_off+off:bin_off+off+length])))
        w,h=img.size
        if max(w,h)>1024:
            r=1024/max(w,h)
            img=img.resize((max(1,int(w*r)),max(1,int(h*r))),Image.LANCZOS)
        buf=io.BytesIO()
        if im['mimeType']=='image/jpeg':
            img.convert('RGB').save(buf,'JPEG',quality=82,optimize=True)
        else:
            img.save(buf,'PNG',optimize=True)
        nb=buf.getvalue()
        if len(nb)>length:
            print('SKIP grow:',im['mimeType'],len(nb),'>',length); continue
        b[bin_off+off:bin_off+off+len(nb)]=nb
        for i in range(len(nb),length): b[bin_off+off+i]=0
        saved+=length-len(nb)
        print('  img',im['mimeType'],f'{w}x{h}','->',f'{len(nb)/1024:.0f}KB','(was',f'{length/1048576:.2f}MB)')
    open(path,'wb').write(bytes(b))
    print(path.split('/')[-1],'->',f'{len(b)/1048576:.2f}MB','saved',f'{saved/1048576:.2f}MB')

slim('assets/models/fujikura-88s.glb')
slim('assets/models/alcohol-bottle.glb')
