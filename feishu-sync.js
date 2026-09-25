/**
 * 飞书数据同步 - 通用工具（智网匠心 AI 布线实训平台）
 * 所有模块的数据通过 Coze Bot 自动写入飞书多维表格
 * 使用方式：feishuSync.sync(module, data)
 */
(function(global){
  const API_URL = 'https://api.coze.cn/v3/chat';
  const TOKEN = 'sat_5fSxGjaYFMpx9nSlIhXwt9mCAxKUKtJbaEwfyCIW9lSewRnHKSa4Qs5QEg5Zr0RZ';

  // Bot ID 映射（每个模块对应一个 Bot）
  const BOT_MAP = {
    teacher:  '7645541370291699731', // D1 教学助手
    student:  '7645540020057374756', // D2 学姐伴学
    quiz:     '7645540020057423908', // 题库/错题
    data:     '7645541370291699731', // D3 数据采集（复用教师Bot，带【实训数据同步】标识）
    fiber:    '7645541370291699731', // D4 光纤熔接
    cabling:  '7645541370291699731', // D4 T568B
    game:     '7645541370291699731'  // D5 趣味闯关
  };

  // 模块中文名
  const MODULE_NAME = {
    teacher: 'D1 AI教学助手',
    student: 'D2 AI学姐伴学',
    quiz:    '题库练习',
    data:    'D3 数据采集',
    fiber:   'D4-光纤熔接实训',
    cabling: 'D4-T568B端接实训',
    game:    'D5 趣味闯关'
  };

  // 获取或生成用户ID（匿名）
  function getUid(){
    let uid = localStorage.getItem('platform_uid');
    if(!uid){
      uid = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2,6);
      localStorage.setItem('platform_uid', uid);
    }
    return uid;
  }

  /**
   * 实时同步数据到飞书（fire-and-forget，不阻塞UI）
   * @param {string} module - 模块key: teacher/student/quiz/data/fiber/cabling/game
   * @param {string} type - 数据类型标签，如"错题记录"/"实训得分"/"闯关成绩"
   * @param {object} data - 键值对数据
   * @param {object} opts - { silent: true不弹提示, tag: 自定义前缀标签 }
   */
  function sync(module, type, data, opts){
    opts = opts || {};
    const botId = BOT_MAP[module] || BOT_MAP.data;
    const moduleName = MODULE_NAME[module] || module;
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {hour12:false});

    // 构造结构化消息（方便Bot识别写入多维表格）
    let msg = `【${opts.tag || '实训数据同步'}】\n`;
    msg += `模块：${moduleName}\n`;
    msg += `类型：${type}\n`;
    msg += `时间：${timeStr}\n`;
    msg += `用户：${getUid()}\n`;
    msg += `---数据---\n`;
    if(typeof data === 'object'){
      for(const k in data){
        const v = data[k];
        if(v !== undefined && v !== null && v !== ''){
          msg += `${k}：${v}\n`;
        }
      }
    }else{
      msg += String(data) + '\n';
    }
    msg += `\n请将以上数据写入飞书多维表格对应工作表。`;

    const body = {
      bot_id: botId,
      user_id: getUid(),
      stream: false,
      auto_save_history: true,
      additional_messages: [{role:'user', content:msg, content_type:'text'}]
    };

    // fire-and-forget：异步发送，不阻塞，不等待结果，不弹错误提示（避免打断用户）
    fetch(API_URL, {
      method: 'POST',
      headers: {'Authorization':'Bearer '+TOKEN, 'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); })
      .then(function(d){
        if(d.code === 0){
          console.log('[飞书同步]', moduleName, type, '已发送, chat_id:', d.data && d.data.id);
          if(!opts.silent){
            showSyncTip('✅ 数据已同步到飞书');
          }
        }else{
          console.warn('[飞书同步] 发送失败:', d.msg);
        }
      })
      .catch(function(e){ console.warn('[飞书同步] 异常:', e); });
  }

  // 轻量提示（如果页面已有toast系统就复用，否则插入一个全局tip）
  let tipTimer = null;
  function showSyncTip(text){
    let el = document.getElementById('__feishu_tip__');
    if(!el){
      el = document.createElement('div');
      el.id = '__feishu_tip__';
      el.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.3);transition:all .3s;opacity:0;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = '1';
    if(tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function(){ el.style.opacity = '0'; }, 2000);
  }

  // 暴露全局
  global.feishuSync = {
    sync: sync,
    getUid: getUid,
    BOT_MAP: BOT_MAP,
    MODULE_NAME: MODULE_NAME
  };
})(window);
