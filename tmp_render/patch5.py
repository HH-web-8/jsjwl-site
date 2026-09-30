# -*- coding: utf-8 -*-
# patch5: 真3D左右手(无手臂) + 物件自由拖拽 + 地面光圈引导 + 米勒钳GLB + 光纤颜色升级
import io,sys
p='fiber-splicing.html'
s=io.open(p,encoding='utf-8').read()
n=0
def rep(old,new,cnt=1):
    global s,n
    if old not in s:
        print('MISS:',old[:70].replace('\n','\\n'));sys.exit(1)
    s=s.replace(old,new,cnt);n+=1

# ---------- P1 真手重建（删袖口/腕部，圆润手指） ----------
i0=s.index('function makeHand(side){')
i1=s.index('function initHands(){')
old_hand=s[i0:i1]
new_hand='''function makeHand(side){ // side: 1=右手(画面右) -1=左手 · 真3D手型（无手臂）
 var g=new THREE.Group();
 var inner=new THREE.Group();g.add(inner); // 翻转层：指尖朝桌内(-Z)、掌背朝镜头
 var skinM=new THREE.MeshStandardMaterial({color:0xE8B48B,roughness:0.55,metalness:0.02});
 // 掌（扁椭球）
 var palm=new THREE.Mesh(new THREE.SphereGeometry(0.058,20,14),skinM);
 palm.scale.set(1.02,0.5,1.3);palm.position.y=0.02;inner.add(palm);
 // 四指（圆柱+双球端，指尖朝-Z）
 for(var i=0;i<4;i++){
  var fr=new THREE.Group();
  var fs=new THREE.Mesh(new THREE.CylinderGeometry(0.0092,0.0105,0.072,10),skinM);
  fs.rotation.x=Math.PI/2;fr.add(fs);
  var fT=new THREE.Mesh(new THREE.SphereGeometry(0.0092,10,8),skinM);fT.position.z=-0.036;fr.add(fT);
  var fB=new THREE.Mesh(new THREE.SphereGeometry(0.0105,10,8),skinM);fB.position.z=0.036;fr.add(fB);
  fr.position.set(-0.033+i*0.022,0.024,0.066);
  fr.rotation.x=-0.16-i*0.03;
  inner.add(fr);
 }
 // 拇指（侧伸）
 var tg=new THREE.Group();
 var t1=new THREE.Mesh(new THREE.CylinderGeometry(0.0105,0.0125,0.06,10),skinM);
 t1.rotation.x=Math.PI/2;tg.add(t1);
 var t2=new THREE.Mesh(new THREE.SphereGeometry(0.0105,10,8),skinM);t2.position.z=-0.03;tg.add(t2);
 tg.position.set(side*0.056,0.02,0.028);
 tg.rotation.y=-side*0.55;tg.rotation.x=-0.4;
 inner.add(tg);
 inner.rotation.y=Math.PI;
 g.rotation.x=-0.35; // 指尖轻压向桌面（坐桌前第一人称）
 scene.add(g);
 return g;
}
'''
rep(old_hand,new_hand)

# ---------- P2 onMove free分支 ----------
rep('''function onMove(e){
 if(HANDS.follow&&!DRAG.holding)handsFollowPointer(e);
 if(!DRAG.holding)return;
''','''function onMove(e){
 if(HANDS.follow&&!DRAG.holding)handsFollowPointer(e);
 if(!DRAG.holding)return;
 if(DRAG.mode==='free'){
  if(!DRAG.moved&&Math.hypot(e.clientX-DRAG.sx,e.clientY-DRAG.sy)>8)DRAG.moved=true;
  if(DRAG.moved&&DRAG.dragObj){
   var pf=planePos(e,0.14);
   if(pf){
    if(!DRAG.off0)DRAG.off0={x:DRAG.dragObj.position.x-pf.x,z:DRAG.dragObj.position.z-pf.z};
    DRAG.dragObj.position.x=clamp(pf.x+DRAG.off0.x,-4.4,4.4);
    DRAG.dragObj.position.z=clamp(pf.z+DRAG.off0.z,-1.5,3.2);
   }
  }
  return;
 }
''')

# ---------- P3 onUp free分支 ----------
rep('''function onUp(e){
 if(!DRAG.holding)return;
 DRAG.holding=false;
''','''function onUp(e){
 if(!DRAG.holding)return;
 DRAG.holding=false;
 if(DRAG.mode==='free'){
  if(!DRAG.moved&&PICK){PICK(DRAG.dragAct)}
  DRAG.mode=null;DRAG.dragObj=null;
  return;
 }
''')

# ---------- P4 onDown free预备 ----------
rep(''' if(!act)return;
 if(act==='ctHandle'&&(F.step===5||F.step===9)){''',''' if(!act)return;
 if(FREE_DRAG[act]&&rootOf(ANCH[act]).parent===scene&&DRAG.mode!=='strip'&&DRAG.mode!=='wipe'&&DRAG.mode!=='tube'){
  DRAG.mode='free';DRAG.holding=true;DRAG.sx=e.clientX;DRAG.sy=e.clientY;DRAG.dragAct=act;DRAG.dragObj=rootOf(ANCH[act]);DRAG.moved=false;DRAG.off0=null;
  try{e.target.setPointerCapture(e.pointerId)}catch(err){}
  e.preventDefault();return;
 }
 if(act==='ctHandle'&&(F.step===5||F.step===9)){''')

# ---------- P5 声明+mkRing+rootOf+FREE_DRAG ----------
rep('''function setElig(items){''','''var RINGS=[];
function mkRing(){var r=new THREE.Mesh(new THREE.RingGeometry(0.13,0.19,40),new THREE.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:0.8,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.renderOrder=2;scene.add(r);return r}
function rootOf(o){var p=o;while(p.parent&&p.parent!==scene)p=p.parent;return p}
var FREE_DRAG={bottle:1,paper:1,pliers:1};
function setElig(items){''')

# ---------- P6 setElig 清ring+建ring ----------
rep('''var layer=$('labelLayer');layer.innerHTML='';labelDefs=[];''','''var layer=$('labelLayer');layer.innerHTML='';labelDefs=[];
 for(var rr=RINGS.length-1;rr>=0;rr--){scene.remove(RINGS[rr].mesh)}RINGS=[];''')
rep('''   labelDefs.push({act:it.act,obj:it.obj||m,el:el});''','''   labelDefs.push({act:it.act,obj:it.obj||m,el:el});
   var rn=mkRing();RINGS.push({obj:it.obj||m,mesh:rn});''')

# ---------- P7 animate ring动画 ----------
rep(''' updLabels();
 if(SP.scrTex''',''' updLabels();
 for(var r0=0;r0<RINGS.length;r0++){var R0=RINGS[r0];R0.obj.getWorldPosition(_v3);R0.mesh.position.set(_v3.x,0.017,_v3.z);var s0=1+Math.sin(t*3.6)*0.09;R0.mesh.scale.set(s0,s0,1);R0.mesh.material.opacity=0.5+Math.sin(t*3.6)*0.25}
 if(SP.scrTex''')

# ---------- P8 米勒钳GLB接入 ----------
rep('''reg(head,'pliers');TL.pliers=pg;TL.holeY=[0.085-0.052,0.085,0.085+0.052];''','''reg(head,'pliers');TL.pliers=pg;TL.holeY=[0.085-0.052,0.085,0.085+0.052];
 // AI实物GLB：米勒钳（加载成功→隐藏程序化钳身、锚点转移；失败→程序化兜底）
 loadGLB('assets/models/miller-pliers.glb?v=slim4',function(m){
  if(!m||!TL.pliers)return;
  var bb=new THREE.Box3().setFromObject(m);
  var sy=bb.max.y-bb.min.y;
  var sc=0.95/(sy||1);
  m.scale.set(sc,sc,sc);
  m.rotation.z=Math.PI/2; // 立姿放平：钳头朝-X、三孔面朝+Y
  bb.setFromObject(m);
  m.position.x-=(bb.max.x+bb.min.x)/2;
  m.position.z-=(bb.max.z+bb.min.z)/2;
  m.position.y-=bb.min.y;
  m.position.x+=0.22; // 对齐程序化钳头孔位
  m.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  pg.add(m);
  var vol=0,main=null;
  m.traverse(function(o){if(o.isMesh){var b2=new THREE.Box3().setFromObject(o);var v=(b2.max.x-b2.min.x)*(b2.max.y-b2.min.y)*(b2.max.z-b2.min.z);if(v>vol){vol=v;main=o}}});
  h1.visible=false;h2.visible=false;head.visible=false;
  if(main)reg(main,'pliers');
 });''')

# ---------- P9 光纤颜色升级 ----------
rep('0xdec27a','0xf5c518')  # 全部（jacket+剥皮碎屑同步亮黄）
i0=s.index('CylinderGeometry(0.036')
j=s.index('0xf2f5f8',i0)
s=s[:j]+'0xd8cbb8'+s[j+len('0xf2f5f8'):]
n+=1

io.open(p,'w',encoding='utf-8').write(s)
print('patch5 OK, %d 处修改'%n)
