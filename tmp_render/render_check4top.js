// render_check4.js — 部件编号定位图：每个mesh单独高亮（其余暗色轮廓作参照），输出部件PPM序列
// 用法: node render_check4.js <glb> <prefix> [ryDeg]
const fs=require('fs');
const file=process.argv[2], out=process.argv[3], ryDef=parseInt(process.argv[4]||'25');
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
 // node名（含tripo_part_N）
 const name=(J.nodes.find(n=>n.mesh===mi)||{}).name||('mesh'+mi);
 const pm=(name.match(/(\d+)$/)||[null,mi])[1]*1;
 meshes.push({pos,idx,mi,pm,name});
}
meshes.sort((a,b2)=>a.pm-b2.pm);
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
for(const m of meshes)for(let i=0;i<m.pos.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],m.pos[i+k]);mx[k]=Math.max(mx[k],m.pos[i+k]);}
const cx=(mn[0]+mx[0])/2,cy=(mn[1]+mx[1])/2,cz=(mn[2]+mx[2])/2,S=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
const W=300,H=300,f=W*2.15;
const f2=f;
function draw(m,hi){
 // hi=0 暗轮廓, hi=1 高亮
 for(let t=0;t<m.idx.length;t+=3){
  const P=[];
  for(let v=0;v<3;v++){
   const x=m.pos[m.idx[t+v]*3]-cx,y=m.pos[m.idx[t+v]*3+1],z=m.pos[m.idx[t+v]*3+2]-cz;
   P.push([W/2+f*x/S,H/2+f*z/S,y]);
  }
  P.L=null;
  const ux=P[1][0]-P[0][0],uy=P[1][1]-P[0][1],vx=P[2][0]-P[0][0],vy=P[2][1]-P[0][1];
  const nx=uy-vy,ny=vx-ux,nl=Math.hypot(nx,ny)||1;
  const lum=hi?0.4+0.6*Math.max(0,(nx*0.3+ny*0.9)/nl*-1):0.5;
  const R=hi?Math.round(80*lum+160):Math.round(45*lum+8);
  const G=hi?Math.round(120*lum+110):Math.round(48*lum+8);
  const B=hi?Math.round(70*lum+60):Math.round(52*lum+10);
  const X0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),X1=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0])));
  const Y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),Y1=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
  for(let py=Y0;py<=Y1;py++)for(let px=X0;px<=X1;px++){
   const d0x=px-P[0][0],d0y=py-P[0][1];
   const w1=(d0x*uy-d0y*ux)/((vx*uy-vy*ux)||1e-9),w2=(d0y*vx-d0x*vy)/((vx*uy-vy*ux)||1e-9);
   if(w1>=-0.01&&w2>=-0.01&&w1+w2<=1.01){
    const zc2=P[0][2]+w1*(P[1][2]-P[0][2])+w2*(P[2][2]-P[0][2]);
    const zi=py*W+px;
    if(zc2<zbuf[zi]){zbuf[zi]=zc2;const i3=zi*3;cols[i3]=R;cols[i3+1]=G;cols[i3+2]=B;}
   }
  }
 }
}
let zbuf,cols;
for(const m of meshes){
 zbuf=new Float32Array(W*H).fill(1e9);
 cols=new Uint8Array(W*H*3).fill(16);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i3=(y*W+x)*3;cols[i3]=14+y/H*6;cols[i3+1]=16+y/H*6;cols[i3+2]=24+y/H*8;}
 for(const o of meshes)if(o!==m)draw(o,0);
 draw(m,1);
 const fn=out+'-'+String(m.pm).padStart(2,'0')+'.ppm';
 fs.writeFileSync(fn,Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n','ascii'),Buffer.from(cols)]));
}
console.log('done: '+meshes.length+' parts -> '+out+'-NN.ppm');
