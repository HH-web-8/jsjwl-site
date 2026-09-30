const fs=require('fs');
const file=process.argv[2], out=process.argv[3];
const b=fs.readFileSync(file);
let off=12,jsonStr=null,binStart=-1;
while(off<b.length-8){
 const len=b.readUInt32LE(off),type=b.slice(off+4,off+8).toString('ascii');
 if(type==='JSON')jsonStr=b.slice(off+8,off+8+len).toString();
 else if(type.startsWith('BIN'))binStart=off+8;
 off+=8+len;while(off%4&&off<b.length)off++;
 if(jsonStr&&binStart>=0)break;
}
const J=JSON.parse(jsonStr.trim());
const SZ={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},CS={5126:4,5123:2,5125:4};
function readAcc(a){
 const bv=J.bufferViews[a.bufferView];
 const start=binStart+bv.byteOffset;
 return {d:b.slice(start,start+a.count*SZ[a.type]*CS[a.componentType]),c:a.count,cs:CS[a.componentType],ct:a.componentType};
}
let pos=[],idx=[];
for(const mesh of J.meshes){
 for(const prim of mesh.primitives){
  const pa=J.accessors[prim.attributes.POSITION],ia=J.accessors[prim.indices];
  const pv=readAcc(pa),iv=readAcc(ia);
  const base=pos.length/3;
  for(let i=0;i<pv.c;i++)pos.push(pv.d.readFloatLE(i*12),pv.d.readFloatLE(i*12+4),pv.d.readFloatLE(i*12+8));
  for(let i=0;i<iv.c;i++)idx.push(base+(iv.ct===5123?iv.d.readUInt16LE(i*2):iv.d.readUInt32LE(i*4)));
 }
}
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
for(let i=0;i<pos.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],pos[i+k]);mx[k]=Math.max(mx[k],pos[i+k]);}
const cx=(mn[0]+mx[0])/2,cy=(mn[1]+mx[1])/2,cz=(mn[2]+mx[2])/2,S=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
console.log(file,'bbox',mn.map(v=>v.toFixed(2)).join(','),'->',mx.map(v=>v.toFixed(2)).join(','),'tris',idx.length/3);
const W=320,H=320,f=W*2.15;
function render(ryDeg,label){
 const ry=ryDeg*Math.PI/180,cR=Math.cos(ry),sR=Math.sin(ry);
 const camZ=S*2.6;
 const zbuf=new Float32Array(W*H).fill(1e9);
 const cols=new Uint8Array(W*H*3).fill(26);
 for(let t=0;t<idx.length;t+=3){
  const P=[];
  for(let v=0;v<3;v++){
   let x=pos[idx[t+v]*3]-cx,y=pos[idx[t+v]*3+1]-cy,z=pos[idx[t+v]*3+2]-cz;
   const xr=x*cR+z*sR,zr=-x*sR+z*cR;
   const zc=zr+camZ;
   P.push([f*xr/zc+W/2,H/2-f*y/zc,zc]);
  }
  const ux=P[1][0]-P[0][0],uy=P[1][1]-P[0][1],vx=P[2][0]-P[0][0],vy=P[2][1]-P[0][1];
  const nx=uy-vy,ny=vx-ux;const nl=Math.hypot(nx,ny)||1;
  const lum=0.35+0.65*Math.max(0,(nx*0.3+ny*0.9)/nl*-1);
  const R=Math.round(150*lum+40),G=Math.round(165*lum+40),B=Math.round(180*lum+50);
  const ys=[P[0][1],P[1][1],P[2][1]],xs=[P[0][0],P[1][0],P[2][0]],zs=[P[0][2],P[1][2],P[2][2]];
  const y0=Math.max(0,Math.floor(Math.min(...ys))),y1=Math.min(H-1,Math.ceil(Math.max(...ys)));
  const x0=Math.max(0,Math.floor(Math.min(...xs))),x1=Math.min(W-1,Math.ceil(Math.max(...xs)));
  for(let py=y0;py<=y1;py++)for(let px=x0;px<=x1;px++){
   const d0=(xs[1]-xs[0])*(ys[2]-ys[0])-(xs[2]-xs[0])*(ys[1]-ys[0]);
   if(Math.abs(d0)<1e-9)continue;
   const w0=((xs[2]-xs[1])*(py-ys[1])-(px-xs[1])*(ys[2]-ys[1]))/d0;
   const w1=((px-xs[2])*(ys[0]-ys[2])-(xs[0]-xs[2])*(py-ys[2]))/d0;
   const w2=1-w0-w1;
   if(w0<0||w1<0||w2<0)continue;
   const z=w0*zs[0]+w1*zs[1]+w2*zs[2];
   const i=py*W+px;
   if(z<zbuf[i]){zbuf[i]=z;cols[i*3]=R;cols[i*3+1]=G;cols[i*3+2]=B;}
  }
 }
 fs.writeFileSync(out+'_'+label+'.ppm',Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n'),Buffer.from(cols)]));
 console.log('rendered',label);
}
render(0,'r0');render(90,'r90');render(180,'r180');render(-90,'rm90');
