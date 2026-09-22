/* ===========================================================
   speech.js —— 「今日讲述」引导式扩写教练（window.SpeechCoach）

   和旧版最大的不同：旧版是孩子自己写完一大段再打分；
   新版是 AI 像老师一样一轮问一个维度，孩子自己补，逐步把话说完整。

   三条硬规矩（改代码前先看这里）：
   1. **AI 绝不代写**：任何引导话术里都不能出现可以直接抄走的完整句子
      （不能说「你可以写：阳光明媚」），只能提问。
   2. **一轮只问一个维度**：一次塞五个问题孩子就烦了，而且高敏感孩子会被问崩。
   3. **随时能收尾**：「我说完了」按钮一直在，不逼他把所有维度答完。

   没配 API Key 时全部走本地规则，零成本也能用；配了才调大模型。
   =========================================================== */
(function (global) {
  'use strict';

  function UI() { return global.UI; }
  function S() { return global.Store; }

  /* ---------------- 维度定义 ----------------
     顺序是刻意安排的：先解决「一句大白话、没情节」，
     再补细节，最后才润色词句。别随便调顺序。 */
  var GUIDE = [
    {
      key: 'plot', label: '情节推进', icon: '🎬', max: 20,
      words: ['然后', '后来', '接着', '突然', '没想到', '忽然', '这时候', '结果', '最后', '终于', '正在', '刚要'],
      asks: [
        '然后呢？接着发生了什么？',
        '中间有没有一个小转折？比如「突然……」',
        '最后是怎么结束的？所以呢？'
      ],
      choices: ['后来有人来了', '出现了意外', '事情变好了', '我等了很久'],
      why: '现在还只是一句话，听的人不知道后来怎么样了。加一句「后来……」故事就动起来了。'
    },
    {
      key: 'focus', label: '重点', icon: '🎯', max: 15,
      /* 重点：有没有围绕一件事讲，而不是罗列一堆 */
      words: ['最', '特别', '印象', '记得', '难忘', '原来', '其实', '因为'],
      asks: [
        '今天发生了好几件事，你最想讲的是哪一件？',
        '这么多事情里，哪一个瞬间你到现在还记得？',
        '如果只能留下一句话，你最想让人记住什么？'
      ],
      choices: ['最好玩的那一会儿', '最紧张的那一会儿', '我印象最深的一句话'],
      why: '像记流水账一样什么都提一句，反而哪件都没讲清楚。挑一件最重要的事讲透。'
    },
    {
      key: 'see', label: '看到的', icon: '👀', max: 10,
      words: ['看到', '看见', '望', '瞧', '盯着', '颜色', '红', '绿', '白', '亮', '闪', '光', '圆', '大', '小', '高', '矮', '胖', '瘦', '样子', '像'],
      asks: [
        '你看到了什么？它是什么颜色、什么样子的？',
        '当时周围还有什么？挑一个说说',
        '那个东西长什么样？像什么？'
      ],
      choices: ['它的颜色', '它的大小和形状', '旁边还有什么东西', '天色/光线的样子'],
      why: '没有画面，听的人脑子里是空的。加一句你看到的东西，画面立刻就出来了。'
    },
    {
      key: 'hear', label: '听到的', icon: '👂', max: 8,
      words: ['听到', '听见', '说', '喊', '叫', '哭', '笑', '吵', '响', '声', '吵闹', '安静', '悄悄', '哗', '咚', '喵', '汪'],
      asks: [
        '你听到什么声音了？有人说话吗？说的什么？',
        '周围是吵还是安静？有没有什么声音让你记住了？',
        '当时有人喊你吗？或者你心里在说什么？'
      ],
      choices: ['有人喊我/叫我', '周围很吵', '安静得能听见什么', '我自己说了什么'],
      why: '加上声音，故事就像在放电影，而不是在看照片。'
    },
    {
      key: 'touch', label: '摸到·闻到·尝到', icon: '✋', max: 7,
      words: ['摸', '碰', '软', '硬', '热', '冷', '凉', '烫', '滑', '粗糙', '闻', '香', '臭', '味道', '尝', '甜', '酸', '苦', '辣', '好吃'],
      asks: [
        '你摸到什么了？是软的还是硬的、热的还是凉的？',
        '有没有闻到什么味道？或者尝到什么？',
        '手上、脸上有什么感觉？风吹着是什么感觉？'
      ],
      choices: ['摸起来是软的还是硬的', '热的还是凉的', '闻到的味道', '尝到的味道'],
      why: '写出摸到、闻到、尝到的，读的人就像自己也到了现场。'
    },
    {
      key: 'feel', label: '心情·感受', icon: '💗', max: 15,
      words: ['开心', '高兴', '难过', '生气', '害怕', '紧张', '激动', '不好意思', '委屈', '后悔', '惊喜', '感动', '喜欢', '讨厌', '担心', '心里', '觉得', '想', '希望'],
      /* ⚠️ 不要问「你为什么开心」—— 抽象问题二年级孩子答不上来。
         要问身体感受和画面：暖暖的？想跳？这类他才说得出来。 */
      asks: [
        '开心的时候，你身体哪里感觉到了？是心里暖暖的，还是想跳起来？',
        '如果把这个心情画出来，它是什么颜色的？',
        '当时你是笑了、叫了，还是想马上告诉别人？'
      ],
      choices: ['心里暖暖的', '想跳起来', '想马上告诉别人', '有点想哭', '心里像揣了只小兔子'],
      why: '没有心情的事，写出来就像天气预报。加上你的感受，别人才会被打动。'
    },
    {
      key: 'act', label: '动作·说话', icon: '🗣️', max: 10,
      words: ['跑', '跳', '走', '拿', '放', '抓', '推', '拉', '抱', '转', '笑', '哭', '喊', '说', '问', '答', '摆', '挥', '低头', '抬头', '跺'],
      asks: [
        '你当时做了什么动作？手和脚在干什么？',
        '你们说了什么话？原话是怎么说的？',
        '他（或你）脸上是什么表情？'
      ],
      choices: ['我的手在做什么', '我的脚在做什么', '我说了一句什么话', '我脸上的表情'],
      why: '把动作和对话写进去，人就活起来了，不是在「陈述一件事」。'
    },
    {
      key: 'word', label: '好词好句', icon: '✨', max: 15,
      /* 好词：形容词、成语、比喻、四字词 */
      words: ['像', '好像', '仿佛', '似的', '一样', '急得', '高兴得', '美滋滋', '乐呵呵', '飞快', '慢慢', '悄悄', '使劲', '连忙', '一眨眼', '不知不觉', '忍不住', '终于', '兴高采烈', '迫不及待', '目不转睛', '哈哈大笑', '气喘吁吁'],
      asks: [
        '有没有一个词能把那种感觉说得更准？比如不是「很快」，而是……',
        '能不能打个比方？它像什么？',
        '「很高兴」能换成什么更有画面的说法？'
      ],
      choices: ['把它比作一样东西', '换一个更有味道的词', '说出心里的那个想法'],
      why: '大白话能说清楚，但好词能让句子发光。试着把一两个词换得更有画面。'
    }
  ];

  /* 流水账：一堆「然后」串起来，或者「我先…再…最后…」报菜单 */
  var FLOW_WORDS = ['然后', '接着', '之后', '再', '又', '还', '最后', '先'];
  var GOOD_MARK = [
    '像', '好像', '仿佛', '似的', '一样',      /* 比喻 */
    '美滋滋', '乐呵呵', '兴高采烈', '目不转睛', '迫不及待', '哈哈大笑', '气喘吁吁', '忍不住', '不知不觉',
    '急得', '高兴得', '笑得', '难过', '感动', '惊喜'
  ];

  function has(text, words) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) >= 0) return words[i];
    }
    return null;
  }
  function len(t) {
    return String(t || '').replace(/\s/g, '').length;
  }
  function countHits(text, words) {
    var n = 0;
    words.forEach(function (w) {
      var p = 0, t = text;
      while ((p = t.indexOf(w, p)) >= 0) { n++; p += w.length; }
    });
    return n;
  }

  /* ---------------- 引导：下一轮问什么 ----------------
     asked 是已经问过的维度 key 数组，避免重复问同一个 */
  function nextGuide(text, asked) {
    asked = asked || [];
    for (var i = 0; i < GUIDE.length; i++) {
      var g = GUIDE[i];
      if (asked.indexOf(g.key) >= 0) continue;     /* 问过就不再问 */
      if (has(text, g.words)) continue;            /* 已经写到了就跳过 */
      var pi = (asked.length + i) % g.asks.length;
      return {
        key: g.key, label: g.label, icon: g.icon,
        ask: g.asks[pi], why: g.why,
        round: asked.length + 1
      };
    }
    return null;
  }

  /* 还有哪些维度没写到（给孩子看进度用） */
  function missing(text) {
    return GUIDE.filter(function (g) { return !has(text, g.words); });
  }
  function covered(text) {
    return GUIDE.filter(function (g) { return !!has(text, g.words); });
  }

  /* ---------------- 评分 V2 ---------------- */
  function scoreV2(text, origin) {
    text = text || '';
    origin = origin || '';
    var n = len(text);
    var dims = [], total = 0, comments = [], tips = [];

    if (n < 10) {
      return {
        score: Math.min(38, Math.round(n * 4)), mode: 'local', dims: [], tips: [],
        comments: ['你开口啦！再多说一点点，比如「在哪里」「和谁」，就会发现越来越好讲。'],
        good: []
      };
    }

    /* 1) 各维度 */
    GUIDE.forEach(function (g) {
      var hit = has(text, g.words);
      if (hit) {
        total += g.max;
        dims.push({ key: g.key, label: g.label, icon: g.icon, hit: true, word: hit, pts: g.max });
      } else {
        dims.push({ key: g.key, label: g.label, icon: g.icon, hit: false, pts: 0 });
        tips.push(g.icon + ' ' + g.why);
      }
    });

    /* 2) 基础分：开口就有 */
    total = Math.round(total * 0.8) + 20;

    /* 3) 流水账扣分：一堆「然后」串场 */
    var flow = countHits(text, FLOW_WORDS);
    if (flow >= 4 && n < 200) {
      total -= 8;
      /* 扣分类建议要排最前：后面 tips 只留 2 条，这类最该让他看到 */
      tips.unshift('🌊 「然后」有点多，像在报菜单。挑一件最重要的事讲透，其它一句带过就好。');
    } else if (flow >= 3) {
      total -= 4;
    }

    /* 4) 大白话扣分：太短撑不起一篇 */
    if (n < 40) {
      total = Math.min(total, 55);
      tips.unshift('📏 全篇太短了，像一句话日记。加一个细节（看到的或心里想的）就能撑起来。');
    }

    /* 5) 灌水检测：同样的字/词反复刷 */
    var pad = paddingScore(text);
    if (pad.ratio > 0.35) {
      total -= 10;
      tips.unshift('🫧 有一些话在重复说。同一件事说一次就够了，换个角度说点别的。');
    }

    /* 6) 扩写增量：真的补了东西才加分（防刷） */
    var grew = Math.max(0, n - len(origin));
    if (origin && grew >= 30) {
      total += 5;
      comments.push('你从最初的一句话，补到了 ' + n + ' 个字，这就是进步。');
    }

    total = Math.max(1, Math.min(100, Math.round(total)));

    /* 7) 鼓励性点评 */
    var hitN = dims.filter(function (d) { return d.hit; }).length;
    if (hitN >= 6) comments.unshift('太厉害了！' + hitN + ' 个方面你都写到了，读起来像在看一个小电影。');
    else if (hitN >= 4) comments.unshift('很不错！已经把事情讲清楚了，再加一两个细节就更生动。');
    else if (hitN >= 2) comments.unshift('你把这件事记下来了，这是最重要的一步。');
    else comments.unshift('你开口讲了一件今天的事，这就很棒，我们一点一点加料。');

    if (has(text, ['像', '好像', '仿佛', '似的'])) comments.push('你会打比方了，这个很高级！');
    if (has(text, GOOD_MARK)) comments.push('用上了好词，句子一下子亮起来了。');

    return {
      score: total, mode: 'local',
      dims: dims, comments: comments.slice(0, 3), tips: tips.slice(0, 3),
      good: pickGood(text),
      stat: { len: n, grew: grew, flow: flow, hit: hitN }
    };
  }

  /* 灌水比例：重复 2 字组占比 */
  function paddingScore(text) {
    var t = String(text || '').replace(/[\s，。！？、,.!?；;："'']/g, '');
    if (t.length < 20) return { ratio: 0 };
    var seen = {}, rep = 0, pairs = 0;
    for (var i = 0; i < t.length - 1; i++) {
      var p = t.substr(i, 2);
      pairs++;
      if (seen[p]) rep++; else seen[p] = 1;
    }
    return { ratio: pairs ? rep / pairs : 0 };
  }

  /* 挑出写得好的句子（给素材库用） */
  function pickGood(text) {
    var out = [];
    String(text || '').split(/[。！？\n！？]/).forEach(function (s) {
      s = s.trim();
      if (s.length < 8 || s.length > 60) return;
      var score = 0;
      if (has(s, ['像', '好像', '仿佛', '似的', '一样'])) score += 3;   /* 比喻 */
      if (has(s, GOOD_MARK)) score += 2;
      if (has(s, ['心里', '觉得', '想', '感受到'])) score += 2;         /* 心理 */
      if (len(s) >= 20) score += 1;
      if (score >= 3) out.push({ text: s, score: score, why: goodWhy(s) });
    });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
  }

  function goodWhy(s) {
    if (has(s, ['像', '好像', '仿佛', '似的', '一样'])) return '这句打了个比方，画面一下子就有了';
    if (has(s, ['心里', '觉得', '感受到'])) return '这句写出了心里的感受，很难得';
    if (has(s, GOOD_MARK)) return '这句用了好词，读起来很有味道';
    return '这句写得很具体';
  }

  /* ---------------- 大模型版本（配了 Key 才走） ---------------- */
  function llmGuide(text, asked, kidName, cfg) {
    var g = nextGuide(text, asked);
    var want = g ? g.label : '';
    var SYS = '你是一位小学语文老师，正在辅导二年级男孩' + (kidName || '孩子') + '把一件事说完整。\n' +
      '铁律：你只能提问，**绝对不能替他写出任何句子**，不能给范文、不能给开头、不能说「你可以写……」。\n' +
      '一次只问一个方面，问得具体、口语化，像老师在课堂上随口问他一句。\n' +
      '现在这一轮要引导他补充的是：' + want + '。\n' +
      '只输出这一句问话，不要解释、不要加标点以外的内容，30 字以内。';
    var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: '他现在写的是：\n' + text + '\n\n问他一句，引导他补充「' + want + '」。' }
        ],
        temperature: 0.9
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var t = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      t = String(t).trim().split('\n')[0].trim();
      /* AI 越界给了范文就直接丢弃，退回本地那句 */
      if (!t || t.length > 40 || /你可以写|比如：|例如：|范文/.test(t)) throw new Error('越界');
      if (!g) throw new Error('没有要问的了');
      return { key: g.key, label: g.label, icon: g.icon, ask: t, why: g.why, round: (asked || []).length + 1, mode: 'llm' };
    });
  }

  function llmScoreV2(text, origin, kidName, cfg) {
    var SYS = '你是一位温柔、会鼓励人的小学语文老师，正在给二年级男孩' + (kidName || '孩子') + '点评一段话。\n' +
      '打分看五个方面：内容完整度、重点是否突出（有没有记流水账）、情节有没有推进、细节（看到的听到的闻到的摸到的）、好词好句。\n' +
      '重点扣分：如果只是把「然后…然后…」串起来报菜单，或者一句大白话就当一篇，要指出来。\n' +
      '要求：先肯定（具体说他做到了什么），再给 1-2 条马上能试的建议（用「如果……就更棒了」的说法，绝不批评）。\n' +
      '严格按 JSON 输出，不要多余文字：' +
      '{"score":0-100整数,"comments":["优点1","优点2"],"tips":["建议1","建议2"]}';
    var base = (cfg.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: '他最初只写了：\n' + (origin || '（无）') + '\n\n补充后写的是：\n' + text + '\n\n请点评打分。' }
        ],
        temperature: 0.7
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var raw = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      var m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('格式异常');
      var o = JSON.parse(m[0]);
      return {
        score: Math.max(0, Math.min(100, Math.round(+o.score || 60))),
        mode: 'llm',
        dims: covered(text).map(function (g) { return { key: g.key, label: g.label, icon: g.icon, hit: true, pts: g.max }; }),
        comments: Array.isArray(o.comments) ? o.comments : [],
        tips: Array.isArray(o.tips) ? o.tips : [],
        good: pickGood(text)
      };
    });
  }

  /* ---------------- 好词好句库（按维度给，孩子点一下就能用） ----------------
     给的是「半成品句式」，孩子要自己把内容填进去，不是替他写。 */
  var PHRASES = {
    plot: ['先……然后……最后……', '突然', '过了一会儿', '没想到', '后来'],
    focus: ['最让我难忘的是', '最有趣的地方是', '我印象最深的是'],
    see: ['红彤彤的', '绿油油的', '亮晶晶的', '圆圆的', '大大的', '五颜六色'],
    hear: ['叮叮当当', '哗啦啦', '沙沙地响', '叽叽喳喳', '砰的一声'],
    touch: ['软软的', '凉凉的', '暖暖的', '毛茸茸的', '滑溜溜的'],
    feel: ['我心里暖暖的', '我又惊又喜', '我有点不好意思', '我特别开心', '我感动极了'],
    act: ['我连忙跑过去', '我小声地说', '他笑着说', '我们一起来'],
    word: ['像……一样', '一会儿……一会儿……', '有的……有的……', '一边……一边……']
  };

  /* 口语整理：去掉口癖、去掉重复、补上结尾标点。
     专门针对「说话打绊、来回重复」的情况。 */
  function tidyText(text) {
    var t = String(text || '').trim();
    if (!t) return '';
    /* 口癖 / 无意义词 */
    t = t.replace(/(那个|嗯+|啊+|呃+|额+|然后(?=然后)|就是(?=就是))/g, '');
    /* 连续重复的词组（2~8 个字重复两次以上 → 只留一次） */
    t = t.replace(/([\u4e00-\u9fa5]{2,8})\1+/g, '$1');
    /* 重复标点 */
    t = t.replace(/([，。！？、；])\1+/g, '$1');
    /* 多余空白 */
    t = t.replace(/\s{2,}/g, '');
    /* 太长的句子没有结尾标点 → 补一个句号 */
    if (t.length > 12 && !/[。！？]$/.test(t)) t += '。';
    return t.trim();
  }

  var SpeechCoach = {
    GUIDE: GUIDE,
    PHRASES: PHRASES,
    tidyText: tidyText,
    phrasesFor: function (key) { return PHRASES[key] || PHRASES.word; },
    nextGuide: nextGuide,
    missing: missing,
    covered: covered,
    scoreV2: scoreV2,
    pickGood: pickGood,
    paddingScore: paddingScore,
    has: has,
    len: len,

    /* 统一入口：返回 Promise，连不上 / 没配 Key 自动退回本地 */
    guide: function (text, asked, kidName, cfg) {
      cfg = cfg || {};
      if (cfg.enabled && cfg.apiKey) {
        return llmGuide(text, asked, kidName, cfg)['catch'](function () {
          var g = nextGuide(text, asked);
          return g ? g : null;
        });
      }
      return Promise.resolve(nextGuide(text, asked));
    },

    score: function (text, origin, kidName, cfg) {
      cfg = cfg || {};
      if (cfg.enabled && cfg.apiKey) {
        return llmScoreV2(text, origin, kidName, cfg)['catch'](function () {
          return scoreV2(text, origin);
        });
      }
      return Promise.resolve(scoreV2(text, origin));
    }
  };

  global.SpeechCoach = SpeechCoach;
})(window);
