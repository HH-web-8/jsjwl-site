global.window=global;global.self=global;
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


process.argv.slice(2).forEach(f=>{
 const buf=fs.readFileSync(f);const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
 new THREE.GLTFLoader().parse(ab,'',g=>{
  const bb=new THREE.Box3().setFromObject(g.scene);
  const d=v=>v.toFixed(3);
  const names=[];g.scene.traverse(o=>{if(o.isMesh&&o.name)names.push(o.name)});
  console.log(f,'x['+d(bb.min.x)+','+d(bb.max.x)+'] y['+d(bb.min.y)+','+d(bb.max.y)+'] z['+d(bb.min.z)+','+d(bb.max.z)+'] meshes:',names.slice(0,12).join(','));
 },e=>console.log(f,'ERR',e.message));
});
