const fs=require('fs');
const fn=process.argv[2]||'../assets/models/f88s-parts.glb';
const buf=fs.readFileSync(fn);
const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
let off=12,chunks={};
while(off<buf.byteLength){const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);chunks[type]=(chunks[type]||[])+ (type===0x4E4F534A?'':''); if(type===0x004E4942){chunks.bin=[off+8,len];} else if(type===0x4E4F534A){chunks.json=[off+8,len];} off+=8+len;}
const j=JSON.parse(buf.toString('ascii',chunks.json[0],chunks.json[0]+chunks.json[1]));
const [bo,bl]=chunks.bin;
const acc=n=>dv.getFloat32(bo+n,true);
function bbof(accs){let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],cnt=0;
 for(const a of accs){const C=a[2];const bvn=j.bufferViews[a[0][0]];const base=(bvn['byteOffset']||0)+(a[0][1]||0);const comp=j.accessors[C].componentType;const bps=comp===5126?4:2;
 for(let k=0;k<j.accessors[C].count;k++){for(let c=0;c<3;c++){const bi=base+(k*3+c)*bps;let v=comp===5126?dv.getFloat32(bo+bi,true):(j.accessors[C].normalized?dv.getInt16(bo+bi,true)/32767:dv.getInt16(bo+bi,true));if(v<mn[c])mn[c]=v;if(v>mx[c])mx[c]=v;}}cnt+=j.accessors[C].count;}
 return {mn,mx,cnt};}
// mesh -> primitives -> POSITION accessor
const meshIdx={};
j.meshes.forEach((m,i)=>{const prims=m.primitives.map(p=>{const pa=p.attributes.POSITION;const a=j.accessors[pa];const bv=j.bufferViews[a.bufferView];return [[a.bufferView,(a.byteOffset||0),(a['byteOffset']||0)],null,pa];});meshIdx[i]=prims;});
const want=(process.argv[3]||'0,1,17,22,38,39,41,24,26,12,37,23,5').split(',').map(Number);
for(const w of want){if(meshIdx[w]===undefined)continue;const r=bbof(meshIdx[w]);
 console.log('mesh_'+w,'x['+r.mn[0].toFixed(3)+','+r.mx[0].toFixed(3)+']','y['+r.mn[1].toFixed(3)+','+r.mx[1].toFixed(3)+']','z['+r.mn[2].toFixed(3)+','+r.mx[2].toFixed(3)+']','verts='+r.cnt);}
// node transforms
if(j.nodes)j.nodes.forEach((n,i)=>{if(n.mesh!==undefined&&n.translation)console.log('node',i,'mesh',n.mesh,'t',n.translation.map(x=>x.toFixed(3)).join(','));});
