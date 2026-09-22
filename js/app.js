/* ===========================================================
   app.js —— 启动 / 双端切换 / 事件分发
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store, E = global.Engine, U = global.UI;

  var App = {
    mode: 'kid',   // kid | parent

    /* ---------- 顶部条 ---------- */
    topbar: function () {
      if (App.mode === 'kid') {
        return '<div class="topbar">' +
          '<div><div class="tb-title">🌻 ' + U.esc(S.state.kidName) + '的学习花园</div>' +
          '<div class="tb-sub">植物大战僵尸 · 学习工作台</div></div>' +
          '<button class="switch-pill" data-act="gotoParent">👩 妈妈端</button>' +
          '</div>';
      }
      return '<div class="topbar">' +
        '<div><div class="tb-title">👩 妈妈后台</div>' +
        '<div class="tb-sub">' + U.esc(S.state.kidName) + '的学习数据</div></div>' +
        '<button class="switch-pill" data-act="gotoKid">🧒 孩子端</button>' +
        '</div>';
    },

    render: function () {
      document.body.className = 'app-root ' + (App.mode === 'kid' ? 'kid-mode' : 'parent-mode');
      var body = App.mode === 'kid' ? global.Kid.render() : global.Parent.render();
      document.getElementById('app').innerHTML = App.topbar() + body;
      window.scrollTo(0, 0);
    },

    save: function () { S.save(); },

    /* 状态变化后统一入口：存盘 → 重绘 → 弹故事化反馈 */
    afterChange: function () {
      App.warmTick();
      S.save();
      App.render();
      App.flushFlash();
    },

    /* 暖心小功能的心跳：① 三项固定任务全完成 → 自动给小盆栽浇水
       ② 妈妈点了「现在就给他」的急件 → 弹一次信封（只弹一次） */
    warmTick: function () {
      try {
        if (global.Engine && global.Engine.plantWater) {
          var w = global.Engine.plantWater();
          if (w && w.ok) {
            E.flash = E.flash || [];
            E.flash.push({ type: 'water', plant: w });
          }
        }
      } catch (e) { }
      try {
        if (global.Engine && global.Engine.notePushPending) {
          var n = global.Engine.notePushPending();
          if (n && global.UI) {
            global.Engine.notePop(n.id);
            global.UI.modal({
              emoji: '✉️', title: '妈妈刚给你留了一句',
              text: n.text,
              buttons: [{
                text: '知道啦', cls: 'btn-lav', onClick: function (c) {
                  c(); if (global.Engine) global.Engine.noteRead(n.id);
                  App.render();
                }
              }]
            });
          }
        }
      } catch (e) { }
    },

    flushFlash: function () {
      var f = E.flash || [];
      E.flash = [];
      if (!f.length) return;
      var order = { zombieEat: 5, weekPenalty: 4, allDone: 3, zombieBack: 2, water: 1, sunGain: 0.5, zombieForward: 0 };
      f.sort(function (a, b) { return (order[b.type] || 0) - (order[a.type] || 0); });
      var top = f[0];
      if (top.type === 'weekPenalty') {
        U.story('weekPenalty');
        App.render();
      } else if (top.type === 'zombieEat') {
        U.story('zombieEat');
        App.render();
      } else if (top.type === 'allDone') {
        U.story('allDone');
        App.render();
      } else if (top.type === 'zombieBack') {
        U.story('zombieBack');
        App.render();
      } else if (top.type === 'water') {
        U.story('waterGain', { n: top.n });
        App.render();
      } else if (top.type === 'sunGain') {
        U.story('sunGain');
        App.render();
      } else if (top.type === 'zombieForward') {
        U.story('zombieForward');
        App.render();
      }
    },

    /* ---------- 进入妈妈端的 PIN ---------- */
    askPin: function () {
      U.modal({
        emoji: '🔐', title: '妈妈密码',
        text: '输入 4 位密码进入妈妈后台\n（初始密码 1234）',
        body: '<input class="field" id="pin-input" type="password" inputmode="numeric" maxlength="8" style="text-align:center;letter-spacing:6px;font-size:22px">',
        dismissible: false,
        buttons: [
          { text: '进入', cls: 'btn-mac', onClick: function (c) {
            var v = (document.getElementById('pin-input').value || '').trim();
            if (v === S.state.pin) {
              c(); App.mode = 'parent'; global.Parent.page = 'dash'; App.render();
            } else {
              U.toast('密码不对，再试一次');
            }
          } },
          { text: '取消', cls: 'btn-ghost', onClick: function (c) { c(); } }
        ]
      });
    },

    /* ---------- 事件委托 ---------- */
    bind: function () {
      document.addEventListener('click', function (e) {
        // 分段控件（发布页用）
        var segBtn = e.target.closest ? e.target.closest('[data-kind],[data-subj]') : null;
        if (segBtn) {
          // 同一属性跨分组互斥（发布页把类型拆成了两行）
          var attr = segBtn.hasAttribute('data-kind') ? 'data-kind' : 'data-subj';
          document.querySelectorAll('[' + attr + ']').forEach(function (b) { b.classList.remove('on'); });
          segBtn.classList.add('on');
          return;
        }

        var el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el) return;
        var act = el.getAttribute('data-act');
        var v = el.getAttribute('data-v');

        // 语文生字选项：同一题里互斥高亮，让孩子看得见自己选了哪个
        if (act === 'cnOpt') {
          var gi = el.getAttribute('data-g');
          document.querySelectorAll('.cn-opt[data-g="' + gi + '"]').forEach(function (b) { b.classList.remove('on'); });
          el.classList.add('on');
          return;
        }

        if (act === 'gotoParent') { App.askPin(); return; }
        if (act === 'gotoKid') { App.mode = 'kid'; global.Kid.page = 'home'; App.render(); return; }

        var rerender;
        if (App.mode === 'kid') rerender = global.Kid.act(act, v, el);
        else rerender = global.Parent.act(act, v, el);

        if (rerender) {
          S.save();
          App.render();
          App.flushFlash();
        }
      });
    },

    /* ---------- 启动 ---------- */
    boot: function () {
      S.load();
      E.flash = [];

      // 1) 向日葵每日产出
      E.harvestSunflowers();

      // 2) 跨日结算（昨天没做完 → 僵尸前进）
      var evs = E.settlePastDays();
      evs.forEach(function (x) {
        if (x.res && x.res.ate) E.flash.push({ type: 'zombieEat', res: x.res });
        else E.flash.push({ type: 'zombieForward' });
      });

      // 3) 每周任务结算（上周的长线任务周五前没完成 → 温和惩罚）
      try {
        var wevs = E.settleWeeks();
        wevs.forEach(function (x) { E.flash.push({ type: 'weekPenalty', data: x }); });
      } catch (e) { console.warn('每周结算失败', e); }

      /* 跨日进来时补一次：昨天/今天三项完成了就把水浇上 */
      try { App.warmTick(); } catch (e) { }

      S.save();
      App.bind();
      App.render();
      App.flushFlash();
    }
  };

  global.App = App;

  /* 倒计时每秒走一格（只改那几个数字，不整页重画，平板上不卡） */
  setInterval(function () {
    try { if (global.Kid && Kid.tickTimers) Kid.tickTimers(); } catch (e) { }
    try { if (global.MathGame) global.MathGame.tick(); } catch (e) { }
    /* 妈妈的急件：最多 1 秒后就弹到孩子面前 */
    try { if (App.mode === 'kid') App.warmTick(); } catch (e) { }
  }, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.boot);
  } else {
    App.boot();
  }
})(window);
