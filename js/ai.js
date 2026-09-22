/* ===========================================================
   ai.js —— 讲述练习「智能评分」引擎
   两条路：
   1) 本地评分（默认，零成本、离线可用）：五感 / 要素 / 顺序 / 感受 多维打分
   2) 云端大模型（妈妈端填 API 后启用）：真正的 AI 点评
   =========================================================== */
(function (global) {
  'use strict';

  var LEX = {
    sight: { key: 'sight', label: '眼睛看到的', icon: '👀', max: 6, words: ['看到', '看见', '眼睛', '颜色', '红', '绿', '蓝', '黄', '白', '黑', '粉', '大', '小', '高', '矮', '胖', '瘦', '圆', '亮', '暗', '闪光', '漂亮', '美丽', '蓝天', '太阳', '云', '树上', '花', '草地', '窗外'] },
    sound: { key: 'sound', label: '耳朵听到的', icon: '👂', max: 6, words: ['听到', '听见', '声音', '响', '吵', '安静', '喇叭', '唱歌', '说话', '叫', '喊', '叮', '咚', '嘟', '啪', '哗', '悄悄', '铃', '哭声', '笑声'] },
    smell: { key: 'smell', label: '鼻子闻到的', icon: '👃', max: 5, words: ['闻到', '香', '臭', '气味', '香味', '饭菜', '花香', '味道'] },
    taste: { key: 'taste', label: '嘴巴尝到的', icon: '👅', max: 5, words: ['尝', '甜', '酸', '苦', '咸', '好吃', '难吃', '冰激凌', '巧克力', '糖', '吃饭', '喝汤'] },
    touch: { key: 'touch', label: '身体摸到的', icon: '✋', max: 6, words: ['摸', '软', '硬', '热', '冷', '凉', '烫', '滑', '粗糙', '毛茸茸', '湿', '干', '痛', '痒', '轻', '重', '刮风', '下雨', '阳光照'] }
  };

  var TIME_WORDS = ['今天', '早上', '上午', '中午', '下午', '晚上', '昨天', '刚才', '放学', '下课', '上课', '周末', '点钟', '时候', '第一节课', '吃完饭'];
  var PLACE_WORDS = ['学校', '教室', '操场', '家', '家里', '路上', '公园', '超市', '食堂', '图书馆', '小区', '车上', '楼下', '花园', '走廊', '球场', '办公室', '门口'];
  var PERSON_WORDS = ['同学', '老师', '妈妈', '爸爸', '爷爷', '奶奶', '朋友', '同桌', '和我', '我们', '大家', '哥哥', '姐姐', '弟弟', '妹妹', '一起', '叔叔', '阿姨'];
  var SEQ_WORDS = ['先', '然后', '接着', '后来', '最后', '终于', '突然', '马上', '过了一会儿', '一会儿', '开始', '结束', '准备', '正当', '接下来'];
  var CAUSE_WORDS = ['因为', '所以', '于是', '但是', '可是', '虽然', '结果', '没想到'];
  var FEEL_WORDS = ['开心', '高兴', '快乐', '难过', '伤心', '激动', '紧张', '害羞', '害怕', '生气', '自豪', '温暖', '惊喜', '难忘', '有趣', '有意思', '委屈', '后悔', '着急', '不好意思', '眼泪', '笑了', '哭了', '喜欢', '感动'];
  var QUOTE_MARK = ['“', '”', '"', "'", '说', '告诉', '我说', '他说', '她说', '对我'];

  function has(text, arr) {
    for (var i = 0; i < arr.length; i++) {
      if (text.indexOf(arr[i]) >= 0) return arr[i];
    }
    return null;
  }
  function countHits(text, arr) {
    var n = 0, got = [];
    for (var i = 0; i < arr.length; i++) {
      if (text.indexOf(arr[i]) >= 0) { n++; got.push(arr[i]); }
    }
    return { n: n, got: got };
  }
  function len(text) { return (text || '').replace(/\s/g, '').length; }

  /* ---------------- 本地评分 ---------------- */
  function localScore(text) {
    text = text || '';
    var n = len(text);
    var detail = [], tips = [], comments = [], total = 0;

    if (n < 10) {
      return {
        score: Math.min(38, Math.round(n * 4)), mode: 'local', detail: [], tips: [],
        comments: ['你开口啦！再多说一点点，比如「在哪里」「和谁」，就会发现越来越好讲。']
      };
    }

    // 1) 开口基础分
    total += 40;
    comments.push('你讲了 ' + n + ' 个字，把今天的事记下来了。');

    // 2) 长度分（满 120 字给满 20）
    total += Math.min(20, Math.round((Math.min(n, 120) / 120) * 20));

    // 3) 五感
    var sensesHit = 0;
    Object.keys(LEX).forEach(function (k) {
      var d = LEX[k];
      var hit = has(text, d.words);
      if (hit) {
        total += d.max; sensesHit++;
        detail.push({ key: k, label: d.label, icon: d.icon, hit: true, word: hit, pts: d.max });
      } else {
        detail.push({ key: k, label: d.label, icon: d.icon, hit: false, pts: 0 });
        tips.push(d.icon + ' 还没说到' + d.label + '，加一句试试会更生动');
      }
    });

    // 4) 时间 / 地点 / 人物
    [['时间', '🕒', TIME_WORDS, '先说「什么时候发生的」，听的人更容易跟着你走'],
    ['地点', '📍', PLACE_WORDS, '加一句「在哪里」，故事就有了画面'],
    ['人物', '🧑', PERSON_WORDS, '说说「和谁一起」，这个人就活起来啦']].forEach(function (x) {
      if (has(text, x[2])) { total += 4; detail.push({ label: x[0], icon: x[1], hit: true, pts: 4 }); }
      else { detail.push({ label: x[0], icon: x[1], hit: false, pts: 0 }); tips.push(x[1] + ' ' + x[3]); }
    });

    // 5) 顺序
    var seq = countHits(text, SEQ_WORDS);
    if (seq.n >= 2) {
      total += 6;
      detail.push({ label: '讲清了先后顺序', icon: '🔗', hit: true, pts: 6 });
      comments.push('你用了「' + seq.got.slice(0, 2).join('、') + '」，事情的顺序很清楚。');
    } else if (seq.n === 1) {
      total += 3;
      detail.push({ label: '先后顺序', icon: '🔗', hit: true, pts: 3 });
      tips.push('🔗 再用一个「然后 / 最后」，像搭积木一样把过程接起来');
    } else {
      detail.push({ label: '先后顺序', icon: '🔗', hit: false, pts: 0 });
      tips.push('🔗 试试「先……然后……最后……」，故事会更有条理');
    }

    // 6) 因果
    if (countHits(text, CAUSE_WORDS).n > 0) { total += 4; detail.push({ label: '说出了原因', icon: '💡', hit: true, pts: 4 }); }
    else detail.push({ label: '原因想法', icon: '💡', hit: false, pts: 0 });

    // 7) 心情
    if (countHits(text, FEEL_WORDS).n > 0) {
      total += 6;
      detail.push({ label: '说出了心情', icon: '❤️', hit: true, pts: 6 });
      comments.push('你把当时的心情也说出来了，这是最打动人的地方。');
    } else {
      detail.push({ label: '心情', icon: '❤️', hit: false, pts: 0 });
      tips.push('❤️ 最后加一句「我当时觉得……」，听的人会更懂你');
    }

    // 8) 对话
    if (has(text, QUOTE_MARK)) {
      total += 3;
      detail.push({ label: '有对话', icon: '💬', hit: true, pts: 3 });
      comments.push('你还记住了当时说的话，很像一个小作家！');
    } else detail.push({ label: '对话', icon: '💬', hit: false, pts: 0 });

    total = Math.max(0, Math.min(100, Math.round(total)));

    if (sensesHit >= 3) comments.unshift('哇，你用上了 ' + sensesHit + ' 种感官，讲得像电影一样！');
    else if (total >= 85) comments.unshift('讲得非常完整！');
    else if (total >= 70) comments.unshift('讲得不错，画面已经出来啦。');

    return {
      score: total, mode: 'local', detail: detail,
      tips: tips.slice(0, 3), comments: comments.slice(0, 4)
    };
  }

  /* ---------------- 云端大模型评分 ---------------- */
  function llmScore(text, cfg) {
    var SYS = '你是一位温柔、会鼓励人的小学语文老师，正在给二年级男孩 Micky 点评一段口头描述。' +
      '请用中文回答，语气像讲故事的大朋友：先肯定优点（具体说出他做到了什么），' +
      '再给 1-2 条马上能试的小建议（用「如果……就更棒了」的说法，绝不批评）。' +
      '打分参考：五感描写（看听闻尝触）、时间地点人物、先后顺序、心情感受、字数。' +
      '严格按这个 JSON 输出，不要有多余文字：' +
      '{"score":整数0-100,"comments":["优点1","优点2"],"tips":["建议1","建议2"]}';
    var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: '这是 Micky 今天说的一段话：\n' + text + '\n\n请点评并打分。' }
        ],
        temperature: 0.7
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var raw = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      var m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('返回格式异常');
      var o = JSON.parse(m[0]);
      return {
        score: Math.max(0, Math.min(100, Math.round(+o.score || 60))),
        mode: 'llm', detail: [],
        comments: Array.isArray(o.comments) ? o.comments : [],
        tips: Array.isArray(o.tips) ? o.tips : []
      };
    });
  }

  /* ---------------- AI 自动悄悄话（按当天心情，模仿妈妈的口气） ----------------
     口吻设定来自乐乐本人：搞怪、随和、机灵古怪、不走寻常路、不煽情。
     没配 API Key 时完全走本地模板，零成本也能用。 */
  function llmNote(moodKey, kidName, cfg) {
    var map = (global.UI && global.UI.NOTE_BY_MOOD) || {};
    var info = map[moodKey] || map.none || { tone: '' };
    var SYS = '你是' + kidName + '的妈妈。你的性格：搞怪、随和、机灵古怪、经常不走寻常路，' +
      '说话像真人贫嘴，绝不煽情、绝不说教、绝不写「妈妈为你骄傲」这种话。\n' +
      '现在的情况：' + info.tone + '\n' +
      '写一句留给他的悄悄话，要求：\n' +
      '1）一句话，最多 30 个字，像微信里随口说的一句\n' +
      '2）不要「加油」「你最棒」「要坚强」「别难过」这类空话\n' +
      '3）不要布置任务、不要提学习、不要问他为什么\n' +
      '4）可以贫、可以闹、可以说个没头没尾的怪话，只要让他觉得被看见\n' +
      '5）只输出这一句话，不要引号、不要解释';
    var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: '写一句今天留给他的悄悄话。' }
        ],
        temperature: 1.0
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var t = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      t = String(t).trim().replace(/^["'「」『』【】\s]+|["'「」『』【】\s]+$/g, '');
      t = t.split('\n')[0].trim();
      if (!t || t.length > 60) throw new Error('返回不像一句话');
      return { text: t, mode: 'llm' };
    });
  }

  /* 本地兜底：从模板库里按心情挑一句（同一天刷新不变） */
  function localNote(moodKey, seedStr) {
    var tpl = (global.UI && global.UI.NOTE_TPL) || [];
    if (!tpl.length) return { text: '今天不用特别棒，正常发挥就行。', mode: 'local' };
    var map = (global.UI && global.UI.NOTE_BY_MOOD) || {};
    var info = map[moodKey] || map.none || {};
    var cats = info.cats || ['搞怪', '随和'];
    var pool = [];
    cats.forEach(function (c) {
      tpl.forEach(function (g) { if (g.t === c) g.list.forEach(function (x) { pool.push(x); }); });
    });
    if (!pool.length) tpl.forEach(function (g) { g.list.forEach(function (x) { pool.push(x); }); });

    /* 用日期做种，保证同一天一直是同一句 */
    var h = 0, s = String(seedStr || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return { text: pool[h % pool.length], mode: 'local' };
  }

  /* ---------------- 本地「升格改写」----------------
     用孩子自己写的内容，补上他缺的要素，做出一个更高分的示范版本。
     原则：事情、人物、经过全是他自己的，只改表达、不替他编内容。 */
  /* 五感法的五个口子：改写法宝之一 */
  var SENSE_WORDS = {
    see: ['看到', '看见', '望', '瞧', '颜色', '红', '绿', '白', '亮', '闪', '圆', '样子', '像'],
    hear: ['听到', '听见', '说', '喊', '叫', '哭', '笑', '吵', '响', '声', '安静'],
    smell: ['闻', '香', '臭', '味道', '气味'],
    taste: ['尝', '甜', '酸', '苦', '辣', '好吃', '渴'],
    touch: ['摸', '碰', '软', '硬', '热', '冷', '凉', '烫', '滑', '粗糙']
  };
  var SENSE_NAME = { see: '看到的', hear: '听到的', smell: '闻到的', taste: '尝到的', touch: '摸到的' };
  /* 表示「说完/结果」的句子，排顺序时要放到最后 */
  var END_MARK = ['最后', '终于', '结果', '结束', '回家', '回到家', '后来'];
  var SEQ_LINK = ['接着', '然后', '后来', '最后'];

  function localPolish(text) {
    var t = String(text || '').replace(/\s+/g, '').trim();
    if (!t) return { rewrite: '', changes: [], methods: [], mode: 'local' };
    var changes = [], methods = [];
    var sents = (t.match(/[^。！？]+[。！？]?/g) || [t]).filter(function (x) { return String(x).trim(); });
    if (!sents.length) sents = [t];

    /* ① 梳理上下文：如果说结果的句子跑到了中间，把它挪到末尾 */
    if (sents.length > 2) {
      var mi = -1;
      for (var i = 0; i < sents.length - 1; i++) {
        var isEnd = false;
        END_MARK.forEach(function (w) { if (sents[i].indexOf(w) >= 0) isEnd = true; });
        if (isEnd) { mi = i; break; }
      }
      if (mi >= 0) {
        var mv = sents.splice(mi, 1)[0];
        sents.push(mv);
        changes.push('把说结果的那一句挪到了最后——先讲经过、再讲结果，读起来就顺了（梳理上下文）');
        methods.push('顺序梳理：把结果句挪到结尾');
      }
    }

    /* ② 时间 / 地点 */
    if (!has(t, TIME_WORDS) && !has(t, PLACE_WORDS)) {
      sents[0] = '今天，' + sents[0];
      changes.push('开头补了「今天」——读者马上知道是什么时候的事（补上「时间」要素）');
    }

    /* ③ 关联词：把散着的句子连成一段（先…接着…然后…最后） */
    if (countHits(sents.join(''), SEQ_WORDS).n < 1 && sents.length > 1) {
      for (var k = 1; k < sents.length; k++) {
        var link = k === sents.length - 1 ? '最后' : SEQ_LINK[(k - 1) % 3];
        sents[k] = link + '，' + sents[k].replace(/^[，、]/, '');
      }
      changes.push('给每句话加了「接着 / 然后 / 最后」——句子之间有了先后，不再是一句一句地摆着（加关联词）');
      methods.push('关联词：先…接着…然后…最后');
    }

    var out = sents.join('');

    /* ④ 五感法：缺哪一感，补一个「半成品」描写（不替他编情节，只补他能看到/听到的那一处） */
    var missS = [];
    Object.keys(SENSE_WORDS).forEach(function (k2) { if (!has(out, SENSE_WORDS[k2])) missS.push(k2); });
    if (missS.length >= 4) {
      out = out.replace(/[。！？]?$/, '') + '。直到现在，那天的样子和声音我还记得清清楚楚。';
      changes.push('结尾补了一句「看到的 + 听到的」——这就是五感法，读的人像自己也到了现场');
      methods.push('五感法·看到的/听到的：补了一句画面和声音');
    } else if (missS.length) {
      changes.push('还可以再补一处「' + missS.slice(0, 2).map(function (x) { return SENSE_NAME[x]; }).join('、') +
        '」——比如它是什么颜色、发出什么声音（五感法里还没用到的）');
    }

    /* ⑤ 心情感受 */
    if (countHits(out, FEEL_WORDS).n < 1) {
      out = out.replace(/[。！？]?$/, '') + '。我心里觉得暖暖的，一直到回家都还记得。';
      changes.push('结尾加了一句心里感受——文章有了温度（补上「感受」要素）');
    }

    /* ⑥ 把平淡的词换成更生动的说法 */
    var before = out;
    out = out.replace(/很高兴/g, '心里乐开了花')
      .replace(/很开心/g, '心里乐开了花')
      .replace(/很快地?跑/g, '飞快地跑')
      .replace(/很好看/g, '漂亮极了')
      .replace(/很多/g, '好多好多');
    if (out !== before) {
      changes.push('把「很高兴 / 很好看」这类大白话换成了更有画面的说法（好词好句）');
      methods.push('好词好句：平淡词换成有画面的说法');
    }

    return { rewrite: out, changes: changes, methods: methods, mode: 'local' };
  }

  var AI = {
    /* 自动悄悄话：返回 Promise<{text, mode}> —— 连不上 / 没配 Key 都自动退回本地 */
    autoNote: function (moodKey, kidName, cfg, seedStr) {
      cfg = cfg || {};
      if (cfg.enabled && cfg.apiKey) {
        return llmNote(moodKey, kidName || '孩子', cfg)['catch'](function () {
          return localNote(moodKey, seedStr);
        });
      }
      return Promise.resolve(localNote(moodKey, seedStr));
    },
    localNote: localNote,
    localPolish: localPolish,

    /* ---------- 升格改写：按孩子自己的短文，给一个更高分的示范 ---------- */
    polish: function (text, cfg) {
      cfg = cfg || {};
      if (!(cfg.enabled && cfg.apiKey)) return Promise.resolve(localPolish(text));
      var SYS = '你是小学语文老师，正在帮二年级男孩 Micky 修改他自己写的一段小短文。\n' +
        '总目标：把他本来想说的意思说得更完整、更通顺、更生动。\n\n' +
        '你可以做这些（按顺序来）：\n' +
        '1【梳理上下文】他写的句子顺序如果乱了（比如先说结果、后说开头），调整语句顺序，让事情按「先→接着→然后→最后」走。\n' +
        '2【加关联词】用「因为…所以…」「虽然…但是…」「一…就…」「先…接着…最后…」把散着的句子连成一段通顺的话。\n' +
        '3【补细节——只能在他自己说的基础上合理延伸】：\n' +
        '   · 五感法：他缺的那一两处补上——看到的（颜色、形状、样子）、听到的（什么声音、谁说了什么）、闻到的、尝到的、摸到的（软硬冷热）；\n' +
        '   · 好词好句：把「很高兴 / 很快 / 很好看」这类平淡词换成更有画面的说法，可以打比方；\n' +
        '   · 动作与对话：他提到的人和他当时在做什么、说了什么，补清楚。\n' +
        '4【收尾】补一句真实的心理感受。\n\n' +
        '铁律：不许编造新的情节、新的人物、新的结局；不许把他没做的事写成做了；' +
        '可以在他表述的基础上填充一点点相关的描写，但意思必须是他自己的。\n' +
        '改完仍然要像二年级孩子写的话（不要大人腔），长度控制在原文的 1.3～1.8 倍。\n' +
        '严格输出 JSON：{"rewrite":"改后的完整短文","changes":["改动1（说明为什么这样改更好）","改动2"],' +
        '"methods":["顺序梳理：把结果句挪到结尾","五感法·听到的：补了一句……","关联词：先…接着…最后"]}，不要多余文字。';
      var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
      return fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({
          model: cfg.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: SYS },
            { role: 'user', content: '这是他自己写的：\n' + text + '\n\n请改成更高分的版本。' }
          ],
          temperature: 0.7
        })
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var raw = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          var m = raw.match(/\{[\s\S]*\}/);
          if (!m) throw new Error('返回格式异常');
          var o = JSON.parse(m[0]);
          if (!o.rewrite) throw new Error('没有改写结果');
          return {
            rewrite: String(o.rewrite),
            changes: Array.isArray(o.changes) ? o.changes : [],
            methods: Array.isArray(o.methods) ? o.methods : [],
            mode: 'llm'
          };
        })['catch'](function () { return localPolish(text); });
    },

    /* ---------- 妈妈端「今日表扬」AI 润色 ---------- */
    praise: function (dayData, cfg) {
      var fixedDone = (dayData.fixed && dayData.fixed.list || []).filter(function (t) {
        return t.status === 'approved';
      }).map(function (t) { return t.title; });
      var SYS = '你是' + (cfg.kidName || 'Micky') + '的妈妈的朋友，很会夸孩子。孩子是个二年级、双鱼座、心思细、高敏感的男孩。\n' +
        '请基于孩子今天的真实完成情况，给妈妈写「可以直接说出口」的夸奖话。要求：\n' +
        '1）夸努力、夸看得见的具体行为，绝不夸「聪明/厉害」这类空词；\n' +
        '2）每句都要点到一个具体行为（如「你今天练字坐满了十分钟」「你今天把错题记下来了」）；\n' +
        '3）语气温暖、像妈妈平时说话，不搞怪、不煽情；\n' +
        '4）严格输出 JSON：{"lines":["夸奖1","夸奖2","夸奖3"],"tip":"一句给妈妈的话术提醒（怎么夸更有效）"}，不要多余文字。';
      var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
      return fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({
          model: cfg.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: SYS },
            { role: 'user', content: '今天数据：固定任务通过=' + JSON.stringify(fixedDone) +
              '；讲述=' + JSON.stringify(dayData.speech.map(function (x) { return x.score; })) +
              '；朗文题=' + JSON.stringify(dayData.quiz.map(function (x) { return (x.correct || 0) + '/' + (x.total || 0); })) +
              '；阅读=' + dayData.read.length + ' 次。请生成。' }
          ],
          temperature: 0.8
        })
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var raw = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          var m = raw.match(/\{[\s\S]*\}/);
          if (!m) throw new Error('返回格式异常');
          var o = JSON.parse(m[0]);
          return { lines: Array.isArray(o.lines) ? o.lines : [], tip: o.tip || '' };
        });
    },

    /* ---------- 妈妈端「本周成长周报」AI 润色 ---------- */
    weekly: function (weekData, cfg) {
      var SYS = '你是家庭教育观察者，文字温柔、理性又走心。孩子二年级、双鱼座、高敏感。\n' +
        '请基于本周理性数据，先如实总结，再写成「从数据到成长」的感性观察，最后给妈妈 3 条今晚怎么跟孩子聊的具体话术。\n' +
        '要求：不煽情、不夸大、不说教；话术要妈妈能直接照着说。\n' +
        '严格输出 JSON：{"rational":"理性数据总结一句话","grow":"感性成长观察一段","talk":["话术1","话术2","话术3"]}，不要多余文字。';
      var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
      return fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({
          model: cfg.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: SYS },
            { role: 'user', content: '本周数据：' + JSON.stringify({
              fullDays: weekData.fullDays, spCount: weekData.spCount, spAvg: weekData.spAvg,
              qPct: weekData.qPct, rdDays: weekData.rdDays, water: weekData.water
            }) + '。请生成周报。' }
          ],
          temperature: 0.85
        })
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var raw = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          var m = raw.match(/\{[\s\S]*\}/);
          if (!m) throw new Error('返回格式异常');
          var o = JSON.parse(m[0]);
          return { rational: o.rational || '', grow: o.grow || '', talk: Array.isArray(o.talk) ? o.talk : [] };
        });
    },


    /* 统一入口：返回 Promise */
    score: function (text, cfg) {
      cfg = cfg || {};
      if (cfg.enabled && cfg.apiKey) {
        return llmScore(text, cfg)['catch'](function (e) {
          var r = localScore(text);
          r.fallbackReason = (e && e.message) || 'AI 接口没连上';
          return r;
        });
      }
      return Promise.resolve(localScore(text));
    },
    localScore: localScore,
    LEX: LEX,
    rewardText: function (rec) {
      if (rec.score >= 90) return '超级棒！获得 5 滴水滴 + 2 阳光';
      if (rec.score >= 80) return '很厉害！获得 4 滴水滴 + 1 阳光';
      if (rec.score >= 70) return '不错哦！获得 3 滴水滴';
      if (rec.score >= 60) return '继续加油！获得 2 滴水滴';
      return '开口就很棒！获得 1 滴水滴';
    }
  };

  global.AI = AI;
})(window);
