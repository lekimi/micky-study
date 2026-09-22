/* ===========================================================
   wordbook.js —— 英语查词 · 我的单词本 · 错题本（window.WordBook）
   设计原则（高敏感孩子友好）：
     · 查词是「我想知道」，不强制、不发水滴
     · 考察只考自己加进单词本的词，题目不会超纲
     · 答错零成本：只记进错题本、熟练度降一级，不扣任何东西
     · 错题本是「下次再练一次」的地方，不是「你错了」的清单
   =========================================================== */
(function (global) {
  'use strict';

  function UI() { return global.UI; }
  function S() { return global.Store; }
  function E() { return global.Engine; }

  var DAILY_QUIZ = 8;        /* 一次考察几题 */
  var WRONG_STEP = 1;        /* 熟练度升降步长 */

  /* ---------------- 数据 ---------------- */
  function st() { return S().state; }

  function dict() { return global.WORDS2A || { list: [], cats: [] }; }

  function wb() {
    var s = st();
    if (!Array.isArray(s.wordbook)) s.wordbook = [];
    return s.wordbook;
  }
  function wbk() {
    var s = st();
    if (!Array.isArray(s.wrongBook)) s.wrongBook = [];
    return s.wrongBook;
  }

  /* 不规则变形 → 原形。孩子读到的往往是 went / children / better 这种，
     规则还原搞不定，所以单独列一张小表（覆盖二年级最常遇到的那些） */
  var IRREG = {
    am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be',
    went: 'go', goes: 'go', saw: 'see', sees: 'see', ate: 'eat', eats: 'eat',
    ran: 'run', came: 'come', did: 'do', does: 'do', made: 'make', got: 'get',
    had: 'have', has: 'have', gave: 'give', took: 'take', said: 'say', says: 'say',
    told: 'tell', found: 'find', knew: 'know', thought: 'think', wrote: 'write',
    read: 'read', sang: 'sing', swam: 'swim', sat: 'sit', stood: 'stand',
    children: 'child', feet: 'foot', teeth: 'tooth', mice: 'mouse', men: 'man',
    women: 'woman', people: 'person', babies: 'baby', boys: 'boy', girls: 'girl',
    better: 'good', best: 'good', worse: 'bad', worst: 'bad',
    more: 'many', most: 'many', less: 'little', bigger: 'big', smaller: 'small',
    longer: 'long', shorter: 'short', taller: 'tall', hotter: 'hot', colder: 'cold',
    happier: 'happy', unhappier: 'sad', easier: 'easy', busier: 'busy',
    nicer: 'nice', older: 'old', newer: 'new', younger: 'young',
    better2: 'good', worse2: 'bad',
    leaves: 'leaf', knives: 'knife', wolves: 'wolf', shelves: 'shelf',
    potatoes: 'potato', tomatoes: 'tomato', boxes: 'box', buses: 'bus',
    babies2: 'baby', oranges: 'orange', fish: 'fish', sheep: 'sheep'
  };

  /* ---------------- 查词 ---------------- */
  /* 返回 {hit:'exact'|'part', list:[...]} —— 谁在查，就给他结果，不教育 */
  function search(kw) {
    var q = String(kw || '').trim().toLowerCase();
    if (!q) return { hit: 'none', list: [] };
    var all = dict().list;

    var exact = all.filter(function (w) { return String(w.en).toLowerCase() === q; });
    if (exact.length) return { hit: 'exact', list: exact };

    /* 不规则变形先查表 */
    if (IRREG[q]) {
      var base0 = IRREG[q];
      var hit0 = all.filter(function (w) { return String(w.en).toLowerCase() === base0; });
      if (hit0.length) return { hit: 'exact', list: hit0, base: base0, from: q };
    }

    /* 规则变形：books → book，running → run，studied → study */
    var tries = [q];
    if (/ied$/.test(q)) tries.push(q.replace(/ied$/, 'y'));
    if (/ies$/.test(q)) tries.push(q.replace(/ies$/, 'y'));
    if (/es$/.test(q)) tries.push(q.replace(/es$/, ''));
    if (/s$/.test(q)) tries.push(q.replace(/s$/, ''));
    /* running → run / stopping → stop：去掉 -ing 后还要消掉双写辅音 */
    if (/ing$/.test(q)) {
      var g1 = q.replace(/ing$/, '');
      tries.push(g1, g1.replace(/([bdgklmnprt])\1$/, '$1'), g1 + 'e');
    }
    if (/ed$/.test(q)) {
      var e1 = q.replace(/ed$/, '');
      tries.push(e1, e1.replace(/([bdgklmnprt])\1$/, '$1'), e1 + 'e');
    }
    for (var i = 0; i < tries.length; i++) {
      var t = tries[i];
      if (t.length < 2) continue;
      var m = all.filter(function (w) { return String(w.en).toLowerCase() === t; });
      if (m.length) return { hit: 'exact', list: m, base: t };
    }

    /* 前缀 / 包含 */
    var part = all.filter(function (w) {
      return String(w.en).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
    if (part.length) return { hit: 'part', list: part };
    return { hit: 'none', list: [] };
  }

  /* ---------------- 单词本 ---------------- */
  function has(en) {
    var k = String(en).toLowerCase();
    return wb().filter(function (x) { return String(x.en).toLowerCase() === k; })[0] || null;
  }
  function add(en) {
    var w = has(en);
    if (w) return { ok: false, dup: true, word: w };
    var src = search(en);
    var info = (src.list && src.list[0]) || { en: String(en), zh: '（还没查到意思）', cat: '自加' };
    var rec = {
      id: S().uid(), en: info.en, zh: info.zh, cat: info.cat || '自加',
      at: Date.now(), box: 1, right: 0, wrong: 0, lastAt: null
    };
    wb().push(rec);
    S().save();
    return { ok: true, word: rec };
  }
  function del(id) {
    var s = st();
    s.wordbook = wb().filter(function (x) { return x.id !== id; });
    S().save();
  }
  function mine() {
    return wb().slice().sort(function (a, b) {
      if (a.box !== b.box) return a.box - b.box;      /* 不熟的排前面 */
      return b.at - a.at;
    });
  }

  /* ---------------- 错题本（通用，各科目都能往里放） ---------------- */
  function wrongAdd(rec) {
    var arr = wbk();
    var key = (rec.kind || 'word') + '|' + (rec.q || '');
    var old = arr.filter(function (x) { return ((x.kind || 'word') + '|' + x.q) === key; })[0];
    if (old) {
      old.times = (old.times || 1) + 1;
      old.at = Date.now();
      old.your = rec.your; old.right = rec.right;
    } else {
      arr.push({
        id: S().uid(), kind: rec.kind || 'word',
        q: rec.q, your: rec.your, right: rec.right,
        note: rec.note || '', at: Date.now(), times: 1
      });
    }
    S().save();
  }
  function wrongList() {
    return wbk().slice().sort(function (a, b) { return (b.times || 1) - (a.times || 1) || b.at - a.at; });
  }
  function wrongDel(id) {
    var s = st();
    s.wrongBook = wbk().filter(function (x) { return x.id !== id; });
    S().save();
  }
  function wrongClear() {
    st().wrongBook = [];
    S().save();
  }
  /* 某个词答对了，把它的错题从本子上撤掉（「会了」就该消失） */
  function wrongResolve(q) {
    var s = st();
    s.wrongBook = wbk().filter(function (x) { return x.q !== q; });
    S().save();
  }

  /* ---------------- 出题 ---------------- */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 干扰项：优先同类别（老师/医生/护士放一起才有区分度） */
  function distractors(word, n) {
    var all = dict().list;
    var same = all.filter(function (x) {
      return x.cat === word.cat && String(x.zh) !== String(word.zh);
    });
    var pool = same.length >= n ? same : same.concat(all.filter(function (x) {
      return x.cat !== word.cat && String(x.zh) !== String(word.zh);
    }));
    var seen = {}, out = [];
    shuffle(pool).forEach(function (x) {
      if (out.length >= n) return;
      if (seen[x.zh]) return;
      if (String(x.zh) === String(word.zh)) return;
      seen[x.zh] = 1;
      out.push(x);
    });
    return out;
  }

  /* 组一套题：从单词本按熟练度出，错题本里的词优先再考一次 */
  function buildQuiz(n) {
    n = n || DAILY_QUIZ;
    var book = mine();
    if (!book.length) return [];

    var wrongWords = {};
    wbk().forEach(function (x) { if (x.kind === 'word') wrongWords[x.q] = 1; });

    /* 错题优先 → 再不熟的优先 */
    var ordered = book.slice().sort(function (a, b) {
      var wa = wrongWords[a.en] ? 0 : 1, wb2 = wrongWords[b.en] ? 0 : 1;
      if (wa !== wb2) return wa - wb2;
      return a.box - b.box;
    });

    var picked = ordered.slice(0, Math.min(n, ordered.length));
    return picked.map(function (w, i) {
      /* 交替题型：偶数看英文选中文，奇数看中文选英文 */
      var askEn = (i % 2 === 0);
      var ds = distractors(w, 3);
      var opts, ans;
      if (askEn) {
        ans = w.zh;
        opts = shuffle([w.zh].concat(ds.map(function (x) { return x.zh; })));
      } else {
        ans = w.en;
        opts = shuffle([w.en].concat(ds.map(function (x) { return x.en; })));
      }
      return {
        id: w.id, en: w.en, zh: w.zh, cat: w.cat,
        askEn: askEn,
        q: askEn ? w.en : w.zh,
        ans: ans, opts: opts,
        tip: askEn ? '这个单词是什么意思？' : '哪个单词是这个意思？'
      };
    });
  }

  /* 判一道题，返回 {ok, right} */
  function judge(q, pick) {
    var ok = String(pick) === String(q.ans);
    var w = null;
    wb().forEach(function (x) { if (x.id === q.id) w = x; });
    if (w) {
      w.lastAt = Date.now();
      if (ok) {
        w.right = (w.right || 0) + 1;
        w.box = Math.min(3, (w.box || 1) + WRONG_STEP);
        wrongResolve(w.en);           /* 会了就从错题本撤掉 */
      } else {
        w.wrong = (w.wrong || 0) + 1;
        w.box = Math.max(1, (w.box || 1) - WRONG_STEP);
        wrongAdd({
          kind: 'word', q: w.en, your: String(pick), right: String(q.ans),
          note: w.en + ' = ' + w.zh
        });
      }
    }
    S().save();
    return { ok: ok, word: w };
  }

  /* ---------------- 朗读（英文） ---------------- */
  function say(text) {
    try {
      if (!global.speechSynthesis) { UI().toast('这个浏览器不能朗读'); return; }
      global.speechSynthesis.cancel();
      var ut = new global.SpeechSynthesisUtterance(String(text));
      ut.lang = 'en-US';
      ut.rate = 0.8;
      global.speechSynthesis.speak(ut);
    } catch (e) { UI().toast('朗读失败了'); }
  }

  /* ---------------- 界面 ---------------- */
  var BRIGHT = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐' };

  function searchResultHtml(res, kw) {
    if (res.hit === 'none') {
      return '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:12px;margin-top:8px">' +
        '<div style="font-weight:900;color:#5C4322">词库里没找到「' + UI().esc(kw) + '」</div>' +
        '<div class="muted" style="margin-top:4px">看看是不是拼错了？也可以先问老师，回来再加进单词本。</div>' +
        '</div>';
    }
    var rows = res.list.map(function (w) {
      var inBook = has(w.en);
      return '<div style="background:#FFFDF4;border:2px solid #EFDDB8;border-radius:14px;padding:12px;margin-top:8px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:24px;font-weight:900;color:#2E7CA8;line-height:1.3">' + UI().esc(w.en) + '</div>' +
        '<div style="font-size:18px;font-weight:900;color:#5C4322;margin-top:2px">' + UI().esc(w.zh) + '</div>' +
        '<div><span class="task-tag">' + UI().esc(w.cat) + '</span></div>' +
        '</div>' +
        '<button class="btn btn-lav" style="width:auto;min-height:52px;padding:8px 14px;font-size:14px" ' +
        'data-act="wbSay" data-v="' + UI().esc(w.en) + '">🔊</button>' +
        '</div>' +
        (inBook
          ? '<div style="margin-top:8px;font-weight:900;color:#2F6B3A">✅ 已经在你的单词本里（' + (BRIGHT[inBook.box] || '⭐') + '）</div>'
          : '<button class="btn btn-green mt8" data-act="wbAdd" data-v="' + UI().esc(w.en) + '">+ 加进我的单词本</button>') +
        '</div>';
    }).join('');
    var head = res.hit === 'part'
      ? '<div class="muted" style="margin-top:8px">没有一模一样的，这几个有点像：</div>'
      : '';
    return head + rows;
  }

  /* 主面板：挂在英语页「今日任务」下面 */
  function panel() {
    var s = st();
    var book = mine();
    var wrongs = wrongList();
    var kw = WordBook.kw || '';

    var inputHtml = '<div style="display:flex;gap:8px">' +
      '<input class="field" id="wb-input" placeholder="打一个英文单词，比如 teacher" value="' + UI().esc(kw) + '" style="flex:1;text-align:left">' +
      '<button class="btn btn-green" style="width:auto;min-height:52px;padding:10px 18px" data-act="wbSearch">查一查</button>' +
      '</div>';

    var resultHtml = '';
    if (WordBook.result && kw) resultHtml = searchResultHtml(WordBook.result, kw);

    var bookHtml = book.length
      ? book.map(function (w) {
        return '<div class="task-card" style="margin-bottom:8px">' +
          '<div class="task-emoji">' + (BRIGHT[w.box] || '⭐') + '</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div class="task-title">' + UI().esc(w.en) + ' <span style="font-size:14px;color:#5C4322">' + UI().esc(w.zh) + '</span></div>' +
          '<div><span class="task-tag">' + UI().esc(w.cat) + '</span>' +
          '<span class="task-tag ok">对 ' + (w.right || 0) + '</span>' +
          ((w.wrong || 0) ? '<span class="task-tag" style="background:#FFE3E3;color:#A8435B">错 ' + w.wrong + '</span>' : '') +
          '</div></div>' +
          '<button class="pill-btn pill-lav" style="min-height:52px" data-act="wbSay" data-v="' + UI().esc(w.en) + '">🔊</button>' +
          '<button class="pill-btn pill-no" style="min-height:52px" data-act="wbDel" data-v="' + w.id + '">×</button>' +
          '</div>';
      }).join('')
      : '<div class="empty">单词本还是空的。查一个词，点「加进我的单词本」就存进来了。</div>';

    var quizHtml = book.length
      ? '<button class="btn btn-lav mt12" data-act="wbStart">✏️ 考一考我的单词（' + Math.min(DAILY_QUIZ, book.length) + ' 题）</button>'
      : '';

    var wrongHtml = '<div class="card mt12" style="background:#FFF6F2;border:2px solid #F0C7AE">' +
      '<div class="sec-title" style="font-size:15px">📕 错题本（' + wrongs.length + '）</div>' +
      '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
      '答错的词会自动进来，答对了自动出去。这不是「你错了」的清单，是「下次再练一次」的地方。' +
      '</div>' +
      (wrongs.length
        ? wrongs.slice(0, 10).map(function (x) {
          return '<div class="task-card" style="margin-bottom:8px">' +
            '<div class="task-emoji">📕</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div class="task-title">' + UI().esc(x.note || x.q) + '</div>' +
            '<div><span class="task-tag">你把 ' + UI().esc(x.your || '（没选）') + ' 当成了它</span>' +
            ((x.times || 1) > 1 ? '<span class="task-tag wait">错了 ' + x.times + ' 次</span>' : '') +
            '</div></div>' +
            '<button class="pill-btn pill-lav" style="min-height:52px" data-act="wbSay" data-v="' + UI().esc(x.q) + '">🔊</button>' +
            '<button class="pill-btn pill-no" style="min-height:52px" data-act="wbWrongDel" data-v="' + x.id + '">×</button>' +
            '</div>';
        }).join('')
        : '<div class="empty">还没有错题。就算有了也没关系 —— 错的词才是要重点记的词。</div>') +
      (wrongs.length ? '<button class="btn btn-green mt8" data-act="wbWrongStart">📕 把错题再练一遍</button>' : '') +
      (wrongs.length ? '<button class="btn btn-ghost mt8" data-act="wbWrongClear">清空错题本</button>' : '') +
      '</div>';

    return '<div class="card mt12" style="background:#F7FBFF;border:2px solid #C9E0F5">' +
      '<div class="sec-title">🔍 查单词 · 📒 我的单词本</div>' +
      '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
      '看到不认识的单词，查一下就知道意思。想记住的加进单词本，以后会拿出来考你。' +
      '</div>' +
      inputHtml + resultHtml +
      '<div class="sec-title" style="font-size:15px;margin-top:14px">📒 我的单词本（' + book.length + '）</div>' +
      '<div style="margin-top:8px">' + bookHtml + '</div>' +
      quizHtml +
      '</div>' + wrongHtml;
  }

  /* 答题界面 */
  function quizPanel() {
    var Q = WordBook.quiz;
    if (!Q || !Q.list.length) return '';
    var q = Q.list[Q.idx];
    if (!q) return '';

    var picked = Q.picks[Q.idx];
    var answered = picked !== undefined;

    var opts = q.opts.map(function (o, i) {
      var isPick = picked === i;
      var isRight = String(o) === String(q.ans);
      var bg = '#FFF8E4', bd = '#EFDDB8', fg = '#5C4322';
      if (answered) {
        if (isRight) { bg = '#E9F7E9'; bd = '#B7DFB7'; fg = '#2F6B3A'; }
        else if (isPick) { bg = '#FFE9E9'; bd = '#F0B7B7'; fg = '#A8435B'; }
      } else if (isPick) { bg = '#EAF3FB'; bd = '#B5D4F4'; fg = '#185FA5'; }
      return '<button class="btn" style="width:100%;min-height:56px;background:' + bg + ';border:3px solid ' + bd +
        ';color:' + fg + ';font-size:' + (String(o).length > 10 ? '16px' : '22px') + ';font-weight:900;margin-bottom:8px" ' +
        'data-act="wbPick" data-v="' + i + '"' + (answered ? '' : '') + '>' + UI().esc(o) + '</button>';
    }).join('');

    var fb = '';
    if (answered) {
      var okOne = String(q.opts[picked]) === String(q.ans);
      fb = okOne
        ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:14px;padding:12px;margin:8px 0;font-weight:900;color:#2F6B3A">' +
        '✅ 答对啦！' + UI().esc(q.en) + ' = ' + UI().esc(q.zh) + '</div>'
        : '<div style="background:#FFF6F2;border:2px solid #F0C7AE;border-radius:14px;padding:12px;margin:8px 0">' +
        '<div style="font-weight:900;color:#A8435B">这次没对上，不扣任何东西。</div>' +
        '<div style="font-weight:900;color:#5C4322;margin-top:6px">' + UI().esc(q.en) + ' = ' + UI().esc(q.zh) + '</div>' +
        '<div class="muted" style="margin-top:4px">已经记进错题本了，下次还会考你这个。</div></div>';
    }

    return '<div class="card mt12" style="background:#FFFDF4;border:2px solid #EFDDB8">' +
      '<div class="sec-title">✏️ 单词考察 · 第 ' + (Q.idx + 1) + ' / ' + Q.list.length + ' 题' +
      (Q.mode === 'wrong' ? '（错题重练）' : '') + '</div>' +
      '<div style="height:10px;border-radius:6px;background:#EADFC0;overflow:hidden;margin:8px 0">' +
      '<div style="height:100%;width:' + Math.round((Q.idx / Q.list.length) * 100) + '%;background:#5BA82B"></div></div>' +
      '<div class="muted">' + UI().esc(q.tip) + '</div>' +
      '<div style="text-align:center;padding:14px 0 6px">' +
      '<div style="font-size:' + (q.askEn ? '44px' : '34px') + ';font-weight:900;color:#2E7CA8;line-height:1.2">' +
      UI().esc(q.q) + '</div>' +
      (q.askEn ? '<button class="btn btn-ghost" style="width:auto;min-height:52px;padding:8px 16px;margin-top:8px" ' +
        'data-act="wbSay" data-v="' + UI().esc(q.en) + '">🔊 听一下</button>' : '') +
      '</div>' +
      opts + fb +
      (answered
        ? '<button class="btn btn-green mt8" data-act="wbNext">' +
        (Q.idx + 1 >= Q.list.length ? '看结果' : '下一题 →') + '</button>'
        : '') +
      '<button class="btn btn-ghost mt8" data-act="wbQuit">先不考了</button>' +
      '</div>';
  }

  /* ---------------- 动作 ---------------- */
  function start(mode) {
    var list;
    if (mode === 'wrong') {
      var ws = wrongList().filter(function (x) { return x.kind === 'word'; });
      var seen = {};
      list = [];
      ws.forEach(function (x) {
        if (seen[x.q]) return;
        seen[x.q] = 1;
        var w = has(x.q);
        if (w) list.push(w);
      });
      list = list.slice(0, DAILY_QUIZ);
      var qs = buildQuizFrom(list);
      if (!qs.length) { UI().toast('错题本里的词都已经不在单词本啦'); return false; }
      WordBook.quiz = { mode: 'wrong', list: qs, idx: 0, picks: {} };
    } else {
      var qs2 = buildQuiz(DAILY_QUIZ);
      if (!qs2.length) { UI().toast('先去单词本加几个词吧'); return false; }
      WordBook.quiz = { mode: 'normal', list: qs2, idx: 0, picks: {} };
    }
    return true;
  }

  /* 指定词表出题（错题重练用） */
  function buildQuizFrom(words) {
    return words.map(function (w, i) {
      var askEn = (i % 2 === 0);
      var ds = distractors(w, 3);
      var ans = askEn ? w.zh : w.en;
      var opts = askEn
        ? shuffle([w.zh].concat(ds.map(function (x) { return x.zh; })))
        : shuffle([w.en].concat(ds.map(function (x) { return x.en; })));
      return {
        id: w.id, en: w.en, zh: w.zh, cat: w.cat, askEn: askEn,
        q: askEn ? w.en : w.zh, ans: ans, opts: opts,
        tip: askEn ? '这个单词是什么意思？' : '哪个单词是这个意思？'
      };
    });
  }

  function act(name, v) {
    if (name === 'wbSearch') {
      var el = document.getElementById('wb-input');
      var kw = el ? String(el.value || '').trim() : '';
      WordBook.kw = kw;
      WordBook.result = search(kw);
      if (!kw) UI().toast('先打一个单词');
      return true;
    }
    if (name === 'wbAdd') {
      var r = add(v);
      if (r.ok) UI().toast('加进单词本啦 📒');
      else if (r.dup) UI().toast('这个词已经在单词本里了');
      return true;
    }
    if (name === 'wbDel') { del(v); UI().toast('拿掉了'); return true; }
    if (name === 'wbSay') { say(v); return false; }
    if (name === 'wbStart') return start('normal');
    if (name === 'wbWrongStart') return start('wrong');
    if (name === 'wbWrongDel') { wrongDel(v); return true; }
    if (name === 'wbWrongClear') {
      UI().confirm('清空错题本？', '清掉之后这些词不会被特别拿出来重练，但单词本里的词还在。', function () {
        wrongClear(); UI().toast('清空啦'); if (global.App) global.App.render();
      }, '清空');
      return false;
    }
    if (name === 'wbPick') {
      var Q = WordBook.quiz;
      if (!Q) return false;
      if (Q.picks[Q.idx] !== undefined) return false;   /* 一题只判一次 */
      var q = Q.list[Q.idx];
      var pi = parseInt(v, 10);
      if (isNaN(pi) || pi < 0 || pi >= q.opts.length) return false;
      Q.picks[Q.idx] = pi;
      judge(q, q.opts[pi]);
      return true;
    }
    if (name === 'wbNext') {
      var Q2 = WordBook.quiz;
      if (!Q2) return false;
      if (Q2.idx + 1 >= Q2.list.length) {
        var okN = 0;
        Q2.list.forEach(function (q, i) {
          var p = Q2.picks[i];
          if (p !== undefined && String(q.opts[p]) === String(q.ans)) okN++;
        });
        var tot = Q2.list.length;
        WordBook.quiz = null;
        UI().modal({
          emoji: okN === tot ? '🎉' : '🌻',
          title: '做完啦：' + okN + ' / ' + tot,
          text: okN === tot
            ? '全对！这几个词你已经拿下了。'
            : '答错的已经记进错题本，下次会再来考你一次。错一次不扣什么，就是多练一遍而已。',
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); if (global.App) global.App.afterChange(); } }]
        });
        return false;
      }
      Q2.idx++;
      return true;
    }
    if (name === 'wbQuit') { WordBook.quiz = null; return true; }
    return false;
  }

  var WordBook = {
    dict: dict,
    search: search,
    has: has,
    add: add,
    del: del,
    mine: mine,
    wrongAdd: wrongAdd,
    wrongList: wrongList,
    wrongDel: wrongDel,
    wrongClear: wrongClear,
    wrongResolve: wrongResolve,
    buildQuiz: buildQuiz,
    buildQuizFrom: buildQuizFrom,
    judge: judge,
    say: say,
    panel: panel,
    quizPanel: quizPanel,
    start: start,
    act: act,
    kw: '',
    result: null,
    quiz: null,
    DAILY_QUIZ: DAILY_QUIZ
  };

  global.WordBook = WordBook;
})(window);
