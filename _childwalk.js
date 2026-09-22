/* 孩子端逐选项遍历测试：渲染每个视图 + 驱动每个 act 动作（含正确答案通关） */
const fs = require('fs');
const path = require('path');
global.window = global;
global.App = { mode: 'kid', render() {}, afterChange() {} };

/* ---- 假 DOM：支持按 name 取已选 radio + 按 id 取 input ---- */
const checkedMap = {};
const inputs = {};
function makeEl() { return { value: '', style: {}, innerHTML: '', textContent: '', appendChild() {}, remove() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, getAttribute() { return null; } }; }
global.document = {
  getElementById(id) { if (!inputs[id]) inputs[id] = makeEl(); return inputs[id]; },
  querySelector(sel) {
    const m = sel.match(/input\[name="([^"]+)"\]:checked/);
    if (m) { const v = checkedMap[m[1]]; return v === undefined ? null : { value: v }; }
    return null;
  },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); }
};
global.localStorage = (function () { const mem = {}; return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; })();
global.speechSynthesis = { cancel() {}, speak() {} };
global.SpeechSynthesisUtterance = function () {};
global.navigator = { mediaDevices: null };
global.MediaRecorder = undefined;
global.setTimeout = function () { return 0; };
global.URL = { createObjectURL() { return ''; } };
global.Blob = function () {};

const dir = path.join(__dirname, 'js');
const dataDir = path.join(__dirname, 'data');
function ev(p) { eval(fs.readFileSync(p, 'utf8')); }
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'kid', 'parent'].forEach(f => ev(path.join(dir, f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'lwte2a', 'lwte2a_review'].forEach(f => ev(path.join(dataDir, f + '.js')));

/* ---- 捕获 UI 弹窗 / 确认 / toast ---- */
const UI = global.UI;
let lastModal = null, lastConfirm = null, toasts = [];
UI.toast = m => { toasts.push(String(m)); };
UI.modal = o => { lastModal = o; };
UI.confirm = (t, x, onYes) => { lastConfirm = { title: t, onYes }; };
UI.story = (k) => { toasts.push('STORY:' + k); };
function clickModal(i) { const b = lastModal && lastModal.buttons[i]; lastModal = null; if (b && b.onClick) b.onClick(() => {}); }
function confirmYes() { const f = lastConfirm && lastConfirm.onYes; lastConfirm = null; if (f) f(); }
function setRadio(name, val) { checkedMap[name] = String(val); }
function clearRadios() { for (const k in checkedMap) delete checkedMap[k]; }

const S = global.Store, E = global.Engine, Kid = global.Kid, MG = global.MathGame;
S.load();
S.state.autoApprove = true;
const today = S.dateStr();

const errors = [], warns = [], notes = [];
const stats = { renders: 0, acts: 0, mathLevels: 0, cnLessons: 0, reciteGames: 0 };
function T(name, fn) { try { fn(); } catch (e) { errors.push(name + ' :: ' + e.message + '\n   ' + (e.stack || '').split('\n').slice(1, 3).join('\n   ')); } }
function scan(name, html) {
  if (typeof html !== 'string') return;
  stats.renders++;
  if (/undefined/.test(html)) warns.push(name + ' :: 含字串 "undefined"');
  if (/\[object Object\]/.test(html)) warns.push(name + ' :: 含 [object Object]');
  if (/NaN/.test(html)) warns.push(name + ' :: 含 NaN');
  if (html.indexOf('ERR:') === 0) errors.push(name + ' :: 渲染返回 ERR');
}

/* =========================================================
   1) 渲染每个页面 / 每个子状态
   ========================================================= */
['home', 'chinese', 'math', 'english', 'other', 'reward'].forEach(p => {
  T('render:' + p, () => { Kid.page = p; scan('page:' + p, Kid.render()); });
});

/* 语文学习园：五个 tab + 选课 + 单元/课文 + 语文园地(-1) + 未选(-2) */
T('render:cn-tabs', () => {
  ['chars', 'preview', 'recite', 'read', 'dict', ''].forEach(t => {
    Kid.cnTab = t; Kid.cnLesson = -2; Kid.cnResult = null; Kid.pvLesson = -2;
    scan('cnTab:' + (t || '(home)'), Kid.render());
  });
});
T('render:cn-chars-lessons', () => {
  const C = Kid.cnData();
  C.units.forEach((u, ui) => {
    u.lessons.forEach((l, li) => {
      Kid.cnTab = 'chars'; Kid.cnUnit = ui; Kid.cnLesson = li; Kid.cnResult = null;
      scan('cnChars:' + u.no + l.no, Kid.cnChars());
    });
    Kid.cnTab = 'chars'; Kid.cnUnit = ui; Kid.cnLesson = -1; scan('cnChars:garden', Kid.cnChars());
  });
});

/* 背诵：每篇 × 每种玩法 渲染 */
T('render:recite-games', () => {
  const list = Kid.reciteList();
  notes.push('背诵清单共 ' + list.length + ' 篇');
  list.slice(0, 6).forEach(it => {
    ['', 'fill', 'chain', 'sort', 'cover', 'rec'].forEach(g => {
      Kid.cnTab = 'recite'; Kid.rcId = it.id; Kid.rcGame = g; Kid.rcStep = 0; Kid.rcPick = []; Kid.rcLv = 0; Kid.rcResult = null;
      scan('recite:' + it.id + '/' + (g || 'home'), Kid.render());
      if (g) stats.reciteGames++;
    });
    Kid.rcId = ''; Kid.rcGame = '';
  });
});

/* 预习：目录 + 某课四关（两册各一） */
function findGoodLesson() {
  const C = Kid.cnData();
  for (let u = 0; u < C.units.length; u++) {
    for (let l = 0; l < C.units[u].lessons.length; l++) {
      const d = Kid.pvData(u, l);
      if (d && (d.texts || []).length && (d.quiz || []).length && (d.cards || []).length) return { u, l, d };
    }
  }
  return null;
}
T('render:preview-stages', () => {
  ['2a', '2b'].forEach(book => {
    Kid.cnBook = book; Kid.pvLesson = -2; Kid.pvStage = '';
    scan('pvCatalog:' + book, Kid.pvCatalog());
    const g = findGoodLesson();
    if (!g) { warns.push('preview:' + book + ' :: 找不到含原文+课后题+卡片的课'); return; }
    Kid.pvUnit = g.u; Kid.pvLesson = g.l;
    ['', 'read', 'ask', 'boss', 'sum'].forEach(st => {
      Kid.pvStage = st;
      if (st === 'sum') { Kid.sumMode = 'sort'; Kid.sumPick = []; Kid.sumCheck = 0; scan('pvSum:sort:' + book, Kid.pvSum()); Kid.sumMode = 'gist'; Kid.sumGist = -1; scan('pvSum:gist:' + book, Kid.pvSum()); }
      else scan('pv:' + st + ':' + book, Kid.render());
    });
    Kid.pvLesson = -2; Kid.pvStage = '';
  });
});

/* 英语：复习题 + 朗文阅读/听力面板 */
T('render:english', () => {
  scan('enReview', Kid.enReview());
  scan('lwte:reading', Kid.lwtePanel('reading', today));
  scan('lwte:listening', Kid.lwtePanel('listening', today));
});
T('render:subjects', () => {
  ['chinese', 'math', 'english', 'other'].forEach(s => scan('subject:' + s, Kid.pageSubject(s)));
});

/* 数学：首页 + 每族关卡列表 + 每关 play 页 */
T('render:math-all', () => {
  scan('mathPanel', Kid.mathPanel());
  MG.view = ''; scan('mathHome', MG.panel());
  ['seq', 'p24', 'sudoku', 'brain'].forEach(g => {
    MG.view = g; MG.game = g; MG.lv = 0; MG.sdSize = 4;
    scan('levelList:' + g, MG.panel());
  });
});

/* =========================================================
   2) 驱动每个 act 动作（孩子端）
   ========================================================= */
const FAKE_EL = { getAttribute() { return ''; }, classList: { add() {}, remove() {} }, closest() { return null; } };
function doAct(name, v) { stats.acts++; Kid.act(name, v, FAKE_EL); }
T('act:tab', () => { doAct('tab', 'chinese'); doAct('tab', 'math'); doAct('tab', 'reward'); doAct('tab', 'home'); });

/* 固定任务：计时→打卡 / 提前完成 */
T('act:timers', () => {
  const fixed = S.fixedTasksOf(today);
  fixed.forEach(t => { doAct('timerStart', t.id + ':' + t.limit); });
  fixed.forEach(t => { doAct('timerEnd', t.id); });
  const calc = fixed.filter(t => t.early)[0];
  if (calc) {
    Kid.timerStart(calc.id, calc.limit);
    Kid.timerOf(calc.id).end = Date.now() + 3 * 60000;
    doAct('calcDone', calc.id);
    confirmYes();
  }
});

/* 自定义任务 */
T('act:myTasks', () => {
  ['chinese', 'math', 'english', 'other'].forEach(s => {
    doAct('myAdd', s + '|多读了一篇课文');
    inputs['myTask-' + s] = { value: '我自己加的测试任务', style: {} };
    doAct('myAddInput', s);
  });
});

/* 奖励中心：兑换时间 + 兑换商品 */
T('act:reward', () => {
  E.MATH_TIME_PLANS.forEach(p => doAct('kidRedeemTime', p.min));
  // 换一次后当天不能换，再点应被拦截
  const sBefore = S.state.water;
  doAct('kidRedeemTime', 10);
  S.state.sun = 999;
  S.state.shop.forEach(it => { doAct('redeem', it.id); confirmYes(); });
});

/* 朗读 / TTS 按钮 */
T('act:cnRead-cnSay', () => {
  doAct('cnRead', '床前明月光');
  doAct('cnSay', '苹果,香蕉,橙子');
  doAct('cnShowAns');
  doAct('cnNextGroup');
});

/* 朗文复习题：全对交卷 → 换一组 */
T('act:enReview', () => {
  let pool = Kid.enReviewPool();
  pool.forEach((q, i) => { Kid.enrAns[i] = (q.type === 'multi' ? q.ans.slice() : [q.ans]); });
  doAct('enrSubmit');
  doAct('enrNext');
  // 换一组后答案清空，再交一次（练习模式不发奖）
  pool = Kid.enReviewPool();
  pool.forEach((q, i) => { Kid.enrAns[i] = (q.type === 'multi' ? q.ans.slice() : [q.ans]); });
  doAct('enrSubmit');
});

/* 朗文阅读/听力：逐题全对提交（抽样） */
T('act:lwte', () => {
  const L = global.LWTE;
  const items = L.readings.slice(0, 3).concat(L.listenings.slice(0, 2));
  items.forEach(it => {
    clearRadios();
    it.questions.forEach(q => setRadio('lwte_' + it.id + '_' + q.no, q.ans));
    doAct('quizSubmit', (it.kind || (L.readings.indexOf(it) >= 0 ? 'reading' : 'listening')) + ':' + it.id);
  });
});

/* 生字闯关：每课全对通关 */
T('act:cnChars-all', () => {
  const C = Kid.cnData();
  C.units.forEach((u, ui) => {
    u.lessons.forEach((l, li) => {
      const item = Kid.cnItem(ui, li);
      if (!item || !item.write || !item.write.length) return;
      const pool = [];
      C.units.forEach(x => { if (x.garden && x.garden.write) x.garden.write.forEach(w => pool.push(w)); x.lessons.forEach(ll => (ll.write || []).forEach(w => pool.push(w))); });
      const ds = S.dateStr(); let sb = 0; for (let k = 0; k < ds.length; k++) sb += ds.charCodeAt(k); sb += ui * 31 + li * 7 + 3;
      const list = global.CNQUIZ.build(item.write, pool, sb);
      if (!list.length) return;
      Kid.cnTab = 'chars'; Kid.cnUnit = ui; Kid.cnLesson = li; Kid.cnResult = null;
      clearRadios(); list.forEach((q, i) => setRadio('cnq_' + i, q.ans));
      doAct('cnSubmit', 'U' + ui + 'L' + li);
      stats.cnLessons++;
    });
  });
  // 错题路径：故意答错一题
  Kid.cnTab = 'chars'; Kid.cnUnit = 0; Kid.cnLesson = 0; Kid.cnResult = null;
  const item = Kid.cnItem(0, 0); const pool = [];
  C.units.forEach(x => { if (x.garden && x.garden.write) x.garden.write.forEach(w => pool.push(w)); x.lessons.forEach(ll => (ll.write || []).forEach(w => pool.push(w))); });
  const ds = S.dateStr(); let sb = 0; for (let k = 0; k < ds.length; k++) sb += ds.charCodeAt(k); sb += 0 * 31 + 0 * 7 + 3;
  const list = global.CNQUIZ.build(item.write, pool, sb);
  clearRadios(); list.forEach((q, i) => setRadio('cnq_' + i, (q.ans + 1) % q.opts.length));
  doAct('cnSubmit', 'U0L0'); // 全错 → 应有讲解，不崩
});

/* 预习：完整跑一课 */
T('act:preview-flow', () => {
  const g = findGoodLesson();
  if (!g) { warns.push('preview-flow :: 无可用课'); return; }
  Kid.cnBook = '2a'; Kid.pvUnit = g.u; Kid.pvLesson = g.l; Kid.pvStage = '';
  doAct('pvPick', g.u + ':' + g.l);
  // 侦探
  (g.d.detective || []).forEach((_, i) => { doAct('pvHint', i); doAct('pvFind', i); });
  // 读原文
  doAct('pvStage', 'read');
  // 僵尸闯关：逐题答对
  doAct('pvStage', 'boss');
  const qn = (g.d.quiz || []).length;
  for (let i = 0; i < qn; i++) { doAct('bossPick', g.d.quiz[i].ans); }
  // 故事拼图：排序
  doAct('pvStage', 'sum'); Kid.sumMode = 'sort'; Kid.sumPick = []; Kid.sumCheck = 0;
  const order = Kid.sumOrder(g.d);
  order.forEach(ci => doAct('sumTap', ci));
  doAct('sumCheck');
  // 一句话概括
  Kid.sumMode = 'gist'; const go = Kid.gistOpts(g.d); Kid.sumGist = go.ans; doAct('sumDone');
  doAct('pvFinish', g.d.no + ' ' + g.d.title);
  Kid.pvLesson = -2; Kid.pvStage = '';
});

/* 背诵：每篇 × 每种玩法 实际跑通 */
T('act:recite-games', () => {
  const list = Kid.reciteList();
  list.slice(0, 6).forEach(it => {
    Kid.cnTab = 'recite'; Kid.rcId = it.id; Kid.rcGame = ''; Kid.rcStep = 0; Kid.rcPick = []; Kid.rcLv = 0; Kid.rcResult = null;
    doAct('rcOpen', it.id);
    // fill
    Kid.rcGame = 'fill';
    let guard = 0;
    while (Kid.rcStep < it.lines.length && guard++ < 200) {
      const m = Kid.rcMask(it.lines, Kid.rcStep, it.words);
      setRadio('rfq', m ? m.ans : 0);
      doAct('rcNext');
    }
    // chain
    Kid.rcGame = 'chain'; Kid.rcStep = 0;
    guard = 0;
    while (Kid.rcStep < it.lines.length - 1 && guard++ < 200) {
      const o = Kid.rcChainOpts(it, Kid.rcStep);
      setRadio('rcq', o.ans);
      doAct('rcNext');
    }
    // sort
    Kid.rcGame = 'sort'; Kid.rcStep = 0; Kid.rcPick = [];
    for (let i = 0; i < it.lines.length; i++) doAct('rcPick', i);
    doAct('rcFinish', 'sort');
    // cover
    Kid.rcGame = 'cover'; [0, 1, 2].forEach(n => doAct('rcCover', n)); doAct('rcFinish', 'cover');
    // rec
    Kid.rcGame = 'rec'; doAct('rcFinish', 'rec');
    doAct('rcBack');
    Kid.rcId = ''; Kid.rcGame = '';
  });
});

/* 听写 */
T('act:dictation', () => { Kid.cnTab = 'dict'; scan('dict', Kid.cnDictation()); doAct('cnNextGroup'); });

/* 阅读打卡 */
T('act:reading', () => {
  Kid.cnTab = 'read';
  const grp = Kid.READ_BOOKS[0];
  if (grp && grp.list[0]) { doAct('readPick', grp.list[0]); doAct('readCheck'); }
});

/* 数学：每族每关全部通关（正确答案）+ 抽样走提示/失败路径 */
function tokenizeExpr(expr) {
  const t = []; let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch >= '0' && ch <= '9') { let n = ''; while (i < expr.length && expr[i] >= '0' && expr[i] <= '9') n += expr[i++]; t.push({ t: 'n', v: parseInt(n, 10) }); continue; }
    if ('+-*/()'.indexOf(ch) >= 0) { t.push({ t: 'o', v: ch }); i++; continue; }
    i++;
  }
  return t;
}
function mazePath(p) {
  const n = p.n, start = p.start, goal = p.goal;
  const q = [[start]], seen = {}; seen[start] = 1;
  while (q.length) {
    const path = q.shift(); const cur = path[path.length - 1];
    if (cur === goal) return path;
    const k = p.grid[cur], cr = Math.floor(cur / n), cc = cur % n;
    [[-k, 0], [k, 0], [0, -k], [0, k]].forEach(([dr, dc]) => {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) { const ni = nr * n + nc; if (!seen[ni]) { seen[ni] = 1; q.push(path.concat(ni)); } }
    });
  }
  return null;
}
T('act:math-all-levels', () => {
  ['seq', 'p24', 'sudoku', 'brain'].forEach(g => {
    MG.view = g; MG.game = g; MG.lv = 0; MG.sdSize = 4;
    const maxLv = g === 'sudoku' ? MG.sdConf(4).levels : MG.maxLevels();
    for (let lv = 1; lv <= maxLv; lv++) {
      if (!MG.unlocked(g, lv)) { warns.push('math:' + g + ' L' + lv + ' 未解锁却尝试进入'); continue; }
      MG.open(g, lv);
      const p = MG.p;
      if (!p) { errors.push('math:' + g + ' L' + lv + ' 出题为空'); continue; }
      if (g === 'seq') {
        const idx = p.opts.indexOf(p.answer);
        doAct('mthSeq', idx);
      } else if (g === 'p24') {
        MG.st.tokens = tokenizeExpr(p.expr);
        doAct('mth24go');
      } else if (g === 'sudoku') {
        for (let i = 0; i < p.solution.length; i++) {
          if (p.puzzle[i] > 0) continue;
          doAct('mthSdCell', i);
          doAct('mthSdNum', p.solution[i]);
        }
      } else {
        if (p.type === 'maze') {
          const path = mazePath(p);
          if (!path) { errors.push('math:brain maze L' + lv + ' 找不到解'); }
          else for (let s = 1; s < path.length; s++) doAct('mthMaze', path[s]);
        } else {
          const idx = p.opts.indexOf(p.answer);
          doAct('mthBrainOpt', idx);
        }
      }
      stats.mathLevels++;
    }
    // 6×6 / 9×9 数独（需先解锁）
    if (g === 'sudoku') {
      [6, 9].forEach(sz => {
        if (!MG.sdUnlocked(sz)) { warns.push('math:sudoku ' + sz + '×' + sz + ' 未能解锁（前段需全通）'); return; }
        MG.sdSize = sz; MG.view = 'sudoku'; MG.game = 'sudoku';
        for (let lv = 1; lv <= MG.sdConf(sz).levels; lv++) {
          if (!MG.unlocked('sudoku', lv, sz)) continue;
          MG.open('sudoku', lv); const p = MG.p;
          for (let i = 0; i < p.solution.length; i++) { if (p.puzzle[i] > 0) continue; doAct('mthSdCell', i); doAct('mthSdNum', p.solution[i]); }
          stats.mathLevels++;
        }
      });
    }
  });
});

/* 数学提示/失败抽样 */
T('act:math-hint-fail', () => {
  MG.view = 'seq'; MG.game = 'seq'; MG.lv = 1; MG.open('seq', 1);
  doAct('mthHint'); doAct('mthHint'); // 两次提示应直接过关
  MG.view = 'p24'; MG.game = 'p24'; MG.lv = 1; MG.open('p24', 1);
  doAct('mth24o', '+'); doAct('mth24go'); // 错误的算式
  doAct('mthHint'); doAct('mthHint');
  MG.view = 'brain'; MG.game = 'brain'; MG.lv = 1; MG.open('brain', 1);
  const p = MG.p; const wrong = (p.opts.indexOf(p.answer) + 1) % p.opts.length;
  doAct('mthBrainOpt', wrong); // 错一次
  doAct('mthHint'); doAct('mthHint');
});

/* 数学计时器 tick + 锁定 */
T('act:math-tick', () => {
  MG.view = 'seq'; MG.game = 'seq'; MG.lv = 1; MG.open('seq', 1);
  Kid.page = 'math'; global.App.mode = 'kid';
  for (let i = 0; i < 3; i++) MG.tick();
  // 模拟时间耗尽
  S.state.mathUse[today] = (S.mathConf().baseMin || 10) * 60 + 10;
  const locked = MG.locked();
  if (locked) scan('mathLock', MG.panel());
  else warns.push('math-tick :: 时间耗尽后未进入锁定态');
  S.state.mathUse[today] = 0;
});

/* 预习僵尸闯关：用「我做完啦」(pvSubmit) 走完整判分 */
T('act:pvSubmit', () => {
  const g = findGoodLesson(); if (!g) { warns.push('pvSubmit :: 无可用课'); return; }
  Kid.cnBook = '2a'; Kid.pvUnit = g.u; Kid.pvLesson = g.l; Kid.pvStage = 'boss';
  Kid.bossIdx = 0; Kid.bossTry = {}; Kid.bossPicked = -1;
  const pd = Kid.pvData(g.u, g.l);
  clearRadios();
  (pd.quiz || []).forEach((q, i) => setRadio('pvq_' + i, q.ans));
  doAct('pvSubmit', g.u + '_' + g.l);
  Kid.pvStage = ''; Kid.pvLesson = -2;
});

/* 未知动作 */
T('act:unknown', () => { const r = Kid.act('zzz_noop', 'x'); if (r !== false) warns.push('act:unknown :: 未识别动作应返回 false，实际=' + r); });

/* =========================================================
   输出
   ========================================================= */
console.log('\n========== 孩子端遍历报告 ==========');
console.log('渲染次数:', stats.renders, '| 驱动动作次数:', stats.acts);
console.log('生字课通关:', stats.cnLessons, '| 背诵玩法执行:', stats.reciteGames, '| 数学关卡通关:', stats.mathLevels);
console.log('提示/弹窗触发次数(粗略):', toasts.length);
console.log('\n--- 报错 (' + errors.length + ') ---');
errors.forEach(e => console.log(' ✗ ' + e));
console.log('\n--- 警告 (' + warns.length + ') ---');
warns.forEach(w => console.log(' ⚠ ' + w));
console.log('\n--- 备注 ---');
notes.forEach(n => console.log(' • ' + n));
console.log('\n结论:', errors.length === 0 ? '✅ 没有崩溃' : '❌ 有 ' + errors.length + ' 处报错需修');
