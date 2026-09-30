// render_check5.js — 俯视图 + 每部件质心屏幕坐标输出（供PIL标号）
// 用法: node render_check5.js <glb> <out.ppm>
const fs=require('fs');
const file=process.argv[2], out=process.argv[3];
const b=fs.readFileSync(file);
let off=12,jsonStr=null,binStart=-1;
while(off<b.length-8){
 const len=b.readUInt32LE(off),type=b.slice(off+4,off+8).toString('ascii');
 if(type==='JSON')jsonStr=b.slice(off+8,off+8+len).toString();
 else if(type.startsWith('BIN'))binStart=off+8;
 off+=8+len;while(off%4&&off<b.length)off++;
}
const J=JSON.parse(jsonStr.trim());
const SZ={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},CS={5126:4,5123:2,5125:4};
function readAcc(a){
 const bv=J.bufferViews[a.bufferView];
 const start=binStart+bv.byteOffset;
 return {d:b.slice(start,start+a.count*SZ[a.type]*CS[a.componentType]),c:a.count,ct:a.componentType};
}
const meshes=[];
for(let mi=0;mi<J.meshes.length;mi++){
 let pos=[],idx=[];
 for(const prim of J.meshes[mi].primitives){
  const pa=J.accessors[prim.attributes.POSITION],ia=J.accessors[prim.indices];
  const pv=readAcc(pa),iv=readAcc(ia);
  const base=pos.length/3;
  for(let i=0;i<pv.c;i++)pos.push(pv.d.readFloatLE(i*12),pv.d.readFloatLE(i*12+4),pv.d.readFloatLE(i*12+8));
  for(let i=0;i<iv.c;i++)idx.push(base+(iv.ct===5123?iv.d.readUInt16LE(i*2):iv.d.readUInt32LE(i*4)));
 }
 const name=(J.nodes.find(n=>n.mesh===mi)||{}).name||('mesh'+mi);
 const pm=(name.match(/(\d+)$/)||[null,mi])[1]*1;
 meshes.push({pos,idx,mi,pm,name});
}
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
for(const m of meshes)for(let i=0;i<m.pos.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],m.pos[i+k]);mx[k]=Math.max(mx[k],m.pos[i+k]);}
const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2,S=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
const W=760,H=760,f=W*1.15;
// 俯视: sx = x, sy = z（z+朝下）
const zbuf=new Float32Array(W*H).fill(1e9);
const cols=new Uint8Array(W*H*3);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i3=(y*W+x)*3;cols[i3]=14+y/H*6;cols[i3+1]=16+y/H*6;cols[i3+2]=24+y/H*8;}
const cents={};
for(const m of meshes){
 // 用部件bbox尺寸决定亮度（大件亮）
 let a=[1e9,1e9,1e9],z2=[-1e9,-1e9,-1e9];
 for(let i=0;i<m.pos.length;i+=3)for(let k=0;k<3;k++){a[k]=Math.min(a[k],m.pos[i+k]);z2[k]=Math.max(z2[k],m.pos[i+k]);}
 const sz=Math.max(z2[0]-a[0],z2[1]-a[1],z2[2]-a[2]);
 const base=Math.round(40+Math.min(150,sz*160));
 // 质心（bbox中心）
 const cX=(a[0]+z2[0])/2, cZ=(a[2]+z2[2])/2;
 cents[m.pm]=[Math.round(W/2+f*(cX-cx)/S), Math.round(H/2+f*(cZ-cz)/S)];
 const hue=(m.pm*47)%360/360;
 const r0=Math.round(base*(0.6+0.4*hue)),g0=Math.round(base*0.85),b0=Math.round(base*(1.0-0.4*hue));
 for(let t=0;t<m.idx.length;t+=3){
  const P=[];
  for(let v=0;v<3;v++){
   const x=m.pos[m.idx[t+v]*3]-cx, y=m.pos[m.idx[t+v]*3+1], z=m.pos[m.idx[t+v]*3+2]-cz;
   P.push([W/2+f*x/S, H/2+f*z/S, y]);  // 深度用y（越高越靠前）
  }
  const ux=P[1][0]-P[0][0],uy=P[1][1]-P[0][1],vx=P[2][0]-P[0][0],vy=P[2][1]-P[0][1];
  const nx=uy-vy,ny=vx-ux,nl=Math.hypot(nx,ny)||1;
  const lum=0.45+0.55*Math.max(0,(nx*0.5+ny*0.86)/nl);
  const R=Math.round(r0*lum),G=Math.round(g0*lum),B=Math.round(b0*lum);
  const X0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),X1=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0])));
  const Y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),Y1=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
  for(let py=Y0;py<=Y1;py++)for(let px=X0;px<=X1;px++){
   const d0x=px-P[0][0],d0y=py-P[0][1];
   const w1=(d0x*uy-d0y*ux)/((vx*uy-vy*ux)||1e-9),w2=(d0y*vx-d0x*vy)/((vx*uy-vy*ux)||1e-9);
   if(w1>=-0.01&&w2>=-0.01&&w1+w2<=1.01){
    const zc2=P[0][2]+w1*(P[1][2]-P[0][2])+w2*(P[2][2]-P[0][2]);
    const zi=py*W+px;
    if(zc2>zbuf[zi]){zbuf[zi]=zc2;const i3=zi*3;cols[i3]=R;cols[i3+1]=G;cols[i3+2]=B;}
   }
  }
 }
}
fs.writeFileSync(out,Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n','ascii'),Buffer.from(cols)]));
// 质心坐标JSON输出
fs.writeFileSync(out.replace('.ppm','.json'),JSON.stringify(cents));
console.log('top view + centroids done:',Object.keys(cents).length,'parts');
console.log(JSON.stringify(cents));
