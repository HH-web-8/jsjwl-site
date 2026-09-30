# -*- coding: utf-8 -*-
import io

p='fiber-splicing.html'
s=io.open(p,encoding='utf-8').read()

# 1) loadGLB 重写：进度条 + 失败显式报错（不静默）
old_loader='''function loadGLB(path,cb){
 try{
  if(!THREE.GLTFLoader){cb(null);return}
  new THREE.GLTFLoader().load(path,function(g){cb(g.scene||null)},undefined,function(){cb(null)});
 }catch(e){cb(null)}
}'''
assert s.count(old_loader)==1, 'loadGLB anchor not unique: %d'%s.count(old_loader)

new_loader='''/* ---------- GLB加载状态（进度+失败显式报错，不静默回退） ---------- */
var GLBST={};
function glbEl(id){
 var el=document.getElementById(id);
 if(!el){
  el=document.createElement('div');el.id=id;document.body.appendChild(el);
  if(id==='glbTip'){
   el.style.cssText='position:fixed;left:12px;bottom:110px;z-index:900;background:rgba(8,14,28,.86);color:#7dd3fc;font:12px/1.6 -apple-system,"PingFang SC",sans-serif;padding:5px 12px;border-radius:8px;border:1px solid rgba(125,211,252,.42);pointer-events:none;transition:opacity .6s';
  }else{
   el.style.cssText='position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:999;background:#7f1d1d;color:#fecaca;font:600 13px/1.5 -apple-system,"PingFang SC",sans-serif;padding:8px 16px;border-radius:8px;border:1px solid #fca5a5;box-shadow:0 6px 22px rgba(0,0,0,.45);max-width:88vw;text-align:center';
  }
 }
 return el;
}
function glbProg(nm,st){
 if(nm)GLBST[nm]=st;
 var parts=[];
 for(var k in GLBST){if(k[0]!=='_')parts.push(k+' '+(GLBST[k]>=1?'\\u2713':(GLBST[k]<0?'\\u2717':Math.round(GLBST[k]*100)+'%')))}
 var el=glbEl('glbTip');
 el.textContent='实物模型：'+parts.join(' \\u00b7 ');
 el.style.opacity='1';
 clearTimeout(GLBST._t);
 var keys=Object.keys(GLBST).filter(function(k){return k[0]!=='_'});
 if(keys.length&&keys.every(function(k){return GLBST[k]===1||GLBST[k]===-1})){
  if(keys.every(function(k){return GLBST[k]===1}))GLBST._t=setTimeout(function(){el.style.opacity='0'},2200);
 }
}
function glbFail(nm,why){
 GLBST[nm]=-1;
 var el=glbEl('glbErr');
 el.textContent='\\u26a0 实物模型['+nm+']加载失败：'+why+'，已临时用简化模型，请截图反馈';
 glbProg(null,0);
}
function loadGLB(path,cb){
 try{
  var nm=/_88s/.test(path)?'88S熔接机':(/bottle/.test(path)?'酒精喷壶':'模型');
  if(!THREE.GLTFLoader){glbFail(nm,'GLTFLoader未就绪');cb(null);return}
  glbProg(nm,0);
  new THREE.GLTFLoader().load(path,function(g){glbProg(nm,1);cb(g.scene||null)},
   function(ev){if(ev.lengthComputable&&ev.total>0)glbProg(nm,ev.loaded/ev.total)},
   function(err){
    var st=(err&&err.target&&err.target.status)?('HTTP '+err.target.status):'解析失败';
    glbFail(nm,st);cb(null);
   });
 }catch(e){glbFail('模型',e.message);cb(null)}
}'''
s=s.replace(old_loader,new_loader)

# 2) 88S 朝向：正面(+X)转向镜头(+Z)
old_rot='''var sc=1.75/sx;
  m.scale.set(sc,sc,sc);
  bb.setFromObject(m);'''
assert s.count(old_rot)==1, 'rot anchor not unique: %d'%s.count(old_rot)
new_rot='''var sc=1.75/sx;
  m.scale.set(sc,sc,sc);
  m.rotation.y=-Math.PI/2;
  bb.setFromObject(m);'''
s=s.replace(old_rot,new_rot)

# 3) GLB 引用加版本参数，强制手机拉取瘦身新文件
old88="loadGLB('assets/models/fujikura-88s.glb'"
assert s.count(old88)==1, '88s ref anchor: %d'%s.count(old88)
s=s.replace(old88,"loadGLB('assets/models/fujikura-88s.glb?v=slim3'")
oldalc="loadGLB('assets/models/alcohol-bottle.glb'"
assert s.count(oldalc)==1, 'alc ref anchor: %d'%s.count(oldalc)
s=s.replace(oldalc,"loadGLB('assets/models/alcohol-bottle.glb?v=slim3'")

io.open(p,'w',encoding='utf-8').write(s)
print('patch3 OK: 4处改动全部落地')
