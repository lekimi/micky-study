/* ===========================================================
   parent.js —— 妈妈管控后台端（马卡龙配色）
   适配 OPPO Find X9 Pro 手机竖屏
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store, E = global.Engine, U = global.UI;
  var SUBJ = { chinese: '语文', math: '数学', english: '英语', other: '其他' };

  /* 数学趣味闯关进度（给妈妈看，不含答案） */
  function mathRowsHtml() {
    if (!global.MathGame) return '';
    var MG = global.MathGame, m = MG.m();
    var rows = MG.GAMES.map(function (g) {
      var done = MG.gameCleared(g.id), total = g.levels;
      var sub = '';
      if (g.id === 'sudoku') {
        sub = '4×4 ' + MG.sdCleared(4) + '/15　6×6 ' + (MG.sdUnlocked(6) ? MG.sdCleared(6) + '/30' : '🔒') +
          '　9×9 ' + (MG.sdUnlocked(9) ? MG.sdCleared(9) + '/20' : '🔒');
      } else {
        sub = '⭐ ' + MG.starsOfGame(g.id) + ' / ' + (total * 3);
      }
      return '<div class="row"><div style="font-size:20px">' + g.emoji + '</div>' +
        '<div class="row-main"><div class="row-t">' + g.name + '　' + done + ' / ' + total + ' 关</div>' +
        '<div class="row-s">' + sub + '</div></div></div>';
    }).join('');
    var c = S.mathConf();
    var used = Math.round(S.mathUsedSec() / 60 * 10) / 10;
    var quota = S.mathQuotaMin();
    var redeemed = (c.redeemDay === S.dateStr() ? (c.redeemMin || 0) : 0);
    var bonus = (c.bonus && c.bonus[S.dateStr()]) || 0;
    var status = !c.enable
      ? '<b style="color:#2F6B3A">没限时，随便玩</b>'
      : '今天已玩 <b>' + used + '</b> / ' + quota + ' 分钟' +
      (c.enable ? '（免费 ' + (c.baseMin || 10) + (bonus ? ' + 加时 ' + bonus : '') + (redeemed ? ' + 兑换 ' + redeemed : '') + '）' : '');
    var left = MG.leftSec ? MG.leftSec() : 0;

    var ctrl = '<div class="card mt12" style="background:#FFF8E4;border:2px solid #EFDDB8">' +
      '<div class="sec-title">⏳ 数学闯关时间管控</div>' +
      '<div class="muted" style="font-size:12px;margin-bottom:8px">' + status +
      (c.enable ? ' · 还剩 <b>' + Math.ceil(left / 60) + '</b> 分钟' : '') + '</div>' +
      '<div class="flex gap8" style="align-items:center;flex-wrap:wrap">' +
      '<button class="pill-btn ' + (c.enable ? 'pill-ok' : '') + '" style="min-height:44px" ' +
      'data-act="mcToggle">' + (c.enable ? '✅ 限时已开启（点我关掉）' : '⭕ 限时已关闭（点我开启）') + '</button>' +
      '<button class="pill-btn pill-lav" style="min-height:44px" data-act="mcCur">兑换用：' +
      (c.currency === 'sun' ? '☀️ 阳光' : '💧 水滴') + '（点我换）</button>' +
      '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:10px;font-weight:800">每天免费时长（分钟）</div>' +
      '<div class="flex gap8 mt8">' +
      '<input class="field" id="mc-base" type="number" min="1" max="120" value="' + (c.baseMin || 10) + '" style="flex:1">' +
      '<button class="pill-btn pill-ok" style="min-height:48px" data-act="mcBase">保存</button>' +
      '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:10px;font-weight:800">每天兑换上限（分钟，一天只能兑一次）</div>' +
      '<div class="flex gap8 mt8">' +
      '<input class="field" id="mc-max" type="number" min="0" max="120" value="' + (c.maxMin || 20) + '" style="flex:1">' +
      '<button class="pill-btn pill-ok" style="min-height:48px" data-act="mcMax">保存</button>' +
      '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:10px;font-weight:800">今天额外加时（分钟，临时用）</div>' +
      '<div class="flex gap8 mt8">' +
      '<input class="field" id="mc-bonus" type="number" min="1" max="60" value="5" style="flex:1">' +
      '<button class="pill-btn pill-lav" style="min-height:48px" data-act="mcBonus">加时</button>' +
      '<button class="pill-btn pill-no" style="min-height:48px" data-act="mcClear">清零</button>' +
      '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:8px">兑换档位固定为 ' +
      E.MATH_TIME_PLANS.map(function (p) { return p.cost + ' 分 → ' + p.min + ' 分钟'; }).join(' / ') +
      '</div></div>';

    return ctrl + '<div class="card mt12"><div class="sec-title">🎮 数学趣味闯关</div>' +
      '<div class="muted" style="margin-bottom:8px">累计 ⭐ ' + MG.totalStars() + ' 颗 · 今日提示还剩 ' +
      (m.hintLeft || 0) + ' 个 · 连胜 ' + (m.streak || 0) + ' 关</div>' + rows + '</div>';
  }

  function taskEmoji(id) {
    var t = S.state.tasks.filter(function (x) { return x.id === id; })[0];
    return t ? t.emoji : '📌';
  }

  var Parent = {
    page: 'dash',

    tabs: function () {
      var pending = E.pendingList().length;
      var list = [
        { k: 'dash', e: '📊', t: '看板' },
        { k: 'chart', e: '📈', t: '图表' },
        { k: 'ledger', e: '🧾', t: '明细' },
        { k: 'review', e: '✅', t: '审核', badge: pending },
        { k: 'publish', e: '📝', t: '发布' },
        { k: 'shop', e: '🏪', t: '商店' }
      ];
      return list.map(function (x) {
        return '<button class="tab' + (Parent.page === x.k ? ' active' : '') + '" data-act="ptab" data-v="' + x.k + '">' +
          '<span class="tab-emoji">' + x.e + '</span><span>' + x.t + '</span>' +
          (x.badge ? '<span class="badge">' + x.badge + '</span>' : '') +
          '</button>';
      }).join('');
    },

    /* ---------------- 数据看板 ---------------- */
    pageDash: function () {
      var s = S.state;
      var date = S.dateStr();
      var stat = E.todayFixedStatus(date);
      var pending = E.pendingList().length;

      var boxes =
        '<div class="stat-grid">' +
        '<div class="stat-box sb-lemon"><div class="sb-val">☀️ ' + s.sun + '</div><div class="sb-label">当前阳光</div></div>' +
        '<div class="stat-box sb-sky"><div class="sb-val">💧 ' + s.water + '</div><div class="sb-label">当前水滴</div></div>' +
        '<div class="stat-box sb-mint"><div class="sb-val">' + stat.done + '/' + stat.total + '</div><div class="sb-label">今日完成</div></div>' +
        '<div class="stat-box sb-pink"><div class="sb-val">🧟 ' + s.zombieStep + ' 步</div><div class="sb-label">僵尸位置（5步到家）</div></div>' +
        '<div class="stat-box sb-lav"><div class="sb-val">🌻 ' + Kid_count('sunflower') + '</div><div class="sb-label">向日葵株数</div></div>' +
        '<div class="stat-box sb-pink"><div class="sb-val">⏳ ' + pending + '</div><div class="sb-label">待我审核</div></div>' +
        '</div>';

      function Kid_count(k) {
        var n = 0; s.garden.forEach(function (c) { if (c.plant === k) n++; }); return n;
      }

      var rows = stat.list.map(function (t) {
        var sub = S.subOf(t.id, date);
        var stt = !sub ? '未提交' : sub.status === 'approved' ? '已通过' : sub.status === 'submitted' ? '待审核' : '已退回';
        var color = stt === '已通过' ? '#2F6B54' : stt === '待审核' ? '#B8791B' : '#A8435B';
        return '<div class="row"><div style="font-size:22px">' + t.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s" style="color:' + color + ';font-weight:800">' + stt + '</div></div></div>';
      }).join('');

      var extraRows = S.state.tasks.filter(function (t) { return t.kind === 'extra'; }).map(function (t) {
        var sub = S.subOf(t.id, date);
        var stt = !sub ? '未提交' : sub.status === 'approved' ? '已通过 +' + sub.water + '💧' : sub.status === 'submitted' ? '待审核' : '已退回';
        return '<div class="row"><div style="font-size:22px">' + t.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s">' + (SUBJ[t.subject] || '其他') + ' · ' + stt + '</div></div></div>';
      }).join('');

      var ws = S.weekStartOf(date), we = S.weekEndOf(date);
      var weekly = S.weeklyTasksOf(null, ws);
      var weeklyRows = weekly.length ? weekly.map(function (t) {
        var ad = S.approvedDateOf(t.id);
        var stt = ad ? '周' + S.WEEK_CN[S.dayIndex(ad)] + '完成 ✅'
          : (S.isApprovedEver(t.id) ? '已完成 ✅' : '进行中 ⏳');
        var color = stt.indexOf('✅') >= 0 ? '#2F6B54' : '#B8791B';
        return '<div class="row"><div style="font-size:20px">' + t.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s">' + (SUBJ[t.subject] || '其他') + ' · 截止周五 · <span style="color:' + color + ';font-weight:800">' + stt + '</span></div></div></div>';
      }).join('') : '<div class="muted" style="padding:6px 0">本周还没有长线任务</div>';

      var speechRows = (s.speech || []).slice(-5).reverse().map(function (x) {
        return '<div class="row"><div style="font-size:20px">🎤</div>' +
          '<div class="row-main"><div class="row-t">' + x.date + ' · <b>' + x.score + ' 分</b></div>' +
          '<div class="row-s">' + U.esc((x.comments && x.comments[0]) || '') + '</div></div>' +
          '<span class="pill-btn pill-gray" style="pointer-events:none">💧' + x.water + '</span></div>';
      }).join('');

      var quizRows = (s.quiz || []).slice(-8).reverse().map(function (x) {
        var icon = x.kind === 'cn' ? '🀄' : (x.kind === 'cnprev' ? '🔍' : (x.kind === 'recite' ? '🎤' : (x.kind === 'cnboss' ? '🧟' : (x.kind === 'review' ? '📝' : (x.kind === 'listening' ? '🎧' : '📖')))));
        var name = x.label || (x.kind === 'cn' ? '语文生字 ' + x.ref : (x.kind === 'review' ? '朗文 2A 复习题' : (x.kind === 'listening' ? '朗文听力 ' : '朗文阅读 ') + x.ref));
        var full = x.total && x.correct === x.total;
        var wrong = (x.detail || []).filter(function (d) { return !d.ok; }).map(function (d) { return d.c; }).join('、');
        return '<div class="row"><div style="font-size:20px">' + icon + '</div>' +
          '<div class="row-main"><div class="row-t">' + x.date + ' · ' + U.esc(name) + '</div>' +
          '<div class="row-s">' + (full ? '全对 🎉' : ('答对 ' + x.correct + '/' + x.total + (wrong ? '　写错：' + wrong : ''))) + '</div></div>' +
          '<span class="pill-btn ' + (full ? 'pill-ok' : 'pill-gray') + '" style="pointer-events:none">💧' + x.water + '</span></div>';
      }).join('');

      /* 阅读打卡（故事海漂流） */
      var readRows = (s.readLog || []).slice(-8).reverse().map(function (r) {
        return '<div class="row"><div style="font-size:20px">🐚</div>' +
          '<div class="row-main"><div class="row-t">' + r.date + ' · ' + U.esc(r.book || '自由阅读') + '</div>' +
          '<div class="row-s">' + (r.book ? '读完一本 🐚' : '自由阅读') + ' · +' + (r.water || 10) + ' 💧</div></div>' +
          '<span class="pill-btn pill-ok" style="pointer-events:none">✅</span></div>';
      }).join('');
      var readWater = (s.readLog || []).reduce(function (a, r) { return a + (r.water || 10); }, 0);
      var readDays = {};
      (s.readLog || []).forEach(function (r) { readDays[r.date] = 1; });
      if (readRows) {
        readRows = '<div class="muted" style="margin-bottom:8px">共打卡 <b>' + Object.keys(readDays).length +
          '</b> 天 · 共获得 <b>' + readWater + '</b> 💧（选做任务，每天可自由打卡一次）</div>' + readRows;
      }

      /* 语文预习进度：按册次 → 单元 → 课，看孩子学到哪儿了 */
      var pvMap = s.pv || {};
      var pvKeys = Object.keys(pvMap);
      var pvRows = '';
      if (pvKeys.length) {
        var doneN = 0, doingN = 0;
        pvKeys.forEach(function (k) {
          var p = pvMap[k];
          if (p.done) doneN++;
          else if (p.read || p.ask || p.boss || p.sum) doingN++;
        });
        pvRows = '<div class="muted" style="margin-bottom:8px">已预习 <b>' + doneN +
          '</b> 课 · 进行中 <b>' + doingN + '</b> 课</div>' +
          pvKeys.slice(-10).reverse().map(function (k) {
            var p = pvMap[k];
            var parts = k.split('|');
            var label = parts.length > 1 ? parts[1] : k;
            var vol = parts[0] === '2b' ? '（下册）' : '';
            var st = p.done ? '已预习 ✅' : ((p.read || p.ask || p.boss || p.sum) ? '预习中 🟡' : '未预习 ⚪');
            var step = [];
            if (p.read) step.push('读原文');
            if (p.ask) step.push('侦探');
            if (p.boss) step.push('闯关');
            if (p.sum) step.push('拼图');
            return '<div class="row"><div style="font-size:20px">' +
              (p.done ? '✅' : '🔍') + '</div>' +
              '<div class="row-main"><div class="row-t">' + U.esc(label) + vol + '</div>' +
              '<div class="row-s">' + st + (step.length ? ' · ' + step.join(' → ') : '') + '</div></div></div>';
          }).join('');
      }

      /* ===== 心情天气（只显示他愿意给我看的） ===== */
      var moods = E.moodRecent(7);
      var moodHtml = '<div class="card mt12">' +
        '<div class="sec-title">🌤️ 这周的心情天气</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '标着 🔒 的是他选了「只有我知道」，我不会看到具体是哪个 —— 这是他自己的权利。' +
        '</div>' +
        '<div style="display:flex;gap:6px">' +
        moods.map(function (m) {
          var mm = null;
          E.MOODS.forEach(function (x) { if (x.k === m.m) mm = x; });
          var face = m.hidden ? '🔒' : (mm ? mm.e : '·');
          var label = m.hidden ? '他自己藏着' : (mm ? mm.t : '没选');
          var bg = m.hidden ? '#F1EFE8' : (mm ? mm.c + '22' : '#F1EFE8');
          return '<div style="flex:1;text-align:center;padding:8px 2px;border-radius:12px;background:' + bg + '">' +
            '<div style="font-size:12px;font-weight:800;color:#7A6248">周' + m.label + '</div>' +
            '<div style="font-size:22px;line-height:1.4">' + face + '</div>' +
            '<div style="font-size:11px;font-weight:800;color:#7A6248">' + label + '</div>' +
            '</div>';
        }).join('') + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:8px">' +
        '这个不打分、不影响任何奖励，只是让你知道他今天怎么样。连着几天是雨的时候，也许就是聊聊的时候。' +
        '</div></div>';

      /* ===== 妈妈的悄悄话 ===== */
      var noteList = E.noteList().slice(0, 8);
      var noteRows = noteList.length ? noteList.map(function (n) {
        var stt = n.read ? '<span class="task-tag ok">他读过了 ✅</span>'
          : (n.date > date ? '<span class="task-tag wait">' + n.date + ' 才生效</span>' : '<span class="task-tag">还没拆</span>');
        return '<div class="row"><div style="font-size:20px">' + (n.read ? '📭' : '✉️') + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(n.text.length > 30 ? n.text.slice(0, 30) + '…' : n.text) + '</div>' +
          '<div class="row-s">' + n.date + ' · ' + stt + (n.push ? ' · 急件' : '') + '</div></div>' +
          '<button class="pill-btn pill-no" style="min-height:44px" data-act="noteDel" data-v="' + n.id + '">×</button></div>';
      }).join('') : '<div class="muted" style="padding:6px 0">还没留过悄悄话</div>';

      /* 模板：按分类给一排快捷按钮 */
      var tplHtml = (U.NOTE_TPL || []).map(function (g) {
        return '<div style="margin-top:8px">' +
          '<div style="font-size:12px;font-weight:900;color:#7A6248;margin-bottom:4px">' + g.t + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          g.list.map(function (t) {
            return '<button class="pill-btn" style="min-height:44px;font-size:12px;padding:6px 10px" ' +
              'data-act="noteTpl" data-v="' + U.esc(t) + '">' + U.esc(t.length > 16 ? t.slice(0, 16) + '…' : t) + '</button>';
          }).join('') + '</div></div>';
      }).join('');

      var noteHtml = '<div class="card mt12" style="background:#FFF6F9;border:2px solid #F0C7D4">' +
        '<div class="sec-title">✉️ 给 Micky 留一句悄悄话</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '他会看到一个信封，点开才能读。读完这里会显示「他读过了」。' +
        '</div>' +
        '<input class="field" id="note-text" placeholder="写一句你想跟他说的话…" style="text-align:left">' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:14px" data-act="noteSend" data-v="today">今天生效</button>' +
        '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:14px" data-act="noteSend" data-v="tomorrow">明天生效</button>' +
        '<button class="btn btn-lav" style="flex:1;min-height:52px;font-size:14px" data-act="noteSend" data-v="now">现在就给他</button>' +
        '</div>' +
        '<div style="margin-top:10px">' +
        '<div style="font-size:12px;font-weight:900;color:#7A6248;margin-bottom:4px">懒得想？点一句现成的</div>' +
        tplHtml +
        '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:8px">' +
        '点模板会把它填进上面的输入框，你可以改完再发。' +
        '</div>' +
        '</div>';

      /* 今天自动生成的那句（按他的心情来的，不用你写） */
      var an = E.autoNoteOf(date);
      var anMood = { sun: '☀️ 晴', cloud: '⛅ 多云', rain: '🌧️ 有雨', storm: '⛈️ 打雷', none: '没选' }[(an && an.mood) || 'none'];
      var autoNoteHtml = '<div class="card mt12" style="background:#FFF3F6;border:2px solid #F0C7D4">' +
        '<div class="sec-title">🤖 今天自动给他的那句</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '按他今天的心情挑的，不用你操心。心情差的时候只会陪着，不会让他振作、不会派任务。' +
        '</div>' +
        '<div style="background:#fff;border-radius:12px;padding:12px">' +
        '<div style="font-weight:900;color:#5C4322;line-height:1.7">' + U.esc((an && an.text) || '（今天还没有）') + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">今天心情：' + anMood +
        ' · 来源：' + ((an && an.mode === 'ai') ? 'AI 写的' : '模板库挑的') +
        ' · ' + (an && an.read ? '他读过了 ✅' : '还没拆') + '</div>' +
        '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:8px">' +
        '想要 AI 真按你的口气写（而不是从模板里挑），在下面「AI 老师」里填上 Key 就行；没填也照样能用。' +
        '</div></div>';

      /* ===== 开心罐 + 小盆栽 ===== */
      var p = E.plantOf();
      var joyN = E.joyList().length;
      var warmHtml = '<div class="card mt12" style="background:#F3FAF0;border:2px solid #B7DFB7">' +
        '<div class="sec-title">🪴 小盆栽 · 🍯 开心罐</div>' +
        '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
        '<div style="min-width:150px">' + (global.Kid ? global.Kid.plantSvg() : '') + '</div>' +
        '<div style="flex:1;min-width:180px">' +
        '<div style="font-weight:900;color:#2F6B3A">' + (p.leaves || 0) + ' 片叶子 · ' + (p.flower || 0) + ' 朵花</div>' +
        '<div class="muted" style="font-weight:800;margin-top:2px">' +
        '连着 ' + (p.streak || 0) + ' 天 · 三项固定任务全完成自动浇水' +
        '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">' +
        '断一天只是停住，不会掉叶子。这里没有惩罚。' +
        '</div>' +
        '<div class="muted" style="font-weight:800;margin-top:8px">🍯 开心罐里存了 <b>' + joyN + '</b> 件开心的事</div>' +
        '</div></div></div>';

      /* ===== 📒 单词本 · 📕 错题本 ===== */
      var book = (global.WordBook ? global.WordBook.mine() : []);
      var wrongs = (global.WordBook ? global.WordBook.wrongList() : []);
      var score = (function () {
        if (!book.length) return 0;
        var sum = 0;
        book.forEach(function (w) { sum += (w.box || 1); });
        return Math.round(sum / (book.length * 3) * 100);
      })();
      var bookRows = book.slice(0, 8).map(function (w) {
        return '<div class="row"><div style="font-size:18px">' + (['⭐', '⭐⭐', '⭐⭐⭐'][(w.box || 1) - 1] || '⭐') + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(w.en) + ' · ' + U.esc(w.zh) + '</div>' +
          '<div class="row-s">' + U.esc(w.cat) + ' · 对 ' + (w.right || 0) + ' 错 ' + (w.wrong || 0) + '</div></div></div>';
      }).join('');
      var wrongRows = wrongs.slice(0, 6).map(function (x) {
        return '<div class="row"><div style="font-size:18px">📕</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(x.note || x.q) + '</div>' +
          '<div class="row-s">他把 ' + U.esc(x.your || '（没选）') + ' 当成了它' +
          ((x.times || 1) > 1 ? ' · 错了 ' + x.times + ' 次' : '') + '</div></div></div>';
      }).join('');
      var wordHtml = '<div class="card mt12" style="background:#F7FBFF;border:2px solid #C9E0F5">' +
        '<div class="sec-title">📒 英语单词本 · 📕 错题本</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '孩子在英语页自己查词、自己加进单词本，系统会定期拿这些词考他。' +
        '</div>' +
        '<div class="muted" style="font-weight:800">单词本 <b>' + book.length + '</b> 个词' +
        (book.length ? ' · 平均熟练度 <b>' + score + '%</b>' : '') +
        ' · 错题本 <b>' + wrongs.length + '</b> 条</div>' +
        '<div style="margin-top:8px">' +
        (bookRows || '<div class="muted" style="padding:6px 0">还没加过单词</div>') +
        '</div>' +
        (wrongRows
          ? '<div class="sec-title" style="font-size:14px;margin-top:10px">这几个词他容易错</div>' + wrongRows
          : '') +
        '<div class="muted" style="font-size:12px;margin-top:8px">' +
        '错题本里的词答对一次就自动出本子，不用你手动清。' +
        '</div></div>';

      /* ===== ⏳ 全局使用时长（除打卡外最多 30 分钟） ===== */
      var ac = S.appConf();
      var aUsed = Math.round(S.appUsedSec(date) / 60);
      var aQuota = Math.round(S.appQuotaSec(date) / 60);
      var aBonus = (ac.bonus && ac.bonus[date]) || 0;
      var appTimeHtml = '<div class="card mt12" style="background:#FFF8E4;border:2px solid #EFDDB8">' +
        '<div class="sec-title">⏳ 使用时长管控</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '除了每日三项固定任务的「打卡计时」，其它板块（语文、数学、英语、奖励）合起来每天最多 ' + aQuota + ' 分钟。' +
        '时间到了只锁这些板块，<b>首页打卡照常能用</b>。' +
        '</div>' +
        '<div class="muted" style="font-weight:800">今天已用 <b>' + aUsed + '</b> / ' + aQuota + ' 分钟' +
        (aBonus ? '（含你加的 ' + aBonus + ' 分钟）' : '') + '</div>' +
        '<div style="height:10px;border-radius:6px;background:#EADFC0;overflow:hidden;margin:8px 0">' +
        '<div style="height:100%;width:' + (aQuota ? Math.min(100, Math.round(aUsed / aQuota * 100)) : 0) + '%;background:' +
        (aUsed >= aQuota ? '#E24B4A' : '#5BA82B') + '"></div></div>' +
        '<div class="row"><div class="row-main"><div class="row-t">时长限制</div>' +
        '<div class="row-s">关掉就不限制（不建议）</div></div>' +
        '<button class="pill-btn ' + (ac.enable ? 'pill-ok' : 'pill-gray') + '" style="min-height:44px" data-act="appToggle">' +
        (ac.enable ? '已开启' : '已关闭') + '</button></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:14px" data-act="appSet" data-v="30">改成 30 分钟</button>' +
        '<button class="btn btn-ghost" style="flex:1;min-height:52px;font-size:14px" data-act="appSet" data-v="20">改成 20 分钟</button>' +
        '<button class="btn btn-lav" style="flex:1;min-height:52px;font-size:14px" data-act="appBonus">今天 +10 分钟</button>' +
        '</div>' +
        '</div>';

      /* ===== ✂️ 精简模式（减少屏幕使用） ===== */
      var ln4 = (typeof Kid !== 'undefined' && global.Kid && global.Kid.lean) ? global.Kid.lean() : { on: 0 };
      var leanHtml = '<div class="card mt12" style="background:#F7FBFF;border:2px solid #C9E0F5">' +
        '<div class="sec-title">✂️ 精简模式（少看屏幕）</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">' +
        '关掉一部分在纸质书上做更合适的练习，只留真正需要在屏幕上做的。' +
        '<b>随时可以打开，不会丢任何数据。</b>' +
        '</div>' +
        '<div class="row"><div class="row-main"><div class="row-t">精简模式</div>' +
        '<div class="row-s">关掉后所有板块恢复</div></div>' +
        '<button class="pill-btn ' + (ln4.on ? 'pill-ok' : 'pill-gray') + '" style="min-height:44px" data-act="leanToggle">' +
        (ln4.on ? '已开启' : '已关闭') + '</button></div>' +
        (ln4.on
          ? '<div style="font-size:13px;font-weight:800;color:#185FA5;margin-top:8px;line-height:1.9">' +
          '· 语文：去掉生字闯关、预习探险（字词类改在纸质书上做）<br>' +
          '· 英语：去掉朗文阅读题<br>' +
          '· 英语：复习题只出 6 道语法题<br>' +
          '· 英语：听力按 L1、L2… 顺序播放，孩子在纸质卷子上做' +
          '</div>'
          : '') +
        '</div>';

      var autoHtml = '<div class="card mt12">' +
        '<div class="sec-title">⚙️ 快捷开关</div>' +
        '<div class="row"><div class="row-main"><div class="row-t">提交自动通过</div>' +
        '<div class="row-s">打开后孩子提交即刻点亮，我不用逐条审核</div></div>' +
        '<button class="pill-btn ' + (s.autoApprove ? 'pill-ok' : 'pill-gray') + '" data-act="toggleAuto">' +
        (s.autoApprove ? '已开启' : '已关闭') + '</button></div>' +
        '<div class="row"><div class="row-main"><div class="row-t">进入密码</div>' +
        '<div class="row-s">孩子端进妈妈后台要输入的密码</div></div>' +
        '<button class="pill-btn pill-lav" data-act="changePin">修改</button></div>' +
        '<div class="row"><div class="row-main"><div class="row-t">🤖 AI 老师打分</div>' +
        '<div class="row-s">关闭时用本地评分（零成本、离线可用）</div></div>' +
        '<button class="pill-btn ' + (s.ai && s.ai.enabled ? 'pill-ok' : 'pill-gray') + '" data-act="toggleAI">' +
        ((s.ai && s.ai.enabled) ? '已开启' : '已关闭') + '</button></div>' +
        '<button class="btn btn-lav mt8" data-act="aiConfig">配置 AI 老师参数</button>' +
        '</div>';

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">👋 你好，' + U.esc(s.kidName) + '的妈妈</div>' +
        '<div class="muted">今天是周' + S.WEEK_CN[S.dayIndex(date)] + ' · ' + date + '</div>' +
        '<div class="mt12">' + boxes + '</div>' +
        noteHtml + autoNoteHtml + moodHtml + warmHtml + wordHtml + appTimeHtml + leanHtml +

        '<div class="card mt12"><div class="sec-title">📋 今日固定任务</div>' + rows + '</div>' +
        '<div class="card mt12"><div class="sec-title">📅 本周长线任务（' + ws.slice(5) + ' ~ ' + we.slice(5) + '）</div>' + weeklyRows + '</div>' +
        '<div class="card mt12"><div class="sec-title">🎤 讲述练习记录</div>' +
        (speechRows || '<div class="muted" style="padding:6px 0">还没有记录</div>') + '</div>' +
        '<div class="card mt12"><div class="sec-title">📚 练习记录（语文 / 朗文）</div>' +
        (quizRows || '<div class="muted" style="padding:6px 0">还没有记录</div>') + '</div>' +
        '<div class="card mt12"><div class="sec-title">🌊 阅读打卡（故事海漂流 · 选做）</div>' +
        (readRows || '<div class="muted" style="padding:6px 0">还没有记录</div>') + '</div>' +
        '<div class="card mt12"><div class="sec-title">🔍 语文预习进度</div>' +
        (pvRows || '<div class="muted" style="padding:6px 0">还没开始预习</div>') + '</div>' +
        mathRowsHtml() +
        '<div class="card mt12"><div class="sec-title">💧 今日拓展任务</div>' + extraRows + '</div>' +
        autoHtml +
        '<div class="card mt12"><div class="sec-title">🗂️ 数据管理</div>' +
        '<div class="muted" style="margin-bottom:8px">每周存一次备份，换设备或清缓存都不怕。</div>' +
        '<div class="flex gap8">' +
        '<button class="btn btn-mac" data-act="export">💾 导出备份</button>' +
        '<button class="btn btn-lav" data-act="importFile">📂 从文件恢复</button>' +
        '</div>' +
        '<button class="btn btn-ghost mt8" style="min-height:40px;font-size:13px" data-act="import">📋 粘贴文字恢复</button>' +
        '<button class="btn btn-mac mt8" style="background:#FFE3E3;color:#A8435B;box-shadow:0 4px 0 #E8A9A9" data-act="resetAll">清空全部数据</button>' +
        '</div>' +
        '</div>';
    },

    /* ---------------- 近 7 天柱状图 ---------------- */
    pageChart: function () {
      var days = E.lastNDays(7);
      var max = Math.max.apply(null, days.map(function (d) { return d.sun; }).concat([4]));

      var bars = days.map(function (d) {
        var h = max ? Math.round(d.sun / max * 110) : 0;
        return '<div class="bar-col">' +
          '<div class="bar-val">' + (d.sun || '') + '</div>' +
          '<div class="bar' + (d.sun ? '' : ' zero') + '" style="height:' + Math.max(4, h) + 'px"></div>' +
          '<div class="bar-label">' + d.label + '</div>' +
          '</div>';
      }).join('');

      var rows = days.slice().reverse().map(function (d) {
        return '<div class="row"><div class="row-main"><div class="row-t">' + d.date + ' 周' + d.label + '</div>' +
          '<div class="row-s">固定任务 ' + d.done + '/' + d.total + ' · 水滴 +' + d.water + '</div></div>' +
          '<div style="font-weight:900;color:#B8791B">☀️ ' + d.sun + '</div></div>';
      }).join('');

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">📈 近 7 天阳光收入</div>' +
        '<div class="card mt8"><div class="bars">' + bars + '</div>' +
        '<div class="muted text-c mt8">柱子越高，那天拿到的阳光越多</div></div>' +
        '<div class="card mt12"><div class="sec-title">📅 每日明细</div>' + rows + '</div>' +
        '</div>';
    },

    /* ---------------- 阳光收支明细 ---------------- */
    pageLedger: function () {
      var s = S.state;
      var list = s.ledger.slice().reverse().slice(0, 120);
      if (!list.length) {
        return '<div style="padding:14px"><div class="card"><div class="empty"><span class="e-emoji">🧾</span>还没有收支记录</div></div></div>';
      }
      var groups = {};
      list.forEach(function (l) { (groups[l.date] = groups[l.date] || []).push(l); });

      var html = Object.keys(groups).sort().reverse().map(function (d) {
        var items = groups[d].map(function (l) {
          var right = '';
          if (l.type === 'sun') right = '<span style="font-weight:900;color:' + (l.delta >= 0 ? '#2F6B54' : '#A8435B') + '">' + (l.delta >= 0 ? '+' : '') + l.delta + ' ☀️</span>';
          else if (l.type === 'water') right = '<span style="font-weight:900;color:#2E7CA8">' + (l.delta >= 0 ? '+' : '') + l.delta + ' 💧</span>';
          else right = '<span class="pill-btn pill-gray" style="pointer-events:none">僵尸</span>';
          return '<div class="row"><div class="row-main"><div class="row-t">' + U.esc(l.reason) + '</div></div>' + right + '</div>';
        }).join('');
        return '<div class="card mt12"><div class="sec-title">' + d + ' 周' + S.WEEK_CN[S.dayIndex(d)] + '</div>' + items + '</div>';
      }).join('');

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">🧾 阳光 / 水滴收支</div>' +
        html + '</div>';
    },

    /* ---------------- 提交审核 ---------------- */
    pageReview: function () {
      var s = S.state;
      var pending = E.pendingList();
      var done = S.state.submissions.filter(function (x) { return x.status !== 'submitted'; })
        .sort(function (a, b) { return (b.reviewedAt || b.at) - (a.reviewedAt || a.at); }).slice(0, 20);

      var pHtml = pending.length ? pending.map(function (x) {
        return '<div class="card mt8" style="background:#FFFDF5;border:2px solid #FFD9A8">' +
          '<div class="row-t" style="font-size:15px">' + taskEmoji(x.taskId) + ' ' + U.esc(x.title) + '</div>' +
          '<div class="row-s" style="margin:4px 0 8px">' + x.date + ' · ' + (SUBJ[x.subject] || '其他') + ' · ' + (x.kind === 'fixed' ? '固定任务' : '拓展任务') + '</div>' +
          (x.note ? '<div style="background:#F7F1FA;border-radius:12px;padding:10px;font-size:13px;color:#7D6D8C;margin-bottom:10px">💬 ' + U.esc(x.note) + '</div>' : '') +
          '<div class="flex gap8">' +
          '<button class="btn btn-mint" data-act="approve" data-v="' + x.id + '">✅ 通过</button>' +
          '<button class="btn btn-mac" style="background:#FFD9DE;color:#A8435B;box-shadow:0 4px 0 #E89AA8" data-act="reject" data-v="' + x.id + '">↩️ 退回</button>' +
          '</div></div>';
      }).join('') : '<div class="card mt8"><div class="empty"><span class="e-emoji">🎉</span>暂时没有要审核的，全部处理完啦</div></div>';

      var dHtml = done.length ? done.map(function (x) {
        var ok = x.status === 'approved';
        return '<div class="row"><div style="font-size:20px">' + (ok ? '✅' : '↩️') + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(x.title) + '</div>' +
          '<div class="row-s">' + x.date + ' · ' + (ok ? '已通过' : '已退回') + (x.water ? ' · +' + x.water + '💧' : '') + '</div></div>' +
          (ok ? '' : '<button class="pill-btn pill-lav" data-act="approve" data-v="' + x.id + '">改判通过</button>') +
          '</div>';
      }).join('') : '<div class="muted text-c" style="padding:12px">还没有处理记录</div>';

      /* 孩子自己加的任务：等妈妈评判 */
      var myPend = (s.myTasks || []).filter(function (t) { return t.status === 'pending'; })
        .sort(function (a, b) { return b.at - a.at; });
      var myDone = (s.myTasks || []).filter(function (t) { return t.status !== 'pending'; })
        .sort(function (a, b) { return (b.reviewedAt || b.at) - (a.reviewedAt || a.at); }).slice(0, 12);
      var DEF_W = { chinese: 2, math: 2, english: 2, other: 1 };
      var myHtml = myPend.length ? myPend.map(function (t) {
        var dw = DEF_W[t.subject] || 1;
        return '<div class="card mt8" style="background:#F7F1FA;border:2px solid #DCCBE8">' +
          '<div class="row-t" style="font-size:15px">✍️ ' + U.esc(t.title) + '</div>' +
          '<div class="row-s" style="margin:4px 0 8px">' + t.date + ' · ' + (SUBJ[t.subject] || '其他') + ' · 孩子自己加的</div>' +
          '<div class="flex gap8">' +
          '<button class="btn btn-mint" data-act="myOk" data-v="' + t.id + '|' + dw + '">✅ 给 💧' + dw + '</button>' +
          '<button class="btn btn-mac" data-act="myOk" data-v="' + t.id + '|3">💧3 做得好</button>' +
          '<button class="btn btn-ghost" style="min-height:52px;font-size:14px" data-act="myOk" data-v="' + t.id + '|0">☀️1 只点赞</button>' +
          '<button class="pill-btn pill-no" style="min-height:52px" data-act="myNo" data-v="' + t.id + '">↩️</button>' +
          '</div></div>';
      }).join('') : '<div class="muted" style="padding:6px 0">孩子还没有自己加任务</div>';
      var myDoneHtml = myDone.length ? myDone.map(function (t) {
        return '<div class="row"><div style="font-size:20px">' + (t.status === 'ok' ? '🌟' : '💌') + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s">' + t.date + ' · ' + (t.status === 'ok' ? (t.water ? '给了 💧' + t.water : '给了 ☀️1') : '已退回') + '</div></div></div>';
      }).join('') : '';

      var myCard = '<div class="card mt12"><div class="sec-title">✍️ 孩子自加任务（' + myPend.length + ' 条待评判）</div>' +
        '<div class="muted" style="font-size:12px;margin-bottom:8px">他自己说多做了什么，你确认就发奖励。不给水滴的话会给 ☀️1 点赞。</div>' +
        myHtml + (myDoneHtml ? '<div class="mt8">' + myDoneHtml + '</div>' : '') + '</div>';

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">✅ 提交审核监管</div>' +
        '<div class="muted">待审核 ' + pending.length + ' 条</div>' +
        myCard +
        '<div class="sec-title" style="font-size:16px;margin-top:14px">📨 任务提交</div>' +
        '<div class="mt12">' + pHtml + '</div>' +
        '<div class="card mt12"><div class="sec-title">🕓 最近处理</div>' + dHtml + '</div>' +
        '</div>';
    },

    /* ---------------- 任务发布 ---------------- */
    pagePublish: function () {
      var s = S.state;
      var date = S.dateStr();
      var ws = S.weekStartOf(date), we = S.weekEndOf(date);

      var fixed = s.tasks.filter(function (t) { return t.kind === 'fixed'; });
      var extra = s.tasks.filter(function (t) { return t.kind === 'extra'; });
      var weekly = S.weeklyTasksOf(null, ws);
      var school = S.schoolTasksOf(date);

      function line(t) {
        var kindLabel = t.kind === 'weekly' ? '本周 · ' + (SUBJ[t.subject] || '其他')
          : t.kind === 'school' ? '今日校内 · ' + (SUBJ[t.subject] || '其他')
            : t.kind === 'extra' ? (SUBJ[t.subject] || '其他') + ' · 拓展'
              : (t.slot === 'weekend' ? '周末固定' : '平日固定');
        return '<div class="row"><div style="font-size:20px">' + t.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(t.title) + '</div>' +
          '<div class="row-s">' + kindLabel + '</div></div>' +
          '<button class="pill-btn pill-no" data-act="delTask" data-v="' + t.id + '">删除</button></div>';
      }

      /* 老师作业快捷模板（基本都是录视频打卡，只有语文和英语） */
      var HW_TPL = {
        chinese: ['📖 朗读课文，录视频打卡', '🎤 背诵古诗，录视频打卡', '📚 课外阅读 20 分钟', '✍️ 生字书写打卡'],
        english: ['🔤 跟读课文，录视频打卡', '🎧 听录音并复述，录视频打卡', '🗣️ 唱英文歌，录视频打卡', '🔠 单词认读，录视频打卡']
      };
      function hwChips(sub) {
        return HW_TPL[sub].map(function (t) {
          return '<button class="pill-btn" style="min-height:44px;font-size:13px;padding:8px 12px" ' +
            'data-act="hwQuick" data-v="' + sub + '|' + U.esc(t) + '">+ ' + U.esc(t.replace('，录视频打卡', '')) + '</button>';
        }).join('');
      }
      var yestDay = (function () {
        var d = new Date(); d.setDate(d.getDate() - 1); return S.dateStr(d);
      })();
      var yest = S.state.tasks.filter(function (t) { return t.kind === 'school' && t.date === yestDay; });
      var yestBtn = yest.length
        ? '<button class="pill-btn" style="min-height:44px" data-act="hwCopy">📋 复制昨天的 ' + yest.length + ' 条作业</button>'
        : '';

      var hwCard = '<div class="card mt12" style="background:#FFF8E4;border:2px solid #EFDDB8">' +
        '<div class="sec-title">📹 老师今日作业（' + date + '）</div>' +
        '<div class="muted" style="font-size:12px">老师一发过来就点一下加进去，孩子首页立刻能看到。' +
        '完成<b>不给水滴</b>，给 ☀️1 阳光 + 🌸1 朵小红花。</div>' +
        '<div style="font-size:12px;font-weight:900;margin-top:10px;color:#B26B00">语文</div>' +
        '<div class="flex gap8 mt8" style="flex-wrap:wrap">' + hwChips('chinese') + '</div>' +
        '<div style="font-size:12px;font-weight:900;margin-top:10px;color:#2E7CA8">英语</div>' +
        '<div class="flex gap8 mt8" style="flex-wrap:wrap">' + hwChips('english') + '</div>' +
        '<div class="mt8">' + yestBtn + '</div>' +
        '<div class="mt8">' +
        (school.length ? school.map(function (t) {
          return '<div class="row"><div style="font-size:20px">' + t.emoji + '</div>' +
            '<div class="row-main"><div class="row-t">' + U.esc(t.title) +
            (t.needVideo ? ' <span class="task-tag">📹 录视频</span>' : '') + '</div>' +
            '<div class="row-s">今日校内 · ' + (SUBJ[t.subject] || '其他') + '</div></div>' +
            '<button class="pill-btn pill-no" data-act="delTask" data-v="' + t.id + '">删除</button></div>';
        }).join('') : '<div class="muted" style="padding:6px 0">今天还没有布置</div>') +
        '</div></div>';

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">📝 任务发布</div>' +
        '<div class="muted">周日晚上布置下周的长线任务，孩子自己安排哪天做，越早完成水滴越多</div>' +

        hwCard +

        /* 本周长线任务 */
        '<div class="card mt12">' +
        '<div class="sec-title">📅 本周长线任务（' + ws.slice(5) + ' ~ ' + we.slice(5) + '）</div>' +
        (weekly.length ? weekly.map(line).join('') : '<div class="muted" style="padding:6px 0">本周还没有长线任务</div>') +
        '</div>' +

        /* 新增表单 */
        '<div class="card mt12">' +
        '<div class="sec-title">➕ 新增任务</div>' +
        '<label class="field-label">任务名字</label>' +
        '<input class="field" id="nt-title" placeholder="例如：土豆老师作业 P12-13">' +
        '<div class="flex mt8" style="gap:8px;align-items:center">' +
        '<label class="field-label" style="margin:0;flex:1">图标</label>' +
        '<input class="field" id="nt-emoji" value="✏️" maxlength="4" style="max-width:80px;text-align:center">' +
        '</div>' +
        '<label class="field-label">任务类型</label>' +
        '<div class="seg" id="nt-kind">' +
        '<button class="on" data-kind="school">今日校内</button>' +
        '<button data-kind="weekly">本周任务</button>' +
        '<button data-kind="weekday">平日固定</button>' +
        '</div>' +
        '<div class="seg mt8" id="nt-kind2">' +
        '<button data-kind="weekend">周末固定</button>' +
        '<button data-kind="extra">拓展任务</button>' +
        '</div>' +
        '<label class="field-label">科目</label>' +
        '<div class="seg" id="nt-subj">' +
        '<button class="on" data-subj="math">数学</button>' +
        '<button data-subj="english">英语</button>' +
        '<button data-subj="chinese">语文</button>' +
        '<button data-subj="other">其他</button>' +
        '</div>' +
        '<label class="field-label">打卡方式（只对「今日校内」生效）</label>' +
        '<div class="seg" id="nt-video">' +
        '<button class="on" data-video="1">📹 录视频打卡</button>' +
        '<button data-video="0">不用录视频</button>' +
        '</div>' +
        '<button class="btn btn-lav mt12" data-act="addTask">添加这个任务</button>' +
        '<div class="muted mt8">提示：「本周任务」周五没完成会被扣 5 阳光并让僵尸前进一步</div>' +
        '</div>' +

        '<div class="card mt12"><div class="sec-title">📌 每日固定任务（平日 ' + fixed.filter(function (t) { return t.slot === 'weekday'; }).length + ' 项 / 周末 ' + fixed.filter(function (t) { return t.slot === 'weekend'; }).length + ' 项）</div>' +
        fixed.map(line).join('') + '</div>' +

        '<div class="card mt12"><div class="sec-title">💧 拓展任务</div>' +
        extra.map(line).join('') + '</div>' +
        '</div>';
    },

    /* ---------------- 奖励商店改价 ---------------- */
    pageShop: function () {
      var s = S.state;
      var html = s.shop.map(function (it) {
        return '<div class="card mt8">' +
          '<div class="row"><div style="font-size:28px">' + it.emoji + '</div>' +
          '<div class="row-main"><div class="row-t">' + U.esc(it.name) + '</div>' +
          '<div class="row-s">' + U.esc(it.desc || '') + '</div></div></div>' +
          '<div class="flex gap8" style="align-items:center">' +
          '<input class="field" style="flex:1" type="number" min="1" value="' + it.price + '" data-price="' + it.id + '">' +
          '<button class="pill-btn pill-ok" data-act="setPrice" data-v="' + it.id + '">改价</button>' +
          '<button class="pill-btn pill-no" data-act="delShop" data-v="' + it.id + '">删</button>' +
          '</div></div>';
      }).join('');

      return '<div style="padding:14px 14px 0">' +
        '<div class="sec-title" style="font-size:17px">🏪 奖励商店（我来定价）</div>' +
        '<div class="muted">价格改了，孩子那边立刻生效</div>' +
        '<div class="mt12">' + html + '</div>' +
        '<div class="card mt12"><div class="sec-title">➕ 新增奖励（自定义）</div>' +
        '<div class="muted" style="font-size:12px">想加什么奖励都行：一次出游、一个大抱抱、一本新书……孩子攒够阳光就能来换。</div>' +
        '<input class="field mt8" id="ns-name" placeholder="奖励名字，例如：去游泳一次">' +
        '<div class="flex gap8 mt8">' +
        '<input class="field" id="ns-emoji" value="🎈" maxlength="4" style="max-width:76px;text-align:center">' +
        '<input class="field" id="ns-price" type="number" min="1" value="30" style="flex:1">' +
        '</div>' +
        '<input class="field mt8" id="ns-desc" placeholder="说明（可不填），例如：周末去，爸爸妈妈一起">' +
        '<button class="btn btn-lav mt8" data-act="addShop">添加奖励</button>' +
        '</div>' +
        '<div class="card mt12"><div class="sec-title">🎁 兑换记录</div>' +
        (s.redeems.length ? s.redeems.slice().reverse().slice(0, 20).map(function (r) {
          return '<div class="row"><div style="font-size:20px">' + r.emoji + '</div>' +
            '<div class="row-main"><div class="row-t">' + U.esc(r.name) + '</div>' +
            '<div class="row-s">' + r.date + ' · ☀️ ' + r.price + '</div></div></div>';
        }).join('') : '<div class="muted text-c" style="padding:12px">还没有兑换记录</div>') +
        '</div></div>';
    },

    render: function () {
      var html = '';
      if (Parent.page === 'dash') html = Parent.pageDash();
      else if (Parent.page === 'chart') html = Parent.pageChart();
      else if (Parent.page === 'ledger') html = Parent.pageLedger();
      else if (Parent.page === 'review') html = Parent.pageReview();
      else if (Parent.page === 'publish') html = Parent.pagePublish();
      else html = Parent.pageShop();

      return '<div class="app-shell">' +
        '<div style="height:8px"></div>' + html +
        '<div style="height:20px"></div></div>' +
        '<div class="tabbar"><div class="tabbar-inner">' + Parent.tabs() + '</div></div>';
    },

    /* ---------------- 交互 ---------------- */
    act: function (name, v, el) {
      var s = S.state;

      if (name === 'ptab') { Parent.page = v; return true; }

      /* 精简模式 */
      if (name === 'leanToggle') {
        var L4 = global.Kid.lean();
        L4.on = L4.on ? 0 : 1;
        S.save();
        U.toast(L4.on ? '精简模式已开启' : '已恢复全部板块');
        return true;
      }

      /* 全局使用时长 */
      if (name === 'appToggle') {
        var ac0 = S.appConf();
        ac0.enable = ac0.enable ? 0 : 1;
        S.save();
        U.toast(ac0.enable ? '时长限制已开启' : '时长限制已关闭（不限时）');
        return true;
      }
      if (name === 'appSet') {
        var ac1 = S.appConf();
        ac1.baseMin = parseInt(v, 10) || 30;
        S.save();
        U.toast('每天改成 ' + ac1.baseMin + ' 分钟');
        return true;
      }
      if (name === 'appBonus') {
        var ac2 = S.appConf();
        var d2 = S.dateStr();
        if (!ac2.bonus) ac2.bonus = {};
        ac2.bonus[d2] = (ac2.bonus[d2] || 0) + 10;
        S.save();
        U.toast('今天加了 10 分钟');
        return true;
      }

      /* ---------- 妈妈的悄悄话 ---------- */
      if (name === 'noteTpl') {
        /* 点模板 → 填进输入框，让她可以改完再发 */
        try {
          var el = document.getElementById('note-text');
          if (el) el.value = v;
        } catch (e) { }
        U.toast('填进去啦，改改再发也行');
        return false;
      }
      if (name === 'noteSend') {
        var el2 = document.getElementById('note-text');
        var txt = el2 ? String(el2.value || '').trim() : '';
        if (!txt) { U.toast('先写一句话，或者点下面现成的模板'); return false; }
        var when = v;
        var d = S.dateStr();
        var isNow = (when === 'now');
        if (when === 'tomorrow') d = S.addDays(S.dateStr(), 1);
        var nn = E.noteAdd(txt, d, isNow);
        if (!nn) return false;
        try { if (el2) el2.value = ''; } catch (e) { }
        if (isNow) U.toast('发啦，他那边马上就能看到');
        else if (when === 'tomorrow') U.toast('存好啦，明天他一开门就能拆');
        else U.toast('存好啦，今天他就能拆');
        return true;
      }
      if (name === 'noteDel') {
        E.noteDel(v);
        U.toast('删掉啦');
        return true;
      }

      if (name === 'toggleAuto') {
        s.autoApprove = !s.autoApprove; S.save();
        U.toast(s.autoApprove ? '已开启：提交自动通过' : '已关闭：需要我手动审核');
        return true;
      }

      if (name === 'changePin') {
        U.modal({
          emoji: '🔐', title: '修改进入密码', text: '输入新的密码（4～8 位都行）',
          body: '<input class="field" id="np" value="' + U.esc(s.pin) + '" style="text-align:center;letter-spacing:4px">',
          buttons: [{ text: '保存', cls: 'btn-mac', onClick: function (c) {
            var v = (document.getElementById('np').value || '').trim();
            if (!v) { U.toast('密码不能为空'); return; }
            s.pin = v; S.save(); c(); U.toast('密码已更新');
          } }, { text: '取消', cls: 'btn-ghost' }]
        });
        return false;
      }

      if (name === 'approve') {
        var sub = E.approve(v);
        if (!sub) return true;
        U.toast('已通过：' + sub.title + (sub.water ? ' +' + sub.water + '💧' : ''));
        global.App.afterChange();
        return true;
      }

      if (name === 'reject') {
        E.reject(v);
        U.toast('已退回，孩子可以重新提交');
        return true;
      }

      if (name === 'toggleAI') {
        if (!s.ai) s.ai = { enabled: false, apiKey: '', model: '', baseUrl: '' };
        if (!s.ai.enabled && !s.ai.apiKey) {
          U.modal({
            emoji: '🤖', title: '先填 API 密钥',
            text: '开启 AI 打分需要一个大模型接口的密钥（比如 DeepSeek / 通义 / OpenAI）。\n不填也可以用，系统会用内置的本地评分。',
            body: '<input class="field mt8" id="ai-base" placeholder="接口地址，可留空用 DeepSeek" value="' + U.esc(s.ai.baseUrl || '') + '">' +
              '<input class="field mt8" id="ai-key" placeholder="API Key（sk-...）">' +
              '<input class="field mt8" id="ai-model" placeholder="模型名，可留空" value="' + U.esc(s.ai.model || '') + '">',
            buttons: [{ text: '保存并开启', cls: 'btn-mac', onClick: function (c) {
              s.ai.baseUrl = (document.getElementById('ai-base').value || '').trim() || 'https://api.deepseek.com/v1';
              s.ai.apiKey = (document.getElementById('ai-key').value || '').trim();
              s.ai.model = (document.getElementById('ai-model').value || '').trim() || 'deepseek-chat';
              s.ai.enabled = !!s.ai.apiKey;
              S.save(); c();
              U.toast(s.ai.enabled ? 'AI 老师已开启' : '没填密钥，继续用本地评分');
            } }, { text: '暂时不用', cls: 'btn-ghost' }]
          });
          return false;
        }
        s.ai.enabled = !s.ai.enabled;
        S.save();
        U.toast(s.ai.enabled ? 'AI 老师已开启' : '已切回本地评分');
        return true;
      }

      if (name === 'aiConfig') {
        if (!s.ai) s.ai = { enabled: false, apiKey: '', model: '', baseUrl: '' };
        U.modal({
          emoji: '🤖', title: 'AI 老师参数', text: '支持 DeepSeek / 通义 / OpenAI 等兼容接口',
          body: '<input class="field mt8" id="ai-base" placeholder="接口地址" value="' + U.esc(s.ai.baseUrl || '') + '">' +
            '<input class="field mt8" id="ai-key" placeholder="API Key" value="' + U.esc(s.ai.apiKey || '') + '">' +
            '<input class="field mt8" id="ai-model" placeholder="模型名" value="' + U.esc(s.ai.model || '') + '">',
          buttons: [
            { text: '保存', cls: 'btn-mac', onClick: function (c) {
              s.ai.baseUrl = (document.getElementById('ai-base').value || '').trim();
              s.ai.apiKey = (document.getElementById('ai-key').value || '').trim();
              s.ai.model = (document.getElementById('ai-model').value || '').trim();
              if (!s.ai.apiKey) s.ai.enabled = false;
              S.save(); c(); U.toast('已保存');
            } },
            { text: '关闭AI', cls: 'btn-ghost', onClick: function (c) { s.ai.enabled = false; S.save(); c(); U.toast('已切回本地评分'); } }
          ]
        });
        return false;
      }

      /* 老师作业：快捷模板，一键加到今天 */
      if (name === 'hwQuick') {
        var hp = String(v || '').split('|');
        if (!hp[1]) { U.toast('模板没写全'); return false; }
        var need = hp[1].indexOf('录视频') >= 0;
        s.tasks.push({
          id: S.uid(), title: hp[1], emoji: need ? '📹' : '🏫',
          subject: hp[0], kind: 'school', date: S.dateStr(), needVideo: need ? 1 : 0
        });
        S.save(); U.toast('已加进今天：' + hp[1]);
        return true;
      }
      /* 老师作业：复制昨天的 */
      if (name === 'hwCopy') {
        var yd = (function () { var d = new Date(); d.setDate(d.getDate() - 1); return S.dateStr(d); })();
        var src = s.tasks.filter(function (t) { return t.kind === 'school' && t.date === yd; });
        if (!src.length) { U.toast('昨天没有布置'); return false; }
        var td = S.dateStr();
        src.forEach(function (t) {
          var has = s.tasks.filter(function (x) {
            return x.kind === 'school' && x.date === td && x.title === t.title;
          }).length;
          if (has) return;
          s.tasks.push({
            id: S.uid(), title: t.title, emoji: t.emoji || '🏫',
            subject: t.subject, kind: 'school', date: td, needVideo: t.needVideo ? 1 : 0
          });
        });
        S.save(); U.toast('已复制 ' + src.length + ' 条到今天');
        return true;
      }

      /* 孩子自加任务：妈妈评判 */
      if (name === 'myOk') {
        var sp2 = String(v || '').split('|');
        var wt = parseInt(sp2[1], 10) || 0;
        var rt = E.myTaskApprove(sp2[0], wt);
        if (!rt) { U.toast('找不到这条'); return false; }
        U.toast(rt.water ? '已通过，给了 💧' + rt.water : '已通过，给了 ☀️1 点赞');
        return true;
      }
      if (name === 'myNo') {
        var rt2 = E.myTaskReject(v, '妈妈看到了，下次一起做');
        if (rt2) U.toast('已退回');
        return true;
      }

      /* 数学闯关时间管控 */
      if (name === 'mcToggle') {
        var cf = S.mathConf();
        cf.enable = cf.enable ? 0 : 1; S.save();
        U.toast(cf.enable ? '已开启每日限时' : '已关闭限时（孩子可以一直玩）');
        return true;
      }
      if (name === 'mcBase') {
        var cb = S.mathConf();
        var nb = parseInt((document.getElementById('mc-base') || {}).value, 10);
        if (!nb || nb < 1 || nb > 120) { U.toast('填 1~120 之间的分钟数'); return false; }
        cb.baseMin = nb; S.save(); U.toast('每日免费时长改成 ' + nb + ' 分钟');
        return true;
      }
      if (name === 'mcMax') {
        var cm = S.mathConf();
        var nm = parseInt((document.getElementById('mc-max') || {}).value, 10);
        if (!nm || nm < 0 || nm > 120) { U.toast('填 0~120 之间的分钟数'); return false; }
        cm.maxMin = nm; S.save(); U.toast('每日兑换上限改成 ' + nm + ' 分钟');
        return true;
      }
      if (name === 'mcCur') {
        var cc = S.mathConf();
        cc.currency = cc.currency === 'sun' ? 'water' : 'sun'; S.save();
        U.toast('兑换用' + (cc.currency === 'sun' ? '☀️ 阳光' : '💧 水滴'));
        return true;
      }
      if (name === 'mcBonus') {
        var cbo = S.mathConf();
        var nb2 = parseInt((document.getElementById('mc-bonus') || {}).value, 10);
        if (!nb2 || nb2 < 1 || nb2 > 60) { U.toast('填 1~60 之间的分钟数'); return false; }
        var dd = S.dateStr();
        cbo.bonus[dd] = (cbo.bonus[dd] || 0) + nb2; S.save();
        U.toast('今天额外给了 ' + nb2 + ' 分钟');
        return true;
      }
      if (name === 'mcClear') {
        U.confirm('把今天的计时清零？',
          '会把 Micky 今天已经玩掉的闯关时间清成 0，等于又给了他一整段免费时间。\n（用掉的兑换次数也一起退回。）',
          function () {
            var ccl = S.mathConf();
            ccl.bonus[S.dateStr()] = 0;
            S.state.mathUse[S.dateStr()] = 0;
            ccl.redeemDay = null; ccl.redeemMin = 0;
            S.save(); U.toast('今天的计时和兑换已清零'); global.App.render();
          }, '清零');
        return false;
      }

      if (name === 'addTask') {
        var t = document.getElementById('nt-title').value.trim();
        var em = document.getElementById('nt-emoji').value.trim() || '✏️';
        var kindBtn = document.querySelector('[data-kind].on');
        var kind = kindBtn ? kindBtn.getAttribute('data-kind') : 'school';
        var subjBtn = document.querySelector('[data-subj].on');
        var subj = subjBtn ? subjBtn.getAttribute('data-subj') : 'other';
        if (!t) { U.toast('先写个任务名字'); return false; }

        var task = { id: S.uid(), title: t, emoji: em, subject: subj };
        if (kind === 'weekly') {
          task.kind = 'weekly';
          task.weekStart = S.weekStartOf(S.dateStr());
          task.due = S.weekEndOf(S.dateStr());
        } else if (kind === 'school') {
          task.kind = 'school';
          task.date = S.dateStr();
          var vBtn = document.querySelector('[data-video].on');
          task.needVideo = vBtn ? vBtn.getAttribute('data-video') === '1' : true;
        } else if (kind === 'extra') {
          task.kind = 'extra';
        } else {
          task.kind = 'fixed';
          task.slot = kind;                 // weekday / weekend
          task.order = 99;
        }
        s.tasks.push(task); S.save();
        U.toast('已添加：' + t);
        return true;
      }

      if (name === 'delTask') {
        var dt = s.tasks.filter(function (x) { return x.id === v; })[0];
        if (!dt) return false;
        U.confirm('删掉这个任务？',
          '「' + U.esc(dt.title) + '」删掉就找不回来了，孩子之前在这上面的记录也会一起看不到。',
          function () {
            s.tasks = s.tasks.filter(function (x) { return x.id !== v; });
            S.save(); U.toast('已删除'); global.App.render();
          }, '删掉');
        return false;
      }

      if (name === 'setPrice') {
        var input = document.querySelector('[data-price="' + v + '"]');
        var p = parseInt(input && input.value, 10);
        if (!p || p < 1) { U.toast('价格要大于 0'); return false; }
        var item = s.shop.filter(function (x) { return x.id === v; })[0];
        if (item) { item.price = p; S.save(); U.toast('已改价：' + item.name + ' ☀️' + p); }
        return true;
      }

      if (name === 'addShop') {
        var n = document.getElementById('ns-name').value.trim();
        var e2 = document.getElementById('ns-emoji').value.trim() || '🎈';
        var pr = parseInt(document.getElementById('ns-price').value, 10) || 30;
        if (!n) { U.toast('先写个奖励名字'); return false; }
        var dsc = (document.getElementById('ns-desc') || {}).value || '';
        s.shop.push({ id: S.uid(), name: n, emoji: e2, price: pr, desc: dsc.trim() });
        S.save(); U.toast('已添加奖励');
        return true;
      }

      if (name === 'delShop') {
        var ds = s.shop.filter(function (x) { return x.id !== v; })[0];
        if (!ds) return false;
        U.confirm('删掉这个奖励？',
          '「' + U.esc(ds.name || ds.title || '') + '」删掉就找不回来了。如果只是暂时不想给，可以先把价格调高。',
          function () {
            s.shop = s.shop.filter(function (x) { return x.id !== v; });
            S.save(); U.toast('已删除'); global.App.render();
          }, '删掉');
        return false;
      }

      if (name === 'export') {
        U.modal({
          emoji: '📦', title: '数据备份', text: '建议点「存成文件」，会下载一个备份文件到这台电脑（在「下载」文件夹里），以后用它恢复。',
          body: '<textarea class="field" id="exp-txt" style="height:110px;font-size:11px">' + U.esc(S.exportJSON()) + '</textarea>',
          buttons: [
            { text: '💾 存成文件', cls: 'btn-mac', onClick: function (c) {
              try {
                var d = new Date();
                var stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) +
                  '-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2);
                var blob = new Blob([S.exportJSON()], { type: 'application/json' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'Micky学习工作台-备份-' + stamp + '.json';
                document.body.appendChild(a); a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
                U.toast('已保存备份文件');
              } catch (e) { U.toast('保存失败，请用下面的复制'); }
            } },
            { text: '复制文字', cls: 'btn-lav', onClick: function (c) {
              var ta = document.getElementById('exp-txt'); ta.select();
              try { document.execCommand('copy'); U.toast('已复制'); } catch (e) { U.toast('请长按手动复制'); }
            } },
            { text: '关闭', cls: 'btn-ghost' }
          ]
        });
        return false;
      }

      if (name === 'importFile') {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = function () {
          var f = inp.files && inp.files[0]; if (!f) return;
          var rd = new FileReader();
          rd.onload = function () {
            try { S.importJSON(String(rd.result)); U.toast('导入成功'); global.App.render(); }
            catch (e) { U.toast('这个文件读不懂，检查一下'); }
          };
          rd.readAsText(f, 'utf-8');
        };
        inp.click();
        return false;
      }

      if (name === 'import') {
        U.modal({
          emoji: '📥', title: '导入备份', text: '把之前复制的那段文字粘贴进来，会覆盖现在的数据。',
          body: '<textarea class="field" id="imp-txt" style="height:150px;font-size:11px" placeholder="粘贴在这里"></textarea>',
          buttons: [{ text: '导入并覆盖', cls: 'btn-mac', onClick: function (c) {
            var txt = document.getElementById('imp-txt').value;
            try { S.importJSON(txt); c(); U.toast('导入成功'); global.App.render(); }
            catch (e) { U.toast('这段内容读不懂，检查一下'); }
          } }, { text: '取消', cls: 'btn-ghost' }]
        });
        return false;
      }

      if (name === 'resetAll') {
        U.confirm('确定清空全部数据？', '阳光、水滴、花园、记录都会回到初始状态，无法恢复。建议先导出备份。', function () {
          S.reset(); U.toast('已重置'); global.App.render();
        }, '确定清空');
        return false;
      }

      return false;
    }
  };

  global.Parent = Parent;
})(window);
