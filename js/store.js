/* ===========================================================
   store.js —— 数据层（LocalStorage）
   后续要接 Firebase 跨设备同步时，只需替换 load / save 两个方法
   =========================================================== */
(function (global) {
  'use strict';

  var KEY = 'pvz_study_v1';

  /* ---------- 日期工具 ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDate(s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addDays(s, n) {
    var d = parseDate(s);
    d.setDate(d.getDate() + n);
    return dateStr(d);
  }
  function dayIndex(s) { return parseDate(s).getDay(); }  // 0=周日 6=周六
  function isWeekend(s) { var w = dayIndex(s); return w === 0 || w === 6; }
  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------- 周次工具（每周任务用：周一 ~ 周五） ---------- */
  function weekStartOf(s) {          // 该日期所在周的周一
    var d = parseDate(s);
    var w = d.getDay();              // 0=周日
    var diff = (w === 0) ? -6 : 1 - w;
    d.setDate(d.getDate() + diff);
    return dateStr(d);
  }
  function weekEndOf(s) {            // 该周的周五（截止日）
    return addDays_(weekStartOf(s), 4);
  }
  function addDays_(s, n) {
    var d = parseDate(s);
    d.setDate(d.getDate() + n);
    return dateStr(d);
  }
  /* 越早完成奖励越多：周一 5 → 周五 1 */
  var WEEKLY_REWARD = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0, 0: 0 };

  /* 拓展任务按「周几完成」发放的水滴 */
  var WATER_BY_DAY = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 1, 0: 1 };

  /* ---------- 植物配置 ---------- */
  var PLANTS = {
    sunflower: { key: 'sunflower', name: '向日葵', cost: 20, emoji: '🌻', desc: '每天产 10 阳光' },
    peashooter: { key: 'peashooter', name: '豌豆射手', cost: 15, emoji: '🌱', desc: '帮你挡住僵尸' },
    wallnut: { key: 'wallnut', name: '坚果墙', cost: 10, emoji: '🥜', desc: '结实的护盾' }
  };

  /* ---------- 默认数据 ---------- */
  /* 每日固定任务：固定三项（练字 10 分钟 / 计算小超市 5 分钟 / 四面八方 App 打卡 20 分钟）
     early:1 = 允许「我做完了！」提前结束，并按剩余时间发水滴奖励 */
  var FIXED_DEF = {
    weekday: [
      { id: 'f2', title: '练字（10 分钟）', emoji: '🖌️', subject: 'chinese', order: 0, limit: 10 },
      { id: 'f3', title: '计算小超市（5 分钟）', emoji: '🛒', subject: 'math', order: 1, limit: 5, early: 1 },
      { id: 'f4', title: '四面八方 App 打卡（20 分钟）', emoji: '📱', subject: 'english', order: 2, limit: 20 }
    ],
    weekend: [
      { id: 'w1', title: '练字（10 分钟）', emoji: '🖌️', subject: 'chinese', order: 0, limit: 10 },
      { id: 'w2', title: '计算小超市（5 分钟）', emoji: '🛒', subject: 'math', order: 1, limit: 5, early: 1 },
      { id: 'w3', title: '四面八方 App 打卡（20 分钟）', emoji: '📱', subject: 'english', order: 2, limit: 20 }
    ]
  };

  function defaultFixedTasks() {
    var out = [];
    ['weekday', 'weekend'].forEach(function (slot) {
      FIXED_DEF[slot].forEach(function (d) {
        var t = { kind: 'fixed', slot: slot, timer: 1 };
        for (var k in d) t[k] = d[k];
        out.push(t);
      });
    });
    return out;
  }

  /* 老数据清洗：固定任务只留「三项」。
     匹配规则：按「科目 + 限时」找老任务来接管，练字还是练字、计算还是计算，
     不会把「阅读 30 分钟」错认成「练字」。没被接管的老任务归档（历史记录保留给妈妈端看）。 */
  function migrateFixedTasks(s) {
    if (!Array.isArray(s.tasks)) return false;
    var changed = false;

    /* 归档：任务移出今天列表，历史提交改指向 x_old，避免和新任务串号 */
    function archive(t) {
      (s.submissions || []).forEach(function (x) {
        if (x.taskId === t.id) x.taskId = t.id + '_old';
      });
      s.tasks = s.tasks.filter(function (x) { return x !== t; });
      changed = true;
    }

    ['weekday', 'weekend'].forEach(function (slot) {
      var defs = FIXED_DEF[slot];
      var olds = s.tasks.filter(function (t) { return t.kind === 'fixed' && t.slot === slot; });
      var taken = {};
      var pairs = [];

      /* 先配对：每项新任务找一个「同科目 + 同限时」的老任务 */
      defs.forEach(function (d) {
        for (var i = 0; i < olds.length; i++) {
          var t = olds[i];
          if (taken[t.id]) continue;
          if (t.subject === d.subject && (t.limit || 0) === (d.limit || 0)) {
            taken[t.id] = 1;
            pairs.push({ t: t, d: d });
            return;
          }
        }
        pairs.push({ t: null, d: d });   // 没有老任务可接管 → 新建
      });

      /* 再归档没被接管的老固定任务 */
      olds.forEach(function (t) { if (!taken[t.id]) archive(t); });

      /* 最后落地：改 id 时把历史提交一起搬过去，孩子的记录不会丢 */
      pairs.forEach(function (p) {
        var d = p.d;
        if (!p.t) {
          var nt = { kind: 'fixed', slot: slot, timer: 1 };
          for (var k in d) nt[k] = d[k];
          if (d.early) nt.early = 1;
          s.tasks.push(nt);
          changed = true;
          return;
        }
        var t = p.t;
        if (t.id !== d.id) {
          (s.submissions || []).forEach(function (x) {
            if (x.taskId === t.id) x.taskId = d.id;
          });
          changed = true;
        }
        if (t.title !== d.title || t.emoji !== d.emoji || t.limit !== d.limit ||
          t.order !== d.order || t.subject !== d.subject) changed = true;
        t.id = d.id; t.title = d.title; t.emoji = d.emoji; t.order = d.order;
        t.limit = d.limit; t.subject = d.subject;
        t.kind = 'fixed'; t.slot = slot; t.timer = 1;
        if (d.early) t.early = 1; else delete t.early;
      });
    });

    /* 3) 补上「故事海漂流 · 阅读看书」选做任务（每天自由打卡，完成 +10 水滴） */
    if (!s.tasks.some(function (t) { return t.id === 'e_read'; })) {
      s.tasks.push({
        id: 'e_read', title: '故事海漂流 · 阅读看书', emoji: '🌊',
        kind: 'extra', subject: 'chinese', water: 10, optional: 1
      });
      changed = true;
    }
    return changed;
  }

  /* 数学趣味闯关进度：星星只升不降，答错不扣任何东西 */
  function defaultMath() {
    return {
      stars: {},      // {'seq:3':2, 'sudoku:4:1':3}
      cleared: {},    // {'seq:3':1}
      hintDay: '', hintLeft: 5,
      streak: 0, bestStreak: 0,
      sunStep: 0,     // 已经发过几次「满 10 星」阳光
      got6: 0, got9: 0, sudFree: 0
    };
  }

  /* 数学趣味闯关的时间管控（妈妈端可改） */
  function defaultMathConf() {
    return {
      enable: 1,          // 1 = 启用每日限时
      baseMin: 10,        // 每天免费时长（分钟）
      maxMin: 20,         // 每天兑换上限（分钟）
      currency: 'water',  // 兑换用什么积分：water 水滴 / sun 阳光
      redeemDay: null,    // 最近一次兑换的日期
      redeemMin: 0,       // 当天已兑换的分钟
      bonus: {}           // {'2026-09-22': 5} 妈妈手动加时（分钟）
    };
  }

  function defaultExtraTasks() {
    return [
      { id: 'e_cn_speech', title: '说说今天最难忘的一件事', emoji: '🎤', kind: 'extra', subject: 'chinese', mode: 'speech' },
      { id: 'e_read', title: '故事海漂流 · 阅读看书', emoji: '🌊', kind: 'extra', subject: 'chinese', water: 10, optional: 1 },
      { id: 'e_ot_1', title: '帮家里做一件家务', emoji: '🧹', kind: 'extra', subject: 'other' }
    ];
  }

  function defaultShop() {
    return [
      { id: 'sh1', name: '看动画片 15 分钟', emoji: '📺', price: 30, desc: '自己选一集' },
      { id: 'sh2', name: '决定今晚吃什么', emoji: '🍜', price: 25, desc: '全家听你的' },
      { id: 'sh3', name: '和爸爸打一场球', emoji: '🏀', price: 40, desc: '爸爸不许放水' },
      { id: 'sh4', name: '周末去公园', emoji: '🌳', price: 60, desc: '挑一个想去的地方' },
      { id: 'sh5', name: '一盒小乐高', emoji: '🧱', price: 150, desc: '自己挑一盒' },
      { id: 'sh6', name: '晚睡 20 分钟', emoji: '🌙', price: 35, desc: '仅限周五周六' }
    ];
  }

  /* 我的小盆栽：完成每日三项固定任务自动浇水，断一天只是「停住」，叶子永远不会掉 */
  function defaultPlant() {
    return { leaves: 0, streak: 0, lastDate: '', flower: 0, total: 0 };
  }

  function defaults() {
    return {
      version: 1,
      kidName: 'Micky',
      pin: '1234',
      autoApprove: false,        // 妈妈端可开：提交即通过
      sun: 20,                   // 开局送一点，先有成就感
      water: 0,
      zombieStep: 0,
      sunflowerUnlocked: false,  // 今日是否解锁向日葵种植
      lastSunflowerDate: null,   // 上次向日葵产阳光的日期
      lastSettleDate: null,      // 上次跨日结算检查到的日期
      garden: (function () {
        var a = []; for (var i = 0; i < 15; i++) a.push({ plant: null, at: null }); return a;
      })(),
      tasks: defaultFixedTasks().concat(defaultExtraTasks()),
      days: {},                  // {'2026-09-22':{bonus,zombieMoved,allDone}}
      dictRound: 0,              // 听写第几组（每组 10 个词，跨单元打散）
      weekPenalty: {},           // {'2026-09-21':true} 每周任务未完成的惩罚只算一次
      speech: [],                // 讲述练习记录 {id,date,text,score,detail,water,sun}
      quiz: [],                  // 朗文练习记录 {id,date,ref,kind,correct,total,water}
      pv: {},                    // 预习进度 {'2a|识字4 田家四季歌':{read,ask,boss,sum,done}}
      readLog: [],               // 阅读打卡 {id,date,book,minutes,early,sun,water}
      timers: {},                // 倒计时 {'2026-09-22:f2':{start,end,limit,done}}
      math: defaultMath(),       // 数学趣味闯关 {stars,cleared,hintLeft,streak,sudFree...}
      mathConf: defaultMathConf(), // 妈妈端时间管控 {enable,baseMin,maxMin,currency,redeemDay,redeemMin,bonus}
      mathUse: {},               // 闯关计时 {'2026-09-22': 已用秒数}
      myTasks: [],               // 孩子自加任务 {id,subject,title,date,status,water,note,at,reviewedAt}
      flowers: 0,                // 🌸 小红花（老师作业完成数，不抵水滴）
      hwLog: [],                 // 老师作业打卡记录 {id,date,title,subject}
      ai: { enabled: false, provider: '', apiKey: '', model: '', baseUrl: '' },
      /* ↓↓↓ 五个「暖心小功能」（2026-09-22 加，老数据会自动补上，不用重新导出备份） */
      mood: {},                  // 心情天气 {'2026-09-22':{m:'sun'|'cloud'|'rain'|'storm', share:0|1, at}}
      notes: [],                 // 妈妈的悄悄话 {id,text,date(生效日),read,readAt,push}
      autoNote: {},              // 今日自动悄悄话 {'2026-09-22':{mood,text,mode,read}} —— 不依赖妈妈端，AI 按心情生成
      joy: [],                   // 开心罐 {id,text,date,at}
      plant: defaultPlant(),     // 我的小盆栽 {leaves,streak,lastDate,flower,total}
      movie: {},                 // 今日小电影 {'2026-09-22':{text,at}} 生成一次就缓存
      wordbook: [],              // 📒 我的单词本（英语查词加进来的） {id,en,zh,cat,at,box,right,wrong,lastAt}
      wrongBook: [],             // 📕 错题本（通用，各科目都能往里放） {id,kind,q,your,right,note,at,times}
      submissions: [],           // {id,taskId,title,subject,kind,date,status,at,reviewedAt,water}
      shop: defaultShop(),
      redeems: [],
      ledger: [],                // {id,date,delta,type,reason}
      zombieLog: [],
      createdAt: dateStr()
    };
  }

  /* ---------- Store ---------- */
  var Store = {
    state: null,

    load: function () {
      var s = null;
      try {
        var raw = global.localStorage.getItem(KEY);
        if (raw) s = JSON.parse(raw);
      } catch (e) { s = null; }
      if (!s || typeof s !== 'object') s = defaults();
      // 补齐新增字段（版本升级安全）
      var d = defaults();
      for (var k in d) {
        if (!(k in s)) s[k] = d[k];
      }
      if (!Array.isArray(s.garden) || s.garden.length !== 15) {
        s.garden = d.garden;
      }
      // 迁移：清掉已下线的老任务（早读 / 口算 / 旧的语文英语拓展）
      var drop = ['f1', 'e_cn_1', 'e_ma_1', 'e_en_1'];
      if (Array.isArray(s.tasks)) {
        s.tasks = s.tasks.filter(function (t) { return drop.indexOf(t.id) < 0; });
      }
      // 迁移：固定任务换新名字（练字 / 计算小超市 / 四面八方）
      if (migrateFixedTasks(s)) this.save();
      // 听写进度（每次 10 个词，打散跨单元）
      if (typeof s.dictRound !== 'number') s.dictRound = 0;
      this.state = s;
      return s;
    },

    save: function () {
      try {
        global.localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (e) {
        if (global.UI && global.UI.toast) global.UI.toast('保存失败，浏览器存储可能已满');
      }
    },

    reset: function () {
      this.state = defaults();
      this.save();
    },

    /* 导出 / 导入（跨设备手动同步备用） */
    exportJSON: function () { return JSON.stringify(this.state, null, 2); },
    importJSON: function (txt) {
      var o = JSON.parse(txt);
      if (!o || typeof o !== 'object') throw new Error('格式不对');
      this.state = o;
      this.save();
    },

    /* ---------- 工具方法 ---------- */
    dateStr: dateStr,
    parseDate: parseDate,
    addDays: addDays,
    dayIndex: dayIndex,
    isWeekend: isWeekend,
    WEEK_CN: WEEK_CN,
    WATER_BY_DAY: WATER_BY_DAY,
    WEEKLY_REWARD: WEEKLY_REWARD,
    weekStartOf: weekStartOf,
    weekEndOf: weekEndOf,
    PLANTS: PLANTS,

    uid: function () {
      return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /* 某天的固定任务 */
    fixedTasksOf: function (date) {
      var slot = isWeekend(date) ? 'weekend' : 'weekday';
      return this.state.tasks
        .filter(function (t) { return t.kind === 'fixed' && t.slot === slot; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    },

    extraTasksOf: function (subject) {
      return this.state.tasks.filter(function (t) {
        return t.kind === 'extra' && (!subject || t.subject === subject);
      });
    },

    /* 本周任务（周一布置，周五截止） */
    weeklyTasksOf: function (subject, weekStart) {
      weekStart = weekStart || weekStartOf(this.dateStr());
      return this.state.tasks.filter(function (t) {
        if (t.kind !== 'weekly') return false;
        if (t.weekStart !== weekStart) return false;
        return !subject || t.subject === subject;
      });
    },

    /* 妈妈当天布置的校内任务 */
    schoolTasksOf: function (date, subject) {
      date = date || this.dateStr();
      return this.state.tasks.filter(function (t) {
        if (t.kind !== 'school' || t.date !== date) return false;
        return !subject || t.subject === subject;
      });
    },

    /* ---------- 数学闯关：时间管控 ---------- */
    mathConf: function () {
      var s = this.state;
      if (!s.mathConf || typeof s.mathConf !== 'object') s.mathConf = defaultMathConf();
      var d = defaultMathConf();
      for (var k in d) if (!(k in s.mathConf)) s.mathConf[k] = d[k];
      if (!s.mathConf.bonus || typeof s.mathConf.bonus !== 'object') s.mathConf.bonus = {};
      if (!s.mathUse || typeof s.mathUse !== 'object') s.mathUse = {};
      return s.mathConf;
    },
    /* 当天已玩秒数 */
    mathUsedSec: function (date) {
      date = date || this.dateStr();
      return (this.state.mathUse || {})[date] || 0;
    },
    /* 当天总额度（分钟）= 免费时长 + 妈妈加时 + 当天兑换 */
    mathQuotaMin: function (date) {
      var c = this.mathConf();
      date = date || this.dateStr();
      if (!c.enable) return 600;                       // 关掉限制 = 随便玩
      var bonus = (c.bonus && c.bonus[date]) || 0;
      var redeemed = (c.redeemDay === date ? (c.redeemMin || 0) : 0);
      return (c.baseMin || 10) + bonus + redeemed;
    },
    /* 当天还能兑换多少分钟（上限 20，且一天只能兑一次） */
    mathCanRedeem: function (date) {
      var c = this.mathConf();
      date = date || this.dateStr();
      if (c.redeemDay === date) return 0;              // 今天已经兑过
      return Math.max(0, (c.maxMin || 20) - 0);
    },

    /* ---------- 孩子自加任务 ---------- */
    myTasksOf: function (subject, date) {
      var arr = this.state.myTasks || [];
      return arr.filter(function (t) {
        if (subject && t.subject !== subject) return false;
        if (date && t.date !== date) return false;
        return true;
      });
    },

    /* 某任务在某天的最新提交 */
    subOf: function (taskId, date) {
      var arr = this.state.submissions.filter(function (s) {
        return s.taskId === taskId && s.date === date;
      });
      if (!arr.length) return null;
      return arr[arr.length - 1];
    },

    /* 某天某任务是否已通过 */
    isApproved: function (taskId, date) {
      var s = this.subOf(taskId, date);
      return !!s && s.status === 'approved';
    },

    /* 该任务是否曾经通过（每周任务跨天完成用） */
    isApprovedEver: function (taskId) {
      var arr = this.state.submissions.filter(function (s) {
        return s.taskId === taskId && s.status === 'approved';
      });
      return arr.length > 0;
    },

    /* 任务在某天的完成日期（已通过的那条） */
    approvedDateOf: function (taskId) {
      var arr = this.state.submissions.filter(function (s) {
        return s.taskId === taskId && s.status === 'approved';
      });
      return arr.length ? arr[arr.length - 1].date : null;
    },

    /* 阳光收支记账 */
    addLedger: function (delta, type, reason, date) {
      this.state.ledger.push({
        id: this.uid(),
        date: date || dateStr(),
        delta: delta,
        type: type,          // sun | water | zombie | plant | redeem
        reason: reason
      });
      if (this.state.ledger.length > 600) this.state.ledger = this.state.ledger.slice(-600);
    }
  };

  global.Store = Store;
})(window);
