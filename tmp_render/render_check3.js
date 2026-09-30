// render_check3.js — 多mesh GLB渲染（分部件模型），每mesh独立上色+逐mesh bbox报告
const fs=require('fs');
const file=process.argv[2], out=process.argv[3];
const b=fs.readFileSync(file);
let off=12,jsonStr=null,binStart=-1;
while(off<b.length-8){
 const len=b.readUInt32LE(off),type=b.slice(off+4,off+8).toString('ascii');
 if(type==='JSON'){jsonStr=b.slice(off+8,off+8+len).toString();}
 else if(type.startsWith('BIN')){binStart=off+8;}
 off+=8+len;while(off%4&&off<b.length)off++;
 if(jsonStr&&binStart>=0)break;
}
if(binStart<0){console.error('ERR: no BIN chunk');process.exit(1);}
const J=JSON.parse(jsonStr.trim());
const SZ={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},CS={5126:4,5123:2,5125:4};
function readAcc(a){
 const bv=J.bufferViews[a.bufferView];
 const start=binStart+bv.byteOffset;
 return {d:b.slice(start,start+a.count*SZ[a.type]*CS[a.componentType]),c:a.count,cs:CS[a.componentType],ct:a.componentType};
}
// 收集每mesh的pos/idx，并按材质关联
const meshes=[];
for(let mi=0;mi<J.meshes.length;mi++){
 const mesh=J.meshes[mi];
 let pos=[],idx=[],mat=null;
 for(const prim of mesh.primitives){
  const pa=J.accessors[prim.attributes.POSITION],ia=J.accessors[prim.indices];
  mat=prim.material;
  const pv=readAcc(pa),iv=readAcc(ia);
  const base=pos.length/3;
  for(let i=0;i<pv.c;i++)pos.push(pv.d.readFloatLE(i*12),pv.d.readFloatLE(i*12+4),pv.d.readFloatLE(i*12+8));
  for(let i=0;i<iv.c;i++)idx.push(base+(iv.ct===5123?iv.d.readUInt16LE(i*2):iv.d.readUInt32LE(i*4)));
 }
 meshes.push({pos,idx,mat,mi});
}
// 全局bbox
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
for(const m of meshes)for(let i=0;i<m.pos.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],m.pos[i+k]);mx[k]=Math.max(mx[k],m.pos[i+k]);}
const cx=(mn[0]+mx[0])/2,cy=(mn[1]+mx[1])/2,cz=(mn[2]+mx[2])/2,S=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
console.log('GLOBAL bbox',mn.map(v=>v.toFixed(3)).join(','),'->',mx.map(v=>v.toFixed(3)).join(','),'size',S.toFixed(3));
// 每mesh bbox（前20个+按尺寸排序）
const info=meshes.map(m=>{
 let a=[1e9,1e9,1e9],z=[-1e9,-1e9,-1e9];
 for(let i=0;i<m.pos.length;i+=3)for(let k=0;k<3;k++){a[k]=Math.min(a[k],m.pos[i+k]);z[k]=Math.max(z[k],m.pos[i+k]);}
 const name=J.nodes.find(n=>n.mesh===m.mi)?.name||('mesh'+m.mi);
 return {name,a,z,tris:m.idx.length/3,size:Math.max(z[0]-a[0],z[1]-a[1],z[2]-a[2])};
});
info.sort((x,y)=>y.size-x.size);
console.log('部件数',info.length,'；按尺寸排序（毫米级=×1000）:');
for(const i of info)console.log('  '+i.name.padEnd(14),'bbox['+i.a.map(v=>(v*1000).toFixed(0)).join(',')+']-['+i.z.map(v=>(v*1000).toFixed(0))+']','size',(i.size*1000).toFixed(0)+'mm tris',i.tris);
// 渲染：全部mesh合起来，但按mesh索引着不同色相
const W=420,H=420,f=W*2.15;
function render(ryDeg,label){
 const ry=ryDeg*Math.PI/180,cR=Math.cos(ry),sR=Math.sin(ry);
 const camZ=S*2.6;
 const zbuf=new Float32Array(W*H).fill(1e9);
 const cols=new Uint8Array(W*H*3).fill(26);
 // 底面渐变
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i3=(y*W+x)*3;cols[i3]=18+y/H*8;cols[i3+1]=22+y/H*8;cols[i3+2]=34+y/H*10;}
 for(const m of meshes){
  const hue=(m.mi*47)%360/360;
  const r0=Math.round(120+120*hue),g0=Math.round(140+80*Math.sin(hue*6.28)),b0=Math.round(160+90*(1-hue));
  for(let t=0;t<m.idx.length;t+=3){
   const P=[];
   for(let v=0;v<3;v++){
    let x=m.pos[m.idx[t+v]*3]-cx,y=m.pos[m.idx[t+v]*3+1]-cy,z=m.pos[m.idx[t+v]*3+2]-cz;
    const xr=x*cR+z*sR,zr=-x*sR+z*cR;
    const zc=zr+camZ;
    if(zc<0.1)break;
    P.push([f*xr/zc+W/2,H/2-f*y/zc,zc]);
   }
   if(P.length<3)continue;
   const ux=P[1][0]-P[0][0],uy=P[1][1]-P[0][1],vx=P[2][0]-P[0][0],vy=P[2][1]-P[0][1];
   const nx=uy-vy,ny=vx-ux;const nl=Math.hypot(nx,ny)||1;
   const lum=0.35+0.65*Math.max(0,(nx*0.3+ny*0.9)/nl*-1);
   const R=Math.round(r0*lum),G=Math.round(g0*lum),B=Math.round(b0*lum);
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
 return cols;
}
const fs2=require('fs');
let ppm='P6\n'+W+' '+H+'\n255\n';
function save(cols,name){
 const buf=Buffer.concat([Buffer.from(ppm,'ascii'),Buffer.from(cols)]);
 fs2.writeFileSync(name,buf);
}
save(render(25,'front'),out+'-a.ppm');
save(render(70,'side'),out+'-b.ppm');
save(render(-40,'back'),out+'-c.ppm');
console.log('渲染完成:',out+'-a/b/c.ppm');
