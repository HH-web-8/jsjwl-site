/**
 * 飞书数据同步 - 通用工具（智网匠心 AI 布线实训平台）
 * 数据写入飞书 Base：AI赋能教学数据中枢
 * 每个模块对应一个独立多维表格（worksheet）
 * 使用方式：feishuSync.sync(module, table, type, data)
 */
(function(global){
  const API_URL = 'https://api.coze.cn/v3/chat';
  const TOKEN = 'sat_5fSxGjaYFMpx9nSlIhXwt9mCAxKUKtJbaEwfyCIW9lSewRnHKSa4Qs5QEg5Zr0RZ';
  // Bot ID（统一使用教师Bot处理飞书写入，所有数据汇聚到同一个Base）
  const BOT_ID = '7645541370291699731';
  // 目标飞书Base名称
  const BASE_NAME = 'AI赋能教学数据中枢';

  // 模块中文名
  const MODULE_NAME = {
    teacher:  'D1 AI教学助手',
    student:  'D2 AI学姐伴学',
    data:     'D3 数据采集助手',
    fiber:    'D4 光纤熔接实训',
    cabling:  'D4 T568B端接实训',
    sim:      'D4 虚拟实训平台',
    quiz:     '题库练习',
    wrong:    '错题记录',
    consult:  '咨询记录',
    game:     'D5 趣味闯关',
  };

  // 目标数据表名称（每个模块对应飞书Base内的一张独立表）
  const TABLE_NAME = {
    teacher_prep:    'D1-1 备课资源生成表',
    teacher_analyze: 'D1-2 学情分析表',
    teacher_quiz:    'D1-3 智能组卷表',
    teacher_reflect: 'D1-4 教学反思表',
    student_preview: 'D2-1 预习伴学记录表',
    student_qa:      'D2-2 支架答疑记录表',
    student_review:  'D2-3 方案陪审记录表',
    student_emotion: 'D2-4 情感激励记录表',
    data_photo:      'D3-1 施工现场归档表',
    data_behavior:   'D3-2 课堂行为量化表',
    data_dialogue:   'D3-3 对话质量分析表',
    data_privacy:    'D3-4 隐私审计日志表',
    fiber_score:     'D4-1 光纤熔接实训成绩表',
    cabling_score:   'D4-2 T568B端接实训成绩表',
    sim_task:        'D4-3 任务三维勘察表',
    sim_video:       'D4-4 施工视频学习表',
    sim_fault:       'D4-5 故障模拟记录表',
    quiz_score:      '题库练习成绩表',
    wrong_book:      '错题记录表',
    consult_record:  '咨询记录表',
    game_score:      'D5 闯关成绩表',
    game_garbage:    'D5 垃圾分类闯关表',
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
   * 实时同步数据到飞书「AI赋能教学数据中枢」Base
   * @param {string} tableKey - 数据表key（见TABLE_NAME）
   * @param {string} type - 数据类型/事件，如"实训成绩"/"错题"/"答题提交"
   * @param {object} data - 键值对数据，字段名对应表格列名
   * @param {object} opts - { silent: true 不弹提示 }
   */
  function sync(tableKey, type, data, opts){
    opts = opts || {};
    const tableName = TABLE_NAME[tableKey] || tableKey;
    // 推断模块
    const moduleKey = tableKey.split('_')[0];
    const moduleName = MODULE_NAME[moduleKey] || '';
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {hour12:false});

    // 构造结构化指令消息（明确告诉Bot要写入哪个Base哪张表）
    let msg = `【飞书数据中枢-写入指令】\n`;
    msg += `目标Base：${BASE_NAME}\n`;
    msg += `目标数据表：${tableName}\n`;
    msg += `所属模块：${moduleName}\n`;
    msg += `数据类型：${type}\n`;
    msg += `记录时间：${timeStr}\n`;
    msg += `用户ID：${getUid()}\n`;
    msg += `==========\n`;
    if(typeof data === 'object'){
      for(const k in data){
        const v = data[k];
        if(v !== undefined && v !== null && v !== ''){
          msg += `${k}：${v}\n`;
        }
      }
    }else{
      msg += `内容：${String(data)}\n`;
    }
    msg += `==========\n`;
    msg += `请严格将以上字段写入飞书多维表格「${BASE_NAME}」中的「${tableName}」工作表，字段与列名一一对应，自动创建新行。`;

    const body = {
      bot_id: BOT_ID,
      user_id: getUid(),
      stream: false,
      auto_save_history: true,
      additional_messages: [{role:'user', content:msg, content_type:'text'}]
    };

    // Fire-and-forget 异步发送
    fetch(API_URL, {
      method:'POST',
      headers:{
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(r=>r.json()).then(res=>{
      if(!opts.silent){
        showToast('✅ 已同步到飞书数据中枢');
      }
    }).catch(e=>{
      console.warn('[飞书同步] 失败:', e);
    });
  }

  // 简单Toast
  function showToast(text){
    try{
      let t = document.getElementById('feishuSyncToast');
      if(!t){
        t = document.createElement('div');
        t.id = 'feishuSyncToast';
        t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(34,197,94,.92);color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:none;transition:opacity .3s;opacity:0;';
        document.body.appendChild(t);
      }
      t.textContent = text;
      t.style.opacity = '1';
      clearTimeout(t._timer);
      t._timer = setTimeout(()=>{ t.style.opacity = '0'; }, 2200);
    }catch(e){}
  }

  // 暴露到全局
  global.feishuSync = {
    sync,
    TABLE: TABLE_NAME,
    MODULE: MODULE_NAME,
    BASE: BASE_NAME
  };

})(window);