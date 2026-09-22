/* 妈妈端逐选项遍历：渲染每个页 + 驱动每个 act 动作 */
const fs = require('fs');
const path = require('path');
global.window = global;
global.App = { mode: 'parent', render() {}, afterChange() {} };

const checkedMap = {}, inputs = {};
function makeEl() { return { value: '', checked: false, style: {}, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getAttribute() { return null; }, closest() { return null; }, focus() {}, click() {}, select() {}, setSelectionRange() {} }; }
global.document = {
  getElementById(id) { if (!inputs[id]) inputs[id] = makeEl(); return inputs[id]; },
  querySelector(sel) {
    const m = sel.match(/input\[name="([^"]+)"\]:checked/);
    if (m) { const v = checkedMap[m[1]]; return v === undefined ? null : { value: v }; }
    if (sel === '.modal' || sel === '#modal-wrap') return null;
    return null;
  },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  body: makeEl()
};
global.localStorage = (function () { const mem = {}; return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; })();
global.speechSynthesis = { cancel() {}, speak() {} };
global.SpeechSynthesisUtterance = function () {};
global.navigator = { mediaDevices: null, clipboard: { writeText() { return Promise.resolve(); } } };
global.URL = { createObjectURL() { return ''; }, revokeObjectURL() {} };
global.Blob = function () {};
global.setTimeout = function (f) { try { f && f(); } catch (e) {} return 0; };
global.prompt = () => '测试输入';
global.alert = () => {};

const base = __dirname;
function ev(p) { eval(fs.readFileSync(p, 'utf8')); }
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'kid', 'parent'].forEach(f => ev(path.join(base, 'js', f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'lwte2a', 'lwte2a_review'].forEach(f => ev(path.join(base, 'data', f + '.js')));

const UI = global.UI;
let lastModal = null, lastConfirm = null; const toasts = [];
UI.toast = m => { toasts.push(String(m)); };
UI.modal = o => { lastModal = o; };
UI.confirm = (t, x, onYes) => { lastConfirm = { title: t, onYes }; };
UI.story = k => { toasts.push('STORY:' + k); };
function clickModal(i) { const b = lastModal && lastModal.buttons && lastModal.buttons[i]; lastModal = null; if (b && b.onClick) b.onClick(() => {}); }
function confirmYes() { const f = lastConfirm && lastConfirm.onYes; lastConfirm = null; if (f) f(); }
function setRadio(n, v) { checkedMap[n] = String(v); }

const S = global.Store, E = global.Engine, P = global.Parent, Kid = global.Kid;
S.load();

const errors = [], warns = [], notes = [];
const stats = { renders: 0, acts: 0 };
function T(n, fn) { try { fn(); } catch (e) { errors.push(n + ' :: ' + e.message + '\n   ' + (e.stack || '').split('\n').slice(1, 3).join('\n   ')); } }
function scan(name, html) {
  if (typeof html !== 'string') { warns.push(name + ' :: 渲染返回的不是字符串 (' + typeof html + ')'); return; }
  stats.renders++;
  [['undefined', '含 undefined'], ['NaN', '含 NaN'], ['[object Object]', '含 [object Object]'], ['null', '含 null'], ['Infinity', '含 Infinity']].forEach(([needle, msg]) => {
    if (html.indexOf(needle) >= 0) warns.push(name + ' :: ' + msg);
  });
}
function doAct(name, v) { stats.acts++; try { return P.act(name, v, null); } catch (e) { errors.push('act:' + name + ' :: ' + e.message + '\n   ' + (e.stack || '').split('\n').slice(1, 3).join('\n   ')); } }

/* ---------- 1. 五个页都渲染一遍（默认态） ---------- */
const PAGES = ['dash', 'chart', 'ledger', 'review', 'publish'];
console.log('========== 妈妈端遍历报告 ==========');
PAGES.forEach(p => T('page:' + p, () => { P.page = p; scan('page:' + p, P.render()); }));

/* ---------- 2. 空数据/极端态 ---------- */
T('空数据', () => {
  S.state.tasks = []; S.state.submissions = []; S.state.shop = []; S.state.log = [];
  S.state.water = 0; S.state.sun = 0;
  PAGES.forEach(p => { P.page = p; scan('空:' + p, P.render()); });
});
T('极端数值', () => {
  S.reset ? S.reset() : null;
  S.load();
  S.state.water = -5; S.state.sun = 99999;
  PAGES.forEach(p => { P.page = p; scan('极端:' + p, P.render()); });
  S.state.water = 0; S.state.sun = 0;
});
S.reset ? S.reset() : null; S.load();

/* ---------- 3. 逐个驱动所有 ptab ---------- */
PAGES.forEach(p => T('act:ptab-' + p, () => doAct('ptab', p)));

/* ---------- 4. 发布任务（表单） ---------- */
T('act:pubTask', () => {
  inputs['nt-title'] = makeEl(); inputs['nt-title'].value = '测试任务';
  inputs['nt-emoji'] = makeEl(); inputs['nt-emoji'].value = '✏️';
  doAct('addTask');
  noteIt();
});
function noteIt() { }

/* ---------- 5. 完整走一遍通用动作名字表 ---------- */
const allActs = (function () {
  const txt = fs.readFileSync(path.join(base, 'js', 'parent.js'), 'utf8');
  const set = new Set(); let m;
  const re = /name === '([a-zA-Z0-9_]+)'/g;
  while ((m = re.exec(txt))) set.add(m[1]);
  return [...set];
})();
notes.push('妈妈端 act 分支共 ' + allActs.length + ' 个：' + allActs.join(', '));

/* 逐个试探：低风险的纯渲染/切换类先试 */
const probeVal = {
  ptab: 'dash', pubTask: '', pubQuick: '', delTask: '', approve: '', reject: '',
  addShop: '', delShop: '', buyShop: '', adjWater: '1', adjSun: '1',
  toggleAuto: '', toggleAi: '', exportData: '', importData: '', resetData: '',
  setLimit: '15', setBase: '10', setMax: '20', setCurrency: 'sun', mgrlandAdd: '10',
  clearUse: '', hwSave: '', hwCopy: '', hwDel: '', setReward: '', delReward: '',
  myOk: '', myNo: '', toggleTime: '', setMath: '', setAIKey: '', saveAiKey: '', setPin: '',
  unlockAll: '', resetProd: '', setWeek: '', copyYesterday: '', toggleReward: ''
};

allActs.forEach(a => {
  T('act:' + a, () => {
    lastModal = null; lastConfirm = null;
    const v = probeVal[a] !== undefined ? probeVal[a] : '';
    doAct(a, v);
    /* 若弹了确认框/弹窗，自动点第一个按钮，尽量往下走 */
    if (lastConfirm) confirmYes();
    if (lastModal) clickModal(0);
  });
});

/* ---------- 6. 发布-审核-取消 完整闭环 ---------- */
T('闭环:发布→孩子提交→妈妈审核', () => {
  S.load();
  const before = S.state.tasks.length;
  inputs['nt-title'] = makeEl(); inputs['nt-title'].value = '闭环测试';
  inputs['nt-emoji'] = makeEl(); inputs['nt-emoji'].value = '✏️';
  doAct('addTask');
  const t = S.state.tasks[S.state.tasks.length - 1];
  if (S.state.tasks.length !== before + 1) { warns.push('闭环 :: 发布任务后任务数没增加'); return; }
  E.submitTask(t.id, '孩子说做完啦');
  const sub = S.subOf(t.id, S.dateStr());
  if (!sub) { warns.push('闭环 :: 孩子提交后找不到提交记录'); return; }
  doAct('approve', sub.id);
  doAct('reject', sub.id);
  const after2 = S.subOf(t.id, S.dateStr());
  if (!after2 || after2.status !== 'rejected') warns.push('闭环 :: 退回后状态未变 rejected');
  doAct('approve', sub.id);
  const after = S.subOf(t.id, S.dateStr());
  if (!after || after.status !== 'approved') warns.push('闭环 :: 妈妈通过后状态未变 approved');
  notes.push('闭环通过：发布→提交→审核 ✅');
});

/* ---------- 7. 输出 ---------- */
console.log('页面渲染次数:', stats.renders, '| 动作驱动次数:', stats.acts);
console.log('\n--- 报错 (' + errors.length + ') ---');
errors.forEach(e => console.log(' ✗ ' + e));
console.log('\n--- 警告 (' + warns.length + ') ---');
[...new Set(warns)].forEach(w => console.log(' ⚠ ' + w));
console.log('\n--- 备注 ---');
notes.forEach(n => console.log(' • ' + n));
console.log('\n结论:', errors.length === 0 ? '✅ 妈妈端没有崩溃' : '❌ 有 ' + errors.length + ' 处报错需修');
