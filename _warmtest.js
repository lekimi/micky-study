/* 五个「暖心小功能」专项测试：心情天气 / 妈妈的悄悄话 / 今日小电影 / 开心罐 / 我的小盆栽 */
const fs = require('fs'), path = require('path');
global.window = global;
global.App = { mode: 'kid', render() {}, afterChange() {} };
const inputs = {};
function makeEl() { return { value: '', style: {}, innerHTML: '', classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getAttribute() { return null; }, closest() { return null; } }; }
global.document = {
  getElementById(id) { if (!inputs[id]) inputs[id] = makeEl(); return inputs[id]; },
  querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return makeEl(); }, body: makeEl()
};
global.localStorage = (function () { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
global.speechSynthesis = { cancel() {}, speak() {} };
global.SpeechSynthesisUtterance = function () {};
global.setTimeout = () => 0;
const base = __dirname;
function ev(p) { eval(fs.readFileSync(p, 'utf8')); }
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'kid', 'parent'].forEach(f => ev(path.join(base, 'js', f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'lwte2a', 'lwte2a_review'].forEach(f => ev(path.join(base, 'data', f + '.js')));

const UI = global.UI;
let modal = null; const toasts = [];
UI.toast = m => toasts.push(String(m));
UI.modal = o => { modal = o; };
UI.confirm = (t, x, y) => { if (y) y(); };
UI.story = () => { };

const S = global.Store, E = global.Engine, Kid = global.Kid, P = global.Parent;
S.load(); S.state.autoApprove = true;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
function reset() {
  S.state.mood = {}; S.state.notes = []; S.state.joy = [];
  S.state.plant = { leaves: 0, streak: 0, lastDate: '', flower: 0, total: 0 };
  S.state.movie = {}; S.state.submissions = [];
  S.save();
}

console.log('========== 暖心小功能专项测试 ==========');

/* ---------- 1. 心情天气 ---------- */
console.log('\n[1] 心情天气');
reset();
Kid.act('moodSet', 'rain');
let m1 = E.moodOf();
ok('选了「有雨」记录正确', m1 && m1.m === 'rain', JSON.stringify(m1));
ok('默认是不给妈妈看的（share=0）', m1 && m1.share === 0);
Kid.act('moodShare', '1');
ok('点开分享后 share=1', E.moodOf().share === 1);
Kid.act('moodShare', '0');
ok('可以再收回去 share=0', E.moodOf().share === 0);
Kid.act('moodShare', '1');
let mr = E.moodRecent(7);
let today = mr[mr.length - 1];
ok('妈妈端能取到今天的心情', today.m === 'rain' && today.share === true);
/* 造一条「他自己藏着」的 */
S.state.mood[S.addDays(S.dateStr(), -1)] = { m: 'storm', share: 0 };
mr = E.moodRecent(7);
let y = mr[mr.length - 2];
ok('没分享的那天标记为 hidden', y.hidden === true, JSON.stringify(y));
ok('hidden 时不泄露具体是哪个', y.share === false);

/* ---------- 2. 妈妈的悄悄话 ---------- */
console.log('\n[2] 妈妈的悄悄话');
reset();
ok('模板库有 6 类（含「陪着」）', (UI.NOTE_TPL || []).length === 6);
let tplN = 0; (UI.NOTE_TPL || []).forEach(g => tplN += g.list.length);
ok('模板共 ' + tplN + ' 条（>=30）', tplN >= 30);
/* 点模板填进输入框 */
Kid.page = 'home'; P.act('noteTpl', '今天允许你多吃一块饼干，别告诉你爸。');
ok('点模板会填进输入框', inputs['note-text'] && inputs['note-text'].value.indexOf('饼干') >= 0, inputs['note-text'] && inputs['note-text'].value);
/* 今天生效 */
const nIn = document.getElementById('note-text'); nIn.value = '今天不用特别棒，正常发挥就行。';
P.act('noteSend', 'today');
let un = E.noteUnread();
ok('「今天生效」→ 孩子端立刻能拆', un.length === 1, 'unread=' + un.length);
/* 明天生效 */
nIn.value = '明天的信';
P.act('noteSend', 'tomorrow');
un = E.noteUnread();
ok('「明天生效」→ 今天还拆不到', un.length === 1, 'unread=' + un.length);
ok('明天的信确实存了', E.noteList().length === 2);
/* 急件 */
nIn.value = '现在就给他的一句';
P.act('noteSend', 'now');
un = E.noteUnread();
ok('「现在就给他」→ 立刻可拆', un.length === 2);
let pushN = E.notePushPending();
ok('急件能被推送机制认出来', !!pushN && pushN.text === '现在就给他的一句');
/* 拆信 */
let first = E.noteUnread()[0];
Kid.act('noteOpen', first.id);
ok('拆信后标记为已读', E.noteList().filter(x => x.id === first.id)[0].read === 1);
ok('拆信会弹窗显示内容', !!modal && modal.emoji === '✉️');
ok('未读数量 -1', E.noteUnread().length === 1);
/* 删除 */
P.act('noteDel', E.noteList()[0].id);
ok('妈妈可以删掉一条', E.noteList().length === 2);

/* ---------- 3. 今日小电影 ---------- */
console.log('\n[3] 今日小电影');
reset();
let mv = E.movieOf();
ok('能生成小电影文案', typeof mv === 'string' && mv.length > 10, mv && mv.slice(0, 40));
ok('文案里有收尾语', mv.indexOf('放完啦') >= 0);
ok('第二次取会走缓存（内容一致）', E.movieOf() === mv);
Kid.act('movieOpen');
ok('点卡片会弹小电影', !!modal && modal.emoji === '🎬');
/* 有心情时会不会带上 */
S.state.mood[S.dateStr()] = { m: 'sun', share: 1 };
let mv2 = E.movieOf(S.dateStr(), true);
ok('会把今天的心情编进故事', mv2.indexOf('晴天') >= 0, mv2.slice(0, 60));
/* 完成任务后故事里应该提到僵尸 */
S.state.tasks.filter(t => t.kind === 'fixed' && t.slot === 'weekday').forEach(t => E.submitTask(t.id, ''));
let mv3 = E.movieOf(S.dateStr(), true);
ok('三项完成后故事提到挡住僵尸', mv3.indexOf('僵尸') >= 0 || mv3.indexOf('门口') >= 0, mv3.slice(0, 80));

/* ---------- 4. 开心罐 ---------- */
console.log('\n[4] 开心罐');
reset();
ok('空罐子摇不出东西', E.joyDraw() === null);
Kid.act('joyAdd', '今天午饭好吃');
ok('点 chip 能存一条', E.joyList().length === 1);
const jIn = document.getElementById('joy-input'); jIn.value = '我自己写的一件';
Kid.act('joyAddInput');
ok('输入框也能存', E.joyList().length === 2);
ok('存的内容正确', E.joyList().some(x => x.text === '我自己写的一件'));
jIn.value = '   ';
let before = E.joyList().length;
Kid.act('joyAddInput');
ok('空内容不会被存进去', E.joyList().length === before);
let drew = E.joyDraw();
ok('摇一摇能掉出一条', !!drew && typeof drew.text === 'string');
Kid.act('joyDraw');
ok('摇一摇会弹窗', !!modal && modal.emoji === '🍬');
Kid.act('joyDel', E.joyList()[0].id);
ok('可以删掉一条', E.joyList().length === 1);

/* ---------- 5. 我的小盆栽 ---------- */
console.log('\n[5] 我的小盆栽');
reset();
let p0 = E.plantOf();
ok('初始 0 片叶子', p0.leaves === 0);
let w = E.plantWater();
ok('任务没完成时不会浇水', !w.ok && w.why === 'notdone', JSON.stringify(w));
/* 完成三项 */
S.state.tasks.filter(t => t.kind === 'fixed').forEach(t => E.submitTask(t.id, ''));
w = E.plantWater();
ok('三项完成后自动浇水', w.ok === true, JSON.stringify(w));
ok('长了一片叶子', E.plantOf().leaves === 1);
ok('连续天数 = 1', E.plantOf().streak === 1);
let w2 = E.plantWater();
ok('同一天不会重复浇水', !w2.ok && w2.why === 'already');
/* 模拟连续 7 天：直接改 lastDate 让昨天浇过 */
let p = E.plantOf();
p.leaves = 6; p.streak = 6; p.lastDate = S.addDays(S.dateStr(), -1);
w = E.plantWater();
ok('第 7 天会开花', w.flower === true, JSON.stringify(w));
ok('开花计数 +1', E.plantOf().flower === 1);
/* 断一天不会掉叶子 */
let leavesBefore = E.plantOf().leaves;
let flowerBefore = E.plantOf().flower;
p.lastDate = S.addDays(S.dateStr(), -3);
S.save();
let miss = E.plantMissDays();
ok('能算出断了多少天', miss === 3, 'miss=' + miss);
ok('断掉之后叶子一片没掉', E.plantOf().leaves === leavesBefore);
ok('断掉之后花也没掉', E.plantOf().flower === flowerBefore);

/* ---------- 6. 渲染不崩 ---------- */
console.log('\n[6] 五个功能的页面渲染');
reset();
global.App.mode = 'kid';
try {
  const h1 = Kid.moodBar() + Kid.noteCard() + Kid.plantCard() + Kid.movieCard() + Kid.joyPanel();
  ok('孩子端五个组件都能渲染', typeof h1 === 'string' && h1.length > 100);
  ok('渲染结果没有 undefined', h1.indexOf('undefined') < 0);
  ok('渲染结果没有 NaN', h1.indexOf('NaN') < 0);
} catch (e) { ok('孩子端五个组件渲染', false, e.message); }
global.App.mode = 'parent';
try {
  P.page = 'dash';
  const h2 = P.render();
  ok('妈妈端看板能渲染（含心情/悄悄话/盆栽）', typeof h2 === 'string' && h2.length > 100);
  ok('看板出现「心情天气」', h2.indexOf('心情天气') >= 0);
  ok('看板出现「悄悄话」', h2.indexOf('悄悄话') >= 0);
  ok('看板出现「开心罐」', h2.indexOf('开心罐') >= 0);
  ok('看板渲染没有 undefined', h2.indexOf('undefined') < 0);
} catch (e) { ok('妈妈端看板渲染', false, e.message); }

/* ---------- 7. AI 自动悄悄话（不依赖妈妈端） ---------- */
console.log('\n[7] AI 自动悄悄话');
reset();
E.setMood('storm', 0);
let an1 = E.autoNoteOf();
ok('按心情自动生成一句', !!an1 && typeof an1.text === 'string' && an1.text.length > 0, an1 && an1.text);
ok('记住了当时的心情', an1.mood === 'storm');
ok('刚生成时是未读', an1.read === 0);
ok('同一天取第二次是同一句', E.autoNoteOf().text === an1.text);
Kid.act('autoNoteOpen');
ok('点开后标记已读', E.autoNoteOf().read === 1);
ok('读过后首页不再显示信封', Kid.noteCard() === '');
/* 换了心情要重挑一句（还没读过的情况下） */
S.state.autoNote = {}; S.state.mood[S.dateStr()] = { m: 'sun', share: 0 };
let an2 = E.autoNoteOf();
ok('换心情会重新挑', an2.mood === 'sun');
/* 心情差的时候不能出现任务相关的词 */
const BAD = ['先做哪样', '顺序你定', '重写', '擦掉', '作业', '练了', '打卡', '闯关'];
let badHit = [];
['rain', 'storm'].forEach(mk => {
  for (let i = 0; i < 40; i++) {
    const r = global.AI.localNote(mk, '2026-' + (i % 12 + 1) + '-' + (i + 1) + '|' + mk);
    BAD.forEach(b => { if (r.text.indexOf(b) >= 0) badHit.push(mk + ':' + r.text); });
  }
});
ok('心情差时不会出现任务/作业相关的词', badHit.length === 0, badHit.slice(0, 3).join(' | '));

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
