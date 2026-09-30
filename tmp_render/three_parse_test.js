// 用生产同款 THREE r128 + GLTFLoader 在 node 中真实解析 GLB
// 纹理用桩替代（node 无 Image/Blob），结构/几何/材质解析走真实代码路径
const path = require('path');
let THREE = require(path.resolve(__dirname, '../assets/three-r128.min.js'));
global.THREE = THREE; // GLTFLoader.js 以全局 THREE 为依赖
require(path.resolve(__dirname, '../assets/GLTFLoader.js')); // 挂 THREE.GLTFLoader

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

const fs = require('fs');
const files = process.argv.slice(2);
(async () => {
  let fail = 0;
  for (const f of files) {
    await new Promise((resolve) => {
      const ab = fs.readFileSync(f);
      const buf = ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
      const t0 = Date.now();
      const loader = new THREE.GLTFLoader();
      loader.parse(buf, '', (gltf) => {
        const meshes = [];
        gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o.name || o.uuid.slice(0, 6)); });
        console.log('PASS', path.basename(f), `${(ab.length / 1048576).toFixed(2)}MB`, `${Date.now() - t0}ms`, `meshes=${meshes.length}`, `[${meshes.slice(0, 5).join(',')}${meshes.length > 5 ? ',...' : ''}]`);
        resolve();
      }, (err) => {
        console.log('FAIL', path.basename(f), `->`, (err && (err.message || err)) + '');
        fail++;
        resolve();
      });
    });
  }
  process.exit(fail ? 1 : 0);
})();
