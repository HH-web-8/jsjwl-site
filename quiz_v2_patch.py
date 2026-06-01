with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the iframe approach with Coze Web SDK + fallback to new window
# Replace the chat body content
old_chat = '''<div class="qz-chat-bd" id="qz-chat-bd">
<iframe id="qz-iframe" src="https://www.coze.cn/chat/7645540020057423908" 
  onload="document.getElementById('qz-fallback').style.display='none'"
  onerror="document.getElementById('qz-fallback').style.display='flex'"></iframe>
<div class="qz-fallback" id="qz-fallback" style="display:none">
<p>如果聊天窗口未正常加载，<br>请点击下方按钮在新窗口中打开</p>
<a href="https://www.coze.cn/chat/7645540020057423908" target="_blank" rel="noopener">📝 新窗口打开题库助手</a>
</div>
</div>'''

new_chat = '''<div class="qz-chat-bd" id="qz-chat-bd">
<div class="qz-welcome" id="qz-welcome">
<div class="qz-welcome-icon">🤖</div>
<h3>题库AI助手</h3>
<p>选择左侧课程、题型和难度，点击"一键生成试卷"，<br>系统将自动为您生成专属题目</p>
<div class="qz-quick-btns">
<button class="qz-qbtn" onclick="qzQuick('请出10道综合布线系统的选择题')">📝 综合布线选择题</button>
<button class="qz-qbtn" onclick="qzQuick('请出10道网络基础的判断题')">✅ 网络基础判断题</button>
<button class="qz-qbtn" onclick="qzQuick('请出5道网络设备配置的简答题')">✍️ 网络设备简答题</button>
<button class="qz-qbtn" onclick="qzQuick('请出一份网络安全的混合题型试卷')">📋 网络安全综合卷</button>
</div>
<a class="qz-open-btn" href="https://www.coze.cn/chat/7645540020057423908" target="_blank" rel="noopener">
💬 打开AI助手完整版
</a>
</div>
</div>'''

html = html.replace(old_chat, new_chat)

# Add CSS for welcome and quick buttons
old_chat_css = """.qz-chat-bd iframe{width:100%;height:100%;min-height:460px;border:none}
.qz-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 20px;color:#64748b;text-align:center}
.qz-fallback p{font-size:.9rem;line-height:1.6}
.qz-fallback a{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:10px;font-weight:700;font-size:.95rem;text-decoration:none;transition:all .3s}
.qz-fallback a:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,.3)}"""

new_chat_css = """.qz-welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px 20px;min-height:460px;text-align:center}
.qz-welcome-icon{font-size:3rem;margin-bottom:8px}
.qz-welcome h3{font-size:1.2rem;color:var(--pri);margin:0}
.qz-welcome p{font-size:.9rem;color:#64748b;line-height:1.6;margin:0}
.qz-quick-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;width:100%;max-width:400px}
.qz-qbtn{padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-size:.82rem;cursor:pointer;transition:all .2s;text-align:left;color:var(--txt)}
.qz-qbtn:hover{border-color:var(--acc);color:var(--acc);background:rgba(37,99,235,.04)}
.qz-open-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:12px;font-weight:700;font-size:1rem;text-decoration:none;transition:all .3s;margin-top:8px}
.qz-open-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,.3)}"""

html = html.replace(old_chat_css, new_chat_css)

# Update qzGen function
old_js = """function qzGen(){
  const course=document.querySelector('#qz-courses .qz-opt.sel')?.dataset.v||'综合布线系统';
  const type=document.querySelector('#qz-types .qz-opt.sel')?.dataset.v||'选择题';
  const diff=document.querySelector('#qz-diff .qz-opt.sel')?.dataset.v||'中等';
  const prompt='请为《'+course+'》课程出10道'+type+'，难度为'+diff+'。请包含题目、选项（如适用）和答案解析。';
  navigator.clipboard.writeText(prompt).then(()=>{
    const btn=document.querySelector('.qz-go');
    const orig=btn.textContent;
    btn.textContent='✅ 已复制题目要求，请在聊天框粘贴发送';
    btn.style.background='linear-gradient(135deg,#059669,#10b981)';
    setTimeout(()=>{btn.textContent=orig;btn.style.background='';},3000);
  }).catch(()=>{
    alert('请复制以下内容到聊天框发送：\\n\\n'+prompt);
  });
}"""

new_js = """function qzGen(){
  const course=document.querySelector('#qz-courses .qz-opt.sel')?.dataset.v||'综合布线系统';
  const type=document.querySelector('#qz-types .qz-opt.sel')?.dataset.v||'选择题';
  const diff=document.querySelector('#qz-diff .qz-opt.sel')?.dataset.v||'中等';
  const prompt='请为《'+course+'》课程出10道'+type+'，难度为'+diff+'。请包含题目、选项（如适用）和答案解析。';
  navigator.clipboard.writeText(prompt).then(()=>{
    const btn=document.querySelector('.qz-go');
    const orig=btn.textContent;
    btn.textContent='✅ 已复制！正在打开AI助手...';
    btn.style.background='linear-gradient(135deg,#059669,#10b981)';
    setTimeout(()=>{
      btn.textContent=orig;btn.style.background='';
      window.open('https://www.coze.cn/chat/7645540020057423908','_blank');
    },1200);
  }).catch(()=>{
    window.open('https://www.coze.cn/chat/7645540020057423908','_blank');
  });
}
function qzQuick(prompt){
  navigator.clipboard.writeText(prompt).then(()=>{
    window.open('https://www.coze.cn/chat/7645540020057423908','_blank');
  }).catch(()=>{
    window.open('https://www.coze.cn/chat/7645540020057423908','_blank');
  });
}"""

html = html.replace(old_js, new_js)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("V2 patch applied successfully!")
