/* ===========================================================
   kid.js —— 儿童学习花园端（PVZ 原版画风）
   优先适配 华为 MatePad Pro 竖屏，按钮大、圆润、可独立操作
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store, E = global.Engine, U = global.UI;

  var SUBJECTS = {
    chinese: { name: '语文', emoji: '📖', color: '#E8836B' },
    math: { name: '数学', emoji: '🔢', color: '#6BA8E8' },
    english: { name: '英语', emoji: '🔤', color: '#7FC96B' },
    other: { name: '其他', emoji: '🌟', color: '#E8B96B' }
  };

  var Kid = {
    page: 'home',
    selectedPlant: 'sunflower',
    SUBJECTS: SUBJECTS,

    /* ---------------- 顶部资源条 ---------------- */
    resBar: function () {
      var s = S.state;
      var step = s.zombieStep;
      var tip = step === 0 ? '僵尸还在门外打瞌睡呢 😴'
        : step === 1 ? '僵尸刚探出头，还不着急'
          : step === 2 ? '僵尸慢慢走过来了'
            : step === 3 ? '僵尸走到草坪中间了，加油！'
              : step === 4 ? '僵尸快到家了！快完成任务把它推回去'
                : '僵尸闯进花园啦';

      var steps = '';
      for (var i = 1; i <= 5; i++) {
        var cls = i <= step ? (i >= 4 ? 'zt-step on danger' : 'zt-step on') : 'zt-step';
        steps += '<div class="' + cls + '"></div>';
      }
      var left = Math.max(0, Math.min(88, (step / 5) * 92 - 4));

      return '<div class="resbar">' +
        '<div class="res-chip"><span class="rc-icon">☀️</span><div><div class="rc-val">' + s.sun + '</div><div class="rc-label">阳光</div></div></div>' +
        '<div class="res-chip"><span class="rc-icon">💧</span><div><div class="rc-val" style="color:#2E7CA8">' + s.water + '</div><div class="rc-label">水滴</div></div></div>' +
        '<div class="res-chip"><span class="rc-icon">🌻</span><div><div class="rc-val">' + Kid.countPlant('sunflower') + '</div><div class="rc-label">向日葵</div></div></div>' +
        '</div>' +

        '<div class="zombie-track">' +
        '<div class="zt-head"><span>🧟 僵尸走到第 ' + step + ' 步</span><span>' + tip + '</span></div>' +
        '<div style="position:relative;padding-top:2px">' +
        '<div class="zt-steps">' + steps + '</div>' +
        '<div style="position:absolute;top:-26px;left:' + left + '%;transition:left .4s cubic-bezier(.3,1.4,.5,1);width:34px;height:34px">' + U.SVG.zombie() + '</div>' +
        '</div>' +
        '</div>';
    },

    countPlant: function (key) {
      var n = 0;
      S.state.garden.forEach(function (c) { if (c.plant === key) n++; });
      return n;
    },

    /* ---------------- 草坪 ---------------- */
    lawn: function () {
      var s = S.state;
      var cells = '';
      for (var i = 0; i < 15; i++) {
        var c = s.garden[i];
        var inner = c.plant ? U.SVG[c.plant]() : '';
        cells += '<div class="cell' + (c.plant ? ' has-plant' : '') + '" data-act="cell" data-v="' + i + '">' + inner + '</div>';
      }

      var tray = '';
      Object.keys(S.PLANTS).forEach(function (k) {
        var p = S.PLANTS[k];
        var locked = (k === 'sunflower' && !s.sunflowerUnlocked);
        var active = Kid.selectedPlant === k ? ' active' : '';
        tray += '<div class="tray-item' + active + (locked ? ' locked' : '') + '" data-act="pick" data-v="' + k + '">' +
          U.SVG[k]() +
          '<div class="tray-price">☀️ ' + p.cost + '</div>' +
          '<div style="font-size:11px;font-weight:800;color:#8A6B3C">' + p.name + '</div>' +
          '</div>';
      });

      return '<div class="card" style="padding:14px">' +
        '<div class="sec-title">🌿 我的花园 <span class="muted" style="font-weight:700">（选一种植物，再点格子种下）</span></div>' +
        '<div class="lawn"><div class="lawn-grid">' + cells + '</div></div>' +
        '<div class="tray">' + tray + '</div>' +
        '</div>';
    },

    /* ---------------- 任务卡 ---------------- */

    /* 点整张卡时该做什么：完全对齐 taskCard 右侧主按钮的语义 */
    taskTap: function (id) {
      var s = S.state, date = S.dateStr();
      var t = null;
      (s.tasks || []).forEach(function (x) { if (x.id === id) t = x; });
      if (!t) return false;

      var sub = t.kind === 'weekly'
        ? (function () { var arr = s.submissions.filter(function (x) { return x.taskId === id; }); return arr.length ? arr[arr.length - 1] : null; })()
        : S.subOf(id, date);
      var status = 'todo';
      if (sub && sub.status === 'approved') status = 'done';
      else if (sub && sub.status === 'submitted') status = 'waiting';
      else if (sub && sub.status === 'rejected') status = 'rejected';

      if (status === 'waiting') { U.toast('妈妈正在看，马上就点亮 ⏳'); return false; }
      if (status === 'done') { U.toast('这个今天已经完成啦 ✅'); return false; }

      if (id === 'e_read') { Kid.page = 'cn'; Kid.cnTab = 'read'; return true; }

      var isTimed = t.kind === 'fixed' && !!t.limit;
      if (!isTimed) return Kid.act('submit', id);

      var tm = Kid.timerOf(id);
      if (!tm) return Kid.act('timerStart', id + ':' + t.limit);
      if (Date.now() >= tm.end) return Kid.act('submit', id);
      if (t.early) return Kid.act('calcDone', id);

      var left = Math.max(0, Math.ceil((tm.end - Date.now()) / 1000));
      U.toast('还在计时中，剩 ' + Math.ceil(left / 60) + ' 分钟，加油！');
      return false;
    },

    taskCard: function (t, date) {
      var s = S.state;
      var sub;
      if (t.kind === 'weekly') {
        var arr = s.submissions.filter(function (x) { return x.taskId === t.id; });
        sub = arr.length ? arr[arr.length - 1] : null;
      } else {
        sub = S.subOf(t.id, date);
      }
      var status = 'todo';
      if (sub && sub.status === 'approved') status = 'done';
      else if (sub && sub.status === 'submitted') status = 'waiting';
      else if (sub && sub.status === 'rejected') status = 'rejected';

      /* 每日固定任务（三项）：主按钮 = 开始计时 → 倒计时 → 到点打卡 */
      var isTimed = t.kind === 'fixed' && !!t.limit;
      var tm = isTimed ? Kid.timerOf(t.id) : null;
      var ended = !!(isTimed && tm && Date.now() >= tm.end);
      var earlyMin = (isTimed && t.early && tm && !ended) ? Kid.earlyMinutes(t.id) : 0;

      var cls = status === 'done' ? ' done' : (status === 'waiting' ? ' waiting' : '');
      var right = '';
      if (status === 'done') {
        right = '<div style="font-size:28px">✅</div>';
      } else if (status === 'waiting') {
        right = '<button class="btn btn-ghost" style="width:auto;min-height:52px;font-size:13px;padding:8px 14px">⏳ 等妈妈</button>';
      } else if (t.id === 'e_read') {
        /* 选做任务：点进去是「故事海漂流」阅读打卡页 */
        right = '<button class="btn btn-green" style="width:auto;min-height:52px;font-size:15px;padding:10px 18px" data-act="cnTab" data-v="read">🌊 去打卡</button>';
      } else if (!isTimed) {
        right = '<button class="btn btn-green" style="width:auto;min-height:52px;font-size:15px;padding:10px 18px" data-act="submit" data-v="' + t.id + '">我做完啦</button>';
      } else if (!tm) {
        right = '<button class="btn btn-green" style="width:auto;min-height:56px;font-size:16px;padding:10px 20px" data-act="timerStart" data-v="' +
          t.id + ':' + t.limit + '">⏱ 开始计时</button>';
      } else if (ended) {
        right = '<button class="btn btn-green" style="width:auto;min-height:56px;font-size:15px;padding:10px 18px" data-act="submit" data-v="' +
          t.id + '">✅ 时间到啦，打卡</button>';
      } else if (t.early) {
        right = '<button class="btn btn-green" style="width:auto;min-height:56px;font-size:15px;padding:10px 18px" data-act="calcDone" data-v="' +
          t.id + '">✅ 我做完了！</button>';
      } else {
        right = '<div style="text-align:center;font-size:13px;font-weight:900;color:#2E7CA8;line-height:1.4">计时中<br>加油</div>';
      }

      var tag = '';
      if (t.kind === 'weekly') {
        tag = '<span class="task-tag water">💧 周一只完成 +5 · 周五 +1（越早越多）</span>';
      } else if (t.kind === 'school') {
        tag = '<span class="task-tag">🏫 老师作业 · +1 ☀️ +1 🌸' + (t.needVideo ? ' · 📹 录视频打卡' : '') + '</span>';
      } else if (t.kind === 'extra') {
        if (t.mode === 'speech') {
          tag = '<span class="task-tag water">🎤 讲完按分数发水滴</span>';
        } else if (t.water) {
          tag = '<span class="task-tag water">💧 选做 · 完成 +' + t.water + ' 水滴</span>';
        } else {
          tag = '<span class="task-tag water">💧 今天完成 +' + (S.WATER_BY_DAY[S.dayIndex(date)] || 1) + ' 水滴</span>';
        }
      } else {
        tag = '<span class="task-tag">☀️ 每日固定任务</span>';
      }
      if (status === 'done') {
        if (t.kind === 'weekly' && sub && sub.date) {
          tag += ' <span class="task-tag ok">周' + S.WEEK_CN[S.dayIndex(sub.date)] + '完成</span>';
        } else {
          tag += ' <span class="task-tag ok">已完成</span>';
        }
      }
      if (status === 'waiting') tag += ' <span class="task-tag wait">等妈妈点亮</span>';
      if (status === 'rejected') tag += ' <span class="task-tag">再试一次就好</span>';

      var subLine = '';
      if (t.kind === 'weekly' && (t.weekStart || t.due)) {
        subLine = '<div class="muted" style="margin-top:3px;font-weight:700">本周内完成（周五前）</div>';
      }
      /* 固定任务：倒计时条 + 提示 */
      if (isTimed && status !== 'done') {
        if (tm) {
          subLine += '<div style="margin-top:8px">' + Kid.bigTimer(t.id) + '</div>';
          subLine += '<div class="muted" style="margin-top:4px;font-weight:700">' +
            (ended
              ? '时间到啦！点右边的按钮打卡'
              : '限时 ' + t.limit + ' 分钟' + (t.early ? ' · 提前完成每 1 分钟多拿 💧1' : ' · 倒计时结束就可以打卡')) +
            '</div>';
          if (t.early && !ended && earlyMin > 0) {
            subLine += '<div style="margin-top:4px"><span class="task-tag water">⚡ 现在结束，还能多拿 💧' + earlyMin + '</span></div>';
          }
        } else {
          subLine += '<div class="muted" style="margin-top:4px;font-weight:700">限时 ' + t.limit +
            ' 分钟' + (t.early ? ' · 提前完成有水滴奖励' : '') + '</div>';
        }
      }

      return '<div class="task-card' + cls + '" data-act="task" data-v="' + t.id + '">' +
        '<div class="task-emoji">' + t.emoji + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="task-title">' + U.esc(t.title) + '</div>' +
        '<div>' + tag + '</div>' + subLine +
        '</div>' +
        right +
        '</div>';
    },

    /* =========================================================
       五个「暖心小功能」—— 不给分、不扣分、不做成任务
       ========================================================= */

    /* ---------- 1. 心情天气：今天心情怎么样？不给分，不看表现 ---------- */
    moodBar: function () {
      var date = S.dateStr();
      var cur = E.moodOf(date);
      var btns = E.MOODS.map(function (m) {
        var on = cur && cur.m === m.k;
        return '<button class="btn ' + (on ? 'btn-green' : 'btn-ghost') + '" style="flex:1;min-height:52px;font-size:15px;padding:6px 4px" ' +
          'data-act="moodSet" data-v="' + m.k + '">' +
          '<div style="font-size:22px;line-height:1.2">' + m.e + '</div>' +
          '<div style="font-size:12px;margin-top:2px">' + m.t + '</div></button>';
      }).join('');

      var shareRow = '';
      if (cur) {
        shareRow = '<div style="margin-top:8px">' +
          '<button class="btn ' + (cur.share ? 'btn-lav' : 'btn-ghost') + '" style="width:100%;min-height:52px;font-size:14px" ' +
          'data-act="moodShare" data-v="' + (cur.share ? 0 : 1) + '">' +
          (cur.share ? '✅ 这条妈妈能看到' : '🔒 这条只有我知道') + '</button>' +
          '<div class="muted" style="font-size:12px;margin-top:4px;text-align:center">' +
          (cur.share ? '妈妈在后台能看到今天这朵云' : '妈妈那边只会显示「他自己藏着」，不知道是哪个') +
          '</div></div>';
      }

      return '<div class="card mt12" style="background:#FFFDF6;border:2px solid #EFDDB8">' +
        '<div class="sec-title" style="font-size:15px">🌤️ 今天心里是什么天气？</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '选什么都不扣分、不加分，也不影响今天的任务。就是让我知道你今天怎么样。' +
        '</div>' +
        '<div style="display:flex;gap:6px">' + btns + '</div>' +
        shareRow +
        '</div>';
    },

    /* ---------- 2. 今天的悄悄话：妈妈写的优先，没有就用 AI 按心情写的那句 ---------- */
    noteCard: function () {
      var date = S.dateStr();
      var un = E.noteUnread();

      /* ① 妈妈亲手写的信优先 */
      if (un.length) {
        var hints = ['妈妈给你留了一句话', '有一封信等你拆', '妈妈偷偷放了点东西在这儿'];
        var h = hints[un.length % hints.length];
        return '<div class="card mt12" style="background:#FFF3F6;border:2px solid #F0C7D4" data-act="noteOpen" data-v="' + un[0].id + '">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
          '<div style="font-size:38px;line-height:1">✉️</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div class="task-title">' + U.esc(h) + (un.length > 1 ? '（还有 ' + (un.length - 1) + ' 封）' : '') + '</div>' +
          '<div class="muted" style="font-weight:800">点一下就拆开了</div>' +
          '</div><div style="font-size:22px">›</div></div></div>';
      }

      /* ② 没有妈妈写的 → 今天的自动悄悄话（按心情来，不用妈妈操作） */
      var an = E.autoNoteOf(date);
      if (!an || an.read) return '';
      var mTxt = { sun: '看你今天是晴天', cloud: '今天有点闷是吧', rain: '今天心里下雨了', storm: '今天不好受吧', none: '今天' }[an.mood] || '今天';
      return '<div class="card mt12" style="background:#FFF3F6;border:2px solid #F0C7D4" data-act="autoNoteOpen">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:38px;line-height:1">✉️</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="task-title">' + U.esc(mTxt) + '，妈妈有句话给你</div>' +
        '<div class="muted" style="font-weight:800">点一下就拆开了</div>' +
        '</div><div style="font-size:22px">›</div></div></div>';
    },

    /* ---------- 4. 我的小盆栽 ---------- */
    plantSvg: function () {
      var p = E.plantOf();
      var leaves = Math.min(p.leaves || 0, 12);
      var pot = '<svg viewBox="0 0 120 100" style="width:100%;max-width:180px;height:auto">' +
        '<ellipse cx="60" cy="92" rx="34" ry="7" fill="#00000010"/>' +
        '<path d="M34 58 L86 58 L80 90 L40 90 Z" fill="#C1694F" stroke="#9A4E39" stroke-width="2"/>' +
        '<rect x="31" y="52" width="58" height="10" rx="4" fill="#D98A6C" stroke="#9A4E39" stroke-width="2"/>' +
        '<rect x="57" y="24" width="6" height="32" rx="3" fill="#4E9A1E"/>';
      for (var i = 0; i < leaves; i++) {
        var side = (i % 2 === 0) ? 1 : -1;
        var yy = 50 - Math.floor(i / 2) * 6;
        var xx = 60 + side * 14;
        pot += '<ellipse cx="' + xx + '" cy="' + yy + '" rx="13" ry="7" fill="#5FB327" stroke="#3F7D1C" stroke-width="1.5" ' +
          'transform="rotate(' + (side > 0 ? -22 : 22) + ' ' + xx + ' ' + yy + ')"/>';
      }
      for (var f = 0; f < (p.flower || 0); f++) {
        var fx = 60 + (f % 3 - 1) * 16, fy = 20 - Math.floor(f / 3) * 8;
        pot += '<circle cx="' + fx + '" cy="' + fy + '" r="7" fill="#FFC72C" stroke="#E09B0E" stroke-width="1.5"/>' +
          '<circle cx="' + fx + '" cy="' + fy + '" r="2.5" fill="#B26B00"/>';
      }
      pot += '</svg>';
      return pot;
    },
    plantCard: function () {
      var p = E.plantOf();
      var miss = E.plantMissDays();
      var tip = '';
      if (p.lastDate === S.dateStr()) {
        tip = '今天浇过水啦，第 ' + p.streak + ' 天连着。';
      } else if (miss === 1) {
        tip = '昨天没浇水，它只是停在那儿等你，叶子一片都没掉。';
      } else if (miss > 1) {
        tip = '它有 ' + miss + ' 天没喝水了，但还是好好的。今天三项做完，它就又长一片。';
      } else {
        tip = '今天三项固定任务都完成，它就会自己长一片叶子。';
      }
      return '<div class="card mt12" style="background:#F3FAF0;border:2px solid #B7DFB7">' +
        '<div class="sec-title" style="font-size:15px">🪴 我的小盆栽</div>' +
        '<div style="display:flex;align-items:center;gap:14px">' +
        '<div style="width:150px;flex-shrink:0">' + Kid.plantSvg() + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:900;color:#2F6B3A;font-size:15px">' + (p.leaves || 0) + ' 片叶子' +
        (p.flower ? ' · ' + p.flower + ' 朵花' : '') + '</div>' +
        '<div class="muted" style="font-weight:800;margin-top:2px">' + tip + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">' +
        '连着 7 天会开一朵花。断一天只是停住，不会掉叶子、不会扣东西。' +
        '</div></div></div></div>';
    },

    /* ---------- 3. 今日小电影 ---------- */
    movieCard: function () {
      var date = S.dateStr();
      var text = E.movieOf(date);
      var hour = new Date().getHours();
      var when = hour < 11 ? '早上' : (hour < 17 ? '下午' : '晚上');
      return '<div class="card mt12" style="background:#FFF8E4;border:2px solid #EFDDB8" data-act="movieOpen">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:34px;line-height:1">🎬</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="task-title">' + when + '好，看看今天的小电影</div>' +
        '<div class="muted" style="font-weight:800">把今天做过的事讲成一个故事</div>' +
        '</div><div style="font-size:22px">›</div></div></div>';
    },

    /* ---------- 5. 开心罐 ---------- */
    joyPanel: function () {
      var s = S.state;
      var list = E.joyList();
      var ideas = ['同学跟我玩了', '今天午饭好吃', '被老师夸了一句', '看到一只猫',
        '数学题做出来了', '妈妈笑了', '学会一个新词', '跑得比昨天快'];
      var chips = ideas.map(function (t) {
        return '<button class="pill-btn" style="min-height:52px;font-size:13px;padding:8px 12px" ' +
          'data-act="joyAdd" data-v="' + U.esc(t) + '">+ ' + U.esc(t) + '</button>';
      }).join('');

      var rows = list.length
        ? list.slice(0, 8).map(function (j) {
          return '<div class="task-card" style="margin-bottom:8px">' +
            '<div class="task-emoji">🍬</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div class="task-title">' + U.esc(j.text) + '</div>' +
            '<div><span class="task-tag">' + j.date + '</span></div></div>' +
            '<button class="pill-btn pill-no" style="min-height:52px" data-act="joyDel" data-v="' + j.id + '">×</button>' +
            '</div>';
        }).join('')
        : '<div class="empty">罐子还是空的。写一句今天开心的小事，攒起来。</div>';

      return '<div class="card mt12" style="background:#FFFDF4;border:2px solid #EFDDB8">' +
        '<div class="sec-title">🍯 开心罐</div>' +
        '<div class="muted">存一件今天开心的小事，不用写长，一句话就行。' +
        '攒多了，哪天不高兴的时候摇一摇，会掉出来一张旧的。</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0">' + chips + '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<input class="field" id="joy-input" placeholder="今天有什么开心的事？" style="flex:1;text-align:left">' +
        '<button class="btn btn-green" style="width:auto;min-height:52px;padding:10px 18px" data-act="joyAddInput">存起来</button>' +
        '</div>' +
        '<div style="margin-top:10px">' + rows + '</div>' +
        '<button class="btn btn-lav mt12" data-act="joyDraw">🎲 摇一摇，掉一张出来</button>' +
        '</div>';
    },

    /* ---------------- 页面：首页花园 ---------------- */
    pageHome: function () {
      var date = S.dateStr();
      var s = S.state;
      var stat = E.todayFixedStatus(date);

      var listHtml = '';
      stat.list.forEach(function (t) { listHtml += Kid.taskCard(t, date); });

      var head = '<div style="padding:6px 14px 0">' +
        '<div class="wood-title">🏡 ' + U.esc(s.kidName) + '的学习花园</div>' +
        '<div class="muted" style="margin-top:6px;font-weight:800">' +
        '今天是周' + S.WEEK_CN[S.dayIndex(date)] + ' · 每天 3 项固定任务' +
        '</div></div>';

      var summary = '<div class="card card-cream" style="margin:12px 14px 0">' +
        '<div class="sec-title">📋 今日进度：' + stat.done + ' / ' + stat.total + '</div>' +
        '<div style="height:14px;border-radius:8px;background:#EADFC0;overflow:hidden;border:2px solid #C9A961">' +
        '<div style="height:100%;width:' + (stat.total ? (stat.done / stat.total * 100) : 0) + '%;background:linear-gradient(90deg,#8FD44A,#5BA82B);transition:width .4s"></div>' +
        '</div>' +
        '<div class="muted" style="margin-top:8px">' +
        (stat.all ? '全部完成！今天的阳光已经到手啦 🎉'
          : '全部完成后：+2 阳光 + 2 全勤阳光，还能解锁向日葵种植哦') +
        '</div></div>';

      var school = S.schoolTasksOf(date);
      var schoolHtml = '';
      if (school.length) {
        schoolHtml = '<div style="padding:12px 14px 0">' +
          '<div class="sec-title" style="font-size:16px">🏫 妈妈今天布置的任务</div>' +
          school.map(function (t) { return Kid.taskCard(t, date); }).join('') +
          '</div>';
      }

      /* 暖心小功能：信封插在最上面，心情和小盆栽跟在进度后面 */
      var warm = Kid.noteCard() + Kid.moodBar();

      return head + Kid.resBar() + warm + summary +
        '<div style="padding:12px 14px 0">' + Kid.lawn() + '</div>' +
        schoolHtml +
        '<div style="padding:12px 14px 0">' +
        '<div class="sec-title" style="font-size:16px">✅ 今日固定任务</div>' +
        listHtml + '</div>' +
        '<div style="padding:12px 14px 0">' + Kid.plantCard() + Kid.movieCard() + '</div>';
    },

    /* ---------------- 讲述工坊（语文）· AI 引导式扩写 ---------------- */

    /* 已完成的成绩单 */
    speechDoneHtml: function (done) {
      var sc = global.SpeechCoach;
      var dims = (done.detail || []).map(function (d) {
        return '<span class="task-tag ' + (d.hit ? 'ok' : '') + '" style="font-size:12px">' +
          (d.icon || '') + ' ' + U.esc(d.label) + (d.hit ? ' ✓' : ' —') + '</span>';
      }).join(' ');

      /* 扩写前后对比 */
      var cmp = '';
      if (done.origin && done.origin !== done.text) {
        cmp = '<div style="margin-top:10px">' +
          '<div class="sec-title" style="font-size:14px">📈 扩写前后</div>' +
          '<div style="background:#F1EFE8;border-radius:12px;padding:10px;margin-bottom:6px">' +
          '<div style="font-size:11px;font-weight:900;color:#7A6248">最开始（' + (sc ? sc.len(done.origin) : done.origin.length) + ' 字）</div>' +
          '<div style="font-weight:700;color:#5C4322;line-height:1.7">' + U.esc(done.origin) + '</div></div>' +
          '<div style="background:#E9F7E9;border-radius:12px;padding:10px">' +
          '<div style="font-size:11px;font-weight:900;color:#2F6B3A">补充后（' + (sc ? sc.len(done.text) : done.text.length) + ' 字）</div>' +
          '<div style="font-weight:700;color:#2F6B3A;line-height:1.7">' + U.esc(done.text) + '</div></div>' +
          '</div>';
      }

      return '<div class="card card-cream mt12">' +
        '<div class="sec-title">🎤 今日讲述 · 已完成' + ((done.times || 1) > 1 ? '（第 ' + done.times + ' 次）' : '') + '</div>' +
        '<div style="text-align:center;padding:4px 0 10px">' +
        '<div style="font-size:44px;font-weight:900;color:#E0A020;line-height:1.1">' + done.score + '<span style="font-size:18px">分</span></div>' +
        '<div class="muted" style="font-weight:800">' + U.esc(global.AI.rewardText(done)) + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">' + dims + '</div>' +
        (done.comments || []).map(function (c) {
          return '<div style="background:#FFF3CC;border-radius:12px;padding:8px 10px;margin-bottom:6px;font-size:14px;color:#7A5B33">💛 ' + U.esc(c) + '</div>';
        }).join('') +
        (done.tips || []).map(function (c) {
          return '<div style="background:#EAF3D8;border-radius:12px;padding:8px 10px;margin-bottom:6px;font-size:14px;color:#4B6B1E">🌱 ' + U.esc(c) + '</div>';
        }).join('') +
        cmp +
        '<button class="btn btn-ghost mt8" data-act="respeech">再讲一次</button>' +
        '</div>';
    },

    /* 引导中的对话界面 */
    speechCoachHtml: function (date) {
      var sc = global.SpeechCoach;
      if (!sc) return '';
      var d = E.speechDraftOf(date);
      var cur = Kid.spAsk || null;

      /* 进度条：八个维度补了几个 */
      var got = sc.covered(d.text);
      var miss = sc.missing(d.text);
      var pct = Math.round(got.length / sc.GUIDE.length * 100);

      var chips = sc.GUIDE.map(function (g) {
        var on = !!sc.has(d.text, g.words);
        return '<span class="task-tag ' + (on ? 'ok' : '') + '" style="font-size:12px;opacity:' + (on ? 1 : 0.55) + '">' +
          g.icon + ' ' + g.label + '</span>';
      }).join(' ');

      /* 老师这一轮问的话 */
      var askHtml = '';
      if (cur) {
        askHtml = '<div style="background:#EAF3FB;border:2px solid #B5D4F4;border-radius:14px;padding:12px;margin-top:10px">' +
          '<div style="font-size:12px;font-weight:900;color:#185FA5;margin-bottom:4px">' +
          '👩‍🏫 老师想问你（第 ' + cur.round + ' 轮 · ' + cur.icon + ' ' + U.esc(cur.label) + '）</div>' +
          '<div style="font-size:17px;font-weight:900;color:#0C447C;line-height:1.6">' + U.esc(cur.ask) + '</div>' +
          '</div>' +
          '<textarea class="field mt8" id="sp-ans" rows="3" placeholder="把你想到的话写在这里…" style="min-height:96px;line-height:1.8"></textarea>' +
          '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button class="btn btn-green" style="flex:1;min-height:52px" data-act="spAnswer">说好了，加上去</button>' +
          '<button class="btn btn-ghost" style="width:auto;min-height:52px;padding:10px 16px;font-size:14px" data-act="spSkip">这个我没有</button>' +
          '</div>';
      } else if (miss.length) {
        askHtml = '<button class="btn btn-lav mt8" data-act="spAsk">🤔 让老师再问我一句</button>';
      }

      return '<div class="card card-cream mt12">' +
        '<div class="sec-title">🎤 今日讲述 · 和老师一起把它说完整</div>' +
        '<div class="muted" style="font-size:13px">' +
        '老师不会替你写，只会一句一句问你。你想到什么就说什么，说不出来可以点「这个我没有」。' +
        '</div>' +
        '<div style="height:12px;border-radius:6px;background:#EADFC0;overflow:hidden;margin:10px 0 6px">' +
        '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#8FD44A,#5BA82B)"></div></div>' +
        '<div class="muted" style="font-size:12px;font-weight:800">已经补上 ' + got.length + ' / ' + sc.GUIDE.length + ' 个方面</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0">' + chips + '</div>' +
        '<div style="background:#FFFDF4;border:2px solid #EFDDB8;border-radius:14px;padding:12px">' +
        '<div style="font-size:11px;font-weight:900;color:#B07A2E">你现在写的（' + sc.len(d.text) + ' 字）</div>' +
        '<div style="font-weight:700;color:#5C4322;line-height:1.9;margin-top:4px">' + U.esc(d.text) + '</div>' +
        '</div>' +
        askHtml +
        '<button class="btn btn-ghost mt8" data-act="spFinish">✋ 我说完了，就这样</button>' +
        '</div>';
    },

    speechPanel: function (date) {
      var done = E.speechToday(date);
      var d = E.speechDraftOf(date);

      /* 今天提交次数用完 → 只展示成绩 */
      if (done && !d && !E.speechCanSubmit(date)) {
        return Kid.speechDoneHtml(done) +
          '<div class="card mt12"><div class="muted" style="padding:6px 0;text-align:center">' +
          '今天已经讲了 ' + E.speechCountToday(date) + ' 次啦，明天再来～</div></div>';
      }
      if (d) return Kid.speechCoachHtml(date);
      if (done) return Kid.speechDoneHtml(done) +
        '<div class="card card-cream mt12">' +
        '<div class="sec-title" style="font-size:15px">🎤 再讲一件事</div>' +
        '<div class="muted" style="font-size:13px">今天还能再讲 ' + (E.SPEECH_DAILY_MAX - E.speechCountToday(date)) + ' 次（第二次水滴减半）。</div>' +
        Kid.speechStartHtml() +
        '</div>';

      /* 全新的开始 */
      return '<div class="card card-cream mt12">' +
        '<div class="sec-title">🎤 今日讲述：说一件今天最难忘的事</div>' +
        '<div class="muted" style="font-size:13px;line-height:1.9">' +
        '<b>先一句话说出来就行</b>，哪怕是「今天我和小明玩」也行。<br>' +
        '然后老师会一句一句问你，帮你把它说完整——' +
        '<b>不是替你写，是问你</b>，答案都在你自己脑子里。' +
        '</div>' +
        Kid.speechStartHtml() +
        '</div>';
    },

    /* 开头输入框（两处复用） */
    speechStartHtml: function () {
      return '<textarea class="field mt8" id="speech-text" rows="3" ' +
        'placeholder="今天最让我难忘的是……（一句话就行）" style="min-height:96px;line-height:1.8"></textarea>' +
        '<div class="muted mt8" style="font-size:12px">不会写的字可以用拼音。</div>' +
        '<button class="btn btn-green mt8" data-act="speechStart">开始，让老师问我</button>' +
        '<button class="btn btn-ghost mt8" data-act="speechDirect" style="font-size:14px">今天不想被问，我自己写完</button>';
    },

    /* ✨ 我的素材库 */
    phrasePanel: function () {
      var list = E.phraseList();
      var rows = list.length
        ? list.slice(0, 12).map(function (p) {
          return '<div class="task-card" style="margin-bottom:8px">' +
            '<div class="task-emoji">✨</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div class="task-title" style="font-size:15px;line-height:1.6">' + U.esc(p.text) + '</div>' +
            '<div><span class="task-tag water">' + U.esc(p.why || '好句') + '</span>' +
            '<span class="task-tag">' + p.date + '</span></div>' +
            '</div>' +
            '<button class="pill-btn pill-no" style="min-height:52px" data-act="phDel" data-v="' + p.id + '">×</button>' +
            '</div>';
        }).join('')
        : '<div class="empty">还没有存过好句子。每次讲完，老师会挑出写得最好的一两句，你可以存进来。</div>';

      return '<div class="card mt12" style="background:#FFFDF4;border:2px solid #EFDDB8">' +
        '<div class="sec-title">✨ 我的素材库（' + list.length + '）</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '攒起来干什么？以后写作文、看图说话的时候翻一翻，就能用上自己说过的好句子。' +
        '</div>' + rows + '</div>';
    },

    /* ---------------- 朗文随机抽题 ---------------- */
    lwtePick: function (kind) {
      var L = global.LWTE;
      if (!L) return null;
      var pool = (kind === 'listening' ? L.listenings : L.readings).filter(function (x) {
        return x.questions && x.questions.length;
      });
      if (!pool.length) return null;
      var t = S.dateStr();
      var seed = 0;
      for (var i = 0; i < t.length; i++) seed += t.charCodeAt(i) * (i + 1);
      seed += (kind === 'listening' ? 77 : 13);
      var doneIds = (S.state.quiz || []).filter(function (q) {
        return q.date === t && q.kind === kind;
      }).map(function (q) { return q.ref; });
      var cand = pool.filter(function (x) { return doneIds.indexOf(x.id) < 0; });
      if (!cand.length) cand = pool;
      return cand[seed % cand.length];
    },

    lwtePanel: function (kind, date) {
      var L = global.LWTE;
      if (!L) return '';
      var item = Kid.lwtePick(kind);
      if (!item) return '';
      var rec = E.quizToday(item.id, kind, date);

      var title = kind === 'listening' ? '🎧 朗文听力练习' : '📖 朗文阅读练习';
      if (rec) {
        return '<div class="card mt12">' +
          '<div class="sec-title">' + title + ' · 今天已完成</div>' +
          '<div style="text-align:center;padding:6px 0">' +
          '<div style="font-size:34px;font-weight:900;color:#2E7CA8">' + rec.correct + ' / ' + rec.total + '</div>' +
          '<div class="muted">答对 ' + rec.correct + ' 题，获得 💧 ' + rec.water + '</div>' +
          '</div></div>';
      }

      var body = '';
      if (kind === 'listening') {
        body = '<audio controls style="width:100%;margin:8px 0" src="' + item.audio + '"></audio>' +
          '<div class="muted">先听一遍，再回答下面的问题。可以点重听。</div>';
      } else {
        body = '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:12px;line-height:1.9;font-size:15px">' +
          item.sentences.map(function (s) { return U.esc(s); }).join('<br>') +
          '</div>';
      }

      var qs = item.questions.map(function (q) {
        var opts = Object.keys(q.options).map(function (k) {
          return '<label style="display:block;background:#FFF8E4;border:2px solid #EFDDB8;border-radius:12px;padding:10px;margin-bottom:6px;cursor:pointer">' +
            '<input type="radio" name="lwte_' + item.id + '_' + q.no + '" value="' + k + '" style="transform:scale(1.4);margin-right:8px">' +
            '<b>' + k + '.</b> ' + U.esc(q.options[k]) + '</label>';
        }).join('');
        return '<div style="margin-top:12px"><div style="font-weight:900;font-size:15px;color:#5C4322">' + q.no + '. ' + U.esc(q.q) + '</div>' + opts + '</div>';
      }).join('');

      return '<div class="card mt12">' +
        '<div class="sec-title">' + title + ' <span class="muted" style="font-weight:700">（每天随机一篇）</span></div>' +
        body + qs +
        '<button class="btn btn-green mt12" data-act="quizSubmit" data-v="' + kind + ':' + item.id + '">交卷，看我得几分</button>' +
        '</div>';
    },

    /* ================= 朗文 2A 复习 · 校内同步练习（单选 / 多选 / 判断） ================= */
    enrDay: 0,        // 第几组（点「换一组」会 +1）
    enrAns: {},       // 作答 {题号: [选项下标]}
    enrResult: null,  // 交卷结果

    /* 当天这一组题：单选 5 + 多选 2 + 判断 1（按日期固定，刷新不会变） */
    enReviewPool: function () {
      var R = global.LWTE2A_REVIEW;
      if (!R) return [];
      var t = S.dateStr();
      var seed = 0;
      for (var i = 0; i < t.length; i++) seed += t.charCodeAt(i) * (i + 1);
      seed = (seed * 31 + (Kid.enrDay || 0) * 977 + 7) % 2147483647;
      function rnd() { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; }
      function pick(list, n) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(rnd() * (i + 1));
          var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a.slice(0, n);
      }
      function tag(list, type) {
        return list.map(function (q) {
          var o = { id: q.id, u: q.u, q: q.q, why: q.why, type: type };
          if (type === 'judge') { o.opts = ['✓ 对', '✗ 错']; o.ans = q.ans; }
          else { o.opts = q.opts; o.ans = q.ans; }
          return o;
        });
      }
      return pick(tag(R.single, 'single'), 5)
        .concat(pick(tag(R.multi, 'multi'), 2), pick(tag(R.judge, 'judge'), 1));
    },

    enTypeName: function (t) { return t === 'multi' ? '多选题' : (t === 'judge' ? '判断题' : '单选题'); },

    enReview: function () {
      var R = global.LWTE2A_REVIEW;
      if (!R) return '';
      var today = S.dateStr();
      var rewarded = (S.state.quiz || []).some(function (x) {
        return x.date === today && x.kind === 'review';
      });
      var pool = Kid.enReviewPool();

      var head = '<div class="sec-title">📝 ' + U.esc(R.meta.title) + '</div>' +
        '<div class="muted">按《朗文 2A 复习资料》出题：单选 5 题 + 多选 2 题 + 判断 1 题，每天换一组。</div>' +
        (Kid.enrDay > 0 && rewarded
          ? '<div class="muted" style="margin-top:4px;font-weight:800">练习模式：这一组不再发水滴，做对就好 🌻</div>'
          : '');

      /* ---------- 交卷后：逐题对错 + 解析 ---------- */
      if (Kid.enrResult) {
        var r = Kid.enrResult;
        var body = r.items.map(function (it, i) {
          var q = it.q;
          var ansArr = (q.type === 'multi' ? q.ans : [q.ans]);
          var rightTxt = ansArr.map(function (j) {
            return 'ABCD'[j] + '. ' + q.opts[j];
          }).join('　');
          var myTxt = it.sel.length
            ? it.sel.map(function (j) { return 'ABCD'[j]; }).join('、') : '没选';
          return '<div style="margin-top:12px;border-top:2px dashed #EFDDB8;padding-top:10px">' +
            '<div style="font-weight:900;line-height:1.7;color:#5C4322">' +
            (it.ok ? '✅' : '❌') + ' ' + (i + 1) + '. ' + U.esc(q.q) +
            '　<span class="muted" style="font-size:12px">' + Kid.enTypeName(q.type) + '</span></div>' +
            '<div style="font-weight:700;margin-top:5px;color:' + (it.ok ? '#2F6B3A' : '#C0392B') + '">' +
            '你选的：' + myTxt + '</div>' +
            '<div style="font-weight:800;margin-top:3px;color:#2F6B3A">正确答案：' + U.esc(rightTxt) + '</div>' +
            '<div style="margin-top:6px;background:#FFF8E4;border:2px solid #EFDDB8;border-radius:12px;padding:9px;line-height:1.8;font-size:14px">' +
            '💡 ' + U.esc(q.why) + '</div></div>';
        }).join('');

        return '<div class="card mt12">' + head +
          '<div style="text-align:center;padding:10px 0">' +
          '<div style="font-size:36px;font-weight:900;color:#2E7CA8">' + r.correct + ' / ' + r.total + '</div>' +
          '<div style="font-weight:800;margin-top:4px">' +
          (r.correct === r.total ? '全对！你是朗文小达人 🏆' : (r.correct / r.total >= 0.6 ? '不错哦，把错的看一遍就更稳了 🌻' : '慢慢来，错的题我都讲给你听了 🌱')) +
          '</div>' +
          (r.water > 0 ? '<div class="muted" style="margin-top:4px">获得 💧 ' + r.water + ' 水滴</div>' : '') +
          '</div>' + body +
          '<button class="btn btn-lav mt12" data-act="enrNext">🔁 换一组，再练一次</button>' +
          '</div>';
      }

      /* ---------- 答题中 ---------- */
      var qs = pool.map(function (q, i) {
        var sel = Kid.enrAns[i] || [];
        var opts = q.opts.map(function (o, j) {
          var on = sel.indexOf(j) >= 0;
          return '<div data-act="enrOpt" data-v="' + i + ':' + j + '" ' +
            'style="display:flex;align-items:center;gap:10px;background:' + (on ? '#E9F7E9' : '#FFF8E4') +
            ';border:3px solid ' + (on ? '#5BA82B' : '#EFDDB8') + ';border-radius:14px;padding:12px;margin:6px 0;cursor:pointer;font-size:16px;font-weight:800;color:#5C4322;min-height:52px">' +
            '<span style="width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:' + (on ? '#5BA82B' : '#EFDDB8') +
            ';color:#fff;text-align:center;line-height:28px;font-size:14px;font-weight:900">' + 'ABCD'[j] + '</span>' +
            '<span>' + U.esc(o) + '</span>' +
            (on ? '<span style="margin-left:auto;font-size:18px">' + (q.type === 'multi' ? '☑' : '◉') + '</span>' : '') +
            '</div>';
        }).join('');
        return '<div style="margin-top:14px">' +
          '<div style="font-weight:900;color:#5C4322;line-height:1.7">' + (i + 1) + '. ' + U.esc(q.q) +
          ' <span class="muted" style="font-size:12px">' + Kid.enTypeName(q.type) + (q.type === 'multi' ? '（可以选好几个）' : '') + '</span></div>' +
          '<div style="margin-top:4px">' + opts + '</div></div>';
      }).join('');

      return '<div class="card mt12">' + head + qs +
        '<button class="btn btn-green mt12" data-act="enrSubmit">交卷，看我得几分</button></div>';
    },

    /* ================= 语文：统编版二年级上册资料库 ================= */
    cnTab: '',        // '' | chars | preview | recite | dict
    cnUnit: 0,        // 当前单元下标
    cnLesson: -2,     // 当前课下标，-2 = 还没选，-1 = 语文园地
    cnResult: null,   // 生字练习结果

    /* ---- 预习探险 ---- */
    pvStage: '',      // '' = 关卡列表 | detective | scene | quiz
    pvUnit: 1,        // 默认停在第二单元（田家四季歌在这儿）
    pvLesson: 3,
    pvOpen: {},       // 侦探提问：哪一题展开了线索/答案 {i: 1|2}
    pvAns: {},        // 小测作答 {i: 选项下标}
    pvGuide: {},      // 小测答错的题 → 显示引导提问
    pvResult: null,

    /* ---- 背诵闯关 ---- */
    rcId: '',         // 当前背诵项 id
    rcGame: '',       // '' | fill | chain | sort | cover | rec
    rcStep: 0,
    rcPick: [],       // 排队游戏：已经点掉的句子
    rcResult: null,
    rcLv: 0,          // 遮挡档位 0 全显示 / 1 遮一半 / 2 全遮
    rcRecOn: false,   // 是否正在录音

    cnData: function () { return global.CN2A || null; },

    /* 取某课的完整信息（含语文园地） */
    cnItem: function (u, l) {
      var C = Kid.cnData(); if (!C) return null;
      var unit = C.units[u]; if (!unit) return null;
      var it = l === -1 ? unit.garden : unit.lessons[l];
      /* 语文园地本身不带编号，兜底避免渲染出 "undefined" */
      if (it && !it.no) it.no = (l === -1 ? '' : (unit.no + '·' + (l + 1)));
      return it;
    },

    /* 统一标题：有编号就带编号，没有只显示标题 */
    cnTitle: function (it) {
      if (!it) return '';
      return (it.no ? it.no + ' ' : '') + (it.title || '');
    },

    cnPanel: function () {
      var C = Kid.cnData();
      if (!C) return '';

      /* ---- 入口 ---- */
      if (!Kid.cnTab) {
        return '<div class="card mt12">' +
          '<div class="sec-title">📚 语文学习园（' + C.meta.version + '）</div>' +
          '<div class="muted" style="margin-bottom:10px">跟着课本走，学到哪一课就点哪一课。</div>' +
          '<button class="btn btn-green mb8" data-act="cnTab" data-v="preview">🔍 预习探险（上下册全目录）</button>' +
          '<button class="btn btn-green mb8" data-act="cnTab" data-v="chars">🔤 生字闯关（10 题）</button>' +
          '<button class="btn btn-green mb8" data-act="cnTab" data-v="recite">🎮 背诵闯关</button>' +
          '<button class="btn btn-green mb8" data-act="cnTab" data-v="read">🌊 故事海漂流（阅读打卡）</button>' +
          '<button class="btn btn-green" data-act="cnTab" data-v="dict">🎧 听写练习</button>' +
          '</div>';
      }

      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="cnTab" data-v="">← 返回</button>';
      if (Kid.cnTab === 'chars') return '<div class="card mt12">' + back + Kid.cnChars() + '</div>';
      if (Kid.cnTab === 'preview') return '<div class="card mt12">' + back + Kid.cnPreview() + '</div>';
      if (Kid.cnTab === 'recite') return '<div class="card mt12">' + back + Kid.cnReciteHome() + '</div>';
      if (Kid.cnTab === 'read') return '<div class="card mt12">' + Kid.cnReading() + '</div>';
      if (Kid.cnTab === 'dict') return '<div class="card mt12">' + back + Kid.cnDictation() + '</div>';
      return '';
    },

    /* ---- 生字闯关 ---- */
    cnChars: function () {
      var C = Kid.cnData();
      var u = Kid.cnUnit;

      /* 还没选课 → 列出单元 + 课 */
      if (Kid.cnLesson === -2) {
        var tabs = C.units.map(function (x, i) {
          return '<button class="pill-btn ' + (i === u ? 'pill-ok' : 'pill-gray') + '" data-act="cnUnit" data-v="' + i + '">' +
            x.emoji + ' ' + x.no + '</button>';
        }).join(' ');

        var unit = C.units[u];
        var rows = unit.lessons.map(function (l, i) {
          var done = E.quizToday('U' + u + 'L' + i, 'cn', S.dateStr());
          var badge = done ? '<span class="task-tag ok">✅ ' + done.correct + '/' + done.total + '</span>'
            : '<span class="task-tag">' + (l.write || []).length + ' 字</span>';
          return '<div class="task-card" data-act="cnLesson" data-v="' + i + '">' +
            '<div class="task-emoji">' + (l.poems ? '📜' : '📖') + '</div>' +
            '<div style="flex:1;min-width:0"><div class="task-title">' + l.no + ' ' + U.esc(l.title) + '</div>' + badge + '</div>' +
            '<div style="font-size:22px">›</div></div>';
        }).join('');

        var g = unit.garden;
        var grow = '<div class="task-card" data-act="cnLesson" data-v="-1">' +
          '<div class="task-emoji">🏡</div>' +
          '<div style="flex:1;min-width:0"><div class="task-title">' + U.esc(g.title) + '</div>' +
          '<span class="task-tag">' + (g.write || []).length + ' 字</span></div>' +
          '<div style="font-size:22px">›</div></div>';

        return '<div class="sec-title">🔤 选一课开始</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">' + tabs + '</div>' +
          '<div style="font-weight:900;color:#5C4322;margin:6px 0">' + unit.emoji + ' ' + unit.name + ' · ' + unit.type + '</div>' +
          rows + grow;
      }

      /* 已选课 → 出题或看结果 */
      var item = Kid.cnItem(u, Kid.cnLesson);
      if (!item) return '<div class="empty">这一课还没有内容</div>';
      var ref = 'U' + u + 'L' + Kid.cnLesson;
      var rec = E.quizToday(ref, 'cn', S.dateStr());

      if (rec || Kid.cnResult) {
        var r = Kid.cnResult || rec;
        var stars = r.correct === r.total ? '🌟🌟🌟' : (r.correct / r.total >= 0.6 ? '🌟🌟' : '🌟');
        var tips = '<div style="font-size:34px;font-weight:900;color:#2E7CA8">' + r.correct + ' / ' + r.total + '</div>' +
          '<div style="font-size:30px;margin:4px 0">' + stars + '</div>';
        var wrong = (r.detail || []).filter(function (x) { return !x.ok; });
        var learnHtml = wrong.length
          ? '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:10px;margin-top:10px">' +
          '<div style="font-weight:900;color:#5C4322;margin-bottom:6px">这几题再看一下就全对啦</div>' +
          wrong.map(function (x, wi) {
            return '<div style="padding:8px 0;' + (wi ? 'border-top:1px dashed #EFDDB8' : '') + '">' +
              '<div style="font-size:12px;font-weight:900;color:#B07A2E">' + U.esc(x.t || '') + '</div>' +
              '<div style="font-weight:800;color:#5C4322;line-height:1.6">' + U.esc(String(x.q).replace(/\n/g, ' ')) + '</div>' +
              '<div style="line-height:1.8;margin-top:2px">' +
              '<span class="muted">你选了：</span><b style="color:#8B5E3C">' + U.esc(x.pick || '（没选）') + '</b>　' +
              '<span class="muted">正确答案：</span><b style="color:#2F6B3A;font-size:18px">' + U.esc(x.c) + '</b></div>' +
              '<div style="background:#FFF3D6;border-radius:10px;padding:8px;margin-top:5px;line-height:1.7;font-size:14px;color:#7A5A2A">' +
              '💡 ' + U.esc(x.why || '') + '</div></div>';
          }).join('') + '</div>'
          : '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:14px;padding:12px;margin-top:10px;font-weight:800;color:#2F6B3A">全对！这一课的字你都记住了 🎉</div>';

        return '<div class="sec-title">' + U.esc(Kid.cnTitle(item)) + ' · 今天已完成</div>' +
          '<div style="text-align:center;padding:8px 0">' + tips +
          '<div class="muted">获得 💧 ' + r.water + ' 水滴</div></div>' + learnHtml +
          '<button class="btn btn-lav mt12" data-act="cnLesson" data-v="-2">换一课</button>';
      }

      /* 出题：10 道题，八种题型轮着来 */
      var chars = item.write || [];
      if (!chars.length) return '<div class="empty">这一课暂时没有生字</div>';

      var poolForNoise = [];
      C.units.forEach(function (x) {
        if (x.garden && x.garden.write) {
          x.garden.write.forEach(function (w) { poolForNoise.push(w); });
        }
        x.lessons.forEach(function (l) {
          (l.write || []).forEach(function (w) { poolForNoise.push(w); });
        });
      });

      var seedBase = 0;
      var ds = S.dateStr();
      for (var k = 0; k < ds.length; k++) seedBase += ds.charCodeAt(k);
      seedBase += Kid.cnUnit * 31 + Kid.cnLesson * 7 + 3;

      var QZ = global.CNQUIZ;
      var list = QZ ? QZ.build(chars, poolForNoise, seedBase) : [];
      if (!list.length) return '<div class="empty">这一课暂时出不了题</div>';

      var qs = list.map(function (q, i) {
        var optHtml = q.opts.map(function (o, j) {
          return '<label class="cn-opt" data-act="cnOpt" data-g="' + i + '" style="display:block;background:#FFF8E4;border:3px solid #EFDDB8;border-radius:14px;padding:12px 14px;margin:6px 0;cursor:pointer;font-size:' +
            (o.length > 6 ? '16px' : '22px') + ';font-weight:900;color:#5C4322">' +
            '<input type="radio" name="cnq_' + i + '" value="' + j + '" style="position:absolute;opacity:0;width:0;height:0">' +
            U.esc(o) + '</label>';
        }).join('');
        return '<div style="margin-top:12px;border-top:2px dashed #EFDDB8;padding-top:10px">' +
          '<div style="font-size:12px;font-weight:900;color:#B07A2E;background:#FFF3D6;display:inline-block;padding:2px 8px;border-radius:8px;margin-bottom:6px">' +
          U.esc(q.t) + '</div>' +
          '<div style="font-weight:900;color:#5C4322;line-height:1.7;font-size:16px">' + (i + 1) + '. ' +
          U.esc(q.q).replace(/\n/g, '<br>') + '</div>' +
          '<div style="margin-top:6px">' + optHtml + '</div></div>';
      }).join('');

      return '<div class="sec-title">' + U.esc(Kid.cnTitle(item)) + '（' + list.length + ' 题）</div>' +
        '<div class="muted">一关 10 道题，前后鼻音、形近字、同音字、组词、造句都有。答错会告诉你为什么。</div>' +
        qs +
        '<button class="btn btn-green mt12" data-act="cnSubmit" data-v="' + ref + '">我做完啦</button>' +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:14px" data-act="cnLesson" data-v="-2">换一课</button>';
    },

    /* 下面这段是旧出题代码，保留备用（CNQUIZ 没加载时兜底） */
    cnCharsOld: function () {
      var C = Kid.cnData();
      var item = Kid.cnItem(Kid.cnUnit, Kid.cnLesson);
      if (!item) return '<div class="empty">这一课还没有内容</div>';
      var ref = 'U' + Kid.cnUnit + 'L' + Kid.cnLesson;
      var chars = item.write || [];
      if (!chars.length) return '<div class="empty">这一课暂时没有生字</div>';

      var poolForNoise = [];
      C.units.forEach(function (x) {
        x.lessons.forEach(function (l) {
          (l.write || []).forEach(function (w) { poolForNoise.push(w); });
        });
      });

      var seedBase = 0;
      var ds = S.dateStr();
      for (var k = 0; k < ds.length; k++) seedBase += ds.charCodeAt(k);

      var qs = chars.map(function (w, i) {
        var c = w[0], py = w[1], words = (w[2] || '').split('|');
        /* 3 个干扰项：优先同拼音不同调，再随机 */
        var cand = poolForNoise.filter(function (x) { return x[0] !== c; });
        var noise = [];
        var step = (seedBase + i * 7) % Math.max(cand.length, 1);
        for (var n = 0; n < 40 && noise.length < 3; n++) {
          var pick = cand[(step + n * 5) % cand.length][0];
          if (noise.indexOf(pick) < 0) noise.push(pick);
        }
        var opts = [c].concat(noise);
        /* 打乱 */
        for (var j = opts.length - 1; j > 0; j--) {
          var r2 = (seedBase + i * 13 + j * 3) % (j + 1);
          var tmp = opts[j]; opts[j] = opts[r2]; opts[r2] = tmp;
        }

        var head = (i % 2 === 1 && words.length)
          ? '<div style="font-size:17px;font-weight:900;color:#5C4322">' +
          U.esc(words[0]).split('').map(function (ch) { return ch === c ? '（　）' : ch; }).join('') +
          '</div><div class="muted">上面缺了一个字，拼音是 ' + py + '</div>'
          : '<div style="font-size:22px;font-weight:900;color:#2E7CA8">' + py + '</div>' +
          '<div class="muted">请选出这个字</div>';

        var optHtml = opts.map(function (o) {
          return '<label class="cn-opt" data-act="cnOpt" data-g="' + i + '" style="display:inline-block;min-width:68px;background:#FFF8E4;border:3px solid #EFDDB8;border-radius:14px;padding:12px 6px;margin:5px;text-align:center;cursor:pointer;font-size:28px;font-weight:900;color:#5C4322">' +
            '<input type="radio" name="cnq_' + i + '" value="' + o + '" style="position:absolute;opacity:0;width:0;height:0">' +
            o + '</label>';
        }).join('');

        return '<div style="margin-top:14px;border-top:2px dashed #EFDDB8;padding-top:10px">' + head +
          '<div style="margin-top:6px">' + optHtml + '</div></div>';
      }).join('');

      return '<div class="sec-title">' + U.esc(Kid.cnTitle(item)) + '（' + chars.length + ' 字）</div>' +
        '<div class="muted">点一下你觉得对的那个字。猜错了也没关系，做完会告诉你正确答案。</div>' +
        qs +
        '<button class="btn btn-green mt12" data-act="cnSubmit" data-v="' + ref + '">我做完啦</button>' +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:14px" data-act="cnLesson" data-v="-2">换一课</button>';
    },

    /* ================= 预习探险 ================= */

    /* 当前册：'2a' 上册 / '2b' 下册 */
    cnBook: '2a',

    /* 取某一册的数据（课文原文库优先，没有就退回生字库） */
    bookData: function (b) {
      b = b || Kid.cnBook;
      var T = (b === '2b') ? global.CNT2B : global.CNT2A;
      if (T && T.units) return T;
      return Kid.cnData();
    },

    /* 课文原文库里按「no + title」找一课 */
    findText: function (no, title) {
      var T = Kid.bookData();
      if (!T) return null;
      var hit = null;
      T.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          if (!hit && l.title === title) hit = l;
        });
      });
      return hit;
    },

    /* 生成侦探提问（精编版优先，其次用课本资料自动出） */
    pvDetectiveOf: function (les, texts) {
      var P = global.CNPRE;
      var key = les.no + ' ' + les.title;
      if (P && P.lessons && P.lessons[key] && P.lessons[key].detective) {
        return P.lessons[key].detective;
      }
      var gen = Kid.autoPreview({ name: '', emoji: '', type: '' }, les).detective || [];
      /* 有原文就再补两个「回原文找答案」的问题 */
      if (texts && texts.length) {
        var first = texts[0].replace(/[，。！？；：、“”]/g, '');
        if (first.length > 12) {
          gen.unshift({
            q: '课文开头第一句写了什么？先别看，你猜猜看。',
            hint: '想想这篇课文的主角是谁，它一开始在干什么？',
            find: '开头是：' + first.slice(0, 18) + '……'
          });
        }
      }
      return gen;
    },

    /* 取这一课的完整预习资料：原文 + 批注 + 侦探提问 + 课后题 + 情节卡片 */
    pvData: function (u, l) {
      var C = Kid.cnData(); if (!C) return null;
      var unit = C.units[u]; if (!unit) return null;
      if (l === -1) return null;                       // 语文园地不做预习
      var les = unit.lessons[l]; if (!les) return null;

      var T = Kid.findText(les.no, les.title);
      var P = global.CNPRE;
      var key = les.no + ' ' + les.title;
      var rich = P && P.lessons && P.lessons[key];

      var texts = (T && T.text) || (rich && rich.lines) || [];
      var notes = (T && T.notes) || (rich && rich.notes) || [];
      var quiz = (rich && rich.quiz && rich.quiz.length) ? rich.quiz : ((T && T.quiz) || []);
      var cards = (T && T.cards) || (rich && rich.cards) || [];
      var flow = (T && T.flow) || (rich && rich.reciteTip) || [];
      var gist = (T && T.gist) || les.theme || '';

      return {
        no: les.no,
        title: les.title,
        unit: unit.name + ' · ' + unit.type,
        theme: les.theme || (T && T.gist) || '',
        texts: texts,
        notes: notes,
        detective: Kid.pvDetectiveOf(les, texts),
        quiz: quiz,
        cards: cards,
        flow: Array.isArray(flow) ? flow : [],
        gist: gist,
        recite: (T && T.recite) || (rich && rich.mustRecite ? 'all' : '') || '',
        reciteRange: (T && T.range) || '',
        refs: (T && T.refs) || ['涂重点', '课堂笔记', '小学教材全解'],
        verify: !!(T && T.verify),
        rich: !!rich,
        auto: !T && !rich
      };
    },

    /* 没写精编资料的课：用课本里的字词、主题自动凑一份，保证每课都能预习 */
    autoPreview: function (unit, les) {
      var words = les.words || [], write = les.write || [];
      var det = [];
      det.push({
        q: '读课题《' + les.title + '》，猜一猜这篇课文大概会讲什么？',
        hint: '课题里最关键的是哪个词？把它圈出来，想一想它会做什么、会去哪儿。',
        find: '带着这个猜想去读课文，看看猜对了没有'
      });
      if (les.theme) {
        det.push({
          q: '读完课文，你能用一句话说出它主要讲了什么吗？',
          hint: '想一想：谁？在哪里？做了什么？最后怎么样了？',
          find: les.theme
        });
      }
      if (write.length) {
        var w0 = write[0];
        det.push({
          q: '这一课要会写的字里有「' + w0[0] + '」（' + w0[1] + '）。它在课文的哪个词语里？',
          hint: '先读读它能组的词：' + (w0[2] || '').split('|').slice(0, 2).join('、') + '。再回课文里找。',
          find: '找到了就大声读三遍'
        });
      }
      if (words.length) {
        det.push({
          q: '这一课有这些词语：' + words.slice(0, 4).join('、') + '。哪一个你还没见过？',
          hint: '没见过的那个，先猜一猜意思，再读读它所在的句子。',
          find: '读句子猜意思，比查字典记得牢'
        });
      }

      var q = [];
      var C2 = Kid.cnData();
      var pool = [];
      C2.units.forEach(function (uu) {
        uu.lessons.forEach(function (ll) { (ll.write || []).forEach(function (ww) { pool.push(ww); }); });
      });
      function pick4(right, cands, seed, take) {
        var idx = (take === undefined || take === null) ? -1 : take;
        var o = [right];
        for (var n = 0; n < cands.length && o.length < 4; n++) {
          var p = cands[(n * 7 + seed * 3) % cands.length];
          if (idx >= 0) p = p[idx];
          if (p && p !== right && o.indexOf(p) < 0) o.push(p);
        }
        while (o.length < 2) o.push('（其他）');
        for (var k = o.length - 1; k > 0; k--) {
          var r = (seed * 7 + k * 3) % (k + 1);
          var t = o[k]; o[k] = o[r]; o[r] = t;
        }
        return o;
      }

      /* 题型 1：看拼音选字 */
      var n1 = Math.min(3, write.length);
      for (var i = 0; i < n1; i++) {
        var wz = write[(i * 2) % write.length];
        var cands = pool.filter(function (x) { return x[0] !== wz[0]; });
        var o1 = pick4(wz[0], cands, i, 0);
        q.push({
          q: '读音是「' + wz[1] + '」的是哪个字？',
          opts: o1, ans: o1.indexOf(wz[0]),
          guide: '读一读这个音，再看看它能组的词：' + (wz[2] || '').split('|').slice(0, 2).join('、') + '。是哪一个？'
        });
      }

      /* 题型 2：近义词 */
      if (les.near && les.near.length) {
        var nr = les.near[0];
        var o2 = pick4(nr[1], words.concat([nr[0]]), 11, null);
        q.push({
          q: '「' + nr[0] + '」的近义词是哪一个？',
          opts: o2, ans: o2.indexOf(nr[1]),
          guide: '近义词就是意思差不多的词。把两个词分别放进句子里读一读，哪个读起来顺？'
        });
      }

      /* 题型 3：反义词 */
      if (les.anti && les.anti.length) {
        var an = les.anti[0];
        var o3 = pick4(an[1], words.concat([an[0]]), 17, null);
        q.push({
          q: '「' + an[0] + '」的反义词是哪一个？',
          opts: o3, ans: o3.indexOf(an[1]),
          guide: '反义词就是意思相反的词。想想「' + an[0] + '」反过来是什么样？'
        });
      }

      /* 题型 4：多音字 */
      if (les.multi && les.multi.length) {
        var m = les.multi[0];
        var o4 = [m[1][0], (m[2] && m[2][0]) || '（另一个音）', '两个音都行', '不知道'];
        q.push({
          q: '多音字「' + m[0] + '」在「' + m[1][1] + '」里读什么？',
          opts: o4, ans: 0,
          guide: '这个字有两个读音。把它组成的两个词都读一遍，意思不一样，读音也不一样。'
        });
      }

      /* 题型 5：这篇课文讲了什么 */
      if (les.theme) {
        var otherThemes = [];
        C2.units.forEach(function (uu) {
          uu.lessons.forEach(function (ll) {
            if (ll.theme && ll.theme !== les.theme && otherThemes.length < 8) otherThemes.push(ll.theme.slice(0, 14));
          });
        });
        var o5 = pick4(les.theme.slice(0, 14), otherThemes, 23, null);
        q.push({
          q: '《' + les.title + '》主要讲了什么？',
          opts: o5, ans: o5.indexOf(les.theme.slice(0, 14)),
          guide: '读完课文想一想：谁？在哪里？做了什么？最后怎么样了？'
        });
      }

      return {
        no: les.no, title: les.title, unit: unit.name + ' · ' + unit.type,
        lines: [], theme: les.theme || '', scenes: [], notes: [],
        multi: les.multi || [], near: les.near || [], anti: les.anti || [],
        detective: det, quiz: q, mustRecite: false, auto: true
      };
    },

    /* 预习进度：存在仓库里，换天也不会丢 */
    pvKey: function (no, title) { return Kid.cnBook + '|' + no + ' ' + title; },
    pvProg: function (key) {
      var s = S.state;
      if (!s.pv) s.pv = {};
      if (!s.pv[key]) s.pv[key] = { read: 0, ask: 0, boss: 0, sum: 0, done: 0 };
      return s.pv[key];
    },
    pvSave: function (key, patch) {
      var p = Kid.pvProg(key);
      Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
      S.save();
    },
    /* 三态：0 未预习 / 1 预习中 / 2 已预习 */
    pvState: function (key) {
      var p = Kid.pvProg(key);
      if (p.done) return 2;
      if (p.read || p.ask || p.boss || p.sum) return 1;
      return 0;
    },

    cnPreview: function () {
      if (Kid.pvLesson === -2) return Kid.pvCatalog();
      if (Kid.pvStage === 'read') return Kid.pvRead();
      if (Kid.pvStage === 'ask') return Kid.pvAsk();
      if (Kid.pvStage === 'boss') return Kid.pvBoss();
      if (Kid.pvStage === 'sum') return Kid.pvSum();
      /* 旧入口兼容 */
      if (Kid.pvStage === 'detective') return Kid.pvAsk();
      if (Kid.pvStage === 'scene') return Kid.pvRead();
      if (Kid.pvStage === 'quiz') return Kid.pvBoss();
      return Kid.pvHome();
    },

    /* ---- 整本书目录：两册切换 + 三态图标 + 背诵标识 ---- */
    pvCatalog: function () {
      var C = Kid.cnData();
      var other = Kid.cnBook === '2a' ? '2b' : '2a';

      var sw = '<div style="display:flex;gap:8px;margin:8px 0 4px">' +
        '<button class="btn ' + (Kid.cnBook === '2a' ? 'btn-green' : 'btn-ghost') + '" style="flex:1;min-height:52px;font-size:15px" data-act="pvBook" data-v="2a">📗 二年级上册</button>' +
        '<button class="btn ' + (Kid.cnBook === '2b' ? 'btn-green' : 'btn-ghost') + '" style="flex:1;min-height:52px;font-size:15px" data-act="pvBook" data-v="2b">📘 二年级下册</button>' +
        '</div>' +
        '<div class="muted" style="font-size:12px">' + U.esc(Kid.bookData().meta.version) + '</div>';

      var legend = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0;font-size:12px;font-weight:800;color:#7A6248">' +
        '<span>⚪ 还没预习</span><span>🟡 预习中</span><span>✅ 已预习</span><span>📖 要背诵</span></div>';

      var html = '';
      C.units.forEach(function (unit, ui) {
        var rows = unit.lessons.map(function (l, li) {
          var key = Kid.pvKey(l.no, l.title);
          var st = Kid.pvState(key);
          var T = Kid.findText(l.no, l.title);
          var needRec = T && T.recite;
          var icon = st === 2 ? '✅' : (st === 1 ? '🟡' : '⚪');
          var tagCls = st === 2 ? 'ok' : (st === 1 ? 'wait' : '');
          var tagTxt = st === 2 ? '已预习' : (st === 1 ? '预习中' : '未预习');
          return '<div class="task-card' + (st === 2 ? ' done' : '') + '" data-act="pvPick" data-v="' + ui + ':' + li + '">' +
            '<div class="task-emoji">' + icon + '</div>' +
            '<div style="flex:1;min-width:0">' +
            '<div class="task-title">' + U.esc(l.no + ' ' + l.title) +
            (needRec ? ' <span style="font-size:13px">📖</span>' : '') + '</div>' +
            '<div><span class="task-tag ' + tagCls + '">' + tagTxt + '</span>' +
            (needRec ? ' <span class="task-tag water">📖 ' + U.esc((T.recite === 'all' ? '全文背诵' : T.reciteRange || '要背诵')) + '</span>' : '') +
            '</div></div>' +
            '<div style="font-size:22px">›</div></div>';
        }).join('');
        html += '<div style="margin-top:12px">' +
          '<div style="font-weight:900;color:#5C4322;font-size:15px">' + unit.emoji + ' ' + U.esc(unit.no) + ' · ' + U.esc(unit.name) + '</div>' +
          rows + '</div>';
      });

      return '<div class="sec-title">🔍 整本书目录</div>' +
        '<div class="muted">学到哪一课就点哪一课。点进去先读原文，再当小侦探找答案。</div>' +
        sw + legend + html;
    },

    /* 关卡列表 */
    pvHome: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      if (!d) { Kid.pvLesson = -2; return Kid.pvPickLesson(); }
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvLesson" data-v="-2">← 换一课</button>';

      var key = Kid.pvKey(d.no, d.title);
      var p = Kid.pvProg(key);
      var detN = (d.detective || []).length;
      var quizN = (d.quiz || []).length;

      function card(icon, name, sub, act, v, ok) {
        return '<div class="task-card' + (ok ? ' done' : '') + '" data-act="' + act + '" data-v="' + v + '">' +
          '<div class="task-emoji">' + icon + '</div>' +
          '<div style="flex:1;min-width:0"><div class="task-title">' + name + '</div>' +
          '<div class="muted" style="font-size:12px;font-weight:700">' + sub + '</div></div>' +
          (ok ? '<div style="font-size:28px">✅</div>' : '<div style="font-size:22px">›</div>') + '</div>';
      }

      var refs = (d.refs || []).map(function (r) {
        return '<span class="task-tag">' + U.esc(r) + '</span>';
      }).join(' ');

      return back +
        '<div class="sec-title">🔍 ' + U.esc(d.no + ' ' + d.title) +
        (d.recite ? ' <span style="font-size:14px">📖</span>' : '') + '</div>' +
        '<div class="muted" style="font-size:12px">' + U.esc(d.unit) +
        (d.verify ? ' · ⚠️ 新增篇目，请以课本为准' : '') + '</div>' +
        '<div style="margin:8px 0">' + refs + '</div>' +
        (d.theme ? '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:10px;margin:10px 0;line-height:1.7;color:#5C4322">' +
          '<b>这篇在讲什么：</b>' + U.esc(d.theme) + '</div>' : '') +
        (d.recite ? '<div style="background:#E7F3FF;border:2px solid #A8CBE8;border-radius:14px;padding:10px;margin:10px 0;font-weight:800;color:#2E5F8A">' +
          '📖 这一课要背诵：' + U.esc(d.recite === 'all' ? '全文背诵' : (d.reciteRange || '部分段落')) + '</div>' : '') +
        '<div style="height:8px"></div>' +
        card('📖', '第 1 关 · 读原文', '和课本一模一样，可以点朗读', 'pvStage', 'read', !!p.read) +
        card('🕵️', '第 2 关 · 侦探提问', detN + ' 个问题，先自己想', 'pvStage', 'ask', !!p.ask) +
        card('🧟', '第 3 关 · 僵尸闯关', quizN + ' 道课后题，答错有提示', 'pvStage', 'boss', !!p.boss) +
        card('🧩', '第 4 关 · 故事拼图', '把课文讲的事按顺序排好', 'pvStage', 'sum', !!p.sum) +
        (d.recite
          ? card('🎤', '第 5 关 · 背诵挑战', '思维导图 + 五种玩法', 'rcOpen', U.esc(d.no + d.title), !!p.done)
          : '') +
        '<button class="btn btn-lav mt12" data-act="pvFinish" data-v="' + U.esc(key) + '">' +
        (p.done ? '✅ 这一课已经预习完啦' : '🎉 我预习完这一课了') + '</button>';
    },

    /* 第 1 关：侦探提问 */
    pvDetective: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvStage" data-v="">← 回关卡</button>';
      var body = (d.detective || []).map(function (x, i) {
        var open = Kid.pvOpen[i] || 0;
        var hintHtml = open >= 1
          ? '<div style="background:#FFF3D6;border:2px solid #F0C97A;border-radius:12px;padding:10px;margin-top:8px;line-height:1.7">' +
          '<b>🕵️ 线索：</b>' + U.esc(x.hint) + '</div>' : '';
        var findHtml = open >= 2
          ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:12px;padding:10px;margin-top:8px;line-height:1.7">' +
          '<b>✅ 答案：</b>' + U.esc(x.find) + '</div>' : '';
        var btns = '<div style="display:flex;gap:8px;margin-top:8px">' +
          (open >= 1 ? '' : '<button class="btn btn-lav" style="flex:1;min-height:52px;font-size:15px" data-act="pvHint" data-v="' + i + '">给我一条线索</button>') +
          (open >= 1 && open < 2 ? '<button class="btn btn-green" style="flex:1;min-height:52px;font-size:15px" data-act="pvFind" data-v="' + i + '">我想出来了，看答案</button>' : '') +
          '</div>';
        return '<div style="background:#FFFCF2;border:2px solid #EFDDB8;border-radius:14px;padding:12px;margin-top:10px">' +
          '<div style="font-weight:900;color:#5C4322;line-height:1.7">🔍 ' + U.esc(x.q) + '</div>' +
          hintHtml + findHtml + btns + '</div>';
      }).join('');

      var allDone = (d.detective || []).length &&
        (d.detective || []).every(function (x, i) { return (Kid.pvOpen[i] || 0) >= 1; });

      return back + '<div class="sec-title">🕵️ 侦探提问</div>' +
        '<div class="muted">先自己想，实在想不出来再点「给我一条线索」。想出来了就点开答案对一对。</div>' +
        body +
        (allDone ? '<button class="btn btn-green mt12" data-act="pvStage" data-v="scene">下一关：看课文画面 ›</button>' : '');
    },

    /* 第 1 关：读原文（与课本一致，带教辅批注） */
    pvRead: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvStage" data-v="">← 回关卡</button>';

      var lines = d.texts || [];
      var plain = lines.join('');

      /* 把批注的词在原文里标上小角标 */
      var marks = {};
      var bodyHtml = lines.map(function (p) {
        var seg = [];
        var rest = p;
        var changed = true;
        var guard = 0;
        while (changed && guard < 12) {
          changed = false;
          guard++;
          for (var ni = 0; ni < (d.notes || []).length; ni++) {
            var n = (d.notes || [])[ni];
            if (!n || !n.w) continue;
            var w = String(n.w).split(' /')[0].trim();
            if (!w || marks[w] != null) continue;
            var at = rest.indexOf(w);
            if (at < 0) continue;
            seg.push(rest.slice(0, at));
            seg.push({ mark: ni + 1, w: w });
            rest = rest.slice(at + w.length);
            marks[w] = ni + 1;
            changed = true;
            break;
          }
        }
        seg.push(rest);
        return seg.map(function (s) {
          return typeof s === 'string' ? U.esc(s)
            : '<b class="cn-note-w">' + U.esc(s.w) + '<sup>' + s.mark + '</sup></b>';
        }).join('');
      }).join('<br>');

      var textHtml = lines.length
        ? '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2.3;font-size:19px;font-weight:800;color:#3F2D14">' +
        bodyHtml + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn btn-lav" style="flex:1;min-height:52px;font-size:15px" data-act="cnRead" data-v="' +
        U.esc(plain.slice(0, 400)) + '">🔊 听老师读一遍</button>' +
        '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:15px" data-act="cnReadSlow" data-v="' +
        U.esc(plain.slice(0, 400)) + '">🐢 慢一点</button>' +
        '</div>'
        : '<div style="background:#FFF8E4;border:2px dashed #EFDDB8;border-radius:14px;padding:14px;line-height:1.8">' +
        '这一课的课文原文还在录入中。<br><span class="muted">先打开语文书读两遍，再回来当侦探。</span></div>';

      var noteHtml = (d.notes || []).length
        ? '<div class="sec-title" style="font-size:16px;margin-top:14px">📌 教辅批注（点开难词的意思）</div>' +
        d.notes.map(function (n, ni) {
          return '<div style="line-height:1.9;margin-top:6px">' +
            '<span style="display:inline-block;min-width:20px;height:20px;line-height:20px;text-align:center;background:#8B5E3C;color:#fff;border-radius:10px;font-size:12px;font-weight:900">' + (ni + 1) + '</span> ' +
            '<b style="color:#8B5E3C">' + U.esc(n.w) + '</b>：' + U.esc(n.m) + '</div>';
        }).join('')
        : '';

      var sceneHtml = '';
      var P = global.CNPRE;
      var rk = P && P.lessons && P.lessons[d.no + ' ' + d.title];
      if (rk && rk.scenes && rk.scenes.length) {
        sceneHtml = '<div class="sec-title" style="font-size:16px;margin-top:14px">🖼️ 在脑子里放小电影</div>' +
          rk.scenes.map(function (sc) {
            return '<div style="background:#F4FBFF;border:2px solid #CFE6F7;border-radius:14px;padding:12px;margin-top:10px">' +
              '<div style="font-weight:900;color:#2E5C7A;font-size:16px">' + (sc.emoji || '🎬') + ' ' + U.esc(sc.season || '') + '</div>' +
              '<div style="line-height:1.9;margin-top:6px;color:#3F2D14">' + U.esc(sc.text) + '</div>' +
              (sc.ask ? '<div style="margin-top:8px;color:#8B5E3C;font-weight:800;font-size:14px">💭 ' + U.esc(sc.ask) + '</div>' : '') +
              '</div>';
          }).join('');
      }

      var multiHtml = (d.multi || []).length
        ? '<div class="sec-title" style="font-size:16px;margin-top:14px">🔀 多音字</div>' +
        d.multi.map(function (m) {
          return '<div style="line-height:1.9;margin-top:4px"><b style="color:#8B5E3C;font-size:17px">' + U.esc(m.w) + '</b>　' +
            m.list.map(function (x) { return '<span style="color:#2E7CA8;font-weight:800">' + x[0] + '</span>（' + U.esc(x[1]) + '）'; }).join('　') +
            '</div>';
        }).join('')
        : '';

      var pairHtml = ((d.near || []).length || (d.anti || []).length)
        ? '<div class="sec-title" style="font-size:16px;margin-top:14px">🔗 近义词 · 反义词</div>' +
        ((d.near || []).length ? '<div style="margin-top:4px">近：' + (d.near || []).map(function (x) { return U.esc(x[0]) + ' — ' + U.esc(x[1]); }).join('　') + '</div>' : '') +
        ((d.anti || []).length ? '<div style="margin-top:4px">反：' + (d.anti || []).map(function (x) { return U.esc(x[0]) + ' — ' + U.esc(x[1]); }).join('　') + '</div>' : '')
        : '';

      return back + '<div class="sec-title">📖 读原文</div>' +
        '<div class="muted">和语文书上一样。先读两遍，标着小数字的地方下面有解释。</div>' +
        '<div style="height:8px"></div>' + textHtml + sceneHtml + noteHtml + multiHtml + pairHtml +
        '<button class="btn btn-green mt12" data-act="pvStage" data-v="ask">下一关：侦探提问 ›</button>';
    },

    /* 思维导图（离线 SVG，不用联网） */
    mindSvg: function (flow, title) {
      if (!flow || !flow.length) return '';
      var n = Math.min(flow.length, 6);
      var W = 320, H = 40 + n * 46;
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px;display:block;margin:0 auto">' +
        '<defs><marker id="mh" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
        '<path d="M0,0 L8,4 L0,8 z" fill="#C89A5B"/></marker></defs>';
      /* 中心 */
      var cy = 22;
      s += '<rect x="10" y="6" width="' + (W - 20) + '" height="32" rx="10" fill="#7FB069"/>' +
        '<text x="' + (W / 2) + '" y="27" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">' +
        (title || '').slice(0, 10) + '</text>';
      for (var i = 0; i < n; i++) {
        var y = 48 + i * 46;
        s += '<line x1="' + (W / 2) + '" y1="38" x2="' + (W / 2) + '" y2="' + (y + 16) + '" stroke="#C89A5B" stroke-width="2"/>';
        var bw = W - 40;
        s += '<rect x="20" y="' + y + '" width="' + bw + '" height="34" rx="9" fill="#FFF8E4" stroke="#E8D3A8" stroke-width="2"/>';
        s += '<circle cx="38" cy="' + (y + 17) + '" r="11" fill="#E8A317"/>' +
          '<text x="38" y="' + (y + 22) + '" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">' + (i + 1) + '</text>';
        var txt = String(flow[i]).slice(0, 14);
        s += '<text x="56" y="' + (y + 22) + '" font-size="13" font-weight="700" fill="#5C4322">' +
          txt.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      }
      s += '</svg>';
      return '<div style="background:#FFFCF2;border:2px solid #EFDDB8;border-radius:14px;padding:10px;margin-top:10px">' +
        '<div style="font-weight:900;color:#5C4322;margin-bottom:6px">🧠 课文思维导图</div>' + s + '</div>';
    },

    /* ================= 倒计时（三项每日固定任务） ================= */
    timerKey: function (taskId) { return S.dateStr() + ':' + taskId; },
    timerOf: function (taskId) {
      var s = S.state; if (!s.timers) s.timers = {};
      return s.timers[Kid.timerKey(taskId)] || null;
    },
    timerStart: function (taskId, limit) {
      var s = S.state; if (!s.timers) s.timers = {};
      var k = Kid.timerKey(taskId);
      if (!s.timers[k]) {
        s.timers[k] = {
          start: Date.now(),
          end: Date.now() + (limit || 10) * 60000,
          limit: limit || 10, done: 0
        };
        S.save();
      }
      return s.timers[k];
    },
    timerEnd: function (taskId) {
      var k = Kid.timerKey(taskId);
      if (S.state.timers && S.state.timers[k]) delete S.state.timers[k];
    },
    /* 倒计时是否已经走完 */
    timerEnded: function (taskId) {
      var t = Kid.timerOf(taskId);
      return !!t && Date.now() >= t.end;
    },
    /* 还剩几秒（向上取整到秒） */
    timerLeftSec: function (taskId) {
      var t = Kid.timerOf(taskId);
      if (!t) return 0;
      return Math.max(0, Math.floor((t.end - Date.now()) / 1000));
    },
    /* 提前完成的奖励分钟数（剩余时间每满 1 分钟 = 1 滴水滴） */
    earlyMinutes: function (taskId) {
      return Math.floor(Kid.timerLeftSec(taskId) / 60);
    },
    /* 计时条：没开始 → 开始按钮；计时中 → 大号倒计时 */
    timerHtml: function (taskId, limit) {
      var t = Kid.timerOf(taskId);
      if (!t) {
        return '<button class="btn btn-lav" style="width:auto;min-height:52px;font-size:14px;padding:8px 14px" data-act="timerStart" data-v="' +
          U.esc(taskId) + ':' + (limit || 10) + '">⏱ 开始计时</button>';
      }
      return '<div class="timer-tick" data-end="' + t.end + '" data-task="' + U.esc(taskId) + '" ' +
        'style="font-size:16px;font-weight:900;color:#2E7CA8;background:#E7F3FF;border:2px solid #A8CBE8;border-radius:12px;padding:8px 14px;display:inline-block">⏱ --:--</div>';
    },
    tickTimers: function () {
      if (!document.querySelectorAll) return;
      var els = document.querySelectorAll('.timer-tick');
      var needRender = false;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var end = parseInt(el.getAttribute('data-end'), 10);
        if (!end) continue;
        var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
        var m = Math.floor(left / 60), sec = left % 60;
        if (left === 0) {
          el.textContent = '⏰ 时间到啦';
          el.style.color = '#C0392B'; el.style.background = '#FDECEA'; el.style.borderColor = '#E8A9A9';
          /* 时间走完 → 重绘一次，把「时间到啦，打卡」按钮换上来（只换一次，不会循环） */
          if (el.getAttribute('data-ended') !== '1') {
            el.setAttribute('data-ended', '1');
            needRender = true;
          }
        } else {
          el.textContent = '⏱ ' + m + ':' + (sec < 10 ? '0' : '') + sec;
          if (left <= 60) { el.style.color = '#C0392B'; el.style.background = '#FDECEA'; }
        }
      }
      if (needRender && global.App && global.App.render) {
        setTimeout(function () { try { global.App.render(); } catch (e) { } }, 60);
      }
    },
    /* 大号倒计时（固定任务卡片里显示） */
    bigTimer: function (taskId) {
      var t = Kid.timerOf(taskId);
      if (!t) return '';
      return '<div class="timer-tick" data-end="' + t.end + '" data-task="' + U.esc(taskId) + '" ' +
        'style="font-size:30px;font-weight:900;color:#2E7CA8;background:#E7F3FF;border:3px solid #A8CBE8;border-radius:16px;padding:8px 20px;display:inline-block;min-width:150px;text-align:center">⏱ --:--</div>';
    },

    /* ================= 阅读打卡 · 故事海漂流 ================= */
    readTab: '',
    readPick: '',

    /* 书单：校内杂志 + 适龄儿童文学 */
    READ_BOOKS: [
      { g: '校内杂志 · 报刊', emoji: '📰', list: ['小学生天地', '我们爱科学', '少年文艺', '儿童文学', '中国少年报', '小哥白尼', '好奇号', '万物', '环球少年地理', '少年科学画报', '儿童时代'] },
      { g: '桥梁书 · 童话', emoji: '🐷', list: ['小猪唏哩呼噜', '一年级大个子二年级小个子', '笨狼的故事', '小巴掌童话', '没头脑和不高兴', '青蛙和蟾蜍', '长袜子皮皮', '木偶奇遇记'] },
      { g: '儿童文学 · 中长篇', emoji: '📚', list: ['夏洛的网', '窗边的小豆豆', '稻草人', '宝葫芦的秘密', '了不起的狐狸爸爸', '绿野仙踪', '爱的教育', '亲爱的汉修先生', '城南旧事'] }
    ],

    cnReading: function () {
      var s = S.state;
      var today = S.dateStr();
      var done = (s.readLog || []).filter(function (r) { return r.date === today; });

      var head = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="cnTab" data-v="">← 返回</button>' +
        '<div class="sec-title">🌊 故事海漂流</div>' +
        '<div class="muted">选做任务：想读就读，不用计时。今天读了书就来盖一个 🐚，+💧10 水滴。</div>';

      /* 今天已打卡 */
      var doneHtml = done.length
        ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:14px;padding:12px;margin:12px 0;line-height:1.9">' +
        '<b style="color:#2F6B3A">今天已经漂过啦 🐚</b><br>' +
        done.map(function (r) {
          return '🐚 ' + U.esc(r.book || '自由阅读') + '　+' + (r.water || 10) + ' 水滴';
        }).join('<br>') +
        '<div class="muted" style="margin-top:6px">明天再来 ~</div></div>'
        : '';

      var readTimerPlaceholder = '';
      var pickHtml = Kid.READ_BOOKS.map(function (g) {
        return '<div style="margin-top:12px"><div style="font-weight:900;color:#5C4322;font-size:15px">' +
          g.emoji + ' ' + U.esc(g.g) + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' +
          g.list.map(function (b) {
            var on = Kid.readPick === b;
            return '<button class="pill-btn ' + (on ? 'pill-ok' : 'pill-gray') + '" data-act="readPick" data-v="' + U.esc(b) + '">' + U.esc(b) + '</button>';
          }).join('') + '</div></div>';
      }).join('');

      var checkBtn = done.length
        ? '<div class="muted mt12">今天的水滴已经收到啦，读过的书记在下面的漂流日记里 🐚</div>'
        : '<button class="btn btn-green mt12" data-act="readCheck">🐚 我读完啦，打卡 +💧10</button>' +
        '<div class="muted" style="margin-top:6px">' +
        (Kid.readPick ? '今天漂的是《' + U.esc(Kid.readPick) + '》' : '也可以自己挑一本书，直接打卡') + '</div>';

      /* 漂流日记 */
      var log = (s.readLog || []).slice(-14).reverse();
      var logHtml = log.length
        ? '<div class="sec-title" style="font-size:16px;margin-top:16px">🐚 我的漂流日记</div>' +
        log.map(function (r) {
          return '<div class="row"><div style="font-size:20px">🐚</div>' +
            '<div class="row-main"><div class="row-t">' + U.esc(r.book || '自由阅读') + '</div>' +
            '<div class="row-s">' + r.date + ' · +' + (r.water || 10) + ' 💧</div></div></div>';
        }).join('')
        : '';

      return head + doneHtml + readTimerPlaceholder +
        '<div class="sec-title" style="font-size:16px;margin-top:14px">📖 今天漂去哪座岛？</div>' +
        pickHtml + checkBtn + logHtml;
    },


    /* 第 3 关：预习小测（做错给引导式提问，不直接给答案） */
    pvQuiz: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvStage" data-v="">← 回关卡</button>';
      var qs = d.quiz || [];
      if (!qs.length) return back + '<div class="empty">这一课暂时没有小测题</div>';

      var body = qs.map(function (q, i) {
        var optHtml = q.opts.map(function (o, j) {
          return '<label class="cn-opt" data-act="cnOpt" data-g="p' + i + '" style="display:inline-block;background:#FFF8E4;border:3px solid #EFDDB8;border-radius:14px;padding:11px 12px;margin:5px;cursor:pointer;font-size:17px;font-weight:900;color:#5C4322;text-align:center">' +
            '<input type="radio" name="pvq_' + i + '" value="' + j + '" style="position:absolute;opacity:0;width:0;height:0">' +
            U.esc(o) + '</label>';
        }).join('');
        var guide = Kid.pvGuide[i]
          ? '<div style="background:#FFF3D6;border:2px solid #F0C97A;border-radius:12px;padding:10px;margin-top:8px;line-height:1.8">' +
          '<b>🕵️ 想一想：</b>' + U.esc(q.guide) + '<br>' +
          '<span class="muted" style="font-size:13px">（想好了再点一次选项，选你现在的答案）</span></div>'
          : '';
        return '<div style="margin-top:14px;border-top:2px dashed #EFDDB8;padding-top:10px">' +
          '<div style="font-weight:900;color:#5C4322;line-height:1.7">' + (i + 1) + '. ' + U.esc(q.q) + '</div>' +
          '<div style="margin-top:6px">' + optHtml + '</div>' + guide + '</div>';
      }).join('');

      return back + '<div class="sec-title">🎯 预习小测</div>' +
        '<div class="muted">猜错了不打紧 —— 我会先问你一个小问题，帮你自己想出答案。</div>' +
        body +
        '<button class="btn btn-green mt12" data-act="pvSubmit" data-v="' + Kid.pvUnit + '_' + Kid.pvLesson + '">我做完啦</button>';
    },

    /* 第 2 关：侦探提问 */
    pvAsk: function () { return Kid.pvDetective(); },

    /* 第 3 关：僵尸闯关 —— 一题一题来，答错先给引导，再答错才揭晓答案 */
    bossIdx: 0,
    bossTry: {},
    bossPicked: -1,
    bossDone: 0,

    bossFinish: function (d) {
      var qs = d.quiz || [];
      var n = qs.length;
      /* 第一次就答对的题数 */
      var cor = qs.filter(function (q, i) { return !(Kid.bossTry[i] > 0); }).length;
      Kid.pvSave(Kid.pvKey(d.no, d.title), { boss: 1 });
      var rec = E.finishQuiz('BOSS_' + d.no + d.title, 'cnboss', cor, n,
        d.no + ' ' + d.title + '（僵尸闯关）', []);
      Kid.bossDone = 1;
      U.modal({
        emoji: cor === n ? '🏆' : '🌻',
        title: '打退 ' + cor + ' / ' + n + ' 只僵尸',
        text: '获得 💧 ' + rec.water + ' 水滴。\n' +
          (cor === n ? '一次全对！这一课你真的读懂了。' : '有 ' + (n - cor) + ' 只是第二次才打退的，明天再来一遍就很轻松啦。'),
        buttons: [{
          text: '好！', cls: 'btn-green', onClick: function (c) {
            c(); Kid.bossIdx = 0; Kid.bossTry = {}; Kid.bossPicked = -1; Kid.bossDone = 0;
            Kid.pvStage = '';
            App.afterChange();
          }
        }]
      });
      return false;
    },

    pvBoss: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvStage" data-v="">← 回关卡</button>';
      var qs = d.quiz || [];
      if (!qs.length) return back + '<div class="empty">这一课暂时没有课后题</div>';

      var i = Math.min(Kid.bossIdx, qs.length - 1);
      var q = qs[i];
      var tried = Kid.bossTry[i] || 0;

      /* 顶部：僵尸进度条 */
      var bar = '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:10px;text-align:center">' +
        '<div style="font-size:13px;font-weight:900;color:#8B5E3C;margin-bottom:6px">打退 ' + i + ' / ' + qs.length + ' 只僵尸</div>' +
        '<div style="font-size:24px;letter-spacing:2px">' +
        qs.map(function (_, k) { return k < i ? '🌻' : (k === i ? '🧟' : '⬜'); }).join('') +
        '</div></div>';

      var optHtml = q.opts.map(function (o, j) {
        return '<button class="btn btn-ghost cn-opt" data-act="bossPick" data-v="' + j + '" ' +
          'style="min-height:56px;font-size:17px;font-weight:900;color:#5C4322;text-align:left;padding:12px 14px;margin-bottom:8px;background:#FFF8E4;border:3px solid #EFDDB8">' +
          U.esc(o) + '</button>';
      }).join('');

      var guide = (tried === 1)
        ? '<div style="background:#FFF3D6;border:2px solid #F0C97A;border-radius:12px;padding:12px;margin:10px 0;line-height:1.8">' +
        '<b>🕵️ 想一想：</b>' + U.esc(q.guide || '回到课文里再读一读那句话。') + '<br>' +
        '<span class="muted" style="font-size:13px">想好了再选一次，这次一定行。</span></div>'
        : (tried >= 2
          ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:12px;padding:12px;margin:10px 0;line-height:1.8">' +
          '<b>🌻 答案是：</b>' + U.esc(q.opts[q.ans]) + '<br>' +
          '<span style="font-size:13px">' + U.esc(q.guide || '') + '</span></div>' : '');

      var nextBtn = (tried >= 2 || Kid.bossPicked === i)
        ? '<button class="btn btn-green mt8" data-act="bossNext">' +
        (i >= qs.length - 1 ? '看我的成绩 ›' : '下一只僵尸 ›') + '</button>' : '';

      return back + '<div class="sec-title">🧟 僵尸闯关</div>' +
        '<div class="muted">一题一只僵尸。答错先给你一个提示，自己想出来才算打退它。</div>' +
        '<div style="height:8px"></div>' + bar +
        '<div style="margin-top:12px;font-weight:900;color:#5C4322;line-height:1.7;font-size:17px">' +
        '第 ' + (i + 1) + ' 题：' + U.esc(q.q) + '</div>' +
        '<div style="margin-top:8px">' + optHtml + '</div>' + guide + nextBtn;
    },

    /* 第 4 关：故事拼图（概括训练） */
    sumMode: '',      // '' | sort | gist
    sumPick: [],      // 已点击的卡片下标（按点击顺序）
    sumCheck: 0,      // 是否已校验
    sumGist: -1,

    pvSum: function () {
      var d = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="pvStage" data-v="">← 回关卡</button>';
      var cards = d.cards || [];

      if (!cards.length) {
        return back + '<div class="empty"><span class="e-emoji">🧩</span>这一课暂时没有拼图卡片</div>';
      }

      /* ---- 玩法一：按顺序点 ---- */
      if (Kid.sumMode === 'sort') {
        var order = Kid.sumOrder(d);
        var html = order.map(function (ci, pos) {
          var picked = Kid.sumPick.indexOf(ci);
          var okMark = Kid.sumCheck ? (picked === pos ? '✅' : '❌') : (picked >= 0 ? '<b style="color:#E8A317">' + (picked + 1) + '</b>' : '');
          var cls = Kid.sumCheck ? (picked === pos ? ' done' : '') : (picked >= 0 ? ' waiting' : '');
          return '<div class="task-card' + cls + '" data-act="sumTap" data-v="' + ci + '">' +
            '<div class="task-emoji" style="font-size:20px;font-weight:900;color:#E8A317">' + okMark + '</div>' +
            '<div style="flex:1;min-width:0"><div class="task-title" style="font-size:15px">' + U.esc(cards[ci]) + '</div></div>' +
            '</div>';
        }).join('');

        var tip = Kid.sumCheck
          ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:12px;padding:10px;margin-top:10px;line-height:1.8">' +
          '✅ 排对 ' + Kid.sumRight(d) + ' / ' + cards.length + ' 张。' +
          (Kid.sumRight(d) === cards.length ? '你把整个故事的顺序都记住啦！' : '差一点的再排一次就全对了。') + '</div>'
          : '<div class="muted" style="margin-top:10px">按故事发生的先后，一张一张点下去。点错了点「重排」再来。</div>';

        return back + '<div class="sec-title">🧩 故事拼图</div>' +
          '<div class="muted">把课文里发生的事，按先后顺序排好队。</div>' +
          '<div style="height:8px"></div>' + html + tip +
          '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:15px" data-act="sumReset">↺ 重排</button>' +
          '<button class="btn btn-green" style="flex:1;min-height:52px;font-size:15px" data-act="sumCheck">' +
          (Kid.sumCheck ? '再排一次' : '我排好啦') + '</button></div>' +
          '<button class="btn btn-lav mt8" data-act="sumMode" data-v="gist">换个玩法：一句话概括 ›</button>';
      }

      /* ---- 玩法二：一句话概括 ---- */
      var opts = Kid.gistOpts(d);
      var gHtml = opts.list.map(function (o, j) {
        var picked = Kid.sumGist === j;
        var rightMark = (Kid.sumCheck && j === opts.ans) ? ' ✅' : (Kid.sumCheck && picked ? ' ❌' : '');
        return '<button class="btn btn-ghost cn-opt' + (picked ? ' on' : '') + '" data-act="sumGist" data-v="' + j + '" ' +
          'style="min-height:56px;font-size:15px;font-weight:800;color:#5C4322;text-align:left;padding:12px 14px;margin-bottom:8px;background:' +
          (Kid.sumCheck && j === opts.ans ? '#E9F7E9' : '#FFF8E4') + ';border:3px solid ' +
          (Kid.sumCheck && j === opts.ans ? '#B7DFB7' : '#EFDDB8') + '">' +
          U.esc(o.t) + rightMark + '</button>';
      }).join('');

      return back + '<div class="sec-title">🧩 一句话概括</div>' +
        '<div class="muted">读完一整篇，能不能用一句话说出它讲了什么？</div>' +
        '<div style="height:8px"></div>' + gHtml +
        (Kid.sumCheck
          ? '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:12px;padding:10px;margin-top:10px;line-height:1.8">' +
          (Kid.sumGist === opts.ans
            ? '<b style="color:#2F6B3A">✅ 说对了！</b> ' + U.esc(opts.list[opts.ans].t)
            : '<b style="color:#8B5E3C">再看看正确答案：</b> ' + U.esc(opts.list[opts.ans].t) +
            (opts.list[Kid.sumGist] && opts.list[Kid.sumGist].w
              ? '<div style="margin-top:8px;padding-top:8px;border-top:2px dashed #E8D3A8;color:#7A6248">' +
              '<b>你选的那句为什么不对：</b>' + U.esc(opts.list[Kid.sumGist].w) + '</div>'
              : '')) + '</div>' : '') +
        '<button class="btn btn-green mt12" data-act="sumDone">' +
        (Kid.sumCheck ? '我学会了 ›' : '我选好啦') + '</button>' +
        '<button class="btn btn-lav mt8" data-act="sumMode" data-v="sort">换个玩法：给故事排序 ›</button>';
    },

    /* 拼图卡片的打乱顺序（同一课同一天稳定） */
    sumOrder: function (d) {
      var n = (d.cards || []).length;
      var seed = 0, k = (d.no + d.title);
      for (var i = 0; i < k.length; i++) seed += k.charCodeAt(i);
      var a = [];
      for (var j = 0; j < n; j++) a.push(j);
      for (var m = a.length - 1; m > 0; m--) {
        var r = (seed * 3 + m * 7) % (m + 1);
        var t = a[m]; a[m] = a[r]; a[r] = t;
      }
      return a;
    },
    sumRight: function (d) {
      var order = Kid.sumOrder(d), n = 0;
      order.forEach(function (ci, pos) { if (Kid.sumPick.indexOf(ci) === pos) n++; });
      return n;
    },
    /* 一句话概括的选项：正确项 + 3 个别的课文的概括 */
    /* 归纳题的选项：干扰项不是别的课文，而是「这一篇的错误概括」——
       说得太窄 / 顺序颠倒 / 空泛套话。孩子要分辨的不只是「哪篇」，而是「概括得对不对」。 */
    gistOpts: function (d) {
      var seed = (d.no + d.title).length;
      var right = d.gist || '这一课的主要内容';
      var cards = d.cards || [];
      var bad = [];

      /* ① 说得太窄：只讲了其中一小段 */
      if (cards.length >= 2) {
        bad.push({ t: cards[0].replace(/[，。！？]$/, '') + '。', w: '这只说了课文开头的一小段，没说完一整篇。' });
      }
      /* ② 顺序颠倒：把后面的事说成先发生 */
      if (cards.length >= 3) {
        var last = cards[cards.length - 1].replace(/[，。！？]$/, '');
        var first = cards[0].replace(/[，。！？]$/, '');
        bad.push({
          t: '课文先讲了' + last + '，再讲了' + first + '。',
          w: '顺序反了。回课文看看，哪件事写在前面？'
        });
      }
      /* ③ 空泛套话：什么课文都能套，等于没概括 */
      bad.push({ t: '这一课讲了一件很有意义的事，告诉我们要做一个好孩子。', w: '这句话放在哪篇课文里都行，没有说出这一课到底讲了什么。' });
      /* ④ 抄细节当概括 */
      if (cards.length >= 2) {
        bad.push({
          t: '课文里出现了' + cards[0].replace(/[，。！？]$/, '').slice(0, 8) + '，还写了很多别的东西。',
          w: '这是在数课文里有什么，不是在说它讲了什么。'
        });
      }
      /* 还不够就从别的课文借一条（保证有 4 个选项） */
      if (bad.length < 3) {
        var C = Kid.cnData();
        var others = [];
        C.units.forEach(function (u) {
          u.lessons.forEach(function (l) {
            var T = Kid.findText(l.no, l.title);
            var g = (T && T.gist) || l.theme;
            if (g && g !== right) others.push(g);
          });
        });
        for (var i = 0; i < others.length && bad.length < 3; i++) {
          var p = others[(seed * 5 + i * 3) % others.length];
          if (!bad.some(function (x) { return x.t === p; })) {
            bad.push({ t: p, w: '这是另一篇课文的内容，不是这一课。' });
          }
        }
      }

      var picks = bad.slice(0, 3);
      var list = [{ t: right }].concat(picks);
      for (var j = list.length - 1; j > 0; j--) {
        var r = (seed * 7 + j * 5) % (j + 1);
        var t = list[j]; list[j] = list[r]; list[r] = t;
      }
      var ans = 0;
      list.forEach(function (x, k) { if (x.t === right) ans = k; });
      return { list: list, ans: ans };
    },

    /* ================= 背诵闯关 ================= */

    /* 全册必背清单 = 要背的课文 + 7 首古诗 + 8 个日积月累 */
    /* 从「第2—5自然段背诵」这类说明里截出要背的段落 */
    reciteSlice: function (l) {
      var t = l.text || [];
      if (!t.length) return [];
      if (l.recite === 'all' || !l.range) return t.slice();
      /* 抓「第a—b自然段」*/
      var m = String(l.range).match(/第\s*(\d+)\s*[—\-~－]\s*(\d+)\s*自然段/);
      if (m) {
        var a = Math.max(1, parseInt(m[1], 10));
        var b = Math.min(t.length, parseInt(m[2], 10));
        if (b >= a) return t.slice(a - 1, b);
      }
      /* 「第2自然段」单段 */
      var s = String(l.range).match(/第\s*(\d+)\s*自然段/);
      if (s) {
        var i = parseInt(s[1], 10);
        if (i >= 1 && i <= t.length) return [t[i - 1]];
      }
      return t.slice();
    },

    reciteList: function () {
      var C = Kid.cnData(); if (!C) return [];
      var out = [];
      /* 课文的听写词，用来挑填空挖哪里（挖词比挖字好猜） */
      var lessonWords = {};
      C.units.forEach(function (u) {
        u.lessons.forEach(function (l) { lessonWords[l.no + ' ' + l.title] = l.words || []; });
      });

      var seen = {};

      /* ---- 1) 精编版（田家四季歌等手写的，最详细） ---- */
      var P = global.CNPRE;
      if (P && P.lessons) {
        Object.keys(P.lessons).forEach(function (k) {
          var L = P.lessons[k];
          if (!L.lines || !L.lines.length || !L.mustRecite) return;
          /* 精编版没写导图的，去原文库里找同一课的 flow / cards 补上 */
          var src = null;
          [global.CNT2A, global.CNT2B].forEach(function (T) {
            if (src || !T || !T.units) return;
            T.units.forEach(function (u) {
              u.lessons.forEach(function (l) { if (!src && l.title === L.title) src = l; });
            });
          });
          out.push({
            id: 'RC_' + L.no + L.title, kind: '课文', title: L.no + ' ' + L.title,
            sub: L.unit || '', lines: L.lines, note: L.theme, tip: L.reciteTip,
            scenes: L.scenes || [], notes: L.notes || [],
            words: lessonWords[L.no + ' ' + L.title] || [],
            flow: L.flow || (src && src.flow) || [],
            cards: (src && src.cards) || L.cards || [],
            from: '2a'
          });
          seen[L.title] = 1;
        });
      }

      /* ---- 2) 课文原文库：两册所有标了要背的课文 ---- */
      [['2a', global.CNT2A, C], ['2b', global.CNT2B, null]].forEach(function (pair) {
        var vol = pair[0], T = pair[1], cur = pair[2];
        if (!T || !T.units) return;
        T.units.forEach(function (u) {
          u.lessons.forEach(function (l) {
            if (!l.recite || l.recite === 'no') return;
            if (seen[l.title]) return;              // 精编版已经列过就不重复
            var lines = Kid.reciteSlice(l);
            if (!lines.length) return;
            var isPoem = /古诗/.test(l.title);
            out.push({
              id: 'RC_' + vol + '_' + l.no + l.title,
              kind: isPoem ? '古诗' : '课文',
              title: (vol === '2b' ? '(下) ' : '') + l.no + ' ' + l.title,
              sub: u.name + ' · ' + (l.range || '背诵'),
              lines: lines,
              note: l.gist || '',
              tip: (l.flow && l.flow.length)
                ? '先看下面的思维导图，记住有哪几个画面，再一句一句背。'
                : '先一句一句读顺，再两句两句连起来背。',
              scenes: [],
              notes: l.notes || [],
              words: (cur ? lessonWords[l.no + ' ' + l.title] : (l.words || [])) || [],
              flow: l.flow || [], cards: l.cards || [],
              from: vol
            });
            seen[l.title] = 1;
          });
        });
      });

      /* ---- 3) 全册必背古诗（课本后面的） ---- */
      (C.poems || []).forEach(function (p, i) {
        if (seen[p.title]) return;
        /* 古诗没写单独的导图，就用每一句当线索节点 */
        var pf = p.lines.map(function (s, j) {
          return s.replace(/[，。？！]/g, '').slice(0, 12);
        });
        out.push({
          id: 'RC_P' + i, kind: '古诗', title: p.title,
          sub: p.author + ' · ' + p.from, lines: p.lines, note: p.note,
          tip: '先一句一句读顺，再两句两句连起来背。', scenes: [], notes: [], words: [],
          flow: pf, cards: pf, from: '2a'
        });
        seen[p.title] = 1;
      });

      /* ---- 4) 日积月累（和古诗重复的不列两遍） ---- */
      C.units.forEach(function (u, i) {
        var a = u.garden && u.garden.accum;
        if (!a || !a.lines) return;
        if (seen[a.title]) return;
        var af = a.lines.map(function (s) {
          return s.replace(/[，。？！]/g, '').slice(0, 12);
        });
        out.push({
          id: 'RC_A' + i, kind: '日积月累', title: a.title,
          sub: u.garden.title + (a.author ? ' · ' + a.author : ''),
          lines: a.lines, note: a.note, tip: '每天读两遍，读着读着就记住了。',
          scenes: [], notes: [], words: [], flow: af, cards: af, from: '2a'
        });
        seen[a.title] = 1;
      });
      return out;
    },

    reciteById: function (id) {
      var list = Kid.reciteList();
      return list.filter(function (x) { return x.id === id; })[0] || null;
    },

    cnReciteHome: function () {
      var list = Kid.reciteList();
      if (Kid.rcId) {
        var it = Kid.reciteById(Kid.rcId);
        if (it) return Kid.cnRecite(it);
        Kid.rcId = '';
      }
      var kinds = {};
      list.forEach(function (x) { kinds[x.kind] = (kinds[x.kind] || 0) + 1; });
      var head = '<div class="sec-title">🎮 背诵闯关</div>' +
        '<div class="muted">古诗、要背的课文、日积月累都在这里。选一个，用游戏把它背熟。</div>' +
        '<div class="muted" style="margin-top:6px;font-size:12px">共 ' + list.length + ' 篇（' +
        Object.keys(kinds).map(function (k) { return k + ' ' + kinds[k]; }).join(' · ') + '）</div>';

      var rows = list.map(function (x) {
        var rec = E.quizToday(x.id, 'recite', S.dateStr());
        var badge = rec ? '<span class="task-tag ok">✅ 今天背过</span>' : '<span class="task-tag">' + x.lines.length + ' 句</span>';
        return '<div class="task-card" data-act="rcOpen" data-v="' + U.esc(x.id) + '">' +
          '<div class="task-emoji">' + (x.kind === '古诗' ? '📜' : (x.kind === '日积月累' ? '💡' : '📖')) + '</div>' +
          '<div style="flex:1;min-width:0"><div class="task-title">' + U.esc(x.title) + '</div>' +
          '<div class="muted" style="font-size:12px;font-weight:700">' + U.esc(x.sub) + '</div>' + badge + '</div>' +
          '<div style="font-size:22px">›</div></div>';
      }).join('');
      return head + '<div style="height:8px"></div>' + rows;
    },

    cnRecite: function (it) {
      var back = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="rcBack">← 换一篇</button>';

      /* 还没选玩法 → 显示全文 + 五个玩法 */
      if (!Kid.rcGame) {
        var full = '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2.2;font-size:18px;font-weight:800;color:#3F2D14">' +
          it.lines.map(function (s) { return U.esc(s); }).join('<br>') + '</div>';
        var note = it.note ? '<div class="muted" style="margin-top:8px;line-height:1.8">💡 ' + U.esc(it.note) + '</div>' : '';
        var tip = '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:12px;padding:10px;margin-top:8px;line-height:1.8;color:#5C4322">' +
          '<b>怎么背：</b>' + U.esc(it.tip) + '</div>';
        var scenes = (it.scenes || []).length
          ? '<div class="sec-title" style="font-size:16px;margin-top:14px">🖼️ 脑子里的小电影</div>' +
          it.scenes.map(function (sc) {
            return '<div style="background:#F4FBFF;border:2px solid #CFE6F7;border-radius:12px;padding:10px;margin-top:8px;line-height:1.8">' +
              '<b style="color:#2E5C7A">' + sc.emoji + ' ' + sc.season + '：</b>' + U.esc(sc.text) + '</div>';
          }).join('')
          : '';
        var notes = (it.notes || []).length
          ? '<div class="sec-title" style="font-size:16px;margin-top:14px">📌 意思</div>' +
          it.notes.map(function (n) {
            return '<div style="line-height:1.9"><b style="color:#8B5E3C">' + U.esc(n.w) + '</b>：' + U.esc(n.m) + '</div>';
          }).join('')
          : '';

        /* 思维导图：有 flow 用 flow，没有就用故事卡片顶上 */
        var flow = (it.flow && it.flow.length) ? it.flow : ((it.cards && it.cards.length) ? it.cards : []);
        var mind = flow.length
          ? Kid.mindSvg(flow, it.title.replace(/^(\(下\)\s*)?/, '').slice(0, 10))
          : '';

        function gbtn(icon, name, sub, g) {
          return '<div class="task-card" data-act="rcGame" data-v="' + g + '">' +
            '<div class="task-emoji">' + icon + '</div>' +
            '<div style="flex:1;min-width:0"><div class="task-title">' + name + '</div>' +
            '<div class="muted" style="font-size:12px;font-weight:700">' + sub + '</div></div>' +
            '<div style="font-size:22px">›</div></div>';
        }

        return back + '<div class="sec-title">' + U.esc(it.title) + '</div>' +
          '<div class="muted">' + U.esc(it.sub) + '</div>' +
          '<div style="height:8px"></div>' + full +
          '<button class="btn btn-lav mt8" style="min-height:52px;font-size:15px" data-act="cnRead" data-v="' +
          U.esc(it.lines.join('') + '。' + it.title) + '">🔊 听一遍</button>' +
          tip + note + mind + scenes + notes +
          '<div class="sec-title" style="font-size:16px;margin-top:14px">🎮 选个玩法开始背</div>' +
          gbtn('🎯', '填空闯关', '把句子挖空，选词填进去', 'fill') +
          gbtn('🔗', '接下句', '给出上一句，选出下一句', 'chain') +
          gbtn('🧩', '句子排队', '句子打乱了，按顺序点回去', 'sort') +
          gbtn('👁️', '挡住背', '一点一点把字藏起来', 'cover') +
          gbtn('🎤', '录音背诵', '录下来，自己听一遍', 'rec');
      }

      var gback = '<button class="btn btn-ghost" style="min-height:52px;font-size:14px;margin-bottom:10px" data-act="rcGame" data-v="">← 换玩法</button>';
      if (Kid.rcGame === 'fill') return back + gback + Kid.rcFill(it);
      if (Kid.rcGame === 'chain') return back + gback + Kid.rcChain(it);
      if (Kid.rcGame === 'sort') return back + gback + Kid.rcSort(it);
      if (Kid.rcGame === 'cover') return back + gback + Kid.rcCover(it);
      if (Kid.rcGame === 'rec') return back + gback + Kid.rcRec(it);
      return back;
    },

    /* 把一句挖掉一块：优先挖这一课的词语，挖不到再按位置挖两字（固定位置，保证答案稳定） */
    rcMask: function (lines, i, words) {
      var s = lines[i] || '';
      var clean = s.replace(/[，。、？！；：]/g, '');
      if (clean.length < 3) return null;
      var take = 2;

      /* clean 下标 → 原句下标的映射（标点不占位） */
      var map = [], ci = 0;
      for (var oi = 0; oi < s.length; oi++) {
        if (/[，。、？！；：]/.test(s.charAt(oi))) continue;
        map[ci++] = oi;
      }
      /* 挖空不能跨过标点，不然逗号一起被吞掉，孩子读不出停顿 */
      function contiguous(p, tk) {
        if (p < 0 || p + tk > map.length) return false;
        return map[p + tk - 1] - map[p] === tk - 1;
      }

      /* 候选位置：优先挖课本里的词，其次按句子顺序轮着挖 */
      var cands = [];
      if (words && words.length) {
        words.forEach(function (wd) {
          var p = clean.indexOf(wd);
          if (p >= 0) cands.push([p, wd.length]);
        });
      }
      if (!cands.length) cands.push([(i * 3 + 1) % (clean.length - take + 1), take]);
      var guard = 0;
      while (guard < clean.length) {
        var c0 = cands[guard % cands.length];
        var base = c0[0] + Math.floor(guard / cands.length);
        if (base + c0[1] <= clean.length && contiguous(base, c0[1])) {
          take = c0[1]; cands = [[base, take]]; break;
        }
        guard++;
      }
      if (!cands.length) return null;
      var pos = cands[0][0];
      var ansTxt = clean.substr(pos, take);
      var pool = [];
      lines.forEach(function (x, j) {
        if (j === i) return;
        var c2 = x.replace(/[，。、？！；：]/g, '');
        for (var k = 0; k + take <= c2.length; k++) {
          var seg = c2.substr(k, take);
          if (seg !== ansTxt && pool.indexOf(seg) < 0) pool.push(seg);
        }
      });
      var noise = [];
      for (var n = 0; n < pool.length && noise.length < 3; n++) {
        var cand = pool[(n * 5 + i * 2) % pool.length];
        if (noise.indexOf(cand) < 0) noise.push(cand);
      }
      while (noise.length < 3) noise.push('○○');
      var opts = [ansTxt].concat(noise);
      for (var j2 = opts.length - 1; j2 > 0; j2--) {
        var r = (i * 11 + j2 * 3) % (j2 + 1);
        var t = opts[j2]; opts[j2] = opts[r]; opts[r] = t;
      }
      /* 保留标点：把 clean 的下标映射回原句的下标，只挖掉字，不挖掉标点 */
      var oStart = map[pos];
      var oEnd = (pos + take - 1 < map.length ? map[pos + take - 1] : s.length - 1) + 1;
      if (oStart == null) oStart = 0;
      if (oEnd <= oStart) oEnd = Math.min(s.length, oStart + take);
      var blank = U.esc(s.slice(0, oStart)) +
        '<span style="color:#D98324">（　）</span>' +
        U.esc(s.slice(oEnd));
      return { blank: blank, opts: opts, ans: opts.indexOf(ansTxt), full: s };
    },

    /* 玩法 1：填空闯关 */
    rcFill: function (it) {
      var lines = it.lines;
      var i = Kid.rcStep;
      if (i >= lines.length) return Kid.rcFinish(it, 'fill');
      var m = Kid.rcMask(lines, i, it.words);
      if (!m) { Kid.rcStep++; return Kid.rcFill(it); }

      var optHtml = m.opts.map(function (o, j) {
        return '<label class="cn-opt" data-act="cnOpt" data-g="rf" style="display:inline-block;min-width:78px;background:#FFF8E4;border:3px solid #EFDDB8;border-radius:14px;padding:12px 10px;margin:5px;cursor:pointer;font-size:24px;font-weight:900;color:#5C4322;text-align:center">' +
          '<input type="radio" name="rfq" value="' + j + '" style="position:absolute;opacity:0;width:0;height:0">' +
          U.esc(o) + '</label>';
      }).join('');

      return '<div class="sec-title">🎯 填空闯关　' + (i + 1) + ' / ' + lines.length + '</div>' +
        '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2;font-size:20px;font-weight:900;color:#3F2D14">' +
        m.blank + '</div>' +
        '<div class="muted" style="margin-top:6px">括号里该填哪两个字？</div>' +
        '<div style="margin-top:8px">' + optHtml + '</div>' +
        '<button class="btn btn-green mt12" data-act="rcNext">下一句 ›</button>' +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:14px" data-act="rcPeek">想不起来，看一下</button>';
    },

    /* 玩法 2：接下句（选项生成单独抽出来，渲染和判分必须用同一份） */
    rcChainOpts: function (it, i) {
      var lines = it.lines;
      var right = lines[i + 1];
      var others = lines.filter(function (x, j) { return j !== i + 1 && x !== right; });
      var opts = [right];
      for (var n = 0; n < others.length && opts.length < 4; n++) {
        var pick = others[(n * 3 + i * 2) % others.length];
        if (opts.indexOf(pick) < 0) opts.push(pick);
      }
      for (var j2 = opts.length - 1; j2 > 0; j2--) {
        var r = (i * 7 + j2 * 3) % (j2 + 1);
        var t = opts[j2]; opts[j2] = opts[r]; opts[r] = t;
      }
      return { cur: lines[i], opts: opts, ans: opts.indexOf(right) };
    },

    rcChain: function (it) {
      var lines = it.lines;
      var i = Kid.rcStep;
      if (i >= lines.length - 1) return Kid.rcFinish(it, 'chain');
      var o = Kid.rcChainOpts(it, i);
      var opts = o.opts, cur = o.cur;
      var optHtml = opts.map(function (o2, j) {
        return '<label class="cn-opt" data-act="cnOpt" data-g="rc" style="display:block;background:#FFF8E4;border:3px solid #EFDDB8;border-radius:14px;padding:12px;margin:6px 0;cursor:pointer;font-size:17px;font-weight:800;color:#5C4322">' +
          '<input type="radio" name="rcq" value="' + j + '" style="position:absolute;opacity:0;width:0;height:0">' +
          U.esc(o2) + '</label>';
      }).join('');

      return '<div class="sec-title">🔗 接下句　' + (i + 1) + ' / ' + (lines.length - 1) + '</div>' +
        '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2;font-size:18px;font-weight:900;color:#3F2D14">' +
        U.esc(cur) + '</div>' +
        '<div class="muted" style="margin-top:6px">下一句是什么？</div>' +
        '<div style="margin-top:8px">' + optHtml + '</div>' +
        '<button class="btn btn-green mt12" data-act="rcNext">下一句 ›</button>';
    },

    /* 玩法 3：句子排队 */
    rcSort: function (it) {
      var lines = it.lines;
      var picked = Kid.rcPick || [];
      if (picked.length >= lines.length) return Kid.rcFinish(it, 'sort');

      var seedBase = 0;
      for (var z = 0; z < it.id.length; z++) seedBase += it.id.charCodeAt(z);
      var shuffled = lines.map(function (s, i) { return { s: s, i: i }; });
      for (var j = shuffled.length - 1; j > 0; j--) {
        var r = (seedBase + j * 5) % (j + 1);
        var t = shuffled[j]; shuffled[j] = shuffled[r]; shuffled[r] = t;
      }

      var doneHtml = picked.length
        ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:12px;padding:10px;line-height:1.9;margin-bottom:10px">' +
        picked.map(function (idx) { return U.esc(lines[idx]); }).join('<br>') + '</div>'
        : '';
      var nextIdx = picked.length;
      var cards = shuffled.filter(function (x) { return picked.indexOf(x.i) < 0; }).map(function (x) {
        return '<button class="btn btn-lav" style="min-height:52px;font-size:16px;text-align:left;padding:12px;margin:5px 0" ' +
          'data-act="rcPick" data-v="' + x.i + '">' + U.esc(x.s) + '</button>';
      }).join('');

      return '<div class="sec-title">🧩 句子排队　' + (picked.length) + ' / ' + lines.length + '</div>' +
        '<div class="muted">这句话被打乱啦。第 ' + (nextIdx + 1) + ' 句应该是哪一句？点它。</div>' +
        '<div style="height:8px"></div>' + doneHtml + cards +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:14px" data-act="rcReset">重来一次</button>';
    },

    /* 玩法 4：挡住背 */
    rcCover: function (it) {
      var lv = Kid.rcLv;
      var lines = it.lines;
      function mask(s) {
        var clean = s.replace(/[，。、？！；：]/g, '');
        if (lv === 0) return U.esc(s);
        if (lv === 1) {
          var keep = Math.max(2, Math.ceil(clean.length / 2));
          return U.esc(clean.substr(0, keep)) +
            '<span style="color:#C9B48A">' + new Array(clean.length - keep + 1).join('○') + '</span>';
        }
        return '<span style="color:#C9B48A">' + new Array(clean.length + 1).join('○') + '</span>';
      }
      var label = ['第 1 档 · 全部显示', '第 2 档 · 遮住一半', '第 3 档 · 全遮，全靠背'][lv];
      var seg = '<div class="seg" style="margin:8px 0">' +
        [0, 1, 2].map(function (n) {
          return '<button class="' + (n === lv ? 'on' : '') + '" data-act="rcCover" data-v="' + n + '">' +
            ['全部', '遮一半', '全遮'][n] + '</button>';
        }).join('') + '</div>';

      return '<div class="sec-title">👁️ 挡住背　' + label + '</div>' +
        seg +
        '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2.2;font-size:19px;font-weight:900;color:#3F2D14">' +
        lines.map(mask).join('<br>') + '</div>' +
        '<div class="muted" style="margin-top:8px">先照着读两遍，再点「遮一半」，最后点「全遮」试试能不能全背出来。</div>' +
        '<button class="btn btn-lav mt12" style="min-height:52px" data-act="cnRead" data-v="' + U.esc(it.lines.join('')) + '">🔊 听一遍</button>' +
        '<button class="btn btn-green mt8" data-act="rcFinish" data-v="cover">我背下来啦！</button>';
    },

    /* 玩法 5：录音背诵 */
    rcRec: function (it) {
      var audio = Kid.rcAudioUrl
        ? '<div style="background:#E9F7E9;border:2px solid #B7DFB7;border-radius:12px;padding:10px;margin-top:10px">' +
        '<div style="font-weight:800;color:#2F6B3A;margin-bottom:6px">🎧 刚才的录音（点播放听听）</div>' +
        '<audio controls src="' + Kid.rcAudioUrl + '" style="width:100%"></audio></div>'
        : '<div class="muted" style="margin-top:10px;line-height:1.8">点下面红色按钮开始背，背完再点一次停下来，然后放给自己听。<br>' +
        '能听出哪里卡住了，就再练那一段。</div>';

      return '<div class="sec-title">🎤 录音背诵</div>' +
        '<div style="background:#FFFDF4;border:2px solid #E8D3A8;border-radius:14px;padding:14px;line-height:2;font-size:17px;font-weight:800;color:#3F2D14">' +
        it.lines.map(function (s) { return U.esc(s); }).join('<br>') + '</div>' +
        '<button class="btn mt12" style="min-height:56px;font-size:17px;background:' +
        (Kid.rcRecOn ? '#FF8A8A' : '#FF6B6B') + ';color:#fff;box-shadow:0 4px 0 #C94F4F" data-act="rcRec">' +
        (Kid.rcRecOn ? '⏹ 我背完了，停' : '🎤 开始背') + '</button>' +
        audio +
        '<button class="btn btn-green mt12" data-act="rcFinish" data-v="rec">我背下来啦！</button>';
    },

    rcFinish: function (it, game) {
      var rec = E.quizToday(it.id, 'recite', S.dateStr());
      if (!rec) {
        rec = E.finishQuiz(it.id, 'recite', it.lines.length, it.lines.length, it.title + '（' +
          ({ fill: '填空', chain: '接下句', sort: '排队', cover: '挡住背', rec: '录音' }[game] || '背诵') + '）', []);
      }
      var names = { fill: '填空闯关', chain: '接下句', sort: '句子排队', cover: '挡住背', rec: '录音背诵' };
      return '<div style="text-align:center;padding:16px 0">' +
        '<div style="font-size:60px">🏆</div>' +
        '<div style="font-size:22px;font-weight:900;color:#5C4322;margin-top:6px">' + U.esc(it.title) + ' 背完啦！</div>' +
        '<div class="muted" style="margin-top:4px">' + (names[game] || '背诵') + '</div>' +
        '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:12px;margin-top:12px;font-weight:900;color:#8B5E3C">' +
        '获得 💧 ' + rec.water + ' 水滴</div>' +
        '<div class="muted" style="margin-top:8px;line-height:1.8">背得越多记得越牢。<br>明天再用另一个玩法复习一遍，就更熟了。</div>' +
        '<button class="btn btn-green mt12" data-act="rcBack">再背一篇</button>' +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:14px" data-act="rcGame" data-v="">换种玩法再练一遍</button>' +
        '</div>';
    },

    rcStartRec: function () {
      var self = Kid;
      if (!global.navigator || !global.navigator.mediaDevices || !global.MediaRecorder) {
        U.toast('这个浏览器不能录音，用「挡住背」一样练');
        return;
      }
      global.navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var chunks = [];
        var mr = new global.MediaRecorder(stream);
        mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
        mr.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          try {
            var blob = new global.Blob(chunks, { type: 'audio/webm' });
            self.rcAudioUrl = global.URL.createObjectURL(blob);
          } catch (e) { self.rcAudioUrl = ''; }
          self.rcRecOn = false; self.rcMediaRec = null;
          App.render();
        };
        mr.start();
        self.rcMediaRec = mr;
        self.rcRecOn = true;
        App.render();
        U.toast('开始啦，大声背出来～');
      })['catch'](function () {
        U.toast('没有麦克风权限，用「挡住背」也一样练');
      });
    },

    rcStopRec: function () {
      try { if (Kid.rcMediaRec && Kid.rcMediaRec.state !== 'inactive') Kid.rcMediaRec.stop(); }
      catch (e) { Kid.rcRecOn = false; App.render(); }
    },

    /* ---- 听写：每次 10 个，跨单元打散 ---- */
    cnDictation: function () {
      var C = Kid.cnData();

      /* 全册词语去重，再一次性打散成固定顺序 */
      var all = [];
      C.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          (l.words || []).forEach(function (w) { if (all.indexOf(w) < 0) all.push(w); });
        });
      });
      var order = all.slice();
      for (var i = order.length - 1; i > 0; i--) {
        var r = (i * 7919 + 13) % (i + 1);
        var t = order[i]; order[i] = order[r]; order[r] = t;
      }

      var per = 10;
      var total = Math.max(1, Math.ceil(order.length / per));
      var round = S.state.dictRound || 0;
      if (round >= total || round < 0) round = 0;
      var words = order.slice(round * per, round * per + per);
      if (!words.length) words = order.slice(0, per);

      /* 标出这 10 个词分别来自哪个单元，让孩子知道是打散的 */
      var from = words.map(function (w) {
        var tag = '';
        C.units.forEach(function (u, ui) {
          if (tag) return;
          u.lessons.forEach(function (l) {
            if (!tag && (l.words || []).indexOf(w) >= 0) tag = u.no;
          });
        });
        return tag || '';
      });

      var list = words.map(function (w, i) {
        return '<span style="display:inline-block;background:#FFFDF4;border:2px solid #E8D3A8;border-radius:12px;padding:8px 11px;margin:4px;font-weight:900;font-size:16px;color:#3F2D14">' +
          U.esc(w) + (from[i] ? '<span style="font-size:11px;color:#A89070;font-weight:800"> ·' + from[i] + '</span>' : '') +
          '</span>';
      }).join('');

      return '<div class="sec-title">🎧 听写练习　第 ' + (round + 1) + ' / ' + total + ' 组</div>' +
        '<div class="muted">每次只听写 <b>10 个词</b>，从八个单元里打散着抽。点下面的按钮，平板会一个一个读，你在本子上写。</div>' +
        '<div style="background:#FFF8E4;border:2px solid #EFDDB8;border-radius:14px;padding:12px;margin-top:10px">' +
        '<div style="font-weight:900;color:#5C4322;margin-bottom:6px">这一组的 10 个词（写完再看答案）</div>' +
        '<div id="cn-dict-ans" style="display:none;line-height:2.2">' + list + '</div>' +
        '<div id="cn-dict-hide" style="color:#A89070;font-weight:800">??? ??? ???（写完点下面的「看答案」）</div>' +
        '</div>' +
        '<button class="btn btn-green mt12" data-act="cnSay" data-v="' + words.join(',') + '">🔊 开始听写</button>' +
        '<button class="btn btn-lav mt8" data-act="cnSay" data-v="' + words.join(',') + '" data-slow="1">🐢 慢一点</button>' +
        '<button class="btn btn-ghost mt8" style="min-height:52px;font-size:15px" data-act="cnShowAns">👀 看答案，自己批</button>' +
        '<button class="btn btn-green mt8" data-act="cnNextGroup">➡️ 换一组（再来 10 个）</button>' +
        '<div class="muted" style="margin-top:10px;font-size:12px">全册共 ' + all.length + ' 个词语，分成 ' + total + ' 组。每天练一组，' + total + ' 天就能过一遍。</div>';
    },

    /* 朗读（中文 TTS） */
    cnSpeak: function (text, rate) {
      try {
        if (!global.speechSynthesis) { U.toast('这个浏览器不能朗读'); return; }
        global.speechSynthesis.cancel();
        var ut = new global.SpeechSynthesisUtterance(text);
        ut.lang = 'zh-CN';
        ut.rate = rate || 0.85;
        global.speechSynthesis.speak(ut);
      } catch (e) { U.toast('朗读失败了'); }
    },

    cnSayList: function (str, slow) {
      var arr = String(str).split(',').filter(function (x) { return x; });
      if (!arr.length) return;
      if (!global.speechSynthesis) { U.toast('这个浏览器不能朗读'); return; }
      global.speechSynthesis.cancel();
      U.toast('开始啦，准备好本子～');
      var gap = slow ? 4200 : 2800;
      arr.forEach(function (w, i) {
        var ut = new global.SpeechSynthesisUtterance(w);
        ut.lang = 'zh-CN';
        ut.rate = slow ? 0.65 : 0.8;
        global.setTimeout(function () {
          try { global.speechSynthesis.speak(ut); } catch (e) { }
        }, i * gap);
      });
    },

    /* ---------------- 页面：学科 ---------------- */
    pageSubject: function (subj) {
      var date = S.dateStr();
      var s = S.state;
      var meta = SUBJECTS[subj] || SUBJECTS.other;
      var ws = S.weekStartOf(date);
      var we = S.weekEndOf(date);

      /* 本周任务 */
      var weekly = S.weeklyTasksOf(subj, ws);
      var weeklyHtml = weekly.length
        ? weekly.map(function (t) { return Kid.taskCard(t, date); }).join('')
        : '<div class="empty" style="padding:14px"><span class="e-emoji">📭</span>本周还没有' + meta.name + '长线任务<br><span style="font-size:12px">妈妈周日晚上布置后会显示在这里</span></div>';

      /* 今日任务 = 校内布置 + 本科固定任务 */
      var school = S.schoolTasksOf(date, subj);
      var fixed = S.fixedTasksOf(date).filter(function (t) { return t.subject === subj; });
      var todayList = school.concat(fixed);
      var todayHtml = todayList.length
        ? todayList.map(function (t) { return Kid.taskCard(t, date); }).join('')
        : '<div class="empty" style="padding:14px"><span class="e-emoji">🌤️</span>今天这个科目没有任务，休息一下～</div>';

      /* 拓展任务（讲述任务单独走工坊） */
      var extra = S.extraTasksOf(subj).filter(function (t) { return t.mode !== 'speech'; });
      var extraHtml = extra.length
        ? extra.map(function (t) { return Kid.taskCard(t, date); }).join('')
        : '<div class="empty" style="padding:14px"><span class="e-emoji">💧</span>暂时没有拓展任务</div>';

      var html = '<div style="padding:6px 14px 0">' +
        '<div class="wood-title" style="background:linear-gradient(180deg,' + meta.color + ',#8B5E3C)">' + meta.emoji + ' ' + meta.name + '花园</div>' +
        '<div class="muted" style="margin-top:6px;font-weight:800">长线任务越早完成，水滴越多（周一 5 滴 → 周五 1 滴）</div>' +
        '</div>';

      html += '<div style="padding:12px 14px 0">' +
        '<div class="sec-title" style="font-size:16px">📅 本周任务（' + ws.slice(5) + ' ~ ' + we.slice(5) + '）</div>' +
        weeklyHtml + '</div>';

      html += '<div style="padding:12px 14px 0">' +
        '<div class="sec-title" style="font-size:16px">✅ 今日任务</div>' + todayHtml + '</div>';

      if (subj === 'chinese') {
        html += '<div style="padding:12px 14px 0">' + Kid.speechPanel(date) + '</div>';
        html += '<div style="padding:12px 14px 0">' + Kid.phrasePanel() + '</div>';
        html += '<div style="padding:12px 14px 0">' + Kid.cnPanel() + '</div>';
      }
      if (subj === 'english') {
        /* 查单词 / 单词本 / 错题本（有正在答的题就先显示答题界面） */
        if (global.WordBook) {
          html += '<div style="padding:12px 14px 0">' +
            (global.WordBook.quiz ? global.WordBook.quizPanel() : global.WordBook.panel()) + '</div>';
        }
        html += '<div style="padding:12px 14px 0">' + Kid.enReview() + '</div>';
        html += '<div style="padding:12px 14px 0">' + Kid.lwtePanel('reading', date) + '</div>';
        html += '<div style="padding:12px 14px 0">' + Kid.lwtePanel('listening', date) + '</div>';
      }
      if (subj === 'math') {
        html += '<div style="padding:12px 14px 0">' + Kid.mathPanel() + '</div>';
      }

      /* 「其他」页额外挂上开心罐 */
      if (subj === 'other') {
        html += '<div style="padding:12px 14px 0">' + Kid.joyPanel() + '</div>';
      }

      html += '<div style="padding:12px 14px 0">' + Kid.myTaskPanel(subj) + '</div>';

      html += '<div style="padding:12px 14px 0">' +
        '<div class="sec-title" style="font-size:16px">💧 拓展任务</div>' + extraHtml + '</div>';

      return html;
    },

    /* ---------------- 我自己加的任务（孩子提 → 妈妈评判） ---------------- */
    MY_IDEAS: {
      chinese: ['多读了一篇课文', '又练了 10 分钟字', '背会一首古诗', '读了一本课外书', '给妈妈讲了个故事'],
      math: ['多做了一页口算', '玩了数独闯关', '练了计算小超市', '做出一道思考题', '教妈妈一道题'],
      english: ['多听了一课录音', '背了 5 个单词', '跟读了课文', '看了一集英文动画', '唱了一首英文歌'],
      other: ['帮家里做了家务', '自己整理了房间', '运动了 20 分钟', '画了一幅画', '练了半小时琴']
    },
    myTaskPanel: function (subj) {
      var s = S.state;
      var ideas = Kid.MY_IDEAS[subj] || Kid.MY_IDEAS.other;
      var chips = ideas.map(function (t) {
        return '<button class="pill-btn" style="min-height:52px;font-size:13px;padding:8px 12px" ' +
          'data-act="myAdd" data-v="' + U.esc(subj + '|' + t) + '">+ ' + U.esc(t) + '</button>';
      }).join('');

      var mine = S.myTasksOf(subj).slice().reverse().slice(0, 6);
      var rows = mine.length ? mine.map(function (t) {
        var badge = t.status === 'ok'
          ? '<span class="task-tag ok">✅ 妈妈给了 ' + (t.water ? '💧' + t.water : '☀️1 点赞') + '</span>'
          : (t.status === 'no' ? '<span class="task-tag">💌 妈妈留言：' + U.esc(t.note || '下次一起做') + '</span>'
            : '<span class="task-tag wait">⏳ 等妈妈看看</span>');
        return '<div class="row"><div style="font-size:20px">' +
          (t.status === 'ok' ? '🌟' : (t.status === 'no' ? '💌' : '⏳')) + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s">' + t.date + '</div></div>' + badge + '</div>';
      }).join('') : '<div class="muted" style="padding:4px 0">还没有自己加过任务，做了什么都可以告诉妈妈～</div>';

      return '<div class="card card-cream">' +
        '<div class="sec-title" style="font-size:16px">✍️ 我自己加的任务</div>' +
        '<div class="muted" style="font-size:12px">除了妈妈布置的，你今天还多做了什么？点一下就发给妈妈，妈妈确认后给你水滴。</div>' +
        '<div class="flex gap8 mt8" style="flex-wrap:wrap">' + chips + '</div>' +
        '<div class="flex gap8 mt8">' +
        '<input class="field" id="myTask-' + subj + '" placeholder="或者自己写一句，比如：抄了 10 个生字" style="flex:1">' +
        '<button class="btn btn-lav" style="width:auto;min-height:52px;font-size:15px;padding:10px 16px" ' +
        'data-act="myAddInput" data-v="' + subj + '">发给她</button>' +
        '</div>' +
        '<div class="mt8">' + rows + '</div>' +
        '</div>';
    },

    /* ---------------- 数学趣味闯关（js/math.js） ---------------- */
    mathPanel: function () {
      if (!global.MathGame || !global.MATHP) return '';
      try { return global.MathGame.panel(); }
      catch (e) {
        return '<div class="card mt12"><div class="muted">数学闯关加载中出了点小问题：' + U.esc(e.message) + '</div></div>';
      }
    },

    /* ---------------- 页面：奖励中心 ---------------- */
    pageReward: function () {
      var s = S.state;
      var grid = s.shop.map(function (it) {
        var can = s.sun >= it.price;
        return '<div class="shop-item' + (can ? ' can' : '') + '" data-act="redeem" data-v="' + it.id + '">' +
          '<div class="si-emoji">' + it.emoji + '</div>' +
          '<div class="si-name">' + U.esc(it.name) + '</div>' +
          '<div class="si-price">☀️ ' + it.price + '</div>' +
          '</div>';
      }).join('');

      /* 用积分换数学闯关时间 */
      var c = S.mathConf();
      var canRedeem = S.mathCanRedeem() > 0;
      var curName = c.currency === 'sun' ? '☀️ 阳光' : '💧 水滴';
      var have = c.currency === 'sun' ? s.sun : s.water;
      var planHtml = E.MATH_TIME_PLANS.map(function (p) {
        var enough = have >= p.cost;
        var on = canRedeem && enough;
        return '<div data-act="kidRedeemTime" data-v="' + p.min + '" style="flex:1;min-width:96px;min-height:96px;' +
          'border-radius:14px;border:3px solid ' + (on ? '#5BA82B' : '#DDD5C4') + ';' +
          'background:' + (on ? '#E9F7E9' : '#F2EFE8') + ';' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
          'color:' + (on ? '#5C4322' : '#B0A795') + ';font-weight:900">' +
          '<div style="font-size:22px">⏳</div>' +
          '<div style="font-size:17px">' + p.min + ' 分钟</div>' +
          '<div style="font-size:12px">' + (c.currency === 'sun' ? '☀️' : '💧') + p.cost + '</div>' +
          '<div style="font-size:11px">' + (on ? '可以换' : (canRedeem ? '还差 ' + (p.cost - have) : '今天换过啦')) + '</div>' +
          '</div>';
      }).join('');
      var timeCard = '<div class="card mt12"><div class="sec-title">⏳ 换数学闯关时间</div>' +
        '<div class="muted" style="font-size:12px">数学趣味闯关每天可以玩 ' + (c.baseMin || 10) +
        ' 分钟；想多玩就用' + curName + '换，一天只能换一次，最多 ' + (c.maxMin || 20) + ' 分钟。</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + planHtml + '</div>' +
        '<div class="muted" style="margin-top:8px;font-size:12px;font-weight:800">' +
        (canRedeem ? '今天还能换一次 · 你现有 ' + curName + ' ' + have
          : '今天已经换过啦（+' + (c.redeemMin || 0) + ' 分钟），明天再来') +
        '</div></div>';

      var rec = s.redeems.slice(-8).reverse().map(function (r) {
        return '<div class="row"><div style="font-size:24px">' + r.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(r.name) + '</div>' +
          '<div class="row-s">' + r.date + ' · 花了 ' + r.price + ' 阳光</div></div></div>';
      }).join('');

      return '<div style="padding:6px 14px 0">' +
        '<div class="wood-title">🎁 奖励中心</div>' +
        '<div class="muted" style="margin-top:6px;font-weight:800">☀️ ' + s.sun + ' 阳光 · 💧 ' + s.water +
        ' 水滴 · 🌸 ' + (s.flowers || 0) + ' 小红花</div>' +
        '</div>' +
        '<div style="padding:12px 14px 0"><div class="shop-grid">' + grid + '</div></div>' +
        timeCard +
        '<div style="padding:12px 14px 0">' +
        '<div class="card"><div class="sec-title">🧾 我换过的奖励</div>' +
        (rec || '<div class="empty"><span class="e-emoji">🌱</span>还没有兑换过，攒够阳光来换一个吧</div>') +
        '</div></div>' +
        '<div style="padding:12px 14px 0">' +
        '<div class="card card-cream"><div class="sec-title">💡 阳光怎么来？</div>' +
        '<div class="muted" style="line-height:1.9">' +
        '· 每日固定任务全部完成 → +2 阳光 + 2 全勤阳光<br>' +
        '· 种下向日葵 → 每天产出 10 阳光<br>' +
        '· 攒的阳光永远不会因为一天没做好而消失' +
        '</div></div></div>';
    },

    /* ---------------- 渲染入口 ---------------- */
    render: function () {
      var html = '';
      if (Kid.page === 'home') html = Kid.pageHome();
      else if (Kid.page === 'reward') html = Kid.pageReward();
      else html = Kid.pageSubject(Kid.page);

      var tabs = [
        { k: 'home', e: '🏡', t: '首页' },
        { k: 'chinese', e: '📖', t: '语文' },
        { k: 'math', e: '🔢', t: '数学' },
        { k: 'english', e: '🔤', t: '英语' },
        { k: 'other', e: '🌟', t: '其他' },
        { k: 'reward', e: '🎁', t: '奖励' }
      ].map(function (x) {
        return '<button class="tab' + (Kid.page === x.k ? ' active' : '') + '" data-act="tab" data-v="' + x.k + '">' +
          '<span class="tab-emoji">' + x.e + '</span><span>' + x.t + '</span></button>';
      }).join('');

      return '<div class="app-shell">' +
        '<div style="height:8px"></div>' + html +
        '<div style="height:20px"></div>' +
        '</div>' +
        '<div class="tabbar"><div class="tabbar-inner">' + tabs + '</div></div>';
    },

    /* ---------------- 交互 ---------------- */
    act: function (name, v, el) {
      var e = el; /* 兼容事件元素访问（如 cnSay 的 data-slow） */
      var s = S.state;
      var date = S.dateStr();

      if (name === 'tab') { Kid.page = v; return true; }

      /* 点整张任务卡：等同于点它右边的主按钮（避免孩子点了没反应） */
      if (name === 'task') return Kid.taskTap(v);

      /* ---------- 暖心小功能：心情 / 悄悄话 / 小电影 / 开心罐 / 盆栽 ---------- */
      if (name === 'moodSet') {
        var cur0 = E.moodOf(date) || { share: 0 };
        E.setMood(v, cur0.share, date);
        U.toast('记下啦，谢谢告诉我');
        return true;
      }
      if (name === 'moodShare') {
        var cur1 = E.moodOf(date);
        if (!cur1) { U.toast('先选一个今天的心情吧'); return false; }
        E.setMood(cur1.m, v === '1' || v === 1 || v === true, date);
        U.toast(v == 1 || v === '1' ? '好，这条妈妈能看到' : '好，这条只有你知道 🔒');
        return true;
      }
      if (name === 'noteOpen') {
        var nt = E.noteList().filter(function (x) { return x.id === v; })[0];
        if (!nt) return true;
        E.noteRead(nt.id);
        var more = E.noteUnread().length;
        U.modal({
          emoji: '✉️', title: '妈妈给你留了一句',
          text: nt.text,
          buttons: [{
            text: more ? '还有 ' + more + ' 封，接着拆' : '收好啦',
            cls: 'btn-lav', onClick: function (c) { c(); App.afterChange(); }
          }]
        });
        return false;
      }
      if (name === 'autoNoteOpen') {
        var an = E.autoNoteOf(date);
        if (!an) return true;
        E.autoNoteRead(date);
        U.modal({
          emoji: '✉️', title: '妈妈给你留了一句',
          text: an.text,
          buttons: [{ text: '收好啦', cls: 'btn-lav', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }
      if (name === 'movieOpen') {
        U.modal({
          emoji: '🎬', title: '今天的小电影',
          text: E.movieOf(date),
          buttons: [{ text: '放完啦', cls: 'btn-green', onClick: function (c) { c(); } }]
        });
        return false;
      }
      if (name === 'joyAdd') {
        var jr = E.joyAdd(v);
        if (jr) U.toast('存进罐子啦 🍬');
        return true;
      }
      if (name === 'joyAddInput') {
        var ji = document.getElementById('joy-input');
        var jt = ji ? ji.value.trim() : '';
        if (!jt) { U.toast('写一句今天开心的事吧'); return false; }
        E.joyAdd(jt);
        U.toast('存进罐子啦 🍬');
        return true;
      }
      if (name === 'joyDel') {
        E.joyDel(v);
        U.toast('拿出来啦');
        return true;
      }
      if (name === 'joyDraw') {
        var jd = E.joyDraw();
        if (!jd) {
          U.modal({ emoji: '🍯', title: '罐子还是空的', text: '先存一件今天开心的小事，攒起来。\n以后不高兴的时候，就能从里面掉出来一张。' });
          return false;
        }
        U.modal({
          emoji: '🍬', title: '掉出来一张',
          text: '「' + jd.text + '」\n\n—— ' + jd.date + ' 那天，你也是开心的。',
          buttons: [{ text: '再摇一次', cls: 'btn-lav', onClick: function (c) { c(); Kid.act('joyDraw'); } },
          { text: '收起来', cls: 'btn-green' }]
        });
        return false;
      }

      /* 数学趣味闯关的动作（mth 开头）交给 js/math.js 处理 */
      if (name.indexOf('mth') === 0 && global.MathGame) {
        return global.MathGame.act(name, v);
      }

      /* 英语查词 / 单词本 / 错题本（wb 开头）交给 js/wordbook.js 处理 */
      if (name.indexOf('wb') === 0 && global.WordBook) {
        return global.WordBook.act(name, v);
      }

      /* 我自己加的任务：直接发 */
      if (name === 'myAdd') {
        var sp = String(v || '').split('|');
        var r1 = E.myTaskAdd(sp[0], sp[1]);
        if (!r1.ok) { U.toast(r1.msg); return false; }
        U.toast('发给妈妈啦，等她看看～');
        return true;
      }
      /* 我自己加的任务：输入框版本 */
      if (name === 'myAddInput') {
        var box = document.getElementById('myTask-' + v);
        var txt = box ? (box.value || '').trim() : '';
        if (!txt) { U.toast('先写一下你做了什么'); return false; }
        var r2 = E.myTaskAdd(v, txt);
        if (!r2.ok) { U.toast(r2.msg); return false; }
        if (box) box.value = '';
        U.toast('发给妈妈啦，等她看看～');
        return true;
      }

      /* 奖励中心：用积分换数学闯关时间 */
      if (name === 'kidRedeemTime') {
        var mins = parseInt(v, 10);
        var res = E.redeemMathTime(mins);
        if (!res.ok) { U.toast(res.msg); return false; }
        U.modal({
          emoji: '⏳', title: '换到 ' + mins + ' 分钟！',
          text: '花掉 ' + res.cost + ' ' + res.cur + '\n数学趣味闯关今天又能玩 ' + mins + ' 分钟啦。\n一天只能换一次哦，慢慢玩～',
          buttons: [{ text: '去玩！', cls: 'btn-green', onClick: function (c) { c(); Kid.page = 'math'; App.afterChange(); } }]
        });
        return true;
      }

      if (name === 'pick') {
        if (v === 'sunflower' && !s.sunflowerUnlocked) {
          U.story('notEnoughSun');
          return true;
        }
        Kid.selectedPlant = v;
        return true;
      }

      if (name === 'cell') {
        var idx = +v;
        var cell = s.garden[idx];
        if (cell.plant) {
          var p = S.PLANTS[cell.plant];
          U.confirm('要把它铲掉吗？', '铲掉' + p.name + '会返还一半阳光（☀️ ' + Math.floor(p.cost / 2) + '）', function () {
            var r = E.dig(idx);
            if (r.ok) { S.save(); U.toast('返还 ☀️ ' + r.back); }
            global.App.render();
          }, '铲掉');
          return false;
        }
        var res = E.plant(idx, Kid.selectedPlant);
        if (!res.ok) {
          U.modal({ emoji: '🌻', title: '还不行哦', text: res.msg });
          return false;
        }
        U.story('planted', { name: res.plant.name });
        return true;
      }

      if (name === 'submit') {
        var task = s.tasks.filter(function (t) { return t.id === v; })[0];
        if (!task) return false;
        U.modal({
          emoji: task.emoji, title: '完成「' + U.esc(task.title) + '」啦？',
          text: '要跟妈妈说点什么吗？（可以不写）',
          body: '<input class="field" id="note-input" placeholder="比如：我今天读得很流利！" style="text-align:left">',
          buttons: [
            {
              text: '交给妈妈 ✅', cls: 'btn-green', onClick: function (c) {
                var el = document.getElementById('note-input');
                var note = el ? el.value.trim() : '';
                c();
                var r = E.submitTask(v, note);
                if (r && r.dup) { global.App.render(); return; }
                if (s.autoApprove) {
                  U.story('approved');
                } else {
                  U.story('taskSubmitted');
                }
                global.App.afterChange();
              }
            },
            { text: '还没做完', cls: 'btn-ghost' }
          ]
        });
        return false;
      }

      /* ---------- 讲述：引导式扩写 ---------- */
      if (name === 'speechStart') {
        var st0 = document.getElementById('speech-text');
        var t0 = st0 ? st0.value.trim() : '';
        if (t0.length < 5) {
          U.modal({ emoji: '🎤', title: '再多说一点点', text: '至少写 5 个字，老师才好问你哦～\n试试「今天在操场，我和……」' });
          return false;
        }
        if (!E.speechCanSubmit(date)) { U.toast('今天已经讲完啦，明天再来'); return false; }
        E.speechDraftStart(t0, date);
        Kid.spAsk = null;
        U.modal({
          emoji: '📖', title: '老师正在想问题…',
          text: (s.ai && s.ai.enabled) ? '请 AI 老师出题，稍等一下' : '马上就好',
          dismissible: false, buttons: []
        });
        global.SpeechCoach.guide(t0, [], s.kidName, s.ai).then(function (g) {
          Kid.spAsk = g;
          if (!g) { U.toast('你已经写得挺完整的了，可以直接收尾'); }
          global.App.render();
        });
        return false;
      }

      /* 不想被引导，自己直接写完（高敏感孩子需要这个出口） */
      if (name === 'speechDirect') {
        if (!E.speechCanSubmit(date)) { U.toast('今天已经讲完啦，明天再来'); return false; }
        return Kid.act('speechSubmit');
      }

      if (name === 'spAsk') {
        var d0 = E.speechDraftOf(date);
        if (!d0) return true;
        global.SpeechCoach.guide(d0.text, d0.asked, s.kidName, s.ai).then(function (g) {
          Kid.spAsk = g;
          global.App.render();
        });
        return false;
      }

      if (name === 'spAnswer') {
        var d1 = E.speechDraftOf(date);
        if (!d1) return true;
        var ea = document.getElementById('sp-ans');
        var ans = ea ? ea.value.trim() : '';
        if (ans.length < 2) { U.toast('把你想到的话写下来吧，哪怕几个字'); return false; }
        E.speechDraftAppend(ans, Kid.spAsk ? Kid.spAsk.key : '');
        Kid.spAsk = null;
        /* 补完自动问下一句 */
        var d1b = E.speechDraftOf(date);
        global.SpeechCoach.guide(d1b.text, d1b.asked, s.kidName, s.ai).then(function (g) {
          Kid.spAsk = g;
          global.App.render();
          if (g) U.toast('加上去啦！老师又问了一句');
          else U.toast('各个方面都补到了，可以收尾啦');
        });
        return true;
      }

      if (name === 'spSkip') {
        if (Kid.spAsk) E.speechDraftSkip(Kid.spAsk.key);
        Kid.spAsk = null;
        var d2 = E.speechDraftOf(date);
        if (d2) {
          global.SpeechCoach.guide(d2.text, d2.asked, s.kidName, s.ai).then(function (g) {
            Kid.spAsk = g; global.App.render();
          });
        }
        return false;
      }

      /* 收尾 → 必须孩子确认「已完整、不再改」 */
      if (name === 'spFinish') {
        var d3 = E.speechDraftOf(date);
        if (!d3) return true;
        var sc0 = global.SpeechCoach;
        var n0 = sc0 ? sc0.len(d3.text) : d3.text.length;
        if (n0 < 15) {
          U.modal({
            emoji: '🎤', title: '再多说一点点',
            text: '现在只有 ' + n0 + ' 个字，像一句大白话。\n一篇合格的日记要有情节、有细节、有感受——让老师再问你几句？',
            buttons: [
              { text: '好，让老师问我', cls: 'btn-green', onClick: function (c) { c(); Kid.act('spAsk'); } },
              { text: '就这样吧', cls: 'btn-ghost' }
            ]
          });
          return false;
        }
        U.confirm('故事已经完整了吗？',
          '提交之后就打分给水滴了，不能再改。\n（现在一共 ' + n0 + ' 个字）',
          function () { Kid.act('speechSubmit'); }, '是的，讲完啦');
        return false;
      }

      if (name === 'speechSubmit') {
        var el0 = document.getElementById('speech-text');
        var dft = E.speechDraftOf(date);
        var text = dft ? dft.text : (el0 ? el0.value.trim() : '');
        var origin = dft ? dft.origin : '';
        if (!text || text.length < 5) {
          U.modal({ emoji: '🎤', title: '再多说一点点', text: '至少写 5 个字，老师才好打分哦～\n试试「今天在操场，我和……」' });
          return false;
        }
        if (!E.speechCanSubmit(date)) {
          U.toast('今天已经讲 ' + E.speechCountToday(date) + ' 次啦，明天再来');
          return false;
        }
        U.modal({
          emoji: '📖', title: '老师正在读你的故事…',
          text: (s.ai && s.ai.enabled) ? '正在请 AI 老师点评，稍等一下' : '马上就好',
          dismissible: false, buttons: []
        });
        global.SpeechCoach.score(text, origin, s.kidName, s.ai).then(function (res) {
          var fin = E.finishSpeech2(text, origin, res, date);
          Kid.spAsk = null;
          var face = res.score >= 90 ? '🏆' : res.score >= 80 ? '🌟' : res.score >= 70 ? '🌻' : res.score >= 60 ? '🌱' : '💪';
          var reward = '获得 💧 ' + fin.water + (fin.sun ? ' + ☀️ ' + fin.sun : '');
          if (fin.times > 1) reward += '（今天第 ' + fin.times + ' 次，水滴减半）';

          /* 好词好句：问孩子要不要存进素材库 */
          var good = res.good || [];
          var body = '';
          if (good.length) {
            body = '<div style="text-align:left;margin-top:8px">' +
              '<div style="font-size:12px;font-weight:900;color:#B07A2E;margin-bottom:6px">🌟 老师觉得这句写得特别好：</div>' +
              good.slice(0, 1).map(function (g) {
                return '<div style="background:#FFF3CC;border-radius:12px;padding:10px;font-weight:800;color:#5C4322;line-height:1.7">' +
                  U.esc(g.text) + '</div>' +
                  '<div class="muted" style="font-size:12px;margin-top:4px">' + U.esc(g.why) + '</div>';
              }).join('') + '</div>';
          }

          U.modal({
            emoji: face,
            title: res.score + ' 分！' + reward,
            text: (res.comments || []).concat(res.tips || []).join('\n'),
            body: body,
            buttons: good.length ? [
              {
                text: '存进素材库 ✨', cls: 'btn-lav', onClick: function (c) {
                  c();
                  good.slice(0, 1).forEach(function (g) { E.phraseAdd(g.text, g.why); });
                  U.toast('存好啦，写作文时可以翻出来用');
                  global.App.afterChange();
                }
              },
              { text: '好！', cls: 'btn-green', onClick: function (c) { c(); global.App.afterChange(); } }
            ] : [
              { text: '好！', cls: 'btn-green', onClick: function (c) { c(); global.App.afterChange(); } }
            ]
          });
        });
        return false;
      }

      if (name === 'phDel') { E.phraseDel(v); return true; }

      if (name === 'respeech') {
        s.speech = (s.speech || []).filter(function (x) { return x.date !== date; });
        S.save();
        return true;
      }

      if (name === 'quizSubmit') {
        var parts = v.split(':');
        var kind = parts[0], qid = parts[1];
        var L = global.LWTE;
        var pool = kind === 'listening' ? L.listenings : L.readings;
        var item = pool.filter(function (x) { return x.id === qid; })[0];
        if (!item) return false;
        var total = item.questions.length, correct = 0, un = 0;
        item.questions.forEach(function (q) {
          var sel = document.querySelector('input[name="lwte_' + qid + '_' + q.no + '"]:checked');
          if (!sel) un++;
          else if (sel.value === q.ans) correct++;
        });
        if (un > 0) { U.toast('还有 ' + un + ' 题没选哦'); return false; }
        var rec = E.finishQuiz(qid, kind, correct, total);
        var face2 = correct === total ? '🎉' : (correct / total >= 0.6 ? '🌻' : '🌱');
        var msg = correct === total
          ? '全部答对！' + total + ' 题一个不落，超级棒！'
          : '答对 ' + correct + ' / ' + total + ' 题。\n做错的地方再看一遍，下次就记住啦。';
        U.modal({
          emoji: face2, title: '获得 💧 ' + rec.water,
          text: msg,
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); global.App.afterChange(); } }]
        });
        return false;
      }

      /* ---------- 朗文 2A 复习题（单选 / 多选 / 判断） ---------- */
      if (name === 'enrOpt') {
        var pp0 = String(v).split(':');
        var qi0 = parseInt(pp0[0], 10), oj0 = parseInt(pp0[1], 10);
        var pool0 = Kid.enReviewPool();
        var q0 = pool0[qi0];
        if (!q0) return false;
        var cur = (Kid.enrAns[qi0] || []).slice();
        if (q0.type === 'multi') {
          var at0 = cur.indexOf(oj0);
          if (at0 >= 0) cur.splice(at0, 1); else cur.push(oj0);
        } else {
          cur = [oj0];
        }
        Kid.enrAns[qi0] = cur;
        App.render();
        return false;
      }
      if (name === 'enrSubmit') {
        var pool1 = Kid.enReviewPool();
        if (!pool1.length) return false;
        var un1 = 0, correct1 = 0;
        var items1 = pool1.map(function (q, i) {
          var sel = (Kid.enrAns[i] || []).slice().sort();
          var ansArr = (q.type === 'multi' ? q.ans : [q.ans]).slice().sort();
          if (!sel.length) un1++;
          var okq = sel.length === ansArr.length && sel.every(function (x, k) { return x === ansArr[k]; });
          if (okq) correct1++;
          return { q: q, sel: sel, ok: okq };
        });
        if (un1 > 0) { U.toast('还有 ' + un1 + ' 题没选哦'); return false; }

        var today1 = S.dateStr();
        var rewarded1 = (S.state.quiz || []).some(function (x) {
          return x.date === today1 && x.kind === 'review';
        });
        var water1 = 0;
        if (!rewarded1) {
          var rec1 = E.finishQuiz('REVIEW' + Kid.enrDay, 'review', correct1, pool1.length,
            '朗文 2A 复习 · 校内同步题');
          water1 = rec1.water;
        }
        Kid.enrResult = { correct: correct1, total: pool1.length, water: water1, items: items1 };
        U.toast(correct1 === pool1.length ? '🏆 全对！' : '答对 ' + correct1 + ' / ' + pool1.length + ' 题');
        return true;
      }
      if (name === 'enrNext') {
        Kid.enrDay = (Kid.enrDay || 0) + 1;
        Kid.enrAns = {};
        Kid.enrResult = null;
        App.render();
        return false;
      }

      /* ---------- 语文园 ---------- */
      if (name === 'cnTab') {
        Kid.cnTab = v || '';
        if (!v) { Kid.cnLesson = -2; }
        Kid.cnResult = null;
        App.render();
        return false;
      }
      if (name === 'cnUnit') {
        Kid.cnUnit = parseInt(v, 10) || 0;
        Kid.cnLesson = -2; Kid.cnResult = null;
        App.render();
        return false;
      }
      if (name === 'cnLesson') {
        Kid.cnLesson = parseInt(v, 10);
        Kid.cnResult = null;
        App.render();
        return false;
      }
      if (name === 'cnSubmit') {
        var item2 = Kid.cnItem(Kid.cnUnit, Kid.cnLesson);
        if (!item2) return false;
        var C2 = Kid.cnData();
        var pool2 = [];
        C2.units.forEach(function (x) {
          if (x.garden && x.garden.write) x.garden.write.forEach(function (w) { pool2.push(w); });
          x.lessons.forEach(function (l) { (l.write || []).forEach(function (w) { pool2.push(w); }); });
        });
        var sb = 0, dstr = S.dateStr();
        for (var kk = 0; kk < dstr.length; kk++) sb += dstr.charCodeAt(kk);
        sb += Kid.cnUnit * 31 + Kid.cnLesson * 7 + 3;
        var QZ2 = global.CNQUIZ;
        var list2 = QZ2 ? QZ2.build(item2.write || [], pool2, sb) : [];
        if (!list2.length) return false;

        var tot = list2.length, cor = 0, un = 0;
        var detail = [];
        list2.forEach(function (q, i) {
          var sel = document.querySelector('input[name="cnq_' + i + '"]:checked');
          var pick = sel ? parseInt(sel.value, 10) : -1;
          var ok = pick === q.ans;
          if (pick < 0) un++; else if (ok) cor++;
          detail.push({
            c: q.opts[q.ans], pick: pick >= 0 ? q.opts[pick] : '',
            q: q.q, t: q.t, why: q.why, ok: ok, blank: pick < 0
          });
        });
        if (un > 0) { U.toast('还有 ' + un + ' 题没选哦'); return false; }

        var label = Kid.cnTitle(item2);
        var rec2 = E.finishQuiz(v, 'cn', cor, tot, label, detail);
        Kid.cnResult = rec2;
        var face3 = cor === tot ? '🎉' : (cor / tot >= 0.6 ? '🌻' : '🌱');
        var msg3 = cor === tot
          ? '全部答对！' + tot + ' 道题一个不落，太厉害了！'
          : '答对 ' + cor + ' / ' + tot + ' 道题。\n错了的下面有讲解，看一眼就记住啦。';
        U.modal({
          emoji: face3, title: '获得 💧 ' + rec2.water,
          text: msg3,
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }
      if (name === 'cnRead') {
        Kid.cnSpeak(v, 0.75);
        return false;
      }
      if (name === 'cnReadSlow') {
        Kid.cnSpeak(v, 0.5);
        return false;
      }
      if (name === 'cnSay') {
        Kid.cnSayList(v, !!e.getAttribute('data-slow'));
        return false;
      }
      if (name === 'cnShowAns') {
        var box = document.getElementById('cn-dict-ans');
        var hide = document.getElementById('cn-dict-hide');
        if (box) {
          var show = box.style.display === 'none';
          box.style.display = show ? 'block' : 'none';
          if (hide) hide.style.display = show ? 'none' : 'block';
        }
        return false;
      }
      if (name === 'cnNextGroup') {
        S.state.dictRound = (typeof S.state.dictRound === 'number' ? S.state.dictRound : 0) + 1;
        S.save();
        App.render();
        U.toast('换好啦，再来 10 个');
        return false;
      }

      /* ---------- 倒计时 ---------- */
      if (name === 'timerStart') {
        var tp = String(v).split(':');
        var tid = tp[0], tmin = parseInt(tp[1], 10) || 10;
        Kid.timerStart(tid, tmin);
        App.render();
        U.toast('开始计时：' + tmin + ' 分钟');
        return false;
      }
      if (name === 'readPick') {
        Kid.readPick = (Kid.readPick === v) ? '' : v;
        App.render();
        return false;
      }
      if (name === 'readCheck') {
        var book = Kid.readPick || '';
        var rres = E.finishReading(book, 0);
        if (rres && rres.dup) { U.toast('今天已经漂过啦，明天再来 🐚'); return false; }
        Kid.readPick = '';
        var readNow = S.state.water;
        U.modal({
          emoji: '🐚', title: '阅读打卡成功 +💧' + (rres.water || 10),
          text: (book ? '今天读的是《' + book + '》。\n' : '今天读了书。\n') +
            '获得 💧 ' + (rres.water || 10) + ' 水滴，现在一共 💧 ' + readNow + '。\n' +
            '这是选做任务，读了就有，不用等妈妈点亮。',
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }
      /* 计算小超市：提前完成，按剩余时间每满 1 分钟 +1 水滴 */
      if (name === 'calcDone') {
        var ctask = S.state.tasks.filter(function (x) { return x.id === v; })[0];
        if (!ctask) return false;
        var ct = Kid.timerOf(v);
        if (!ct) { U.toast('先点「开始计时」再打卡哦'); return false; }
        if (S.isApproved(v, S.dateStr())) { App.render(); return false; }
        var cres = E.finishCalcEarly(ct, v);
        Kid.timerEnd(v);
        S.save();
        var sub2 = E.submitTask(v, '我提前做完啦（还剩 ' + (cres.earlyMin || 0) + ' 分钟）');
        var wtxt = (cres.earlyMin > 0)
          ? '还剩 ' + cres.earlyMin + ' 分钟，额外获得 💧 ' + cres.earlyMin + ' 水滴！\n现在一共 💧 ' + S.state.water + '。'
          : '这次没有提前完成，明天试试更快一点 ⚡';
        U.modal({
          emoji: cres.earlyMin > 0 ? '⚡' : '🛒', title: cres.earlyMin > 0 ? '提前完成，多拿 💧' + cres.earlyMin : '小超市收摊啦',
          text: wtxt,
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }

      /* ---------- 预习探险 ---------- */
      if (name === 'pvBook') {
        Kid.cnBook = v === '2b' ? '2b' : '2a';
        Kid.pvLesson = -2; Kid.pvStage = '';
        App.render();
        return false;
      }
      if (name === 'pvPick') {
        var pp = String(v).split(':');
        Kid.pvUnit = parseInt(pp[0], 10) || 0;
        Kid.pvLesson = parseInt(pp[1], 10);
        Kid.pvStage = ''; Kid.pvOpen = {}; Kid.pvAns = {}; Kid.pvGuide = {}; Kid.pvResult = null;
        Kid.bossIdx = 0; Kid.bossTry = {}; Kid.bossPicked = -1;
        Kid.sumMode = ''; Kid.sumPick = []; Kid.sumCheck = 0; Kid.sumGist = -1;
        App.render();
        return false;
      }
      if (name === 'pvFinish') {
        Kid.pvSave(v, { done: 1, read: 1, ask: 1, boss: 1, sum: 1 });
        U.modal({
          emoji: '🎉', title: '这一课预习完啦',
          text: '你在目录里会看到它旁边变成 ✅。\n预习完上课听得懂，回家作业就快啦。',
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }
      if (name === 'bossPick') {
        var pd2 = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        var bq = (pd2 && pd2.quiz || [])[Kid.bossIdx];
        if (!bq) return false;
        var pick2 = parseInt(v, 10);
        if (pick2 === bq.ans) {
          Kid.bossPicked = Kid.bossIdx;
          if (Kid.bossIdx === (pd2.quiz.length - 1)) return Kid.bossFinish(pd2);
          Kid.bossIdx++;
          Kid.bossPicked = -1;
          App.render();
          U.toast('🌻 打退一只僵尸！');
        } else {
          Kid.bossTry[Kid.bossIdx] = (Kid.bossTry[Kid.bossIdx] || 0) + 1;
          App.render();
          if (Kid.bossTry[Kid.bossIdx] === 1) U.toast('差一点，看看提示再想想');
        }
        return false;
      }
      if (name === 'bossNext') {
        var pd3 = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        if (Kid.bossIdx >= (pd3.quiz || []).length - 1) return Kid.bossFinish(pd3);
        Kid.bossIdx++;
        Kid.bossPicked = -1;
        App.render();
        return false;
      }
      if (name === 'sumMode') { Kid.sumMode = v || ''; Kid.sumCheck = 0; App.render(); return false; }
      if (name === 'sumTap') {
        var ci = parseInt(v, 10);
        var at = Kid.sumPick.indexOf(ci);
        if (at >= 0) Kid.sumPick.splice(at, 1); else Kid.sumPick.push(ci);
        Kid.sumCheck = 0;
        App.render();
        return false;
      }
      if (name === 'sumReset') { Kid.sumPick = []; Kid.sumCheck = 0; App.render(); return false; }
      if (name === 'sumCheck') {
        if (Kid.sumCheck) { Kid.sumPick = []; Kid.sumCheck = 0; App.render(); return false; }
        var pd4 = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        var n2 = (pd4.cards || []).length;
        if (Kid.sumPick.length < n2) { U.toast('还有 ' + (n2 - Kid.sumPick.length) + ' 张没点哦'); return false; }
        Kid.sumCheck = 1;
        Kid.pvSave(Kid.pvKey(pd4.no, pd4.title), { sum: 1 });
        var right2 = Kid.sumRight(pd4);
        var rec3 = E.finishQuiz('SUM_' + pd4.no + pd4.title, 'cnsum', right2, n2,
          pd4.no + ' ' + pd4.title + '（故事拼图）', []);
        App.render();
        U.modal({
          emoji: right2 === n2 ? '🎉' : '🧩', title: '获得 💧 ' + rec3.water,
          text: '排对 ' + right2 + ' / ' + n2 + ' 张。\n' +
            (right2 === n2 ? '整个故事的顺序你都记住啦！' : '差一点的再排一次就全对了。'),
          buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }
      if (name === 'sumGist') {
        Kid.sumGist = parseInt(v, 10);
        Kid.sumCheck = 0;
        App.render();
        return false;
      }
      if (name === 'sumDone') {
        var pd5 = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        var go = Kid.gistOpts(pd5);
        if (!Kid.sumCheck) {
          if (Kid.sumGist < 0) { U.toast('先选一个答案'); return false; }
          Kid.sumCheck = 1;
          Kid.pvSave(Kid.pvKey(pd5.no, pd5.title), { sum: 1 });
          var ok2 = Kid.sumGist === go.ans ? 1 : 0;
          var rec4 = E.finishQuiz('SUM2_' + pd5.no + pd5.title, 'cnsum', ok2, 1,
            pd5.no + ' ' + pd5.title + '（一句话概括）', []);
          App.render();
          U.modal({
            emoji: ok2 ? '🎉' : '💡', title: '获得 💧 ' + rec4.water,
            text: ok2 ? '说对了！这就是概括 —— 用一句话说清整篇讲了什么。'
              : '看看正确答案，想一想它为什么比别的选项更好。',
            buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
          });
          return false;
        }
        Kid.sumMode = ''; Kid.sumCheck = 0; Kid.sumGist = -1;
        App.render();
        return false;
      }
      /* 注：原 pvUnit（切单元）已删除 —— 选课统一走 pvPick，这里留着会产生永远没人触发的死分支 */
      if (name === 'pvLesson') {
        Kid.pvLesson = parseInt(v, 10);
        Kid.pvStage = ''; Kid.pvOpen = {}; Kid.pvAns = {}; Kid.pvGuide = {}; Kid.pvResult = null;
        App.render();
        return false;
      }
      if (name === 'pvStage') {
        Kid.pvStage = v || '';
        /* 进哪一关就记一下进度，目录里会变成 🟡 预习中 */
        var pds = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        if (pds && v) {
          var patch = {};
          if (v === 'read') patch.read = 1;
          if (v === 'ask' || v === 'detective') patch.ask = 1;
          if (v === 'boss' || v === 'quiz') patch.boss = 1;
          if (v === 'sum') patch.sum = 1;
          Kid.pvSave(Kid.pvKey(pds.no, pds.title), patch);
        }
        App.render();
        return false;
      }
      if (name === 'pvHint') {
        Kid.pvOpen[v] = Math.max(Kid.pvOpen[v] || 0, 1);
        App.render();
        return false;
      }
      if (name === 'pvFind') {
        Kid.pvOpen[v] = 2;
        App.render();
        return false;
      }
      if (name === 'pvSubmit') {
        var pd = Kid.pvData(Kid.pvUnit, Kid.pvLesson);
        if (!pd) return false;
        var pqs = pd.quiz || [];
        var pcor = 0, pun = 0;
        var pguide = {};
        pqs.forEach(function (q, i) {
          var sel = document.querySelector('input[name="pvq_' + i + '"]:checked');
          if (!sel) { pun++; return; }
          if (parseInt(sel.value, 10) === q.ans) pcor++;
          else pguide[i] = 1;
        });
        Kid.pvGuide = pguide;
        if (pun > 0) { U.toast('还有 ' + pun + ' 题没选哦'); App.render(); return false; }

        if (Object.keys(pguide).length) {
          /* 有错的：先不结算，用引导提问让他自己再想 */
          App.render();
          U.modal({
            emoji: '🕵️', title: '差一点点',
            text: '有 ' + Object.keys(pguide).length + ' 道题答案不对。\n我没有直接告诉你答案 —— 往上看，每道题下面都留了一个小问题，照着它想一想，再选一次。',
            buttons: [{ text: '好，我再想想', cls: 'btn-green' }]
          });
          return false;
        }

        var prec = E.finishQuiz('PV_' + v, 'cnprev', pcor, pqs.length,
          pd.no + ' ' + pd.title + ' · 预习小测', []);
        Kid.pvResult = prec;
        U.modal({
          emoji: '🎉', title: '预习完成！获得 💧 ' + prec.water,
          text: pqs.length + ' 道题全部答对，说明你真的把课文读进去了。',
          buttons: [{ text: '太棒了', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
        });
        return false;
      }

      /* ---------- 背诵闯关 ---------- */
      if (name === 'rcOpen') {
        Kid.rcId = v; Kid.rcGame = ''; Kid.rcStep = 0; Kid.rcPick = [];
        Kid.rcLv = 0; Kid.rcResult = null; Kid.rcAudioUrl = '';
        App.render();
        return false;
      }
      if (name === 'rcBack') {
        Kid.rcId = ''; Kid.rcGame = ''; Kid.rcStep = 0; Kid.rcPick = []; Kid.rcLv = 0;
        if (Kid.rcRecOn) Kid.rcStopRec();
        App.render();
        return false;
      }
      if (name === 'rcGame') {
        if (Kid.rcRecOn) Kid.rcStopRec();
        Kid.rcGame = v || ''; Kid.rcStep = 0; Kid.rcPick = []; Kid.rcLv = 0;
        App.render();
        return false;
      }
      if (name === 'rcCover') {
        Kid.rcLv = parseInt(v, 10) || 0;
        App.render();
        return false;
      }
      if (name === 'rcNext') {
        var rit = Kid.reciteById(Kid.rcId);
        if (!rit) return false;
        var val = null;
        if (Kid.rcGame === 'fill') {
          var sel = document.querySelector('input[name="rfq"]:checked');
          if (!sel) { U.toast('先选一个答案'); return false; }
          val = parseInt(sel.value, 10);
          var msk = Kid.rcMask(rit.lines, Kid.rcStep, rit.words);
          if (msk && val !== msk.ans) {
            U.toast('再想想～ 可以点"想不起来"看原文');
            return false;
          }
        } else if (Kid.rcGame === 'chain') {
          var sel2 = document.querySelector('input[name="rcq"]:checked');
          if (!sel2) { U.toast('先选一句'); return false; }
          var opts2 = Kid.rcChainOpts(rit, Kid.rcStep);
          if (parseInt(sel2.value, 10) !== opts2.ans) {
            U.toast('不对哦，再读一遍上一句');
            return false;
          }
        }
        Kid.rcStep++;
        App.render();
        return false;
      }
      if (name === 'rcPeek') {
        var rit2 = Kid.reciteById(Kid.rcId);
        if (rit2) {
          U.modal({
            emoji: '📖', title: '这一句原文',
            text: rit2.lines[Kid.rcStep] || '',
            buttons: [{ text: '记住啦', cls: 'btn-green' }]
          });
        }
        return false;
      }
      if (name === 'rcPick') {
        var rit3 = Kid.reciteById(Kid.rcId);
        if (!rit3) return false;
        var pickIdx = parseInt(v, 10);
        var want = (Kid.rcPick || []).length;
        if (pickIdx === want) {
          Kid.rcPick.push(pickIdx);
          App.render();
        } else {
          U.toast('还不是这一句哦');
        }
        return false;
      }
      if (name === 'rcReset') {
        Kid.rcPick = [];
        App.render();
        return false;
      }
      if (name === 'rcRec') {
        if (Kid.rcRecOn) Kid.rcStopRec();
        else Kid.rcStartRec();
        return false;
      }
      if (name === 'rcFinish') {
        var rit4 = Kid.reciteById(Kid.rcId);
        if (rit4) {
          var had4 = E.quizToday(rit4.id, 'recite', S.dateStr());
          var rec4 = had4 || E.finishQuiz(rit4.id, 'recite', rit4.lines.length, rit4.lines.length,
            rit4.title + '（' + ({ cover: '挡住背', rec: '录音背诵' }[v] || '背诵') + '）', []);
          U.modal({
            emoji: '🏆', title: had4 ? '又背了一遍，更熟啦' : '背下来啦！获得 💧 ' + rec4.water,
            text: U.esc(rit4.title) + ' 全部背完。\n' +
              (had4 ? '今天的水滴已经拿过啦，再背一遍是为了记更牢。' : '背得越多记得越牢，明天换个玩法再复习一遍。'),
            buttons: [{ text: '好！', cls: 'btn-green', onClick: function (c) { c(); App.afterChange(); } }]
          });
        }
        return false;
      }

      if (name === 'redeem') {
        var item = s.shop.filter(function (x) { return x.id === v; })[0];
        U.confirm('用 ☀️ ' + item.price + ' 换这个？', U.esc(item.name) + '\n' + U.esc(item.desc || ''), function () {
          var r = E.redeem(v);
          if (!r.ok) { U.modal({ emoji: '🌤️', title: '阳光还不够', text: r.msg }); return; }
          U.story('redeemed', { name: r.item.name });
          global.App.afterChange();
        }, '换！');
        return false;
      }
      return false;
    }
  };

  global.Kid = Kid;
})(window);
