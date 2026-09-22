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
