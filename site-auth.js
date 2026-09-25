/**
 * 站点访问密码保护（智网匠心 AI 布线实训平台）
 * 验证通过后 sessionStorage 记住，关闭浏览器后失效
 */
(function(){
  'use strict';
  // 访问密码（如需修改只改这里）
  var SITE_PASSWORD = 'zhiwang2025';
  var STORAGE_KEY = 'zwjx_auth_ok';

  // 已验证直接放行
  try{
    if(sessionStorage.getItem(STORAGE_KEY) === '1') return;
  }catch(e){}

  // 注入密码遮罩样式
  var css = [
    '#zwjxLock{position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0c4a6e 100%);display:flex;align-items:center;justify-content:center;font-family:"Microsoft YaHei","PingFang SC",sans-serif}',
    '#zwjxLock::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 20% 30%,rgba(14,165,233,.15) 0,transparent 50%),radial-gradient(circle at 80% 70%,rgba(59,130,246,.12) 0,transparent 50%);pointer-events:none}',
    '#zwjxLock .lk-box{position:relative;background:rgba(15,23,42,.85);border:1px solid rgba(148,163,184,.2);border-radius:20px;padding:48px 42px;width:380px;max-width:92vw;backdrop-filter:blur(20px);box-shadow:0 25px 70px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.05) inset;text-align:center}',
    '#zwjxLock .lk-logo{width:72px;height:72px;margin:0 auto 22px;background:linear-gradient(135deg,#0ea5e9,#3b82f6);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 8px 24px rgba(14,165,233,.35)}',
    '#zwjxLock .lk-t{color:#fff;font-size:1.4rem;font-weight:700;margin:0 0 6px;letter-spacing:1px}',
    '#zwjxLock .lk-st{color:#94a3b8;font-size:.88rem;margin:0 0 28px;line-height:1.6}',
    '#zwjxLock .lk-ipt{width:100%;padding:12px 16px;border:1.5px solid #334155;background:rgba(30,41,59,.6);border-radius:10px;color:#fff;font-size:1rem;outline:none;transition:all .25s;box-sizing:border-box;text-align:center;letter-spacing:2px}',
    '#zwjxLock .lk-ipt:focus{border-color:#0ea5e9;background:rgba(30,41,59,.9);box-shadow:0 0 0 3px rgba(14,165,233,.15)}',
    '#zwjxLock .lk-ipt::placeholder{color:#64748b;letter-spacing:normal}',
    '#zwjxLock .lk-btn{width:100%;margin-top:16px;padding:12px 16px;border:0;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-size:1rem;font-weight:600;cursor:pointer;transition:all .25s;letter-spacing:2px}',
    '#zwjxLock .lk-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(14,165,233,.4)}',
    '#zwjxLock .lk-btn:active{transform:translateY(0)}',
    '#zwjxLock .lk-err{color:#f87171;font-size:.82rem;margin-top:12px;min-height:18px;opacity:0;transition:opacity .25s}',
    '#zwjxLock .lk-err.show{opacity:1}',
    '#zwjxLock .lk-foot{position:absolute;bottom:-44px;left:0;right:0;text-align:center;color:#64748b;font-size:.75rem;letter-spacing:1px}'
  ].join('');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // 构建遮罩DOM
  var mask = document.createElement('div');
  mask.id = 'zwjxLock';
  mask.innerHTML =
    '<div class="lk-box">' +
    '  <div class="lk-logo">🔐</div>' +
    '  <h2 class="lk-t">智网匠心 AI 布线实训平台</h2>' +
    '  <p class="lk-st">本平台为教学演示专用，请输入访问密码</p>' +
    '  <input class="lk-ipt" type="password" id="lkPwd" placeholder="请输入访问密码" autocomplete="off" autofocus>' +
    '  <button class="lk-btn" id="lkBtn">进 入 平 台</button>' +
    '  <div class="lk-err" id="lkErr">密码错误，请重试</div>' +
    '  <div class="lk-foot">AI赋能教学 · 智慧伴学成长 · 沉浸式实训</div>' +
    '</div>';

  // 在DOM就绪后立刻插入（不等DOMContentLoaded，避免页面先闪一下）
  function insertMask(){
    if(!document.body){ return setTimeout(insertMask, 5); }
    document.body.appendChild(mask);
    // 隐藏body滚动条
    document.body.style.overflow = 'hidden';
    bind();
  }
  insertMask();

  function bind(){
    var pwd = document.getElementById('lkPwd');
    var btn = document.getElementById('lkBtn');
    var err = document.getElementById('lkErr');

    function unlock(){
      if(pwd.value === SITE_PASSWORD){
        try{ sessionStorage.setItem(STORAGE_KEY, '1'); }catch(e){}
        mask.style.transition = 'opacity .35s';
        mask.style.opacity = '0';
        setTimeout(function(){
          mask.remove();
          document.body.style.overflow = '';
        }, 350);
      }else{
        err.classList.add('show');
        pwd.value = '';
        pwd.focus();
        setTimeout(function(){ err.classList.remove('show'); }, 2500);
      }
    }
    btn.addEventListener('click', unlock);
    pwd.addEventListener('keydown', function(e){
      if(e.key === 'Enter') unlock();
    });
    setTimeout(function(){ pwd.focus(); }, 100);
  }
})();
