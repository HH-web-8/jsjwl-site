// 数值仿真：按 fiber-splicing.html 同款变换，验证锚点合理性
const path=require('path'),fs=require('fs');
let THREE=require(path.resolve(__dirname,'../assets/three-r128.min.js'));
global.THREE=THREE;
require(path.resolve(__dirname,'../assets/GLTFLoader.js'));
// --- DOM 桩 ---
let n = 0;
global.URL.createObjectURL = () => 'blob:fake-' + (++n);
global.URL.revokeObjectURL = () => {};
global.Image = class {
  constructor() { this.width = 64; this.height = 64; this._l = {}; }
  addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); }
  removeEventListener(t, fn) { this._l[t] = (this._l[t] || []).filter((f) => f !== fn); }
  set src(v) { setTimeout(() => (this._l.load || []).forEach((fn) => fn({ target: this })), 0); }
};
// 注意：不定义 createImageBitmap，强制走 ImageLoader 路径（ImageBitmapLoader 会 fetch blob: URL）
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}) });
const mkImg = () => {
  const im = { width: 64, height: 64, _l: {} };
  im.addEventListener = (t, fn) => { (im._l[t] = im._l[t] || []).push(fn); };
  im.removeEventListener = () => {};
  Object.defineProperty(im, 'src', { set(v) { setTimeout(() => (im._l.load || []).forEach((fn) => fn({ target: im })), 0); } });
  return im;
};
const mkCanvas = () => ({ width: 64, height: 64, getContext: () => ctx2d, toDataURL: () => 'data:,', style: {} });
global.document = {
  createElementNS: (ns, tag) => (tag === 'img' ? mkImg() : mkCanvas()),
  createElement: (tag) => (tag === 'img' ? mkImg() : mkCanvas()),
  documentElement: { style: {} },
};
global.window = global;
global.self = global;



function load(f){return new Promise((res,rej)=>{
 const buf=fs.readFileSync(f);const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
 new THREE.GLTFLoader().parse(ab,'',g=>res(g.scene),rej);
})}
(async()=>{
try{
 // ===== 88S =====
 let m88=await load('../assets/models/f88s-parts.glb');
 let scene=new THREE.Scene();
 scene.add(m88);
 let bb=new THREE.Box3().setFromObject(m88);
 let sx=bb.max.x-bb.min.x;
 let sc=0.87/sx;
 m88.scale.set(sc,sc,sc);m88.rotation.y=Math.PI/2;
 bb.setFromObject(m88);
 m88.position.x-=(bb.max.x+bb.min.x)/2;m88.position.z-=(bb.max.z+bb.min.z)/2;m88.position.y-=bb.min.y;
 let SP={grp:new THREE.Group()};SP.grp.position.set(0,0,-0.9);scene.add(SP.grp);
 SP.grp.add(m88);m88.position.x-=0;m88.position.z+=0.9;m88.position.y-=0; // 挂组后再平移回(模拟组偏移)
 // 上面挂组方式与HTML不同：HTML是先居中再add，组position(0,0,-0.9)。等效：GLB世界位置=局部+组偏移
 m88.position.z-=0.9;
 bb.setFromObject(m88);
 let P={};m88.traverse(o=>{if(o.isMesh&&/^mesh_(\d+)$/.test(o.name))P[+RegExp.$1]=o});
 let W=bb.max.x-bb.min.x,H=bb.max.y-bb.min.y,D=bb.max.z-bb.min.z;
 console.log('[88S] 世界bbox x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f] W=%.3f H=%.3f D=%.3f',bb.min.x,bb.max.x,bb.min.y,bb.max.y,bb.min.z,bb.max.z,W,H,D);
 let bL0=new THREE.Box3().setFromObject(P[38]),bR0=new THREE.Box3().setFromObject(P[39]);
 let L=(bL0.min.x+bL0.max.x)/2<(bR0.min.x+bR0.max.x)/2?P[38]:P[39];
 let R=(L===P[38])?P[39]:P[38];
 let bL=new THREE.Box3().setFromObject(L),bR=new THREE.Box3().setFromObject(R);
 let jy=Math.max(bL.max.y,bR.max.y);
 let jz=((Math.min(bL.min.z,bR.min.z))+(Math.max(bL.max.z,bR.max.z)))/2;
 let cxL=(bL.min.x+bL.max.x)/2,cxR=(bR.min.x+bR.max.x)/2;
 console.log('[88S] 38bbox y[%.3f,%.3f] 39bbox y[%.3f,%.3f]',bL.min.y,bL.max.y,bR.min.y,bR.max.y);
 console.log('[88S] joint世界=(0,%.3f,%.3f) slotL=(%.3f,%.3f,%.3f) slotR=(%.3f,%.3f,%.3f)',jy+0.008,jz,cxL,jy+0.012,jz,cxR,jy+0.012,jz);
 console.log('[88S] ovenX=%.3f 屏幕z=%.3f pk_z=%.3f',W/2+0.14,bb.min.z-0.05,bb.max.z+0.012);
 let b17=new THREE.Box3().setFromObject(P[17]);
 console.log('[88S] 防风罩17世界 x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]',b17.min.x,b17.max.x,b17.min.y,b17.max.y,b17.min.z,b17.max.z);
 // ===== CT50 =====
 let mCT=await load('../assets/models/ct50-parts.glb');
 scene.add(mCT);
 bb=new THREE.Box3().setFromObject(mCT);
 let sz=bb.max.z-bb.min.z;
 let sc2=1.00/sz;
 mCT.scale.set(sc2,sc2,sc2);
 bb.setFromObject(mCT);
 mCT.position.x-=(bb.max.x+bb.min.x)/2;mCT.position.z-=(bb.max.z+bb.min.z)/2;mCT.position.y-=bb.min.y;
 let CTG=new THREE.Group();CTG.position.set(-2.2,0,-0.3);CTG.rotation.y=-0.3;scene.add(CTG);
 CTG.add(mCT);mCT.position.x+=2.2*Math.cos(0.3);mCT.position.z+=-2.2*Math.sin(0.3)-0.3; // 近似模拟组变换后还原世界
 mCT.position.set(mCT.position.x-0,0,0); // 简化：直接检查局部值
 mCT.position.x=0;mCT.position.z=0;mCT.position.y=0;
 // 直接重算：把CT50放原点局部
 bb.setFromObject(mCT);
 console.log('[CT50] 局部bbox x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]',bb.min.x,bb.max.x,bb.min.y,bb.max.y,bb.min.z,bb.max.z);
 let Q={};mCT.traverse(o=>{if(o.isMesh&&/^mesh_(\d+)$/.test(o.name))Q[+RegExp.$1]=o});
 ['2','3','4'].forEach(k=>{let b=new THREE.Box3().setFromObject(Q[k]);console.log('[CT50] mesh_%s 世界x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]',k,b.min.x,b.max.x,b.min.y,b.max.y,b.min.z,b.max.z)});
 // ===== 钳 =====
 let mPL=await load('../assets/models/pliers-parts.glb');
 scene.add(mPL);
 bb=new THREE.Box3().setFromObject(mPL);
 let dz=bb.max.z-bb.min.z;
 let sc3=0.95/dz;
 mPL.scale.set(sc3,sc3,sc3);mPL.rotation.y=Math.PI/2;
 bb.setFromObject(mPL);
 mPL.position.x-=(bb.max.x+bb.min.x)/2;mPL.position.z-=(bb.max.z+bb.min.z)/2;mPL.position.y-=bb.min.y;
 bb.setFromObject(mPL);
 console.log('[钳] 旋转后 x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]',bb.min.x,bb.max.x,bb.min.y,bb.max.y,bb.min.z,bb.max.z);
 let hy=(bb.min.y+bb.max.y)/2+0.02;
 for(let k=0;k<3;k++){
  let hx=bb.min.x+(bb.max.x-bb.min.x)*(0.62+k*0.13);
  console.log('[钳] 孔%d 位置(%.3f,%.3f,0.04)',k+1,hx,hy);
 }
 console.log('ALL DONE');
}catch(e){console.log('ERR',e.message)}
})();
