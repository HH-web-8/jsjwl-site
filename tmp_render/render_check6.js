// render_check6 v2: 候选部件彩色定位三视图（俯/正/侧）
// 用法: node render_check6.js <glb> <out_prefix> "<part:RRGGBB,...>" [map2] [map3]
// map1=俯视 map2=正视 map3=侧视；候选件最后强制覆盖，非候选深灰
const fs = require('fs');

const [,, glbFile, outPrefix, ...mapArgs] = process.argv;
const parseMap = s => Object.fromEntries(s.split(',').map(p => {
  const [part, col] = p.split(':');
  return [parseInt(part), [parseInt(col.slice(0,2),16)/255, parseInt(col.slice(2,4),16)/255, parseInt(col.slice(4,6),16)/255]];
}));

const b = fs.readFileSync(glbFile);
function parseChunks(b) {
  let off = 12, J = null, binStart = 0, binLen = 0;
  while (off + 8 <= b.length) {
    const clen = b.readUInt32LE(off), t = b.slice(off+4, off+8).toString('ascii');
    if (t === 'JSON') J = JSON.parse(b.slice(off+8, off+8+clen).toString('utf8'));
    else if (t === 'BIN\x00') { binStart = off+8; binLen = clen; }
    off += 8 + clen; while (off % 4) off++;
  }
  return { J, bin: b.slice(binStart, binStart+binLen) };
}
const { J, bin } = parseChunks(b);
const CS = { 5126:4, 5123:2, 5125:4, 5121:1 };
function readAcc(a) {
  const n = a['count'], comp = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a['type']];
  const by = CS[a['componentType']], bv = J['bufferViews'][a['bufferView']];
  const base = bv['byteOffset'] + a['byteOffset'], arr = new Float32Array(n*comp);
  const stride = bv['byteStride'] || comp*by;
  for (let i=0;i<n;i++) for (let c=0;c<comp;c++) {
    const o = base + i*stride + c*by;
    if (a['componentType']===5126) arr[i*comp+c] = bin.readFloatLE(o);
    else if (a['componentType']===5123) arr[i*comp+c] = bin.readUInt16LE(o);
    else if (a['componentType']===5125) arr[i*comp+c] = bin.readUInt32LE(o);
    else arr[i*comp+c] = bin.readUInt8(o);
  }
  return arr;
}
function nodeMatrix(n) {
  const m = n['matrix'];
  if (m) return m;
  const t = n['translation']||[0,0,0], q = n['rotation']||[0,0,0,1], s = n['scale']||[1,1,1];
  const [x,y,z,w]=q;
  const m0=1-2*(y*y+z*z), m1=2*(x*y-z*w), m2=2*(x*z+y*w);
  const m4=2*(x*y+z*w), m5=1-2*(x*x+z*z), m6=2*(y*z-x*w);
  const m8=2*(x*z-y*w), m9=2*(y*z+x*w), m10=1-2*(x*x+y*y);
  return [m0*s[0],m1*s[0],m2*s[0],0, m4*s[1],m5*s[1],m6*s[1],0, m8*s[2],m9*s[2],m10*s[2],0, t[0],t[1],t[2],1];
}
function mulM(a, bm) {
  const r = new Array(16);
  for (let c=0;c<4;c++) for (let ro=0;ro<4;ro++) {
    r[c*4+ro]=0; for (let k=0;k<4;k++) r[c*4+ro] += a[k*4+ro]*bm[c*4+k];
  }
  return r;
}
function xform(m, p) { return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]; }

const tris = new Map();
function walk(ni, pm) {
  const n = J['nodes'][ni];
  const m = mulM(pm, nodeMatrix(n));
  if (n['mesh'] !== undefined) {
    const mesh = J['meshes'][n['mesh']];
    const mi = parseInt(((mesh['name']||'mesh_'+n['mesh']).match(/(\d+)/)||[null,n['mesh']])[1]);
    for (const pr of mesh['primitives']||[]) {
      const pos = readAcc(J['accessors'][pr['attributes']['POSITION']]);
      const idx = pr['indices'] !== undefined ? readAcc(J['accessors'][pr['indices']]) : null;
      const arr = tris.get(mi)||[];
      const n2 = idx ? idx.length : pos.length/3;
      for (let i=0;i<n2;i++) {
        const vi = (idx ? idx[i] : i)*3;
        arr.push(xform(m, [pos[vi],pos[vi+1],pos[vi+2]]));
      }
      tris.set(mi, arr);
    }
  }
  for (const c of n['children']||[]) walk(c, m);
}
for (const rootNi of J['scenes'][J['scene']||0]['nodes']) walk(rootNi, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

let gmn=[1e9,1e9,1e9], gmx=[-1e9,-1e9,-1e9];
for (const arr of tris.values()) for (const p of arr) for (let k=0;k<3;k++) { gmn[k]=Math.min(gmn[k],p[k]); gmx[k]=Math.max(gmx[k],p[k]); }

const W=900, H=700;
const AX = ['x','y','z'];

function render(view, out, colorMap) {
  const {sx, sy, dp, label} = view; // sx/sy/dp = 轴索引(0=x,1=y,2=z)；深度轴大值=靠近相机
  const img = Buffer.alloc(W*H*3, 0);
  function put(x,y,c){ if(x<0||y<0||x>=W||y>=H)return; const o=(y*W+x)*3; img[o]=c[0]*255|0; img[o+1]=c[1]*255|0; img[o+2]=c[2]*255|0; }
  const S = Math.min((W-140)/(gmx[sx]-gmn[sx]), (H-140)/(gmx[sy]-gmn[sy]));
  const cx=(gmn[sx]+gmx[sx])/2, cy=(gmn[sy]+gmx[sy])/2;
  const f = S;
  const parts = [...tris.keys()].sort((a,b)=>a-b);
  const meta = parts.map(pi => {
    let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
    for (const p of tris.get(pi)) for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}
    return {pi, mn, mx};
  }).sort((a,b)=>(a.mn[dp]+a.mx[dp])-(b.mn[dp]+b.mx[dp])); // 远→近
  function paint(pi, col) {
    const arr = tris.get(pi);
    for (let i=0;i+2<arr.length;i+=3) {
      const a=arr[i], bb=arr[i+1], c=arr[i+2];
      const ax=W/2+(a[sx]-cx)*f, ay=H/2-(a[sy]-cy)*f;
      const bx=W/2+(bb[sx]-cx)*f, by=H/2-(bb[sy]-cy)*f;
      const cx2=W/2+(c[sx]-cx)*f, cy2=H/2-(c[sy]-cy)*f;
      const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx2))), maxX=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx2)));
      const minY=Math.max(0,Math.floor(Math.min(ay,by,cy2))), maxY=Math.min(H-1,Math.ceil(Math.max(ay,by,cy2)));
      for (let py=minY;py<=maxY;py++) for (let px=minX;px<=maxX;px++) {
        const d1=(bx-ax)*(py-ay)-(by-ay)*(px-ax), d2=(cx2-bx)*(py-by)-(cy2-by)*(px-bx), d3=(ax-cx2)*(py-cy2)-(ay-cy2)*(px-cx2);
        if ((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)) put(px,py,col);
      }
    }
  }
  for (const {pi} of meta) if (!colorMap[pi]) paint(pi, [0.16,0.17,0.20]);
  for (const {pi} of meta) if (colorMap[pi]) paint(pi, colorMap[pi]); // 候选覆盖
  fs.writeFileSync(out+'.ppm', Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n','ascii'), img]));
  const { execSync } = require('child_process');
  const labels = meta.filter(o=>colorMap[o.pi]).map(o=>{
    const p1x=(W/2+(o.mn[sx]-cx)*f).toFixed(0), p1y=(H/2-(o.mn[sy]-cy)*f).toFixed(0);
    const p2x=(W/2+(o.mx[sx]-cx)*f).toFixed(0), p2y=(H/2-(o.mx[sy]-cy)*f).toFixed(0);
    const ccx=((+p1x + +p2x)/2).toFixed(0), ccy=((+p1y + +p2y)/2).toFixed(0);
    return `d.ellipse([${ccx}-17,${ccy}-17,${ccx}+17,${ccy}+17],fill=(255,255,0));d.text((${ccx}-9,${ccy}-8),'${o.pi}',fill=(0,0,0))`;
  }).join('\n');
  execSync(`python3 - << 'PYEOF'
from PIL import Image, ImageDraw
im=Image.open('${out}.ppm'); d=ImageDraw.Draw(im)
${labels}
# 方向标注
d.text((20,20),'${label}: 深灰=其他部件  屏幕右+${AX[sx]} 上+${AX[sy]}', fill=(255,255,255))
im.save('${out}.png')
PYEOF`);
  console.log('saved', out+'.png');
}

const views = [
  {sx:0, sy:2, dp:1, label:'TOP'},      // 俯视: 右=+x, 上=+z, 近=+y
  {sx:0, sy:1, dp:2, label:'FRONT'},    // 正视: 右=+x, 上=+y, 近=+z
  {sx:2, sy:1, dp:0, label:'SIDE'},     // 侧视: 右=+z, 上=+y, 近=+x
];
views.forEach((v, i) => { if (mapArgs[i]) render(v, outPrefix+'_'+v.label.toLowerCase(), parseMap(mapArgs[i])); });
