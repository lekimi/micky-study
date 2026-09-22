/* ===========================================================
   engine.js —— 核心规则引擎
   阳光 / 水滴 / 僵尸 / 种植 / 提交审核 / 兑换
   设计原则：高敏感孩子友好 —— 失败只「当日不发阳光」，
   绝不一次性清空已攒的阳光。
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store;

  function st() { return S.state; }
  function today() { return S.dateStr(); }
  function ensureDays() { if (!st().days) st().days = {}; }
  function ensureWeeks() { if (!st().weekPenalty) st().weekPenalty = {}; }

  /* 各类任务完成后发放的奖励 */
  function rewardFor(task, date) {
    var rw = { water: 0, sun: 0 };
    if (!task) return rw;
    var w = S.dayIndex(date);
    if (task.kind === 'weekly') {
      rw.water = S.WEEKLY_REWARD[w] || 0;        // 周一 5 → 周五 1
    } else if (task.kind === 'school') {
      rw.sun = 1;                                 // 校内打卡 +1 阳光
    } else if (task.kind === 'extra') {
      if (task.mode === 'speech') return rw;      // 讲述任务走评分奖励
      if (task.water) { rw.water = task.water; return rw; }  // 指定奖励（如阅读看书 +10）
      rw.water = S.WATER_BY_DAY[w] || 1;
    }
    return rw;
  }

  function applyReward(rw, label, date) {
    if (rw.water > 0) {
      Engine.addWater(rw.water, label, date);
      Engine.flash.push({ type: 'water', n: rw.water });
    }
    if (rw.sun > 0) {
      Engine.addSun(rw.sun, label, date);
      Engine.flash.push({ type: 'sunGain', n: rw.sun });
    }
  }

  function dayRec(date) {
    ensureDays();
    if (!st().days[date]) st().days[date] = { bonus: false, zombieMoved: false, allDone: false };
    return st().days[date];
  }

  var Engine = {
    PLANTS: S.PLANTS,
    flash: [],   // 待弹出的「故事化反馈」队列，由 App.flushFlash 消费

    /* ============ 阳光 / 水滴 ============ */
    addSun: function (n, reason, date) {
      var s = st();
      s.sun = Math.max(0, s.sun + n);
      S.addLedger(n, 'sun', reason, date);
      return s.sun;
    },

    spendSun: function (n, reason) {
      var s = st();
      if (s.sun < n) return false;
      s.sun -= n;
      S.addLedger(-n, 'sun', reason);
      return true;
    },

    addWater: function (n, reason, date) {
      var s = st();
      s.water += n;
      S.addLedger(n, 'water', reason, date);
      Engine.drainWater(date);
      return s.water;
    },

    /* 每攒满 3 滴 → 僵尸后退 1 步（僵尸已在起点时不扣水） */
    drainWater: function (date) {
      var s = st();
      var pushed = 0;
      while (s.water >= 3 && s.zombieStep > 0) {
        s.water -= 3;
        s.zombieStep -= 1;
        pushed++;
        S.addLedger(-3, 'water', '3 滴水滴合力 → 僵尸后退 1 步', date);
        S.addLedger(0, 'zombie', '豌豆射手命中！僵尸退到第 ' + s.zombieStep + ' 步', date);
        s.zombieLog.push({ date: date || today(), type: 'back', reason: '水滴合力' });
      }
      if (pushed > 0) Engine.flash.push({ type: 'zombieBack', n: pushed });
      return pushed;
    },

    /* ============ 僵尸 ============ */
    zombieForward: function (reason, date) {
      var s = st();
      date = date || today();
      s.zombieStep = Math.min(5, s.zombieStep + 1);
      S.addLedger(0, 'zombie', reason + ' → 僵尸前进到第 ' + s.zombieStep + ' 步', date);
      s.zombieLog.push({ date: date, type: 'forward', reason: reason });

      var res = { step: s.zombieStep, ate: false, lost: 0 };
      if (s.zombieStep >= 5) {
        // 到家：吃掉一株向日葵 + 阳光 -10，退回第 3 步
        var eatenIdx = -1;
        for (var i = 0; i < s.garden.length; i++) {
          if (s.garden[i].plant === 'sunflower') { eatenIdx = i; break; }
        }
        if (eatenIdx >= 0) {
          s.garden[eatenIdx] = { plant: null, at: null };
          res.ate = true;
        }
        var before = s.sun;
        s.sun = Math.max(0, s.sun - 10);
        res.lost = before - s.sun;
        s.zombieStep = 3;
        S.addLedger(-res.lost, 'sun', '僵尸闯进花园，吃掉一株向日葵', date);
        S.addLedger(0, 'zombie', '植物们重新振作 → 僵尸退回第 3 步', date);
        s.zombieLog.push({ date: date, type: 'eat', reason: '闯进花园' });
      }
      return res;
    },

    /* ============ 每日固定任务结算 ============ */
    /* 全部完成：+2 阳光 + 2 全勤阳光，并解锁向日葵种植 */
    checkDailyBonus: function (date) {
      date = date || today();
      var rec = dayRec(date);
      if (rec.bonus) return false;
      var list = S.fixedTasksOf(date);
      if (!list.length) return false;
      var all = list.every(function (t) { return S.isApproved(t.id, date); });
      rec.allDone = all;
      if (!all) return false;

      rec.bonus = true;
      Engine.addSun(2, '今日固定任务全部完成', date);
      Engine.addSun(2, '全勤奖励', date);
      st().sunflowerUnlocked = true;
      Engine.flash.push({ type: 'allDone' });
      return true;
    },

    /* 跨日结算：昨天（及更早没算过的日子）没全完成 → 僵尸前进 */
    settlePastDays: function () {
      var s = st();
      var t = today();
      var cursor = s.lastSettleDate || s.createdAt || t;
      var guard = 0;
      var events = [];

      while (cursor < t && guard++ < 120) {
        var rec = dayRec(cursor);
        var list = S.fixedTasksOf(cursor);
        var all = list.length > 0 && list.every(function (x) { return S.isApproved(x.id, cursor); });
        rec.allDone = all;

        if (all) {
          // 补发（正常情况下 approve 时已发过）
          if (!rec.bonus) {
            rec.bonus = true;
            Engine.addSun(2, '补发：' + cursor + ' 固定任务全部完成', cursor);
            Engine.addSun(2, '补发：全勤奖励', cursor);
            st().sunflowerUnlocked = true;
          }
        } else {
          if (list.length > 0 && !rec.zombieMoved) {
            rec.zombieMoved = true;
            var r = Engine.zombieForward('昨天有任务没完成', cursor);
            events.push({ date: cursor, res: r });
          }
        }
        cursor = S.addDays(cursor, 1);
      }
      s.lastSettleDate = t;
      return events;
    },

    /* ============ 每周任务结算（周六清算上一周） ============ */
    /* 周五前没完成的每周任务 → 僵尸前进 1 步 + 阳光 -5（温和惩罚，不清空） */
    settleWeeks: function () {
      ensureWeeks();
      var s = st();
      var ws0 = S.weekStartOf(today());
      var weeks = {};
      s.tasks.forEach(function (task) {
        if (task.kind !== 'weekly' || !task.weekStart) return;
        if (task.weekStart >= ws0) return;               // 只清算过去的周
        (weeks[task.weekStart] = weeks[task.weekStart] || []).push(task);
      });

      var events = [];
      Object.keys(weeks).forEach(function (wk) {
        if (s.weekPenalty[wk]) return;
        var bad = weeks[wk].filter(function (t) { return !S.isApprovedEver(t.id); });
        if (!bad.length) return;                          // 全部完成 → 不罚
        s.weekPenalty[wk] = true;
        var r = Engine.zombieForward('上周「' + bad[0].subject + '」任务没在周五前完成', S.weekEndOf(wk));
        var lost = Math.min(5, s.sun);
        s.sun = Math.max(0, s.sun - 5);
        if (lost > 0) S.addLedger(-lost, 'sun', '上周每周任务未完成', today());
        events.push({ week: wk, tasks: bad, res: r, lost: lost });
      });
      return events;
    },

    /* ============ 语文讲述任务（评分后发放奖励） ============ */
    finishSpeech: function (text, scoreResult) {
      var s = st();
      var date = today();
      var score = scoreResult.score;

      // 分数 → 水滴 / 阳光
      var rw = score >= 90 ? { water: 5, sun: 2 }
        : score >= 80 ? { water: 4, sun: 1 }
          : score >= 70 ? { water: 3, sun: 0 }
            : score >= 60 ? { water: 2, sun: 0 }
              : { water: 1, sun: 0 };

      var rec = {
        id: S.uid(),
        date: date,
        text: text,
        score: score,
        detail: scoreResult.detail,
        tips: scoreResult.tips,
        comments: scoreResult.comments,
        water: rw.water,
        sun: rw.sun
      };
      if (!s.speech) s.speech = [];
      s.speech.push(rec);

      // 同时结成一条 approved 提交（当日不可重复）—插到队尾
      s.submissions.push({
        id: S.uid(),
        taskId: 'e_cn_speech',
        title: '说说今天最难忘的一件事',
        subject: 'chinese',
        kind: 'extra',
        date: date,
        note: '讲述练习得分 ' + score + ' 分',
        status: 'approved',
        water: rw.water,
        sun: rw.sun,
        at: Date.now(),
        reviewedAt: Date.now()
      });

      applyReward(rw, '讲述练习得分 ' + score + ' 分', date);
      Engine.checkDailyBonus(date);
      S.save();
      return rec;
    },

    /* ============ 故事海漂流 · 阅读看书（选做任务，每天一次 +10 水滴） ============ */
    /* needReview=true（现在的默认做法）：读满 30 分钟后提交给妈妈，
       妈妈确认才发水滴 —— 防止「东看一下西看一下」也算读完。
       needReview=false：老的即时发放（保留兼容）。 */
    finishReading: function (book, minutes, needReview) {
      var s = st();
      var date = today();
      if (S.isApproved('e_read', date)) return { dup: true };
      var water = 10;

      var rec = {
        id: S.uid(), date: date, book: book || '自由阅读',
        minutes: minutes || Kid.READ_MIN || 30, water: water,
        status: needReview ? 'submitted' : 'approved'
      };
      if (!s.readLog) s.readLog = [];
      s.readLog.push(rec);

      s.submissions.push({
        id: S.uid(), taskId: 'e_read', title: '故事海漂流 · 阅读看书',
        subject: 'chinese', kind: 'extra', date: date,
        note: '读了《' + (book || '自由阅读') + '》' + (rec.minutes ? ' ' + rec.minutes + ' 分钟' : ''),
        status: needReview ? 'submitted' : 'approved',
        water: water, sun: 0, at: Date.now(),
        reviewedAt: needReview ? null : Date.now()
      });

      /* 需要妈妈确认时先不给水滴，等 E.approve() 通过后才发 */
      if (!needReview) Engine.addWater(water, '故事海漂流 · 阅读看书', date);
      S.save();
      return { ok: true, water: water, needReview: !!needReview };
    },

    /* 今天有没有「等着妈妈确认」的阅读打卡 */
    readingPending: function (date) {
      var d = date || today();
      return (st().readLog || []).filter(function (r) {
        return r.date === d && r.status === 'submitted';
      })[0] || null;
    },

    /* ============ 计算小超市：提前完成按剩余分钟发水滴 ============ */
    finishCalcEarly: function (timer, taskId) {
      var s = st();
      var date = today();
      if (S.isApproved(taskId, date)) return { dup: true };
      var leftSec = Math.max(0, Math.floor((timer.end - Date.now()) / 1000));
      var earlyMin = Math.floor(leftSec / 60);          // 每提前满 1 分钟 = 1 滴水滴
      if (earlyMin > 0) {
        Engine.addWater(earlyMin, '计算小超市提前完成 ' + earlyMin + ' 分钟', date);
      }
      S.save();
      return { ok: true, earlyMin: earlyMin, leftSec: leftSec };
    },

    /* ============ 朗文练习（阅读 / 听力） ============ */
    quizToday: function (ref, kind, date) {
      date = date || today();
      var arr = (st().quiz || []).filter(function (x) {
        return x.date === date && x.ref === ref && x.kind === kind;
      });
      return arr.length ? arr[arr.length - 1] : null;
    },

    finishQuiz: function (ref, kind, correct, total, label, detail) {
      var s = st();
      var date = today();
      if (!s.quiz) s.quiz = [];
      var rate = total ? correct / total : 0;
      var water = rate >= 1 ? 3 : (rate >= 0.6 ? 2 : 1);   // 做了就有，鼓励优先
      var rec = { id: S.uid(), date: date, ref: ref, kind: kind, correct: correct, total: total, water: water, label: label || '', detail: detail || null };
      s.quiz.push(rec);
      var name = label || (kind === 'listening' ? '朗文听力' : (kind === 'cn' ? '语文生字' : '朗文阅读')) + ' ' + ref;
      applyReward({ water: water, sun: 0 }, name + '：答对 ' + correct + '/' + total, date);
      S.save();
      return rec;
    },

    /* 今天是否已做过讲述练习 */
    speechToday: function (date) {
      date = date || today();
      var arr = (st().speech || []).filter(function (x) { return x.date === date; });
      return arr.length ? arr[arr.length - 1] : null;
    },

    /* ============ 提交 / 审核 ============ */
    submitTask: function (taskId, note) {
      var s = st();
      var date = today();
      var task = s.tasks.filter(function (t) { return t.id === taskId; })[0];
      if (!task) return null;
      // 同一天同一任务已通过 → 不允许重复提交（防止刷水滴 / 刷阳光）
      if (S.isApproved(taskId, date)) return { dup: true, task: task };

      var status = 'submitted';
      var rw = { water: 0, sun: 0 };
      if (s.autoApprove) {
        status = 'approved';
        rw = rewardFor(task, date);
      }

      var sub = {
        id: S.uid(),
        taskId: taskId,
        title: task.title,
        subject: task.subject,
        kind: task.kind,
        date: date,
        note: note || '',
        status: status,
        water: rw.water,
        sun: rw.sun,
        at: Date.now(),
        reviewedAt: status === 'approved' ? Date.now() : null
      };
      s.submissions.push(sub);

      if (status === 'approved') {
        applyReward(rw, (task.kind === 'weekly' ? '本周任务：' : '') + task.title, date);
        if (task.kind === 'school') Engine.homeworkDone(task, date);
        Engine.checkDailyBonus(date);
      }
      S.save();
      return sub;
    },

    /* 老师布置的作业（视频打卡）完成：不给水滴，给 ☀️ 阳光（已在 rewardFor）+ 🌸 小红花 */
    homeworkDone: function (task, date) {
      var s = st();
      date = date || today();
      s.flowers = (s.flowers || 0) + 1;
      if (!Array.isArray(s.hwLog)) s.hwLog = [];
      s.hwLog.push({
        id: S.uid(), date: date, title: task.title || '',
        subject: task.subject || 'other', video: task.needVideo ? 1 : 0
      });
      S.addLedger(1, 'flower', '🌸 老师作业打卡：' + (task.title || '校内任务'), date);
      return s.flowers;
    },

    approve: function (subId) {
      var s = st();
      var sub = s.submissions.filter(function (x) { return x.id === subId; })[0];
      if (!sub || sub.status === 'approved') return null;
      sub.status = 'approved';
      sub.reviewedAt = Date.now();
      var task = s.tasks.filter(function (t) { return t.id === sub.taskId; })[0];
      var rw = rewardFor(task, sub.date);
      sub.water = rw.water;
      sub.sun = rw.sun;
      applyReward(rw, (sub.kind === 'weekly' ? '本周任务：' : '') + sub.title + '（周' + S.WEEK_CN[S.dayIndex(sub.date)] + '完成）', sub.date);
      if (sub.kind === 'school') Engine.homeworkDone(task || { title: sub.title, subject: sub.subject }, sub.date);
      /* 阅读打卡：妈妈通过后，把 readLog 里那条也标成 approved（水滴这时才真到账） */
      if (sub.taskId === 'e_read') {
        (st().readLog || []).forEach(function (r) {
          if (r.date === sub.date && r.status === 'submitted') r.status = 'approved';
        });
      }
      Engine.checkDailyBonus(sub.date);
      S.save();
      return sub;
    },

    reject: function (subId) {
      var s = st();
      var sub = s.submissions.filter(function (x) { return x.id === subId; })[0];
      if (!sub) return null;
      sub.status = 'rejected';
      sub.reviewedAt = Date.now();
      S.save();
      return sub;
    },

    /* ============ 数学闯关：时间兑换（妈妈端定价，孩子端花积分换） ============ */
    /* 档位：20 分→10 分钟 / 30 分→15 分钟 / 40 分→20 分钟，一天只能兑一次 */
    MATH_TIME_PLANS: [
      { min: 10, cost: 20 },
      { min: 15, cost: 30 },
      { min: 20, cost: 40 }
    ],
    redeemMathTime: function (min) {
      var s = st(), c = S.mathConf(), date = today();
      var plan = null;
      Engine.MATH_TIME_PLANS.forEach(function (p) { if (p.min === min) plan = p; });
      if (!plan) return { ok: false, msg: '没有这个兑换档位' };
      if (c.redeemDay === date) return { ok: false, msg: '今天已经兑换过啦，明天再来' };
      if (min > (c.maxMin || 20)) return { ok: false, msg: '每天最多只能换 ' + (c.maxMin || 20) + ' 分钟' };
      var cur = c.currency === 'sun' ? '☀️ 阳光' : '💧 水滴';
      if (c.currency === 'sun') {
        if (s.sun < plan.cost) return { ok: false, msg: '阳光不够，还差 ' + (plan.cost - s.sun) + ' 个' };
        Engine.spendSun(plan.cost, '兑换数学闯关 ' + min + ' 分钟');
      } else {
        if (s.water < plan.cost) return { ok: false, msg: '水滴不够，还差 ' + (plan.cost - s.water) + ' 滴' };
        s.water -= plan.cost;
        S.addLedger(-plan.cost, 'water', '兑换数学闯关 ' + min + ' 分钟');
      }
      c.redeemDay = date;
      c.redeemMin = min;
      S.save();
      return { ok: true, min: min, cost: plan.cost, cur: cur };
    },

    /* ============ 孩子自加任务（孩子提出 → 妈妈评判） ============ */
    myTaskAdd: function (subject, title) {
      var s = st();
      title = (title || '').trim();
      if (!title) return { ok: false, msg: '先写一下你做了什么' };
      if (title.length > 30) title = title.slice(0, 30);
      if (!Array.isArray(s.myTasks)) s.myTasks = [];
      var t = {
        id: S.uid(), subject: subject || 'other', title: title,
        date: today(), status: 'pending', water: 0, note: '', at: Date.now()
      };
      s.myTasks.push(t);
      S.save();
      return { ok: true, task: t };
    },
    /* 妈妈评判：water 是给的水滴数（0 表示只夸奖不给水滴） */
    myTaskApprove: function (id, water) {
      var s = st();
      var t = (s.myTasks || []).filter(function (x) { return x.id === id; })[0];
      if (!t) return null;
      t.status = 'ok';
      t.water = Math.max(0, Math.min(10, water || 0));
      t.reviewedAt = Date.now();
      if (t.water > 0) {
        Engine.addWater(t.water, '我自己加的任务：' + t.title, t.date);
        Engine.flash.push({ type: 'water', n: t.water });
      } else {
        Engine.addSun(1, '我自己加的任务：' + t.title + '（妈妈点赞）', t.date);
        Engine.flash.push({ type: 'sunGain', n: 1 });
      }
      S.save();
      return t;
    },
    myTaskReject: function (id, note) {
      var s = st();
      var t = (s.myTasks || []).filter(function (x) { return x.id === id; })[0];
      if (!t) return null;
      t.status = 'no';
      t.note = note || '';
      t.reviewedAt = Date.now();
      S.save();
      return t;
    },

    /* ============ 种植 ============ */
    canPlant: function (idx, key) {
      var s = st();
      if (idx < 0 || idx > 14) return { ok: false, msg: '格子不存在' };
      if (s.garden[idx].plant) return { ok: false, msg: '这格已经有植物啦' };
      var p = S.PLANTS[key];
      if (!p) return { ok: false, msg: '没有这种植物' };
      if (key === 'sunflower' && !s.sunflowerUnlocked) {
        return { ok: false, msg: '先把今天的固定任务全部完成，才能种向日葵哦' };
      }
      if (s.sun < p.cost) return { ok: false, msg: '阳光不够啦，还差 ' + (p.cost - s.sun) + ' 阳光' };
      return { ok: true };
    },

    plant: function (idx, key) {
      var c = Engine.canPlant(idx, key);
      if (!c.ok) return c;
      var s = st();
      var p = S.PLANTS[key];
      Engine.spendSun(p.cost, '种下' + p.name);
      s.garden[idx] = { plant: key, at: Date.now() };
      S.save();
      return { ok: true, plant: p };
    },

    dig: function (idx) {
      var s = st();
      var cell = s.garden[idx];
      if (!cell || !cell.plant) return { ok: false, msg: '这格是空的' };
      var p = S.PLANTS[cell.plant];
      var back = Math.floor(p.cost / 2);   // 铲除返还一半，降低挫败感
      s.garden[idx] = { plant: null, at: null };
      if (back > 0) Engine.addSun(back, '铲除' + p.name + '，返还一半阳光');
      S.save();
      return { ok: true, back: back, plant: p };
    },

    /* 向日葵每天产 10 阳光（每天首次进入时结算一次） */
    harvestSunflowers: function () {
      var s = st();
      var t = today();
      if (s.lastSunflowerDate === t) return 0;
      var n = 0;
      for (var i = 0; i < s.garden.length; i++) {
        if (s.garden[i].plant === 'sunflower') n++;
      }
      if (n > 0) {
        Engine.addSun(n * 10, n + ' 株向日葵今日产出阳光');
      }
      s.lastSunflowerDate = t;
      return n * 10;
    },

    /* ============ 兑换 ============ */
    redeem: function (itemId) {
      var s = st();
      var item = s.shop.filter(function (x) { return x.id === itemId; })[0];
      if (!item) return { ok: false, msg: '没有这个奖励' };
      if (s.sun < item.price) return { ok: false, msg: '还差 ' + (item.price - s.sun) + ' 阳光就可以换啦' };
      Engine.spendSun(item.price, '兑换：' + item.name);
      s.redeems.push({ id: S.uid(), itemId: item.id, name: item.name, emoji: item.emoji, price: item.price, at: Date.now(), date: today() });
      S.save();
      return { ok: true, item: item };
    },

    /* ============ 查询辅助 ============ */
    todayFixedStatus: function (date) {
      date = date || today();
      var list = S.fixedTasksOf(date);
      var done = 0, waiting = 0;
      for (var i = 0; i < list.length; i++) {
        var sub = S.subOf(list[i].id, date);
        if (sub && sub.status === 'approved') done++;
        else if (sub && sub.status === 'submitted') waiting++;
      }
      return { list: list, total: list.length, done: done, waiting: waiting, all: done === list.length && list.length > 0 };
    },

    /* 近 N 天数据（柱状图 / 看板用） */
    lastNDays: function (n) {
      var t = today();
      var out = [];
      for (var i = n - 1; i >= 0; i--) {
        var d = S.addDays(t, -i);
        var stt = Engine.todayFixedStatus(d);
        var sun = 0, water = 0;
        st().ledger.forEach(function (l) {
          if (l.date === d && l.type === 'sun' && l.delta > 0) sun += l.delta;
          if (l.date === d && l.type === 'water' && l.delta > 0) water += l.delta;
        });
        out.push({ date: d, label: S.WEEK_CN[S.dayIndex(d)], done: stt.done, total: stt.total, all: stt.all, sun: sun, water: water });
      }
      return out;
    },

    pendingList: function () {
      return st().submissions.filter(function (s) { return s.status === 'submitted'; })
        .sort(function (a, b) { return b.at - a.at; });
    },

    /* =========================================================
       五个「暖心小功能」—— 不参与任何奖惩，纯粹陪着
       设计原则：不给分、不扣分、不做成任务。断一天也只是「停住」。
       ========================================================= */

    /* ---------- 0. 今日讲述：引导式扩写（草稿 + 防刷分 + 素材库） ---------- */
    SPEECH_DAILY_MAX: 2,        /* 每天最多提交 2 次，第 2 次水滴减半 */

    speechDraftOf: function (date) {
      var s = st();
      var d = date || today();
      if (!s.speechDraft || s.speechDraft.date !== d) return null;
      return s.speechDraft;
    },
    speechDraftStart: function (origin, date) {
      var s = st();
      var d = date || today();
      s.speechDraft = { date: d, origin: String(origin || '').trim(), text: String(origin || '').trim(), asked: [] };
      S.save();
      return s.speechDraft;
    },
    /* 孩子补了一句：追加到文本，并记下这个维度问过了 */
    speechDraftAppend: function (ans, key) {
      var s = st();
      var d = s.speechDraft;
      if (!d) return null;
      var a = String(ans || '').trim();
      if (!a) return d;
      if (d.text && d.text.slice(-1) !== '。' && d.text.slice(-1) !== '！' && d.text.slice(-1) !== '？') d.text += '。';
      d.text += a;
      if (key && d.asked.indexOf(key) < 0) d.asked.push(key);
      S.save();
      return d;
    },
    speechDraftSkip: function (key) {
      var s = st();
      if (s.speechDraft) {
        if (key && s.speechDraft.asked.indexOf(key) < 0) s.speechDraft.asked.push(key);
        S.save();
      }
      return s.speechDraft;
    },
    speechDraftClear: function () { st().speechDraft = null; S.save(); },

    /* 今天已经提交几次（防刷分） */
    speechCountToday: function (date) {
      var d = date || today();
      return (st().speech || []).filter(function (x) { return x.date === d; }).length;
    },
    speechCanSubmit: function (date) {
      return Engine.speechCountToday(date) < Engine.SPEECH_DAILY_MAX;
    },

    /* 提交结算：水滴只在提交后发，按分数算，且当天第 2 次减半 */
    finishSpeech2: function (text, origin, scoreResult, date) {
      var s = st();
      var d = date || today();
      var score = scoreResult.score;
      var times = Engine.speechCountToday(d) + 1;      /* 这是今天的第几次 */

      var rw = score >= 90 ? { water: 5, sun: 2 }
        : score >= 80 ? { water: 4, sun: 1 }
          : score >= 70 ? { water: 3, sun: 0 }
            : score >= 60 ? { water: 2, sun: 0 }
              : { water: 1, sun: 0 };

      var water = rw.water;
      if (times > 1) water = Math.max(1, Math.floor(water / 2));   /* 第二次减半 */
      var sun = times > 1 ? 0 : rw.sun;

      s.water = (s.water || 0) + water;
      s.sun = (s.sun || 0) + sun;

      var rec = {
        id: S.uid(), date: d,
        text: text, origin: origin || '',
        score: score, detail: scoreResult.dims || scoreResult.detail,
        tips: scoreResult.tips, comments: scoreResult.comments,
        good: scoreResult.good || [],
        times: times, water: water, sun: sun
      };
      if (!s.speech) s.speech = [];
      s.speech.push(rec);
      if (water) S.addLedger(water, 'water', '🎤 讲述练习：' + score + ' 分', d);
      if (sun) S.addLedger(sun, 'sun', '🎤 讲述练习优秀', d);
      s.speechDraft = null;
      S.save();
      return { rec: rec, water: water, sun: sun, times: times };
    },

    /* ✨ 我的素材库 / 好词好句本 */
    phraseAdd: function (text, why) {
      var s = st();
      if (!Array.isArray(s.phraseBook)) s.phraseBook = [];
      text = String(text || '').trim();
      if (!text) return null;
      if (s.phraseBook.some(function (x) { return x.text === text; })) return null;  /* 去重 */
      var p = { id: S.uid(), text: text, why: why || '', date: today(), at: Date.now() };
      s.phraseBook.push(p);
      S.save();
      return p;
    },
    phraseList: function () {
      var s = st();
      if (!Array.isArray(s.phraseBook)) s.phraseBook = [];
      return s.phraseBook.slice().sort(function (a, b) { return b.at - a.at; });
    },
    phraseDel: function (id) {
      var s = st();
      s.phraseBook = (s.phraseBook || []).filter(function (x) { return x.id !== id; });
      S.save();
    },

    /* ---------- 1. 心情天气 ---------- */
    MOODS: [
      { k: 'sun', e: '☀️', t: '晴', c: '#F2A93B' },
      { k: 'cloud', e: '⛅', t: '多云', c: '#8FA3B0' },
      { k: 'rain', e: '🌧️', t: '有雨', c: '#5B87B8' },
      { k: 'storm', e: '⛈️', t: '打雷', c: '#7A6BA8' }
    ],
    moodOf: function (date) {
      var s = st(); if (!s.mood) s.mood = {};
      return s.mood[date || today()] || null;
    },
    /* share=1 才会出现在妈妈端；孩子自己决定 */
    setMood: function (k, share, date) {
      var s = st(); if (!s.mood) s.mood = {};
      var d = date || today();
      s.mood[d] = { m: k, share: share ? 1 : 0, at: Date.now() };
      S.save();
      return s.mood[d];
    },
    /* 最近 n 天的心情（妈妈端用：没分享的只显示「他自己藏着」） */
    moodRecent: function (n) {
      var s = st(); if (!s.mood) s.mood = {};
      var out = [];
      for (var i = (n || 7) - 1; i >= 0; i--) {
        var d = S.addDays(today(), -i);
        var m = s.mood[d];
        out.push({
          date: d, label: S.WEEK_CN[S.dayIndex(d)],
          m: m ? m.m : null,
          share: m ? !!m.share : false,
          hidden: !!m && !m.share
        });
      }
      return out;
    },

    /* ---------- 2. 妈妈的悄悄话 ---------- */
    noteAdd: function (text, date, push) {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      text = String(text || '').trim();
      if (!text) return null;
      var n = {
        id: S.uid(), text: text, date: date || today(),
        read: 0, readAt: null, push: push ? 1 : 0, at: Date.now()
      };
      s.notes.push(n); S.save();
      return n;
    },
    noteDel: function (id) {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      s.notes = s.notes.filter(function (x) { return x.id !== id; });
      S.save();
    },
    /* 孩子端：今天能拆的信（生效日 <= 今天，且没读过） */
    noteUnread: function () {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      var td = today();
      return s.notes.filter(function (x) { return !x.read && x.date <= td; })
        .sort(function (a, b) { return a.at - b.at; });
    },
    /* 有没有「现在就给他」的急件（用来弹一次窗） */
    notePushPending: function () {
      return Engine.noteUnread().filter(function (x) { return x.push && !x.popped; })[0] || null;
    },
    /* 急件弹过一次就别再弹了 */
    notePop: function (id) {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      var n = s.notes.filter(function (x) { return x.id === id; })[0];
      if (n) { n.popped = 1; S.save(); }
      return n;
    },
    noteRead: function (id) {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      var n = s.notes.filter(function (x) { return x.id === id; })[0];
      if (!n) return null;
      n.read = 1; n.readAt = Date.now();
      S.save();
      return n;
    },
    noteList: function () {
      var s = st(); if (!Array.isArray(s.notes)) s.notes = [];
      return s.notes.slice().sort(function (a, b) { return b.at - a.at; });
    },

    /* ---------- 2b. 今日自动悄悄话（不需要妈妈操作，AI 按当天心情写一句） ----------
       妈妈手动写的信优先；没有妈妈写的，就用这一句。数据不同步时也能自己闭环。 */
    autoNoteOf: function (date) {
      var s = st();
      if (!s.autoNote || typeof s.autoNote !== 'object') s.autoNote = {};
      var d = date || today();
      var rec = s.autoNote[d];
      var mood = s.mood && s.mood[d] ? s.mood[d].m : 'none';
      /* 心情变了就重挑一句（还没读过的话） */
      if (rec && rec.mood === mood) return rec;
      if (rec && rec.read) return rec;

      var seed = d + '|' + mood + '|' + (s.kidName || '');
      var out = (global.AI && global.AI.localNote)
        ? global.AI.localNote(mood, seed)
        : { text: '今天不用特别棒，正常发挥就行。', mode: 'local' };
      rec = { date: d, mood: mood, text: out.text, mode: 'local', read: 0 };
      s.autoNote[d] = rec;

      /* 配了大模型就异步换成 AI 写的（失败也无感，保留本地这句） */
      try {
        if (global.AI && s.ai && s.ai.enabled && s.ai.apiKey) {
          global.AI.autoNote(mood, s.kidName || '孩子', s.ai, seed).then(function (r) {
            var cur = st().autoNote && st().autoNote[d];
            if (cur && !cur.read && r && r.text) {
              cur.text = r.text; cur.mode = r.mode === 'llm' ? 'ai' : 'local';
              S.save();
              if (global.App && global.App.render) global.App.render();
            }
          })['catch'](function () { });
        }
      } catch (e) { }

      S.save();
      return rec;
    },
    autoNoteRead: function (date) {
      var s = st();
      if (!s.autoNote || typeof s.autoNote !== 'object') s.autoNote = {};
      var d = date || today();
      if (s.autoNote[d]) { s.autoNote[d].read = 1; S.save(); }
      return s.autoNote[d];
    },

    /* ---------- 3. 开心罐 ---------- */
    joyAdd: function (text) {
      var s = st(); if (!Array.isArray(s.joy)) s.joy = [];
      text = String(text || '').trim();
      if (!text) return null;
      var j = { id: S.uid(), text: text, date: today(), at: Date.now() };
      s.joy.push(j); S.save();
      return j;
    },
    joyList: function () {
      var s = st(); if (!Array.isArray(s.joy)) s.joy = [];
      return s.joy.slice().sort(function (a, b) { return b.at - a.at; });
    },
    joyDel: function (id) {
      var s = st(); if (!Array.isArray(s.joy)) s.joy = [];
      s.joy = s.joy.filter(function (x) { return x.id !== id; });
      S.save();
    },
    /* 摇一摇：随机翻一条（优先翻不是今天写的） */
    joyDraw: function () {
      var list = Engine.joyList();
      if (!list.length) return null;
      var td = today();
      var older = list.filter(function (x) { return x.date !== td; });
      var pool = older.length ? older : list;
      return pool[Math.floor(Math.random() * pool.length)];
    },

    /* ---------- 4. 我的小盆栽（三项固定任务全完成 → 自动浇水） ---------- */
    plantOf: function () {
      var s = st();
      if (!s.plant || typeof s.plant !== 'object') s.plant = { leaves: 0, streak: 0, lastDate: '', flower: 0, total: 0 };
      return s.plant;
    },
    /* 每天检查一次：今天三项都完成了吗？完成了就浇水 */
    plantWater: function (date) {
      var s = st();
      var p = Engine.plantOf();
      var d = date || today();
      if (p.lastDate === d) return { ok: false, why: 'already' };

      var stat = Engine.todayFixedStatus(d);
      if (!stat.all) return { ok: false, why: 'notdone', done: stat.done, total: stat.total };

      /* 连续判定：昨天浇过才算连着 */
      var y = S.addDays(d, -1);
      p.streak = (p.lastDate === y) ? (p.streak + 1) : 1;
      p.leaves += 1;
      p.total += 1;
      p.lastDate = d;
      /* 每满 7 天开一朵花 */
      var newFlower = (p.streak > 0 && p.streak % 7 === 0);
      if (newFlower) p.flower += 1;
      S.save();
      return { ok: true, streak: p.streak, flower: newFlower, leaves: p.leaves };
    },
    /* 断掉几天了（只是提示，不惩罚、不掉叶子） */
    plantMissDays: function () {
      var p = Engine.plantOf();
      if (!p.lastDate) return -1;
      var d = today();
      var i = 0;
      while (i < 60 && S.addDays(d, -i) !== p.lastDate) i++;
      return i > 59 ? -1 : i;
    },

    /* ---------- 5. 今日小电影（把今天做过的事串成故事） ---------- */
    movieOf: function (date, force) {
      var s = st();
      if (!s.movie || typeof s.movie !== 'object') s.movie = {};
      var d = date || today();
      if (!force && s.movie[d]) return s.movie[d].text;
      var text = Engine.movieBuild(d);
      s.movie[d] = { text: text, at: Date.now() };
      S.save();
      return text;
    },
    movieBuild: function (d) {
      var s = st();
      var stat = Engine.todayFixedStatus(d);
      var parts = [];
      var hour = new Date().getHours();

      /* 开场：按时间给不同的开场白 */
      if (hour < 11) parts.push('太阳刚爬上来，' + (s.kidName || '你') + '的花园醒了一半。');
      else if (hour < 17) parts.push('下午的花园有点懒洋洋，风把叶子吹得晃来晃去。');
      else parts.push('天黑下来了，花园里的向日葵都低着头准备睡觉。');

      /* 心情 */
      var mood = s.mood && s.mood[d];
      if (mood) {
        var mk = { sun: '今天心里是晴天', cloud: '今天心里飘过几朵云', rain: '今天心里下了点小雨', storm: '今天心里打了几声雷' }[mood.m];
        if (mk) parts.push(mk + '，不过花园还是照常开门。');
      }

      /* 固定任务 */
      if (stat.total > 0) {
        if (stat.all) parts.push('三只僵尸排着队来敲门，被你一只一只挡回去了。🏡 今天一次都没让它们进来。');
        else if (stat.done > 0) parts.push('今天来了 ' + stat.total + ' 只僵尸，你挡住了 ' + stat.done + ' 只，剩下的它们在门口蹲着，明天再来也不迟。');
        else parts.push('今天的僵尸还在门口，没进来，只是蹲着。明天你一来它们就得跑。');
      }

      /* 数学闯关 */
      var mt = s.math || {};
      var cleared = (mt.cleared && Object.keys(mt.cleared).length) || 0;
      var lv = (s.quiz || []).concat(s.speech || []);
      var mathToday = (s.ledger || []).filter(function (l) {
        return l.date === d && /闯关|数独|24点|找规律|思维/.test(l.reason || '');
      }).length;
      if (mathToday > 0) parts.push('闯关那边的豌豆射手响了 ' + mathToday + ' 次，僵尸被打得往回退。');

      /* 阅读 */
      var readToday = (s.readLog || []).filter(function (x) { return x.date === d; }).length;
      if (readToday > 0) parts.push('故事海里你捞到了 ' + readToday + ' 个故事，书包里又重了一点点。');

      /* 老师作业 / 自加任务 */
      var hwToday = (s.hwLog || []).filter(function (x) { return x.date === d; }).length;
      if (hwToday > 0) parts.push('老师布置的作业你交了 ' + hwToday + ' 份，小红花又多了一朵。');
      var mineToday = (s.myTasks || []).filter(function (x) { return x.date === d; }).length;
      if (mineToday > 0) parts.push('你还自己加了 ' + mineToday + ' 件事，这个比什么都厉害。');

      /* 收尾 */
      var p = Engine.plantOf();
      if (p && p.lastDate === d) {
        parts.push('你浇了水，小盆栽长了第 ' + p.leaves + ' 片叶子' + (p.flower > 0 ? '，现在已经开了 ' + p.flower + ' 朵花' : '') + '。');
      }
      if (!parts.length || (stat.total > 0 && stat.done === 0 && !mood)) {
        parts.push('今天花园很安静，植物们在等你明天来。');
      }
      parts.push('—— 今天的小电影，放完啦。');
      return parts.join(' ');
    }
  };

  global.Engine = Engine;
})(window);
