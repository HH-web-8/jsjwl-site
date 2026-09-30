const fs=require('fs');
const b=fs.readFileSync('assets/models/fujikura-88s.glb');
const jlen=b.readUInt32LE(12);
const j=JSON.parse(b.slice(20,20+jlen).toString('utf8'));
const bin=b.slice(20+jlen+8);
const prim=j.meshes[0].primitives[0];
const attrs=prim.attributes;
function readF32(acc,bv){const off=(bv.byteOffset||0)+(acc.byteOffset||0);const n=acc.count;const stride=bv.byteStride||12;const out=new Float32Array(n*3);for(let i=0;i<n;i++){out[i*3]=bin.readFloatLE(off+i*stride);out[i*3+1]=bin.readFloatLE(off+i*stride+4);out[i*3+2]=bin.readFloatLE(off+i*stride+8);}return out;}
function readIdx(acc,bv){const off=(bv.byteOffset||0)+(acc.byteOffset||0);const n=acc.count;const out=new Uint32Array(n);if(acc.componentType===5123){for(let i=0;i<n;i++)out[i]=bin.readUInt16LE(off+i*2);}else{for(let i=0;i<n;i++)out[i]=bin.readUInt32LE(off+i*4);}return out;}
const pos=readF32(j.accessors[attrs.POSITION],j.bufferViews[j.accessors[attrs.POSITION].bufferView]);
const idx=readIdx(j.accessors[prim.indices],j.bufferViews[j.accessors[prim.indices].bufferView]);
const W=340,H=340;
const camZ=3.0,f=W*2.15;
const L=(()=>{const v=[-0.45,-0.75,-0.5];const l=Math.hypot(v[0],v[1],v[2]);return v.map(x=>x/l);})();
function render(rotY,out){
  const cos=Math.cos(rotY),sin=Math.sin(rotY);
  const zbuf=new Float32Array(W*H).fill(1e9);
  const img=new Buffer.alloc(W*H*3,14);
  let drawn=0;
  const tx=(i)=>{const x=pos[i],y=pos[i+1],z=pos[i+2];return [x*cos+z*sin,y,-x*sin+z*cos];};
  const pj=(p)=>{const d=camZ-p[2];const s=f/d;return [W/2+p[0]*s,H/2-p[1]*s,d];};
  for(let t=0;t<idx.length;t+=3){
    const va=tx(idx[t]*3),vb=tx(idx[t+1]*3),vc=tx(idx[t+2]*3);
    if(camZ-(va[2]+vb[2]+vc[2])/3<0.2)continue;
    const ux=vb[0]-va[0],uy=vb[1]-va[1],uz=vb[2]-va[2];
    const vx=vc[0]-va[0],vy=vc[1]-va[1],vz=vc[2]-va[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const nl=Math.hypot(nx,ny,nz)||1;
    const lit=0.30+0.70*Math.min(1,Math.abs((nx*L[0]+ny*L[1]+nz*L[2])/nl)*1.12);
    const pa=pj(va),pb=pj(vb),pc=pj(vc);
    if(Math.abs((pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0]))<0.02)continue;
    drawn++;
    const g=Math.min(255,Math.round(lit*238));
    const minx=Math.max(0,Math.floor(Math.min(pa[0],pb[0],pc[0]))),maxx=Math.min(W-1,Math.ceil(Math.max(pa[0],pb[0],pc[0])));
    const miny=Math.max(0,Math.floor(Math.min(pa[1],pb[1],pc[1]))),maxy=Math.min(H-1,Math.ceil(Math.max(pa[1],pb[1],pc[1])));
    for(let yy=miny;yy<=maxy;yy++)for(let xx=minx;xx<=maxx;xx++){
      const w0=(pb[0]-pa[0])*(yy-pa[1])-(pb[1]-pa[1])*(xx-pa[0]);
      const w1=(pc[0]-pb[0])*(yy-pb[1])-(pc[1]-pb[1])*(xx-pb[0]);
      const w2=(pa[0]-pc[0])*(yy-pc[1])-(pa[1]-pc[1])*(xx-pc[0]);
      const s0=w0>0?1:(w0<0?-1:0),s1=w1>0?1:(w1<0?-1:0),s2=w2>0?1:(w2<0?-1:0);
      if(s0===s1&&s1===s2&&s0!==0){
        const depth=(pa[2]+pb[2]+pc[2])/3;
        const o=yy*W+xx;
        if(depth<zbuf[o]){zbuf[o]=depth;const p=o*3;img[p]=Math.round(g*0.90);img[p+1]=Math.round(g*0.95);img[p+2]=g;}
      }
    }
  }
  const fh=fs.openSync(out,'w');
  fs.writeSync(fh,'P6\n'+W+' '+H+'\n255\n');
  fs.writeSync(fh,img);
  fs.closeSync(fh);
  console.log(out,'tris',drawn);
}
render(0,'tmp_render/r0.ppm');
render(Math.PI/2,'tmp_render/r90.ppm');
render(Math.PI,'tmp_render/r180.ppm');
render(-Math.PI/2,'tmp_render/rm90.ppm');
