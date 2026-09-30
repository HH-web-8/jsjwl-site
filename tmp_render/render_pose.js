// render_pose: 施加场景姿态(缩放+rotY+落地)后按倾斜相机渲染 + 打印部件世界bbox
// 用法: node render_pose.js <glb> <out> "<part:RRGGBB,...>" rotYdeg pitchDeg [targetX]
const fs = require('fs');
const [,, glbFile, outPrefix, mapStr, rotDeg, pitchDeg, targetX] = process.argv;
const rotY = (parseFloat(rotDeg)||0)*Math.PI/180;
const pitch = (parseFloat(pitchDeg)||45)*Math.PI/180;
const tx = parseFloat(targetX)||0;
const colorMap = Object.fromEntries((mapStr||'').split(',').filter(Boolean).map(p=>{
  const [part,col]=p.split(':');
  return [parseInt(part),[parseInt(col.slice(0,2),16)/255,parseInt(col.slice(2,4),16)/255,parseInt(col.slice(4,6),16)/255]];
}));
const b=fs.readFileSync(glbFile);
function parseChunks(b){let off=12,J=null,bs=0,bl=0;while(off+8<=b.length){const cl=b.readUInt32LE(off),t=b.slice(off+4,off+8).toString('ascii');if(t==='JSON')J=JSON.parse(b.slice(off+8,off+8+cl).toString('utf8'));else if(t==='BIN\x00'){bs=off+8;bl=cl}off+=8+cl;while(off%4)off++;}return{J,bin:b.slice(bs,bs+bl)}}
const {J,bin}=parseChunks(b);
const CS={5126:4,5123:2,5125:4,5121:1};
function readAcc(a){const n=a['count'],comp={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a['type']];const by=CS[a['componentType']],bv=J['bufferViews'][a['bufferView']];const base=(bv['byteOffset']||0)+(a['byteOffset']||0),arr=new Float32Array(n*comp);const stride=bv['byteStride']||comp*by;for(let i=0;i<n;i++)for(let c=0;c<comp;c++){const o=base+i*stride+c*by;if(a['componentType']===5126)arr[i*comp+c]=bin.readFloatLE(o);else if(a['componentType']===5123)arr[i*comp+c]=bin.readUInt16LE(o);else if(a['componentType']===5125)arr[i*comp+c]=bin.readUInt32LE(o);else arr[i*comp+c]=bin.readUInt8(o);}return arr}
function nodeMatrix(n){const m=n['matrix'];if(m)return m;const t=n['translation']||[0,0,0],q=n['rotation']||[0,0,0,1],s=n['scale']||[1,1,1];const[x,y,z,w]=q;const m0=1-2*(y*y+z*z),m1=2*(x*y-z*w),m2=2*(x*z+y*w);const m4=2*(x*y+z*w),m5=1-2*(x*x+z*z),m6=2*(y*z-x*w);const m8=2*(x*z-y*w),m9=2*(y*z+x*w),m10=1-2*(x*x+y*y);return[m0*s[0],m1*s[0],m2*s[0],0,m4*s[1],m5*s[1],m6*s[1],0,m8*s[2],m9*s[2],m10*s[2],0,t[0],t[1],t[2],1]}
function mulM(a,bm){const r=new Array(16);for(let c=0;c<4;c++)for(let ro=0;ro<4;ro++){r[c*4+ro]=0;for(let k=0;k<4;k++)r[c*4+ro]+=a[k*4+ro]*bm[c*4+k];}return r}
function xform(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]}
// 场景姿态: 先rotY再scale，落地面y=0
const cA=Math.cos(rotY),sA=Math.sin(rotY);
function pose(p){
  const x=p[0]*cA+p[2]*sA, z=-p[0]*sA+p[2]*cA, y=p[1];
  return [x*SC,y*SC,z*SC];
}
const tris=new Map();
function walk(ni,pm){const n=J['nodes'][ni];const m=mulM(pm,nodeMatrix(n));if(n['mesh']!==undefined){const mesh=J['meshes'][n['mesh']];const mi=parseInt(((mesh['name']||'mesh_'+n['mesh']).match(/(\d+)/)||[null,n['mesh']])[1]);for(const pr of mesh['primitives']||[]){const pos=readAcc(J['accessors'][pr['attributes']['POSITION']]);const idx=pr['indices']!==undefined?readAcc(J['accessors'][pr['indices']]):null;const arr=tris.get(mi)||[];const n2=idx?idx.length:pos.length/3;for(let i=0;i<n2;i++){const vi=(idx?idx[i]:i)*3;const w=xform(m,[pos[vi],pos[vi+1],pos[vi+2]]);arr.push(w);}tris.set(mi,arr);}}for(const c of n['children']||[])walk(c,m)}
for(const r of J['scenes'][J['scene']||0]['nodes'])walk(r,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
// 全局bbox(原始)
let gmn=[1e9,1e9,1e9],gmx=[-1e9,-1e9,-1e9];
for(const arr of tris.values())for(const p of arr)for(let k=0;k<3;k++){gmn[k]=Math.min(gmn[k],p[k]);gmx[k]=Math.max(gmx[k],p[k]);}
// 原始x向宽度(旋转前的模型x轴)→场景宽度=旋转后z向宽度? 目标: 世界x向(旋转后)=targetX
const rawX=gmx[0]-gmn[0], rawZ=gmx[2]-gmn[2];
// rotY=±90°时: 旋转后世界x宽=rawZ; 其他角度≈rawX(简化: 取旋转后实测)
const testP=pose([gmx[0],0,gmx[2]]);
var SC = tx>0 ? 1 : 1;
// 实测旋转后宽度: 用两个极端点+中心变换
const corners=[[gmn[0],0,gmn[2]],[gmx[0],0,gmn[2]],[gmn[0],0,gmx[2]],[gmx[0],0,gmx[2]]];
let wxmn=1e9,wxmx=-1e9,wp0=pose([0,0,0]);
for(const c of corners){const w=[c[0]*cA+c[2]*sA, 0, -c[0]*sA+c[2]*cA];wxmn=Math.min(wxmn,w[0]);wxmx=Math.max(wxmx,w[0]);}
if(tx>0)SC=tx/(wxmx-wxmn);
// 变换全部顶点并落地
const minY0=gmn[1];
let lift=-minY0*SC;
for(const arr of tris.values())for(let i=0;i<arr.length;i++){const p=arr[i];const x=(p[0]*cA+p[2]*sA)*SC,y=p[1]*SC+lift,z=(-p[0]*sA+p[2]*cA)*SC;arr[i]=[x,y,z];}
// 重新计算全局bbox
gmn=[1e9,1e9,1e9];gmx=[-1e9,-1e9,-1e9];
for(const arr of tris.values())for(const p of arr)for(let k=0;k<3;k++){gmn[k]=Math.min(gmn[k],p[k]);gmx[k]=Math.max(gmx[k],p[k]);}
// 打印所有部件bbox(世界)
console.log('=== parts world bbox (SC='+SC.toFixed(3)+' raw '+rawX.toFixed(2)+'x'+rawZ.toFixed(2)+') ===');
console.log('GLOBAL x['+gmn[0].toFixed(3)+','+gmx[0].toFixed(3)+'] y['+gmn[1].toFixed(3)+','+gmx[1].toFixed(3)+'] z['+gmn[2].toFixed(3)+','+gmx[2].toFixed(3)+']');
const parts=[...tris.keys()].sort((a,b)=>a-b);
const metaAll=parts.map(pi=>{let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const p of tris.get(pi))for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}return{pi,mn,mx}});
for(const o of metaAll)console.log('p'+String(o.pi).padStart(2)+' x['+o.mn[0].toFixed(3)+','+o.mx[0].toFixed(3)+'] y['+o.mn[1].toFixed(3)+','+o.mx[1].toFixed(3)+'] z['+o.mn[2].toFixed(3)+','+o.mx[2].toFixed(3)+']');
// 渲染: pitch视角. 相机在+z上方俯视: screen right=+x, up=(0,cosP,-sinP), depth=(0,sinP,cosP)
const W=900,H=700;
const img=Buffer.alloc(W*H*3,0);
function put(x,y,c){if(x<0||y<0||x>=W||y>=H)return;const o=(y*W+x)*3;img[o]=c[0]*255|0;img[o+1]=c[1]*255|0;img[o+2]=c[2]*255|0;}
const cP=Math.cos(pitch),sP=Math.sin(pitch);
const sy2=(p)=>p[1]*cP-p[2]*sP, dp2=(p)=>p[1]*sP+p[2]*cP;
const S=Math.min((W-140)/(gmx[0]-gmn[0]),(H-140)/(gmx[1]*cP-gmn[2]*sP-(gmn[1]*cP-gmx[2]*sP)));
const cx=(gmn[0]+gmx[0])/2;
let ymin=1e9,ymax=-1e9;
for(const arr of tris.values())for(const p of arr){const s=sy2(p);ymin=Math.min(ymin,s);ymax=Math.max(ymax,s);}
const cyc=(ymin+ymax)/2;
const f=S;
const dsum=o=>o.mn[1]*sP+o.mn[2]*cP+o.mx[1]*sP+o.mx[2]*cP;
const meta=metaAll.slice().sort((a,b)=>dsum(a)-dsum(b));
function paint(pi,col){const arr=tris.get(pi);for(let i=0;i+2<arr.length;i+=3){const a=arr[i],bb=arr[i+1],c=arr[i+2];const ax=W/2+(a[0]-cx)*f,ay=H/2-(sy2(a)-cyc)*f;const bx=W/2+(bb[0]-cx)*f,by=H/2-(sy2(bb)-cyc)*f;const cx2=W/2+(c[0]-cx)*f,cy2=H/2-(sy2(c)-cyc)*f;const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx2))),maxX=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx2)));const minY=Math.max(0,Math.floor(Math.min(ay,by,cy2))),maxY=Math.min(H-1,Math.ceil(Math.max(ay,by,cy2)));for(let py=minY;py<=maxY;py++)for(let px=minX;px<=maxX;px++){const d1=(bx-ax)*(py-ay)-(by-ay)*(px-ax),d2=(cx2-bx)*(py-by)-(cy2-by)*(px-bx),d3=(ax-cx2)*(py-cy2)-(ay-cy2)*(px-cx2);if((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))put(px,py,col);}}}
for(const{pi}of meta)if(!colorMap[pi])paint(pi,[0.16,0.17,0.20]);
for(const{pi}of meta)if(colorMap[pi])paint(pi,colorMap[pi]);
for(const{pi}of meta)if(colorMap[pi])paint(pi,colorMap[pi]);
fs.writeFileSync(outPrefix+'.ppm',Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n','ascii'),img]));
const{execSync}=require('child_process');
const labels=meta.filter(o=>colorMap[o.pi]).map(o=>{const px=W/2+((o.mn[0]+o.mx[0])/2-cx)*f,py=H/2-(((o.mn[1]+o.mx[1])/2*cP-(o.mn[2]+o.mx[2])/2*sP)-cyc)*f;return`d.ellipse([${px.toFixed(0)}-17,${py.toFixed(0)}-17,${px.toFixed(0)}+17,${py.toFixed(0)}+17],fill=(255,255,0));d.text((${px.toFixed(0)}-9,${py.toFixed(0)}-8),'${o.pi}',fill=(0,0,0))`}).join('\n');
execSync(`python3 - << 'PYEOF'
from PIL import Image, ImageDraw
im=Image.open('${outPrefix}.ppm'); d=ImageDraw.Draw(im)
${labels}
d.text((20,20),'rotY=${rotDeg} pitch=${pitchDeg}deg  right=+x up-screen', fill=(255,255,255))
im.save('${outPrefix}.png')
PYEOF`);
console.log('saved',outPrefix+'.png');
