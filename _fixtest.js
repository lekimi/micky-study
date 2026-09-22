/* 本轮 5 项改动的专项测试：背诵第5关 / 不跳顶 / 字号 / 30分钟 / 精简模式 */
const fs = require('fs'), path = require('path');
global.window = global;
let scrolledTo = null;
global.scrollTo = function (x, y) { scrolledTo = y; };
global.pageYOffset = 400;          /* 模拟：孩子正停在页面中间 */
global.App = { mode: 'kid', render() {}, afterChange() {} };
const inputs = {};
function makeEl() { return { value: '', style: {}, innerHTML: '', classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getAttribute() { return null; }, closest() { return null; } }; }
global.document = {
  getElementById(id) { if (!inputs[id]) inputs[id] = makeEl(); return inputs[id]; },
  querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return makeEl(); }, body: makeEl(), documentElement: { scrollTop: 400 },
  addEventListener() { }, readyState: 'complete'
};
global.localStorage = (function () { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
global.speechSynthesis = { cancel() {}, speak() {} };
global.SpeechSynthesisUtterance = function () {};
global.setTimeout = () => 0;
global.setInterval = () => 0;   // 别让 app.js 的每秒心跳把 node 挂住
const base = __dirname;
function ev(p) { eval(fs.readFileSync(p, 'utf8')); }
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'wordbook', 'speech', 'kid', 'parent', 'app'].forEach(f => ev(path.join(base, 'js', f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'lwte2a', 'lwte2a_review', 'words2a'].forEach(f => ev(path.join(base, 'data', f + '.js')));

const UI = global.UI;
let modal = null, confirmBox = null;
UI.toast = () => { };
UI.modal = o => { modal = o; };
UI.confirm = (t, x, y) => { confirmBox = { t, x, y }; };
UI.story = () => { };

const S = global.Store, E = global.Engine, Kid = global.Kid, P = global.Parent, App = global.App;
S.load();
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
function reset() {
  S.state.speech = []; S.state.speechDraft = null; S.state.phraseBook = [];
  S.state.appUse = {}; S.state.listenIdx = 0;
  Kid.spAsk = null; Kid.listenIdx = 0;
  S.save();
}

console.log('========== 本轮 5 项改动 专项测试 ==========');

/* ---------- 1. 预习第 5 关：背诵挑战能进 ---------- */
console.log('\n[1] 预习探险 · 第 5 关背诵挑战');
reset();
/* 找一课需要背诵的 */
const C = Kid.cnData();
let found = null;
C.units.forEach((u, ui) => {
  (u.lessons || []).forEach((l, li) => {
    const T = Kid.findText(l.no, l.title);
    if (!found && T && T.recite) found = { ui, li, no: l.no, title: l.title };
  });
});
ok('能找到一课需要背诵的课文', !!found, found && found.no + ' ' + found.title);
if (found) {
  Kid.cnBook = '2a'; Kid.cnTab = 'preview';
  Kid.pvUnit = found.ui; Kid.pvLesson = found.li; Kid.pvStage = ''; Kid.rcId = '';
  const homeHtml = Kid.cnPreview();
  ok('关卡页里能看到第 5 关', homeHtml.indexOf('第 5 关') >= 0);
  /* 点第 5 关 */
  const key = found.no + found.title;
  Kid.act('rcOpen', key);
  ok('点了第 5 关后 rcId 被设上', Kid.rcId.indexOf(found.title) >= 0, Kid.rcId);
  const after = Kid.cnPreview();
  ok('第 5 关能渲染出背诵界面（不再是关卡列表）', after.indexOf('第 5 关') < 0 && after.length > 200);
  ok('背诵界面有返回关卡的按钮', after.indexOf('rcBack') >= 0);
  /* 找不到篇目的课不能卡住 */
  Kid.rcId = '不存在的课文xyz';
  const bad = Kid.cnPreview();
  ok('篇目不存在时不会卡死（退回关卡列表）', typeof bad === 'string' && bad.length > 100);
  Kid.rcId = '';
}

/* ---------- 2. 按钮点了不跳回页顶 ---------- */
console.log('\n[2] 点按钮不跳回页顶');
reset();
global.pageYOffset = 400;
scrollToTruth();
function scrollToTruth() { scrolledTo = null; }
App.render();
ok('普通重绘会保持滚动位置（停在 400）', scrolledTo === 400, '实际滚到 ' + scrolledTo);
scrolledTo = null;
App.render(true);
ok('切页面时才回顶部', scrolledTo === 0, '实际滚到 ' + scrolledTo);

/* ---------- 3. 字号缩小 ---------- */
console.log('\n[3] 课文与英语打卡字号');
const kidSrc = fs.readFileSync(path.join(base, 'js', 'kid.js'), 'utf8');
ok('课文正文从 19px 缩到 17px', kidSrc.indexOf('line-height:2.1;font-size:17px') >= 0);
ok('英语打卡正文缩到 14px', kidSrc.indexOf('line-height:1.8;font-size:14px') >= 0);
ok('英语题题面缩到 14px', kidSrc.indexOf('font-weight:900;font-size:14px;color:#5C4322') >= 0);

/* ---------- 4. 每日 30 分钟 ---------- */
console.log('\n[4] 全局使用时长 30 分钟');
reset();
ok('默认开启', S.appConf().enable === 1);
ok('默认 30 分钟', S.appQuotaSec() === 30 * 60, S.appQuotaSec() / 60 + ' 分钟');
ok('一开始没超时', S.appTimeUp() === false);
/* 用满 */
S.appAddSec(29 * 60);
ok('用了 29 分钟还没超时', S.appTimeUp() === false);
S.appAddSec(60);
ok('用满 30 分钟就超时', S.appTimeUp() === true);
/* 超时后：首页能进，其它板块被锁 */
Kid.page = 'home';
const hHome = Kid.render();
ok('超时后首页照常能打卡', hHome.indexOf('今日固定任务') >= 0 || hHome.indexOf('学习花园') >= 0);
Kid.page = 'chinese';
const hLock = Kid.render();
ok('超时后其它板块显示锁定页', hLock.indexOf('今天的使用时间用完啦') >= 0);
ok('锁定页能一键回首页打卡', hLock.indexOf('回首页打卡') >= 0);
/* 打卡计时期间不计时 */
ok('fixedTiming() 能被安全调用', typeof App.fixedTiming() === 'boolean');
/* 妈妈可加时 */
P.act('appBonus');
ok('妈妈加时后不再超时', S.appTimeUp() === false, '还剩 ' + Math.round(S.appLeftSec() / 60) + ' 分钟');
P.act('appSet', '20');
ok('妈妈能改成 20 分钟', S.appQuotaSec() === (20 * 60 + (S.appConf().bonus[S.dateStr()] || 0) * 60));
P.act('appToggle');
ok('妈妈能关掉限制', S.appConf().enable === 0);
P.act('appToggle');
ok('也能再打开', S.appConf().enable === 1);

/* ---------- 5. 精简模式 ---------- */
console.log('\n[5] 精简模式（少看屏幕）');
reset();
let ln = Kid.lean();
ok('默认开启', ln.on === 1);
Kid.cnTab = ''; Kid.page = 'chinese';
const cnHtml = Kid.cnPanel();
ok('语文入口不再显示生字闯关', cnHtml.indexOf('data-act="cnTab" data-v="chars"') < 0);
ok('语文入口保留预习探险（课文理解向，精简模式也留着）', cnHtml.indexOf('data-act="cnTab" data-v="preview"') >= 0);
ok('语文保留背诵闯关', cnHtml.indexOf('data-act="cnTab" data-v="recite"') >= 0);
ok('语文保留故事海漂流', cnHtml.indexOf('data-act="cnTab" data-v="read"') >= 0);
ok('语文保留听写练习', cnHtml.indexOf('data-act="cnTab" data-v="dict"') >= 0);
ok('入口里有说明文字', cnHtml.indexOf('精简模式') >= 0);
/* 英语 */
Kid.page = 'english';
const enHtml = Kid.render();
ok('英语页不含朗文阅读题', enHtml.indexOf('朗文阅读练习') < 0);
ok('英语页有顺序听力播放器', enHtml.indexOf('listenGo') >= 0);
ok('听力标注了按 L1、L2 顺序', enHtml.indexOf('按 L1、L2') >= 0);
/* 听力顺序 */
const LW = global.LWTE;
ok('题库里有听力', LW && LW.listenings && LW.listenings.length > 0);
const first = Kid.listenPlayer();
ok('默认从第一课开始', first.indexOf('>L1<') >= 0 || first.indexOf('L1') >= 0);
Kid.act('listenGo', 2);
ok('能跳到指定课次', Kid.listenIdx === 2);
Kid.act('listenGo', -5);
ok('往前越界会停在 0（不绕圈）', Kid.listenIdx === 0);
Kid.act('listenGo', 999);
ok('往后越界会停在最后一课', Kid.listenIdx === LW.listenings.length - 1);
/* 关掉精简模式能全部恢复 */
ln.on = 0; S.save();
Kid.cnTab = '';
const cnFull = Kid.cnPanel();
ok('关掉后生字闯关回来了', cnFull.indexOf('data-act="cnTab" data-v="chars"') >= 0);
ok('关掉后预习探险仍在（精简模式本来也留着）', cnFull.indexOf('data-act="cnTab" data-v="preview"') >= 0);
const pool6 = (function () { ln.on = 1; S.save(); return Kid.enReviewPool(); })();
ok('精简时复习题 6 道', pool6.length === 6, pool6.length);
ln.on = 0; S.save();
const pool8 = Kid.enReviewPool();
ok('关掉后恢复 8 道', pool8.length === 8, pool8.length);
ln.on = 1; S.save();

/* ---------- 6. 整体渲染 ---------- */
console.log('\n[6] 整体渲染');
reset();
['home', 'chinese', 'math', 'english', 'other', 'reward'].forEach(p => {
  Kid.page = p;
  const h = Kid.render();
  ok('孩子端 ' + p + ' 页能渲染且无 undefined', typeof h === 'string' && h.indexOf('undefined') < 0);
});
P.page = 'dash';
const ph = P.render();
ok('妈妈端看板含时长管控', ph.indexOf('使用时长管控') >= 0);
ok('妈妈端看板含精简模式', ph.indexOf('精简模式') >= 0);
ok('妈妈端渲染无 undefined', ph.indexOf('undefined') < 0);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
