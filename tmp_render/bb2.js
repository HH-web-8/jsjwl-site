const fs=require('fs');
function load(fn){
 const buf=fs.readFileSync(fn);
 const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
 let off=12,J=null,B=[0,0];
 while(off+8<=buf.byteLength){
  const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);
  if(type===0x4E4F534A)J=JSON.parse(buf.toString('utf8',off+8,off+8+len));
  else if(type===0x004E4942)B=[off+8,len];
  off+=8+len;
 }
 return {J,B};
}
function dump(fn){
 const {J}=load(fn);
 const meshToPart={};
 J.nodes.forEach(n=>{if(n.children)n.children.forEach(c=>{if(n.mesh===undefined&&c.mesh!==undefined)meshToPart[c.mesh]=n})});
 // node chain: scene->root->partNode->meshNode->mesh ; meshNode has scale+translation
 const out=[];
 J.meshes.forEach((m,i)=>{
  const pa=m.primitives[0].attributes.POSITION;
  const acc=J.accessors[pa];
  const part=meshToPart[i];
  const mnN=J.nodes.find(n=>n.children&&n.children.length>J.nodes.length-3&&n.mesh===undefined&&n.name&&n.name==='__none__'); // unused
  // mesh node = the node with mesh=i
  const mnode=J.nodes.find(n=>n.mesh===i);
  const s=mnode.scale||[1,1,1],t=mnode.translation||[0,0,0];
  const pt=(part&&part.translation)||[0,0,0];
  const bb=[0,1,2].map(a=>[pt[a]+t[a]+s[a]*acc.min[a],pt[a]+t[a]+s[a]*acc.max[a]]);
  out.push({i,name:(m.name||('mesh_'+i)),bb,partName:part?part.name:'?'});
 });
 return out;
}
for(const f of process.argv.slice(2)){
 console.log('=== '+f+' ===');
 let rows;
 try{rows=dump(f)}catch(e){console.log('ERR '+e.message);continue}
 const G=[1e9,1e9,1e9],GX=[-1e9,-1e9,-1e9];
 rows.forEach(r=>{for(let a=0;a<3;a++){G[a]=Math.min(G[a],r.bb[a][0]);GX[a]=Math.max(GX[a],r.bb[a][1])}});
 console.log('GLOBAL x['+G[0].toFixed(3)+','+GX[0].toFixed(3)+'] y['+G[1].toFixed(3)+','+GX[1].toFixed(3)+'] z['+G[2].toFixed(3)+','+GX[2].toFixed(3)+']');
 rows.forEach(r=>console.log(r.name.padEnd(10),'x['+r.bb[0][0].toFixed(3)+','+r.bb[0][1].toFixed(3)+'] y['+r.bb[1][0].toFixed(3)+','+r.bb[1][1].toFixed(3)+'] z['+r.bb[2][0].toFixed(3)+','+r.bb[2][1].toFixed(3)+']',r.partName));
}
