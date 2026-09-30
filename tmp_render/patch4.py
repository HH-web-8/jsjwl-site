# -*- coding: utf-8 -*-
import io
p='fiber-splicing.html'
s=io.open(p,encoding='utf-8').read()
def rep(old,new,expect=1):
    global s
    c=s.count(old)
    assert c==expect,'anchor %r count=%d expect=%d'%(old[:50],c,expect)
    s=s.replace(old,new)

# 1) CSS: 序号蓝圆圈（爆炸图风格）
rep(".obj-label.idle{opacity:.6;font-size:.62rem;padding:2px 7px;border-color:rgba(56,189,248,.45);animation:none}",
    ".obj-label.idle{opacity:.6;font-size:.62rem;padding:2px 7px;border-color:rgba(56,189,248,.45);animation:none}\n.lbl-no{display:inline-block;min-width:1.3em;height:1.3em;line-height:1.3em;text-align:center;background:#2563eb;color:#fff;font-weight:700;border-radius:50%;margin-right:5px;font-size:.66rem;padding:0 2px;vertical-align:-2px}")

# 2) setElig 名牌支持序号渲染
rep("el.innerHTML=it.label;layer.appendChild(el);",
    "el.innerHTML=(it.no?'<span class=\"lbl-no\">'+it.no+'</span>':'')+it.label;layer.appendChild(el);")

# 3) makeHand：翻转朝向——指尖朝桌内(-Z)、手臂朝镜头(+Z)，人坐桌前第一人称
old_hand="""function makeHand(side){ // side: 1=右手(画面右) -1=左手
 var g=new THREE.Group();
 var skin=0xf4f6f9,glove={r:0.62,m:0.02};
 // 掌
 var palm=box(0.115,0.032,0.125,skin,glove);palm.position.y=0.016;g.add(palm);
 // 四指
 for(var i=0;i<4;i++){
  var f=box(0.02,0.024,0.088,skin,glove);
  f.position.set(-0.042+i*0.028,0.02,0.098);
  f.rotation.x=-0.18-i*0.03;
  g.add(f);
 }
 // 拇指
 var th=box(0.026,0.026,0.07,skin,glove);
 th.position.set(side*-0.062,0.026,0.05);th.rotation.y=side*0.55;th.rotation.x=-0.25;
 g.add(th);
 // 袖口（实训服）
 var cuff=cyl(0.062,0.072,0.16,0x2b3a4d,{r:0.85,m:0.05});
 cuff.rotation.x=Math.PI/2;cuff.position.set(0,0.005,-0.24);
 g.add(cuff);
 // 腕部
 var wrist=box(0.07,0.024,0.14,skin,glove);wrist.position.set(0,0.014,-0.14);g.add(wrist);
 g.rotation.x=0.42; // 手背朝镜头微抬（第一人称俯视感）
 scene.add(g);
 return g;
}"""
new_hand="""function makeHand(side){ // side: 1=右手(画面右) -1=左手
 var g=new THREE.Group();
 var inner=new THREE.Group();g.add(inner); // 翻转层：手臂朝镜头、指尖朝桌内
 var skin=0xf4f6f9,glove={r:0.62,m:0.02};
 // 掌
 var palm=box(0.115,0.032,0.125,skin,glove);palm.position.y=0.016;inner.add(palm);
 // 四指
 for(var i=0;i<4;i++){
  var f=box(0.02,0.024,0.088,skin,glove);
  f.position.set(-0.042+i*0.028,0.02,0.098);
  f.rotation.x=-0.18-i*0.03;
  inner.add(f);
 }
 // 拇指
 var th=box(0.026,0.026,0.07,skin,glove);
 th.position.set(side*0.062,0.026,0.05);th.rotation.y=-side*0.55;th.rotation.x=-0.25;
 inner.add(th);
 // 袖口（实训服）
 var cuff=cyl(0.062,0.072,0.16,0x2b3a4d,{r:0.85,m:0.05});
 cuff.rotation.x=Math.PI/2;cuff.position.set(0,0.005,-0.24);
 inner.add(cuff);
 // 腕部
 var wrist=box(0.07,0.024,0.14,skin,glove);wrist.position.set(0,0.014,-0.14);inner.add(wrist);
 inner.rotation.y=Math.PI;
 g.rotation.x=-0.42; // 指尖轻压桌面、手臂朝镜头（坐桌前第一人称）
 scene.add(g);
 return g;
}"""
rep(old_hand,new_hand)

# 4) handGrab：拿起后手停在原地等点击目标（不跟随鼠标）；工具放指尖方向
rep("""  tool.position.set(0,0.05,0.16);
  tool.rotation.set(0,0,0);
  HANDS.holdR=tool;
  HANDS.follow=true;""",
"""  tool.position.set(0,0.05,-0.16);
  tool.rotation.set(0,0,0);
  HANDS.holdR=tool;""")

# 5) 步骤序号标注（对应面板①②③，爆炸图蓝色圆圈风格）
rep("setElig([{act:'powerKey',label:'电源键'}]);",
    "setElig([{act:'powerKey',label:'电源键',no:1}]);")
rep("setElig([{act:'tubePick',label:'热缩管'},{act:'fiber1',label:'光纤①'}]);",
    "setElig([{act:'tubePick',label:'热缩管',no:1},{act:'fiber1',label:'光纤①',no:2}]);")
rep("setElig([{act:'pliers',label:'米勒钳'},{act:'fiber'+i,label:FNAME[i]}]);",
    "setElig([{act:'pliers',label:'米勒钳',no:1},{act:'fiber'+i,label:FNAME[i],no:2}]);")
rep("{act:'plierHole1',label:'1口·涂覆层'}","{act:'plierHole1',label:'1口·涂覆层',no:3}")
rep("{act:'plierHole2',label:'2口·外护套'}","{act:'plierHole2',label:'2口·外护套',no:3}")
rep("{act:'plierHole3',label:'3口·剪断'}","{act:'plierHole3',label:'3口·剪断',no:3}")
rep("setElig([{act:'bottle',label:'酒精壶'},{act:'paper',label:'无尘纸'}]);",
    "setElig([{act:'bottle',label:'酒精壶',no:1},{act:'paper',label:'无尘纸',no:2}]);")
rep(" setElig([{act:'fiber'+i,label:FNAME[i]}]);\n PICK=function(act){\n  if(act==='fiber'+i){\n   fiberToCleave(i);",
    " setElig([{act:'fiber'+i,label:FNAME[i],no:1}]);\n PICK=function(act){\n  if(act==='fiber'+i){\n   fiberToCleave(i);")
rep("setElig([{act:'ctHandle',label:'压柄'}]);",
    "setElig([{act:'ctHandle',label:'压柄',no:2}]);")
ns=s.count("setElig([{act:'shield',label:'防风罩'}]);")
assert ns>=1,'shield anchor missing'
s=s.replace("setElig([{act:'shield',label:'防风罩'}]);","setElig([{act:'shield',label:'防风罩',no:1}]);")
rep("setElig([{act:cl,label:'压板'}]);","setElig([{act:cl,label:'压板',no:1}]);")
rep("setElig([{act:'tubePick',label:'热缩管'}]);","setElig([{act:'tubePick',label:'热缩管',no:1}]);")

io.open(p,'w',encoding='utf-8').write(s)
print('patch4 OK: 手朝向翻转+鼠标释放+序号标注 全部落地')
