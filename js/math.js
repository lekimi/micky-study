/* ===========================================================
   数学趣味闯关（window.MathGame）
   关卡进度 / 星级 / 提示 / 奖惩，全部存在 S.state.math
   =========================================================== */
(function (global) {
  var S = global.Store, E = global.Engine;
  /* UI 可能比本文件后加载，用到时再取，别在顶部就抓 */
  function UI() { return global.UI; }

  function MP() { return global.MATHP; }

  /* PVZ 皮肤：每个关族 = 一个世界（草坪 / 泳池 / 屋顶 / 迷雾） */
  var GAMES = [
    {
      id: 'seq', name: '找规律', emoji: '🧩', levels: 30, desc: '数字和图形排排队，找出下一个',
      color: '#2E7CA8', bg: '#E7F3FF', world: '🌤️ 白天草坪', zombie: '🧟', plant: '🌻',
      story: '僵尸顺着规律格子往前走，填对了就用豌豆把它打回去！'
    },
    {
      id: 'p24', name: '算 24 点', emoji: '🎯', levels: 24, desc: '四个数字，加减乘除凑出 24',
      color: '#B26B00', bg: '#FFF3DC', world: '🌊 夜间泳池', zombie: '🧟‍♂️', plant: '🌵',
      story: '把四个数字装进炮筒，凑出 24 就能发射！'
    },
    {
      id: 'sudoku', name: '数独', emoji: '🔢', levels: 65, desc: '4×4 → 6×6 → 9×9 三段闯关',
      color: '#3B6D11', bg: '#EAF3DE', world: '🏡 屋顶阵地', zombie: '🧟‍♀️', plant: '🥜',
      story: '每填对一格就种下一棵植物，草坪站满就能挡住僵尸！'
    },
    {
      id: 'brain', name: '思维拓展', emoji: '🎲', levels: 32, desc: '天平 · 方块 · 纸盒 · 迷宫',
      color: '#534AB7', bg: '#EEEDFE', world: '🌫️ 迷雾花园', zombie: '💀', plant: '🍄',
      story: '雾里藏着僵尸，动动脑就能把它们照亮！'
    }
  ];

  var MathGame = {
    /* ---------- 视图状态（不落盘） ---------- */
    view: '',        // '' 关族首页 / game id
    game: '',        // seq | p24 | sudoku | brain
    lv: 0,           // 当前关（1 起，0 = 在关卡列表）
    sdSize: 4,       // 数独尺寸
    p: null,         // 当前题目
    st: null,        // 本次作答 {err, hint, tries, ...}
    drag: null,      // 拖拽中的候选下标
    toastMsg: '',

    /* ================= 存档 ================= */
    m: function () {
      var s = S.state;
      if (!s.math) {
        s.math = { stars: {}, cleared: {}, hintDay: '', hintLeft: 5, streak: 0, bestStreak: 0, sunStep: 0, sudFree: 0 };
      }
      var m = s.math;
      if (!m.stars) m.stars = {};
      if (!m.cleared) m.cleared = {};
      if (m.hintDay !== S.dateStr()) { m.hintDay = S.dateStr(); m.hintLeft = 5; }
      if (typeof m.hintLeft !== 'number') m.hintLeft = 5;
      if (typeof m.streak !== 'number') m.streak = 0;
      if (typeof m.sunStep !== 'number') m.sunStep = 0;
      return m;
    },
    save: function () { S.save(); },

    /* ================= 时间管控（妈妈端设额度，孩子端计时） ================= */
    _acc: 0,          // 本次会话已累计秒（用于分批落盘）
    _lockedAt: 0,     // 已经弹过一次「时间到」的日期标记

    usedSec: function () { return S.mathUsedSec(); },
    quotaSec: function () {
      var q = S.mathQuotaMin();
      return (S.mathConf().enable ? q : 600) * 60;
    },
    leftSec: function () {
      if (!S.mathConf().enable) return 600 * 60;
      return Math.max(0, this.quotaSec() - this.usedSec());
    },
    leftTxt: function () {
      var l = this.leftSec();
      var m = Math.floor(l / 60), sec = l % 60;
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    },
    /* 时间用完 = 锁定（关掉限制时永远不锁） */
    locked: function () {
      if (!S.mathConf().enable) return false;
      return this.leftSec() <= 0;
    },
    /* 每秒走一格：只在「孩子端 + 数学页 + 已进闯关」时计时 */
    tick: function () {
      if (!this.view) return false;                                  // 没进闯关不计时
      if (!global.App || global.App.mode !== 'kid') return false;
      if (!global.Kid || global.Kid.page !== 'math') return false;
      if (this.locked()) return false;
      var d = S.dateStr();
      if (this._day !== d) { this._day = d; this._acc = 0; }
      if (!S.state.mathUse || typeof S.state.mathUse !== 'object') S.state.mathUse = {};
      S.state.mathUse[d] = (S.state.mathUse[d] || 0) + 1;
      this._acc++;
      if (this._acc >= 10) { this._acc = 0; S.save(); }              // 每 10 秒落一次盘
      this.paintTime();
      if (this.locked()) {                                            // 刚好用完 → 整页重绘一次
        S.save();
        this.view = ''; this.lv = 0; this.p = null;
        if (global.App && global.App.render) global.App.render();
        var u = UI(); if (u && u.story) u.story('mathTimeUp');
        return true;
      }
      return false;
    },
    /* 只改倒计时数字，不整页重画（平板上不卡） */
    paintTime: function () {
      if (!global.document || !global.document.getElementById) return;
      var el = global.document.getElementById('mthTimeLeft');
      if (el) el.textContent = '⏳ 今天还能玩 ' + this.leftTxt();
      var bar = global.document.getElementById('mthTimeBar');
      if (bar) {
        var pct = this.quotaSec() ? Math.max(0, Math.min(100, this.leftSec() / this.quotaSec() * 100)) : 0;
        bar.style.width = pct + '%';
        bar.style.background = pct > 40 ? '#5BA82B' : (pct > 15 ? '#E0A83C' : '#C0392B');
      }
    },
    /* 时间条（挂在闯关首页 / 关卡页顶部） */
    timeBarHtml: function () {
      var c = S.mathConf();
      if (!c.enable) {
        return '<div class="card" style="background:#EAF3DE;border:2px solid #B7DFB7">' +
          '<div style="font-weight:900;color:#2F6B3A;font-size:15px">⏳ 妈妈今天没有限时，可以放心玩</div></div>';
      }
      var pct = this.quotaSec() ? Math.max(0, Math.min(100, this.leftSec() / this.quotaSec() * 100)) : 0;
      var redeemed = (c.redeemDay === S.dateStr() ? (c.redeemMin || 0) : 0);
      var bonus = (c.bonus && c.bonus[S.dateStr()]) || 0;
      var sub = '免费 ' + (c.baseMin || 10) + ' 分钟';
      if (bonus) sub += ' + 妈妈加时 ' + bonus + ' 分钟';
      if (redeemed) sub += ' + 兑换 ' + redeemed + ' 分钟';
      return '<div class="card" style="background:#FFF8E4;border:2px solid #EFDDB8">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
        '<div id="mthTimeLeft" style="font-weight:900;font-size:16px;color:#5C4322">⏳ 今天还能玩 ' + this.leftTxt() + '</div>' +
        '<div class="muted" style="font-size:12px;font-weight:800">' + sub + '</div>' +
        '</div>' +
        '<div style="height:10px;border-radius:6px;background:#00000012;overflow:hidden;margin-top:8px">' +
        '<div id="mthTimeBar" style="height:100%;width:' + pct + '%;background:' +
        (pct > 40 ? '#5BA82B' : (pct > 15 ? '#E0A83C' : '#C0392B')) + '"></div></div></div>';
    },
    /* 时间用完的锁定页 */
    lockHtml: function () {
      var c = S.mathConf();
      var can = S.mathCanRedeem() > 0;
      return '<div class="card" style="text-align:center;background:#FFF8E4;border:2px solid #EFDDB8">' +
        '<div style="font-size:44px">⏳</div>' +
        '<div style="font-weight:900;font-size:17px;color:#5C4322;margin-top:6px">今天的闯关时间用完啦</div>' +
        '<div class="muted" style="margin-top:6px;line-height:1.8">' +
        '明天一早会自动补满 ' + (c.baseMin || 10) + ' 分钟。<br>' +
        (can ? '也可以去 <b>🎁 奖励中心</b> 用积分换时间（一天只能换一次）。' : '今天已经换过时间啦，明天再来吧～') +
        '</div>' +
        '<button class="btn btn-lav mt12" data-act="tab" data-v="reward">🎁 去奖励中心</button>' +
        '</div>';
    },

    gameOf: function (id) {
      for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
      return GAMES[0];
    },

    /* 关卡唯一键 */
    key: function (game, lv, size) {
      if (game === 'sudoku') return 'sudoku:' + (size || this.sdSize) + ':' + lv;
      return game + ':' + lv;
    },
    curKey: function () { return this.key(this.game, this.lv); },

    /* ================= 解锁规则 ================= */
    sdConf: function (size) { return (MP().SD_CONF[size] || MP().SD_CONF[4]); },
    sdCleared: function (size) {
      var m = this.m(), pre = 'sudoku:' + size + ':', n = 0;
      for (var k in m.cleared) if (k.indexOf(pre) === 0 && m.cleared[k]) n++;
      return n;
    },
    sdUnlocked: function (size) {
      var m = this.m();
      if (size === 4) return true;
      if (m.sudFree) return true;
      if (size === 6) return this.sdCleared(4) >= this.sdConf(4).levels;
      if (size === 9) return this.sdCleared(6) >= this.sdConf(6).levels;
      return false;
    },
    unlocked: function (game, lv, size) {
      if (lv <= 1) return game !== 'sudoku' || this.sdUnlocked(size || this.sdSize);
      if (game === 'sudoku') {
        if (!this.sdUnlocked(size || this.sdSize)) return false;
        return !!this.m().cleared['sudoku:' + (size || this.sdSize) + ':' + (lv - 1)];
      }
      return !!this.m().cleared[game + ':' + (lv - 1)];
    },
    /* 数独三段全通 = 毕业，之后三种尺寸随便选 */
    sudokuGraduated: function () {
      return this.sdCleared(4) >= this.sdConf(4).levels &&
        this.sdCleared(6) >= this.sdConf(6).levels &&
        this.sdCleared(9) >= this.sdConf(9).levels;
    },

    /* ================= 统计 ================= */
    gameCleared: function (id) {
      var m = this.m(), n = 0;
      if (id === 'sudoku') {
        n = this.sdCleared(4) + this.sdCleared(6) + this.sdCleared(9);
      } else {
        var pre = id + ':';
        for (var k in m.cleared) if (k.indexOf(pre) === 0 && m.cleared[k]) n++;
      }
      return n;
    },
    totalStars: function () {
      var m = this.m(), n = 0;
      for (var k in m.stars) n += (m.stars[k] || 0);
      return n;
    },
    totalLevels: function () {
      return 30 + 24 + (15 + 30 + 20) + 32;
    },
    starsOfGame: function (id) {
      var m = this.m(), n = 0;
      for (var k in m.stars) if (k.indexOf(id + ':') === 0) n += (m.stars[k] || 0);
      return n;
    },

    /* ================= 出题 / 开一关 ================= */
    open: function (game, lv) {
      this.game = game;
      this.lv = lv;
      this.drag = null;
      var M = MP();
      if (game === 'seq') {
        this.p = M.seq(lv);
        this.st = { err: 0, hint: 0, tries: 0, filled: null, dead: {} };
      } else if (game === 'p24') {
        this.p = M.p24(lv);
        this.st = { err: 0, hint: 0, tries: 0, tokens: [], used: {} };
      } else if (game === 'sudoku') {
        this.p = M.sudoku(this.sdSize, lv);
        this.st = { err: 0, hint: 0, tries: 0, grid: this.p.puzzle.slice(), sel: -1 };
      } else {
        this.p = M.brain(lv);
        var bst = { err: 0, hint: 0, tries: 0, pick: -1, dead: {} };
        if (this.p.type === 'maze') { bst.pos = 0; bst.path = [0]; }
        this.st = bst;
      }
    },

    /* ================= 判星 ================= */
    grade: function () {
      var s = this.st;
      if (!s) return 1;
      if (s.hint === 0 && s.err === 0 && s.tries === 0) return 3;
      if (s.hint <= 1 && s.err <= 2 && s.tries <= 1) return 2;
      return 1;
    },
    starTxt: function (n) {
      n = n || 0;
      return '⭐'.repeat(n) + '☆'.repeat(3 - n);
    },

    /* ================= 通关结算 ================= */
    win: function (silent) {
      var m = this.m(), k = this.curKey(), M = MP();
      var first = !m.cleared[k];
      var stars = this.grade();
      var prev = m.stars[k] || 0;
      m.cleared[k] = 1;
      m.stars[k] = Math.max(prev, stars);      /* 只升不降 */
      if (m.hintLeft < 5) m.hintLeft++;        /* 过关回一滴提示 */

      var water = 0, sun = 0, extra = '';
      if (first) water += 1;
      if (stars === 3 && prev < 3) water += 1;
      if (stars === 3) {
        m.streak = (m.streak || 0) + 1;
        if (m.streak > (m.bestStreak || 0)) m.bestStreak = m.streak;
        if (m.streak % 3 === 0) { water += 2; extra = '连胜 ' + m.streak + ' 关，额外 +2 💧！'; }
      } else {
        m.streak = 0;
      }
      /* 解锁新段位 */
      var unlockMsg = '';
      if (this.game === 'sudoku') {
        if (this.sdSize === 4 && this.sdCleared(4) >= this.sdConf(4).levels && !m.got6) {
          m.got6 = 1; water += 5; unlockMsg = '🎉 4×4 全通！6×6 数独解锁啦，+5 💧';
        } else if (this.sdSize === 6 && this.sdCleared(6) >= this.sdConf(6).levels && !m.got9) {
          m.got9 = 1; water += 5; unlockMsg = '🎉 6×6 全通！9×9 数独解锁啦，+5 💧';
        } else if (this.sudokuGraduated() && !m.sudFree) {
          m.sudFree = 1; water += 10; unlockMsg = '🏆 数独毕业！4×4 / 6×6 / 9×9 以后随便选，+10 💧';
        }
      }
      /* 每 10 颗星 +3 阳光 */
      var ts = this.totalStars(), step = Math.floor(ts / 10);
      if (step > (m.sunStep || 0)) { sun = (step - m.sunStep) * 3; m.sunStep = step; }

      if (water > 0) E.addWater(water, '数学闯关 · ' + this.gameName() + ' 第 ' + this.lv + ' 关', S.dateStr());
      if (sun > 0) E.addSun(sun, '数学闯关累计 ' + ts + ' 颗星', S.dateStr());
      this.save();

      if (silent) return;
      var self = this;
      var txt = '拿到 ' + this.starTxt(stars) + '\n';
      if (water) txt += '获得 💧 ' + water + ' 水滴\n';
      if (sun) txt += '获得 ☀️ ' + sun + ' 阳光（星星满 10 颗的奖励）\n';
      if (extra) txt += extra + '\n';
      if (unlockMsg) txt += unlockMsg + '\n';
      if (!first && stars <= prev) txt += '\n这一关之前已经拿过 ' + this.starTxt(prev) + '，星星不会掉哦';
      UI().modal({
        emoji: stars === 3 ? '🏆' : (stars === 2 ? '🌻' : '🌟'),
        title: stars === 3 ? '三星通关！' : (stars === 2 ? '过关啦' : '过关啦'),
        text: txt,
        buttons: [
          { text: '再玩一次', cls: 'btn-ghost', onClick: function (c) { c(); self.open(self.game, self.lv); global.App.render(); } },
          { text: '下一关 →', cls: 'btn-green', onClick: function (c) { c(); self.next(); } }
        ]
      });
    },
    next: function () {
      var max = this.game === 'sudoku' ? this.sdConf(this.sdSize).levels : this.maxLevels();
      if (this.lv >= max) { this.lv = 0; this.p = null; global.App.afterChange(); return; }
      this.open(this.game, this.lv + 1);
      global.App.afterChange();
    },
    maxLevels: function () {
      if (this.game === 'seq') return MP().SEQ_LEVELS;
      if (this.game === 'p24') return MP().P24_LEVELS;
      if (this.game === 'brain') return MP().BRAIN_LEVELS;
      return this.sdConf(this.sdSize).levels;
    },
    gameName: function () {
      for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === this.game) return GAMES[i].name;
      return '闯关';
    },

    /* 答错：只计数，不惩罚 */
    wrong: function (msg) {
      this.st.err++;
      if (this.st.err >= 3 && this.st.err < 4) { /* 第三次错：给个小提醒 */ }
      this.toast(msg || '差一点，再想想～');
      return true;
    },
    toast: function (t) { var u = UI(); if (u && u.toast) u.toast(t); },

    /* ================= 提示 ================= */
    useHint: function () {
      var m = this.m();
      if (m.hintLeft <= 0) {
        this.toast('今天的 💡 用完啦，先去通一关就能再得一个');
        return true;
      }
      m.hintLeft--;
      this.st.hint++;
      this.save();
      var p = this.p, s = this.st;
      if (this.game === 'seq') {
        var wrongOps = p.opts.map(function (o, i) { return i; }).filter(function (i) { return p.opts[i] !== p.answer; });
        if (s.hint === 1) {
          shuffleInPlace(wrongOps);
          s.dead[wrongOps[0]] = 1; s.dead[wrongOps[1]] = 1;
          this.toast('帮你去掉两个不对的，剩下的二选一');
        } else {
          s.filled = p.answer;
          this.toast('答案是 ' + p.answer + '，这次算 1 颗星');
          this.finishWithHint();
        }
      } else if (this.game === 'p24') {
        if (s.hint === 1) {
          this.toast('第一步：' + (p.steps[0] || '先想想哪两个数字能凑成整数'));
        } else {
          this.toast('一种解法：' + prettyExpr(p.expr) + ' = 24');
          this.finishWithHint();
        }
      } else if (this.game === 'sudoku') {
        var h = MP().sudokuHint(s.grid, p.solution, p.size);
        if (!h) { this.toast('已经填完啦，点「检查」看看'); return true; }
        s.grid[h.idx] = h.val;
        s.sel = h.idx;
        this.toast('第 ' + (h.row + 1) + ' 行第 ' + (h.col + 1) + ' 列填 ' + h.val);
        if (this.sudokuDone()) this.win();
      } else {
        if (s.hint === 1) {
          this.toast(p.why);
        } else {
          this.toast('答案是 ' + p.answer);
          this.finishWithHint();
        }
      }
      return true;
    },
    /* 用第二次提示直接过关：保底 1 星 */
    finishWithHint: function () {
      this.st.tries = 9;
      this.win();
    },
    sudokuDone: function () {
      var g = this.st.grid, sol = this.p.solution;
      for (var i = 0; i < sol.length; i++) if (g[i] !== sol[i]) return false;
      return true;
    },
    explain: function () {
      var p = this.p;
      var txt = '';
      if (this.game === 'seq') txt = '规律：' + p.why + '\n所以空格里是 ' + p.answer;
      else if (this.game === 'p24') txt = '一种解法：' + prettyExpr(p.expr) + ' = 24\n' + (p.steps || []).join('，');
      else if (this.game === 'sudoku') txt = '别急，先看只有一种可能填法的格子；实在不行点 💡 帮你填一个';
      else txt = p.why;
      UI().modal({ emoji: '🧸', title: '这一关这样想', text: txt, buttons: [{ text: '我再试试', cls: 'btn-green', onClick: function (c) { c(); } }] });
      return true;
    },

    /* =========================================================
       渲染
       ========================================================= */
    panel: function () {
      this.m();
      var bar = '<div style="padding:12px 14px 0">' + this.timeBarHtml() + '</div>';
      if (this.locked()) {
        /* 时间用完：只留时间条 + 锁页（不进关卡，也不计时） */
        this.view = ''; this.lv = 0; this.p = null;
        return bar + '<div style="padding:0 14px">' + this.lockHtml() + '</div>';
      }
      return bar + (this.view ? this.gameHtml() : this.homeHtml());
    },

    homeHtml: function () {
      var m = this.m(), self = this;
      var ts = this.totalStars();
      var head = '<div class="card card-cream">' +
        '<div class="sec-title">🎮 数学趣味闯关 · 僵尸防线</div>' +
        '<div class="muted">四个世界，四条防线。答对一题 = 发射一颗豌豆，把僵尸打回去！</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
        tagBox('⭐ ' + ts + ' / ' + (this.totalLevels() * 3), '总星星', '#FFF3DC', '#E0A83C') +
        tagBox('💡 ' + m.hintLeft + ' / 5', '今日提示', '#E7F3FF', '#2E7CA8') +
        tagBox('🔥 ' + (m.streak || 0) + ' 连胜', '连续三星', '#EAF3DE', '#3B6D11') +
        '</div></div>';

      var cards = GAMES.map(function (g) {
        var done = self.gameCleared(g.id);
        var st = self.starsOfGame(g.id);
        var sub = '';
        if (g.id === 'sudoku') {
          sub = '4×4 ' + self.sdCleared(4) + '/15　6×6 ' + (self.sdUnlocked(6) ? self.sdCleared(6) + '/30' : '🔒') +
            '　9×9 ' + (self.sdUnlocked(9) ? self.sdCleared(9) + '/20' : '🔒') +
            (self.sudokuGraduated() ? '　🏆' : '');
        } else {
          sub = '已通关 ' + done + ' / ' + g.levels + ' 关';
        }
        var pct = Math.round(done / g.levels * 100);
        /* 防线小动画：已通关比例越高，植物越多、僵尸越靠后 */
        var guard = '';
        for (var q = 0; q < 5; q++) guard += (q * 20 < pct ? g.plant : '·');
        var zx = Math.max(0, 100 - pct);
        return '<div class="card mt8" data-act="mthOpen" data-v="' + g.id + '" ' +
          'style="background:' + g.bg + ';border:2px solid ' + g.color + '33">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:26px">' + g.emoji + '</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:900;font-size:16px;color:' + g.color + '">' + g.name + '　<span style="font-size:12px">⭐' + st + '</span></div>' +
          '<div class="muted" style="font-size:12px">' + g.desc + '</div>' +
          '<div class="muted" style="font-size:11px;font-weight:800;margin-top:2px">' + g.world + '</div>' +
          '<div class="muted" style="font-size:12px;font-weight:800;margin-top:2px">' + sub + '</div>' +
          /* 防线：左边一排植物，右边僵尸按进度后退 */
          '<div style="margin-top:6px;height:22px;border-radius:8px;background:#00000010;position:relative;overflow:hidden">' +
          '<div style="position:absolute;left:6px;top:2px;font-size:14px;letter-spacing:1px">' + guard + '</div>' +
          '<div style="position:absolute;top:2px;left:' + (zx - 8) + '%;font-size:14px">' + g.zombie + '</div>' +
          '</div>' +
          '<div style="height:8px;border-radius:6px;background:#00000012;overflow:hidden;margin-top:4px">' +
          '<div style="height:100%;width:' + pct + '%;background:' + g.color + '"></div></div>' +
          '</div><div style="font-size:20px;color:' + g.color + '">›</div></div></div>';
      }).join('');

      return '<div style="padding:12px 14px 0">' + head + cards +
        '<div class="card mt8"><div class="sec-title" style="font-size:14px">🌟 怎么玩</div>' +
        '<div class="muted" style="line-height:1.9">' +
        '· 一次过、不用提示、不写错 = <b>3 颗星</b>；用 1 次提示或错 1-2 次 = 2 颗星；其余 = 1 颗星<br>' +
        '· <b>星星只升不降</b>，重玩不会掉星；答错不扣任何东西，可以一直试<br>' +
        '· 每关有 2 次提示，每天一共 5 个 💡，通关一关回 1 个<br>' +
        '· 首次通关 +1 💧，三星再 +1 💧，连着 3 关三星 +2 💧；星星每满 10 颗 +3 ☀️' +
        '</div></div></div>';
    },

    gameHtml: function () {
      var g = null;
      for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === this.game) g = GAMES[i];
      if (!g) return '';
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:8px" data-act="mthBack">← 返回闯关首页</button>';
      var head = '<div style="padding:12px 14px 0">' + back +
        '<div class="wood-title" style="background:linear-gradient(180deg,' + g.color + ',#8B5E3C)">' + g.emoji + ' ' + g.name + '</div></div>';

      if (this.lv <= 0) {
        return head + '<div style="padding:12px 14px 0">' + this.levelListHtml() + '</div>';
      }
      return head + '<div style="padding:12px 14px 0">' + this.playHtml() + '</div>';
    },

    levelListHtml: function () {
      var self = this, html = '';
      if (this.game === 'sudoku') {
        var sizes = [4, 6, 9];
        html += '<div style="display:flex;gap:8px;margin-bottom:10px">' +
          sizes.map(function (z) {
            var ok = self.sdUnlocked(z);
            var on = self.sdSize === z;
            return '<div data-act="mthSdSize" data-v="' + z + '" style="flex:1;text-align:center;padding:10px 4px;border-radius:12px;' +
              'border:3px solid ' + (on ? '#5BA82B' : '#D8CDB4') + ';background:' + (ok ? (on ? '#E9F7E9' : '#FFF8E4') : '#F0EDE6') + ';' +
              'font-weight:900;color:' + (ok ? '#5C4322' : '#B0A795') + ';min-height:52px">' +
              z + '×' + z + '<div style="font-size:11px;font-weight:700">' + (ok ? self.sdCleared(z) + '/' + self.sdConf(z).levels : '🔒 未解锁') + '</div></div>';
          }).join('') + '</div>';
        if (!this.sdUnlocked(this.sdSize)) {
          return html + '<div class="card"><div class="empty" style="padding:16px"><span class="e-emoji">🔒</span>' +
            '把 ' + (this.sdSize === 6 ? '4×4 的 15 关' : '6×6 的 30 关') + '全部通关，就解锁这一段啦</div></div>';
        }
      }
      var max = this.maxLevels();
      var btns = '';
      var g = this.gameOf(this.game);
      for (var l = 1; l <= max; l++) {
        var ok = this.unlocked(this.game, l);
        var k = this.key(this.game, l);
        var st = this.m().stars[k] || 0;
        var done = this.m().cleared[k];
        /* 草坪地块：通关 = 种上植物（星越多植物越大），可玩 = 僵尸等着，未解锁 = 墓碑 */
        var icon, sub2, bg, bd;
        if (!ok) { icon = '🪦'; sub2 = '未解锁'; bg = '#F2EFE8'; bd = '#DDD5C4'; }
        else if (done) {
          icon = (st >= 3 ? g.plant : (st === 2 ? '🌿' : '🌱'));
          sub2 = this.starTxt(st).slice(0, 3);
          bg = '#E9F7E9'; bd = '#5BA82B';
        } else { icon = g.zombie; sub2 = '第 ' + l + ' 关'; bg = '#FFF8E4'; bd = '#E0A83C'; }
        btns += '<div data-act="mthLv" data-v="' + l + '" style="width:31%;min-height:68px;border-radius:14px;' +
          'border:3px solid ' + bd + ';background:' + bg + ';' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;color:#5C4322">' +
          '<div style="font-size:20px;line-height:1.1">' + icon + '</div>' +
          '<div style="font-size:11px;color:' + (ok ? '#5C4322' : '#B0A795') + '">' + sub2 + '</div></div>';
      }
      var tip = '<div class="muted" style="margin-bottom:8px">通关一关就解锁下一关，星星只升不降</div>';
      if (this.game === 'sudoku') {
        tip = '<div class="muted" style="margin-bottom:8px">给定数字越少越难；' + this.sdSize + '×' + this.sdSize +
          ' 第 1 关给 ' + this.sdConf(this.sdSize).givens(1) + ' 个数，最后一关给 ' +
          this.sdConf(this.sdSize).givens(this.sdConf(this.sdSize).levels) + ' 个数</div>';
      }
      return tip + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + btns + '</div>';
    },

    playHtml: function () {
      var p = this.p, s = this.st;
      if (!p) return '';
      var self = this;
      var bar = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">' +
        '<span class="task-tag">第 ' + this.lv + ' 关</span>' +
        '<span class="task-tag water">💡 还剩 ' + this.m().hintLeft + ' 个</span>' +
        '<span class="task-tag">本次错 ' + s.err + ' 次</span>' +
        '</div>';

      /* ---------- PVZ 战场条：僵尸按答错次数往前挪，答对就打回去 ---------- */
      var g = this.gameOf(this.game);
      var steps = Math.min(4, s.err || 0);
      var zpos = 80 - steps * 19;                       // 80% → 4%
      var shots = '';
      for (var q = 0; q < 3; q++) shots += (q < 3 - steps ? '💚' : '🤍');
      var battle = '<div style="border-radius:14px;background:linear-gradient(180deg,#EAF3DE,#D9EBCA);' +
        'border:2px solid #B7DFB7;padding:8px 10px;margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:6px;position:relative;height:34px">' +
        '<div style="font-size:18px;letter-spacing:-2px">' + g.plant + g.plant + g.plant + '</div>' +
        '<div style="flex:1;position:relative;height:26px;border-radius:8px;background:#C9E4A9;overflow:hidden">' +
        '<div style="position:absolute;left:' + zpos + '%;top:1px;font-size:19px;' +
        'transition:left .35s">' + g.zombie + '</div></div>' +
        '<div style="font-size:20px">🏠</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
        '<div class="muted" style="font-size:12px;font-weight:800">' +
        (steps === 0 ? '僵尸还没出发，答对就把它打回去！' : '僵尸前进了 ' + steps + ' 格，答对就能打回去') +
        '</div>' +
        '<div style="font-size:13px">' + shots + '</div>' +
        '</div></div>';

      var body = '';
      if (this.game === 'seq') body = this.seqHtml();
      else if (this.game === 'p24') body = this.p24Html();
      else if (this.game === 'sudoku') body = this.sudokuHtml();
      else body = this.brainHtml();

      var foot = '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn-lav" style="flex:1;min-width:120px;min-height:52px;font-size:15px" data-act="mthHint">💡 提示</button>' +
        (s.err >= 4 ? '<button class="btn btn-wood" style="flex:1;min-width:120px;min-height:52px;font-size:15px" data-act="mthWhy">🧸 看讲解</button>' : '') +
        '<button class="btn btn-ghost" style="flex:1;min-width:120px;min-height:52px;font-size:15px" data-act="mthReset">🔄 重来</button>' +
        '</div>';
      return '<div class="card">' + bar + battle + body + foot + '</div>';
    },

    /* ---------- 找规律 ---------- */
    seqHtml: function () {
      var p = this.p, s = this.st, self = this;
      var row = p.items.map(function (it, i) {
        if (i === p.blank) {
          var val = s.filled;
          return '<div id="seqBlank" onpointerup="MathGame.dropSeq()" style="width:56px;height:56px;border-radius:12px;' +
            'border:3px dashed ' + (val != null ? '#5BA82B' : '#E0A83C') + ';background:' + (val != null ? '#E9F7E9' : '#FFFDF5') + ';' +
            'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:' + (p.kind === 'shape' ? '18px' : '22px') + ';color:#5C4322">' +
            (val != null ? val : '?') + '</div>';
        }
        return '<div style="min-width:44px;height:56px;padding:0 6px;border-radius:12px;border:2px solid #EFDDB8;background:#FFF8E4;' +
          'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:' + (p.kind === 'shape' ? '18px' : '22px') + ';color:#5C4322">' +
          it + '</div>';
      }).join('<div style="font-size:18px;color:#C9A961">›</div>');

      var opts = p.opts.map(function (o, i) {
        var dead = s.dead[i];
        return '<div data-act="mthSeq" data-v="' + i + '" onpointerdown="MathGame.dragStartSeq(' + i + ')" onpointerup="MathGame.drag=null" ' +
          'style="min-width:62px;min-height:58px;padding:6px 12px;border-radius:14px;border:3px solid ' + (dead ? '#DDD5C4' : '#E0A83C') + ';' +
          'background:' + (dead ? '#F2EFE8' : '#FFF8E4') + ';display:flex;align-items:center;justify-content:center;' +
          'font-weight:900;font-size:' + (p.kind === 'shape' ? '18px' : '22px') + ';color:' + (dead ? '#B0A795' : '#5C4322') + '">' +
          (dead ? '✕' : o) + '</div>';
      }).join('');

      return '<div style="overflow-x:auto;padding:6px 0"><div style="display:flex;align-items:center;gap:6px;min-width:max-content">' +
        row + '</div></div>' +
        '<div class="muted" style="font-size:12px">把这些数字（图形）按规律排好，中间空了一格</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' + opts + '</div>' +
        '<div class="muted" style="margin-top:8px;font-size:12px">点一下就能填进空格，也可以按住拖进去</div>';
    },

    /* ---------- 24 点 ---------- */
    p24Html: function () {
      var p = this.p, s = this.st;
      /* 数字 = 豌豆，点了就装进炮筒（变灰） */
      var nums = p.nums.map(function (n, i) {
        var used = s.used[i];
        return '<div data-act="mth24n" data-v="' + i + '" style="width:60px;height:60px;border-radius:50%;' +
          'border:3px solid ' + (used ? '#DDD5C4' : '#5BA82B') + ';background:' + (used ? '#F2EFE8' : '#E4F3D2') + ';' +
          'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;color:' + (used ? '#B0A795' : '#3B6D11') + '">' +
          (used ? '·' : n) + '</div>';
      }).join('');

      var exprTxt = s.tokens.map(function (t) {
        if (t.t === 'n') return t.v;
        return ({ '+': '+', '-': '−', '*': '×', '/': '÷', '(': '(', ')': ')' })[t.v];
      }).join(' ');

      var keys = ['+', '-', '*', '/', '(', ')'].map(function (o) {
        var sym = ({ '+': '+', '-': '−', '*': '×', '/': '÷', '(': '(', ')': ')' })[o];
        return '<div data-act="mth24o" data-v="' + o + '" style="width:56px;height:56px;border-radius:12px;border:3px solid #C9A961;' +
          'background:#FFF8E4;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#5C4322">' +
          sym + '</div>';
      }).join('');

      return '<div style="display:flex;gap:8px;margin-bottom:10px">' + nums + '</div>' +
        '<div style="min-height:58px;border-radius:14px;border:3px solid #EFDDB8;background:#FFFCF2;' +
        'display:flex;align-items:center;padding:0 12px;font-weight:900;font-size:22px;color:#5C4322">' +
        (exprTxt || '<span style="font-size:14px;color:#B0A795">点数字和符号，把算式拼出来</span>') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' + keys +
        '<div data-act="mth24del" style="width:56px;height:56px;border-radius:12px;border:3px solid #C9A961;background:#FFF8E4;' +
        'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#5C4322">⌫</div>' +
        '<div data-act="mth24clr" style="width:56px;height:56px;border-radius:12px;border:3px solid #C9A961;background:#FFF8E4;' +
        'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#5C4322">清空</div></div>' +
        '<button class="btn btn-green mt12" data-act="mth24go">🌰 装填完毕，发射！</button>' +
        '<div class="muted" style="margin-top:8px;font-size:12px">四颗豌豆都要装进炮筒，每颗用一次；除法要能整除</div>';
    },

    /* ---------- 数独 ---------- */
    sudokuHtml: function () {
      var p = this.p, s = this.st, M = MP();
      var N = p.size, box = p.box;
      var cell = N === 9 ? 34 : (N === 6 ? 46 : 60);
      var html = '<div style="display:inline-block;border:3px solid #5C4322;border-radius:10px;overflow:hidden;background:#5C4322">';
      for (var r = 0; r < N; r++) {
        html += '<div style="display:flex">';
        for (var c = 0; c < N; c++) {
          var i = r * N + c;
          var given = p.puzzle[i] > 0;
          var v = s.grid[i];
          var sel = s.sel === i;
          var rt = (r % box.br === 0 ? 3 : 1), lf = (c % box.bc === 0 ? 3 : 1);
          var bdr = 'border-top:' + rt + 'px solid #5C4322;border-left:' + lf + 'px solid #5C4322;';
          html += '<div data-act="mthSdCell" data-v="' + i + '" style="width:' + cell + 'px;height:' + cell + 'px;' + bdr +
            'background:' + (sel ? '#FFF0C2' : (given ? '#F3E7CF' : '#FFFDF5')) + ';' +
            'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:' + (cell * 0.45) + 'px;' +
            'color:' + (given ? '#5C4322' : '#2E7CA8') + '">' + (v || '') + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';

      var pad = '';
      for (var d = 1; d <= N; d++) {
        pad += '<div data-act="mthSdNum" data-v="' + d + '" style="width:' + (N === 9 ? 40 : 52) + 'px;height:' + (N === 9 ? 40 : 52) + 'px;' +
          'border-radius:12px;border:3px solid #C9A961;background:#FFF8E4;display:flex;align-items:center;justify-content:center;' +
          'font-weight:900;font-size:20px;color:#5C4322">' + d + '</div>';
      }
      /* 草坪进度：每填一格种一棵植物，填够就挡住僵尸 */
      var total = N * N, filled = 0;
      for (var f = 0; f < total; f++) if (s.grid[f] > 0) filled++;
      var planted = Math.round(filled / total * 5);
      var lawn = '';
      for (var q2 = 0; q2 < 5; q2++) lawn += (q2 < planted ? '🥜' : '🟫');
      var prog = '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding:6px 10px;' +
        'border-radius:12px;background:#EAF3DE;border:2px solid #B7DFB7">' +
        '<div style="font-size:16px;letter-spacing:-1px">' + lawn + '</div>' +
        '<div class="muted" style="font-size:12px;font-weight:800">草坪 ' + filled + '/' + total +
        ' · 种下 ' + planted + ' 棵，站满就能挡住僵尸</div></div>';

      return '<div style="text-align:center">' + html + '</div>' + prog +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px">' + pad +
        '<div data-act="mthSdErase" style="width:52px;height:52px;border-radius:12px;border:3px solid #C9A961;background:#FFF8E4;' +
        'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#5C4322">擦掉</div></div>' +
        '<div class="muted" style="text-align:center;margin-top:8px;font-size:12px">先点格子，再点数字；棕色的是题目给的数字，不能改</div>' +
        '<button class="btn btn-green mt12" data-act="mthSdCheck">检查一下，全填对了吗</button>';
    },

    /* ---------- 思维拓展 ---------- */
    brainHtml: function () {
      var p = this.p, s = this.st;
      if (p.type === 'balance') return this.balanceHtml(p, s);
      if (p.type === 'blocks') return this.blocksHtml(p, s);
      if (p.type === 'net') return this.netHtml(p, s);
      return this.mazeHtml(p, s);
    },
    optRow: function (p, s, actName) {
      var self = this;
      return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
        p.opts.map(function (o, i) {
          var dead = s.dead[i];
          return '<div data-act="' + actName + '" data-v="' + i + '" style="min-width:64px;min-height:56px;padding:6px 14px;' +
            'border-radius:14px;border:3px solid ' + (dead ? '#DDD5C4' : '#E0A83C') + ';background:' + (dead ? '#F2EFE8' : '#FFF8E4') + ';' +
            'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:' + (dead ? '#B0A795' : '#5C4322') + '">' +
            (dead ? '✕' : o) + '</div>';
        }).join('') + '</div>';
    },
    balanceHtml: function (p, s) {
      var eqs = p.eqs.map(function (e) {
        return '<div style="background:#FFFCF2;border:2px solid #EFDDB8;border-radius:12px;padding:10px;margin:6px 0;' +
          'font-size:22px;font-weight:900;color:#5C4322;text-align:center">' +
          e.left.join(' + ') + ' = ' + e.sum + '</div>';
      }).join('');
      return eqs +
        '<div style="text-align:center;font-weight:900;font-size:17px;color:#5C4322;margin-top:10px">' +
        '那么 ' + p.askEmo + ' = ？</div>' +
        this.optRow(p, s, 'mthBrainOpt');
    },
    blocksHtml: function (p, s) {
      return '<div style="text-align:center">' + isoStacks(p.h, p.n) + '</div>' +
        '<div style="text-align:center;font-weight:900;font-size:16px;color:#5C4322;margin-top:8px">一共有几个小方块？（挡住的也要数）</div>' +
        this.optRow(p, s, 'mthBrainOpt');
    },
    netHtml: function (p, s) {
      return '<div style="text-align:center">' + netSvg(p) + '</div>' +
        '<div style="text-align:center;font-weight:900;font-size:16px;color:#5C4322;margin-top:8px">' +
        '折成正方体后，和 ' + p.askMark + ' <b>相对</b>的面是哪个？</div>' +
        this.optRow(p, s, 'mthBrainOpt');
    },
    mazeHtml: function (p, s) {
      var n = p.n, self = this;
      var size = n === 6 ? 44 : 52;
      var html = '<div style="display:inline-block;border:3px solid #5C4322;border-radius:10px;overflow:hidden;background:#5C4322">';
      for (var r = 0; r < n; r++) {
        html += '<div style="display:flex">';
        for (var c = 0; c < n; c++) {
          var i = r * n + c;
          var isGoal = i === p.goal, isStart = i === p.start, at = s.pos === i;
          var bg = at ? '#FFF0C2' : (isGoal ? '#E9F7E9' : '#FFFDF5');
          html += '<div data-act="mthMaze" data-v="' + i + '" style="width:' + size + 'px;height:' + size + 'px;' +
            'border-top:1px solid #5C4322;border-left:1px solid #5C4322;background:' + bg + ';' +
            'display:flex;align-items:center;justify-content:center;font-weight:900;font-size:' + (size * 0.4) + 'px;color:#5C4322">' +
            (isGoal ? '🏁' : (isStart && !at ? '▶' : (i === p.goal ? '' : p.grid[i]))) + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
      return '<div style="text-align:center">' + html + '</div>' +
        '<div class="muted" style="text-align:center;margin-top:8px;font-size:13px">' +
        '从 ▶ 出发，每次只能<b>上下左右直着</b>走「格子里写的步数」，走到 🏁 就赢</div>' +
        '<div style="text-align:center;margin-top:6px;font-weight:800;color:#5C4322">已经走了 ' + (s.path.length - 1) + ' 步</div>' +
        '<button class="btn btn-ghost mt12" data-act="mthMazeReset">↩️ 回到起点</button>';
    },

    /* =========================================================
       动作
       ========================================================= */
    act: function (name, v) {
      var m = this.m(), M = MP();
      if (name === 'mthOpen') {
        this.view = v; this.game = v; this.lv = 0; this.p = null;
        if (v === 'sudoku' && !this.sdUnlocked(this.sdSize)) this.sdSize = 4;
        return true;
      }
      if (name === 'mthBack') {
        if (this.lv > 0) { this.lv = 0; this.p = null; return true; }
        this.view = ''; this.game = ''; this.p = null;
        return true;
      }
      if (name === 'mthSdSize') {
        if (!this.sdUnlocked(parseInt(v, 10))) { this.toast('这一段还没解锁哦'); return true; }
        this.sdSize = parseInt(v, 10); this.lv = 0; this.p = null;
        return true;
      }
      if (name === 'mthLv') {
        var lv = parseInt(v, 10);
        if (!this.unlocked(this.game, lv)) { this.toast('先把前一关过了就能来啦'); return true; }
        this.open(this.game, lv);
        return true;
      }
      if (name === 'mthReset') { this.open(this.game, this.lv); return true; }
      if (name === 'mthHint') { return this.useHint(); }
      if (name === 'mthWhy') { return this.explain(); }

      if (!this.p) return false;

      /* ---- 找规律 ---- */
      if (name === 'mthSeq') {
        var i = parseInt(v, 10);
        if (this.st.dead[i]) return true;
        this.st.filled = this.p.opts[i];
        if (this.st.filled === this.p.answer) this.win();
        else { this.st.tries++; this.st.err++; this.st.filled = null; this.toast('再看看前面的规律～'); }
        return true;
      }
      /* ---- 24 点 ---- */
      if (name === 'mth24n') {
        var ni = parseInt(v, 10);
        if (this.st.used[ni]) return true;
        this.st.used[ni] = 1;
        this.st.tokens.push({ t: 'n', v: this.p.nums[ni] });
        return true;
      }
      if (name === 'mth24o') { this.st.tokens.push({ t: 'o', v }); return true; }
      if (name === 'mth24del') {
        var tk = this.st.tokens.pop();
        if (tk && tk.t === 'n') {
          for (var q = 0; q < this.p.nums.length; q++) {
            if (this.st.used[q] && this.p.nums[q] === tk.v) { delete this.st.used[q]; break; }
          }
        }
        return true;
      }
      if (name === 'mth24clr') { this.st.tokens = []; this.st.used = {}; return true; }
      if (name === 'mth24go') {
        var r = M.check24(this.p.nums, this.st.tokens);
        if (r.ok) { this.win(); return true; }
        this.st.tries++; this.st.err++;
        this.toast(r.msg);
        return true;
      }
      /* ---- 数独 ---- */
      if (name === 'mthSdCell') {
        var ci = parseInt(v, 10);
        if (this.p.puzzle[ci] > 0) return true;
        this.st.sel = ci;
        return true;
      }
      if (name === 'mthSdNum') {
        if (this.st.sel < 0) { this.toast('先点一个空格子'); return true; }
        var cell = this.st.sel;
        if (this.p.puzzle[cell] > 0) return true;
        this.st.grid[cell] = parseInt(v, 10);
        this.st.sel = -1;
        if (this.sudokuDone()) this.win();
        return true;
      }
      if (name === 'mthSdErase') {
        if (this.st.sel >= 0 && !this.p.puzzle[this.st.sel]) this.st.grid[this.st.sel] = 0;
        return true;
      }
      if (name === 'mthSdCheck') {
        var bad = M.sudokuWrong(this.st.grid, this.p.solution);
        if (!bad.length) { this.win(); return true; }
        var empty = 0;
        for (var z = 0; z < this.st.grid.length; z++) if (!this.st.grid[z]) empty++;
        this.st.tries++; this.st.err++;
        this.toast(empty ? ('还有 ' + empty + ' 个格子空着') : ('有 ' + bad.length + ' 个格子不对，再看看'));
        return true;
      }
      /* ---- 思维拓展 ---- */
      if (name === 'mthBrainOpt') {
        var oi = parseInt(v, 10);
        if (this.st.dead[oi]) return true;
        if (this.p.opts[oi] === this.p.answer) this.win();
        else {
          this.st.tries++; this.st.err++; this.st.dead[oi] = 1;
          this.toast('差一点，换个思路～');
        }
        return true;
      }
      if (name === 'mthMaze') {
        var target = parseInt(v, 10), n = this.p.n;
        var cur = this.st.pos, k = this.p.grid[cur];
        var cr = Math.floor(cur / n), cc = cur % n;
        var tr = Math.floor(target / n), tc = target % n;
        var okMove = (cr === tr && Math.abs(cc - tc) === k) || (cc === tc && Math.abs(cr - tr) === k);
        if (!okMove) { this.st.err++; this.toast('只能上下左右直着走 ' + k + ' 格哦'); return true; }
        this.st.pos = target; this.st.path.push(target);
        if (target === this.p.goal) { this.win(); return true; }
        return true;
      }
      if (name === 'mthMazeReset') { this.st.pos = 0; this.st.path = [0]; return true; }

      return false;
    },

    /* 拖拽（找规律：把候选拖进空格） */
    dragStartSeq: function (i) { this.drag = i; },
    dropSeq: function () {
      if (this.drag == null) return;
      var i = this.drag; this.drag = null;
      this.act('mthSeq', String(i));
      if (global.App && global.App.render) global.App.render();
    }
  };

  /* ---------- 小工具 ---------- */
  function shuffleInPlace(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function tagBox(main, sub, bg, color) {
    return '<div style="flex:1;min-width:96px;background:' + bg + ';border:2px solid ' + color + '55;border-radius:12px;' +
      'padding:8px;text-align:center">' +
      '<div style="font-weight:900;color:' + color + ';font-size:15px">' + main + '</div>' +
      '<div style="font-size:11px;color:' + color + ';opacity:.8">' + sub + '</div></div>';
  }
  function prettyExpr(e) {
    return String(e).replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' − ');
  }
  /* 数方块：等轴测画法 */
  function isoStacks(h, n) {
    var a = 20, b = 11, hh = 15, unit = 1;
    var cubes = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        for (var k = 0; k < h[r][c]; k++) cubes.push({ r: r, c: c, k: k, d: r + c });
      }
    }
    cubes.sort(function (x, y) { return (x.d - y.d) || (x.k - y.k); });
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    cubes.forEach(function (q) {
      var sx = (q.c - q.r) * a, sy = (q.r + q.c) * b - q.k * hh;
      minX = Math.min(minX, sx - a); maxX = Math.max(maxX, sx + a);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy + 2 * b + hh);
    });
    var W = Math.max(160, maxX - minX + 12), H = Math.max(90, maxY - minY + 12);
    var ox = -minX + 6, oy = -minY + 6;
    var g = '';
    cubes.forEach(function (q) {
      var sx = (q.c - q.r) * a + ox, sy = (q.r + q.c) * b - q.k * hh + oy;
      var top = (sx) + ',' + (sy) + ' ' + (sx + a) + ',' + (sy + b) + ' ' + (sx) + ',' + (sy + 2 * b) + ' ' + (sx - a) + ',' + (sy + b);
      var left = (sx - a) + ',' + (sy + b) + ' ' + (sx) + ',' + (sy + 2 * b) + ' ' + (sx) + ',' + (sy + 2 * b + hh) + ' ' + (sx - a) + ',' + (sy + b + hh);
      var right = (sx) + ',' + (sy + 2 * b) + ' ' + (sx + a) + ',' + (sy + b) + ' ' + (sx + a) + ',' + (sy + b + hh) + ' ' + (sx) + ',' + (sy + 2 * b + hh);
      g += '<polygon points="' + top + '" fill="#FFE9A8" stroke="#8B5E3C" stroke-width="1"/>' +
        '<polygon points="' + left + '" fill="#E8B35A" stroke="#8B5E3C" stroke-width="1"/>' +
        '<polygon points="' + right + '" fill="#C98A34" stroke="#8B5E3C" stroke-width="1"/>';
    });
    return '<svg width="' + Math.round(W) + '" height="' + Math.round(H) + '" viewBox="0 0 ' + Math.round(W) + ' ' + Math.round(H) + '" style="max-width:100%">' + g + '</svg>';
  }
  /* 展开图 */
  function netSvg(p) {
    var cell = 46, pad = 8;
    var maxR = 0, maxC = 0;
    p.cells.forEach(function (c) { maxR = Math.max(maxR, c[0]); maxC = Math.max(maxC, c[1]); });
    var W = (maxC + 1) * cell + pad * 2, H = (maxR + 1) * cell + pad * 2;
    var g = '';
    p.cells.forEach(function (c, i) {
      var x = pad + c[1] * cell, y = pad + c[0] * cell;
      var isAsk = i === p.ask;
      g += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="6" ' +
        'fill="' + (isAsk ? '#FFF0C2' : '#FFF8E4') + '" stroke="' + (isAsk ? '#E0A83C' : '#C9A961') + '" stroke-width="' + (isAsk ? 3 : 2) + '"/>' +
        '<text x="' + (x + cell / 2) + '" y="' + (y + cell / 2 + 8) + '" text-anchor="middle" font-size="24" fill="#5C4322">' + p.marks[i] + '</text>';
    });
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:100%">' + g + '</svg>';
  }

  MathGame.GAMES = GAMES;
  global.MathGame = MathGame;
})(window);
