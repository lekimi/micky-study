/* ===========================================================
   coach.js —— 妈妈端「表扬教练」：今日怎么夸 + 本周成长周报
   思路（儿童心理学 / 成长型思维）：
   - 夸「努力」和「看得见的具体行为」，不夸「聪明」；
   - 根据孩子当天真实完成情况，给妈妈能直接说的话；
   - 每周把理性数据（做了几天、分多少、正确率）翻译成感性成长观察，
     再给 3 条「今晚怎么跟他聊」的具体话术。
   - 离线用本地模板就够用；妈妈填了 AI Key 时，Coach 会用 AI 再润色（更贴口气）。
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store, E = global.Engine;

  /* 三项固定任务各自对应的「具体行为夸奖」 */
  function praiseFixed(id, title) {
    if (id === 'f2') return '你今天安安静静坐了 10 分钟，把字一笔一画写完了——手越来越稳了，这就是耐心。';
    if (id === 'f3') return '计算小超市你按计时做完了，没拖延，算得清清楚楚，说明你信得过自己。';
    if (id === 'f4') return '四面八方你打卡了 20 分钟，说英语的耳朵一天比一天灵，你真的在坚持。';
    return '今天「' + title + '」你做完了，能坐下来把一件小事做完，本身就值得说一声。';
  }

  /* 取某天数据 */
  function dayData(date) {
    var s = S.state;
    return {
      fixed: E.todayFixedStatus(date),
      speech: (s.speech || []).filter(function (x) { return x.date === date; }),
      quiz: (s.quiz || []).filter(function (x) { return x.date === date; }),
      read: (s.readLog || []).filter(function (r) { return r.date === date; })
    };
  }

  /* 今日表扬（同步、本地） */
  function today(date) {
    var d = dayData(date);
    var lines = [];
    (d.fixed.list || []).forEach(function (t) {
      var sub = S.subOf(t.id, date);
      if (sub && sub.status === 'approved') lines.push(praiseFixed(t.id, t.title));
    });
    if (d.speech.length) {
      var best = d.speech[d.speech.length - 1];
      var c = (best.comments && best.comments[0]) || ('讲得有 ' + best.score + ' 分');
      var wlen = (best.text || '').replace(/\s/g, '').length;
      lines.push('今天你讲了 ' + wlen + ' 个字，' + c + '（讲述 ' + best.score + ' 分）——把事说清楚，就是本事。');
    }
    if (d.quiz.length) {
      var tot = 0, cor = 0;
      d.quiz.forEach(function (x) { tot += (x.total || 0); cor += (x.correct || 0); });
      var pct = tot ? Math.round(cor / tot * 100) : 0;
      lines.push('今天朗文题做了 ' + d.quiz.length + ' 组，总共对 ' + cor + '/' + tot + '（' + pct + '%），错的已经进错题本，下次就会了。');
    }
    if (d.read.length) {
      var bk = d.read[d.read.length - 1].book || '书';
      var rw = d.read.reduce(function (a, r) { return a + (r.water || 10); }, 0);
      lines.push('今天阅读打卡 ' + d.read.length + ' 次，读完《' + bk + '》，又攒了 ' + rw + ' 水滴——看书的时间，谁也拿不走。');
    }
    if (!lines.length) {
      lines.push('今天还没开始打卡。可以先陪他把第一项「练字」点开——只夸他「坐下来开始了」，不催结果。');
    }
    var tip = '夸努力、夸看得见的行为，不夸「聪明」：说「你今天自己坐下来把练字做完了」，' +
      '比「你真棒」更让他愿意再做一次。一句具体的「我看见你……」，顶十句空夸。';
    return { lines: lines, tip: tip, date: date };
  }

  /* 本周成长数据（同步、本地） */
  function weekly(date) {
    var s = S.state, ws = S.weekStartOf(date), we = S.weekEndOf(date);
    function inR(d) { return d >= ws && d <= we; }
    var dayDone = {};
    (s.submissions || []).forEach(function (x) {
      if (x.kind === 'fixed' && x.status === 'approved' && inR(x.date)) {
        dayDone[x.date] = (dayDone[x.date] || 0) + 1;
      }
    });
    var fullDays = Object.keys(dayDone).filter(function (d) { return dayDone[d] >= 3; }).length;
    var sp = (s.speech || []).filter(function (x) { return inR(x.date); });
    var spAvg = sp.length ? Math.round(sp.reduce(function (a, x) { return a + (x.score || 0); }, 0) / sp.length) : 0;
    var qz = (s.quiz || []).filter(function (x) { return inR(x.date); });
    var qTot = 0, qCor = 0;
    qz.forEach(function (x) { qTot += (x.total || 0); qCor += (x.correct || 0); });
    var qPct = qTot ? Math.round(qCor / qTot * 100) : 0;
    var rd = (s.readLog || []).filter(function (r) { return inR(r.date); });
    var rdDays = {}; rd.forEach(function (r) { rdDays[r.date] = 1; });
    var rdWater = rd.reduce(function (a, r) { return a + (r.water || 10); }, 0);
    var water = 0;
    (s.ledger || []).forEach(function (l) { if (l.type === 'water' && inR(l.date)) water += (l.delta || 0); });
    if (!water) {
      water = (s.submissions || []).reduce(function (a, x) {
        return a + ((x.status === 'approved' && inR(x.date)) ? (x.water || 0) : 0);
      }, 0) + rdWater;
    }
    var rational = '这周（' + ws + ' ~ ' + we + '）共 ' + fullDays + ' 天把三项固定任务全部做完；' +
      '讲述练习 ' + sp.length + ' 次、平均 ' + spAvg + ' 分；朗文题正确率 ' + qPct + '%；' +
      '阅读打卡 ' + Object.keys(rdDays).length + ' 天，攒下 ' + water + ' 滴水滴。';
    var grow = '数字背后，是 Micky 这周一点一点把「坐下来、做完一件小事」变成了习惯。' +
      '对双鱼座、心思细的孩子来说，被具体看见「努力」比被夸「聪明」更让他安心——' +
      '他不需要每次都满分，只要每天愿意开始，就是在不声不响地长大。';
    var lastBook = rd.length ? (rd[rd.length - 1].book || '书') : '书';
    var talk = [
      '今晚吃饭时，只说一件他今天具体做到的事（比如「我今天看到你练字写满了十分钟」），说完就停，别接「但是」。',
      '这周要是哪天没做完，别问「为什么没做」，改成「那天是不是有点累？我们明天把第一项先点开就好」。',
      '把本周最好的一次讲述或阅读，当成全家的小成就聊一聊：「你那本《' + lastBook + '》读完啦」——让他觉得努力被记住了。'
    ];
    return {
      ws: ws, we: we, rational: rational, grow: grow, talk: talk,
      fullDays: fullDays, spCount: sp.length, spAvg: spAvg, qPct: qPct,
      rdDays: Object.keys(rdDays).length, water: water
    };
  }

  /* AI 润色（异步）；没配 Key / 出错就回退本地，调用方自己兜底 */
  function aiOn() {
    var a = S.state.ai; return !!(a && a.enabled && a.apiKey);
  }
  function cfgOf() {
    var a = S.state.ai || {};
    return { enabled: true, apiKey: a.apiKey, model: a.model || 'deepseek-chat', baseUrl: a.baseUrl || 'https://api.deepseek.com/v1' };
  }

  function refreshToday(date) {
    if (!aiOn() || !global.AI) return;
    var cache = S.state.coach.praise;
    if (cache[date] && cache[date].ai) return;        // 已用 AI 生成过
    if (global.App && global.App._coachToday === date) return; // 本会话已发起
    if (global.App) global.App._coachToday = date;
    var data = dayData(date);
    global.AI.praise(data, cfgOf()).then(function (r) {
      if (r && r.lines) { r.ai = true; S.state.coach.praise[date] = r; S.save(); if (global.App) global.App.render(); }
    })['catch'](function () { });
  }

  function refreshWeek(date) {
    if (!aiOn() || !global.AI) return;
    var ws = S.weekStartOf(date);
    var cache = S.state.coach.week;
    if (cache[ws] && cache[ws].ai) return;
    if (global.App && global.App._coachWeek === ws) return;
    if (global.App) global.App._coachWeek = ws;
    global.AI.weekly(weekly(date), cfgOf()).then(function (r) {
      if (r && r.talk) { r.ai = true; S.state.coach.week[ws] = r; S.save(); if (global.App) global.App.render(); }
    })['catch'](function () { });
  }

  global.Coach = {
    today: today,
    weekly: weekly,
    refreshToday: refreshToday,
    refreshWeek: refreshWeek,
    aiOn: aiOn
  };
})(window);
