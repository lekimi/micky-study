/* 英语查词 · 单词本 · 错题本 专项测试 */
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
const spoken = [];
global.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u && u.text); } };
global.SpeechSynthesisUtterance = function (t) { this.text = t; };
global.setTimeout = () => 0;
const base = __dirname;
function ev(p) { eval(fs.readFileSync(p, 'utf8')); }
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'wordbook', 'kid', 'parent'].forEach(f => ev(path.join(base, 'js', f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'words2a'].forEach(f => ev(path.join(base, 'data', f + '.js')));

const UI = global.UI;
let modal = null; const toasts = [];
UI.toast = m => toasts.push(String(m));
UI.modal = o => { modal = o; };
UI.confirm = (t, x, y) => { if (y) y(); };
UI.story = () => { };

const S = global.Store, E = global.Engine, Kid = global.Kid, WB = global.WordBook;
S.load();

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
function reset() { S.state.wordbook = []; S.state.wrongBook = []; WB.quiz = null; WB.kw = ''; WB.result = null; S.save(); }

console.log('========== 英语查词 / 单词本 / 错题本 专项测试 ==========');

/* ---------- 1. 词库 ---------- */
console.log('\n[1] 词库');
// 模拟真实页面：核心词库也加载进来
eval(fs.readFileSync(path.join(base, 'data', 'dict', 'core.js'), 'utf8'));
const D = WB.dict();
ok('词库已加载', !!D && Array.isArray(D.list) && D.list.length > 200, 'count=' + (D && D.list.length));
ok('词库没有重复单词', (function () {
  const seen = {}; let dup = 0;
  D.list.forEach(w => { const k = w.en.toLowerCase(); if (seen[k]) dup++; seen[k] = 1; });
  return dup === 0;
})());
ok('每个词都有中英文', D.list.every(w => w.en && w.zh));
ok('类别数 >= 15', D.cats.length >= 15, 'cats=' + D.cats.length);
ok('覆盖朗文主题：职业词齐全', ['teacher', 'doctor', 'nurse', 'driver', 'cook'].every(x => D.list.some(w => w.en === x)));
ok('覆盖身体词', ['head', 'eye', 'hand', 'leg'].every(x => D.list.some(w => w.en === x)));
ok('覆盖方位介词', ['in', 'on', 'under', 'behind', 'next to'].every(x => D.list.some(w => w.en === x)));

/* ---------- 2. 查词 ---------- */
console.log('\n[2] 查词');
reset();
let r = WB.search('teacher');
ok('查 teacher 命中', r.hit === 'exact' && r.list[0].zh === '老师', JSON.stringify(r.list[0]));
ok('大小写不敏感', WB.search('TEACHER').hit === 'exact');
ok('查不到时返回 none', WB.search('zzzzz').hit === 'none');
ok('空输入返回 none', WB.search('').hit === 'none');
let pr = WB.search('book');
ok('前缀/包含能查到', pr.list.length >= 1, JSON.stringify(pr.list.map(x => x.en)));
ok('复数 books 能查到 book', WB.search('books').list.some(w => w.en === 'book'), JSON.stringify(WB.search('books').list.map(x => x.en)));
ok('进行时 running 能查到', WB.search('running').list.some(w => w.en === 'run' || w.en === 'running'), JSON.stringify(WB.search('running').list.map(x => x.en)));

/* ---------- 3. 单词本 ---------- */
console.log('\n[3] 单词本');
reset();
ok('初始是空的', WB.mine().length === 0);
inputs['wb-input'] = makeEl(); inputs['wb-input'].value = 'teacher';
Kid.act('wbSearch');
ok('Action wbSearch 能查到', WB.result && WB.result.hit === 'exact');
Kid.act('wbAdd', 'teacher');
ok('加入单词本', WB.mine().length === 1);
ok('存的是正确的中文', WB.mine()[0].zh === '老师');
ok('新词熟练度是 1 星', WB.mine()[0].box === 1);
let dup = WB.add('teacher');
ok('重复添加会被拦住', dup.ok === false && dup.dup === true);
ok('重复添加不会变两条', WB.mine().length === 1);
WB.add('doctor'); WB.add('nurse');
ok('可以加多个词', WB.mine().length === 3);
const bad = WB.add('qqqq');
ok('查不到的词也能加（标记待补）', bad.ok === true && bad.word.zh.indexOf('还没查到') >= 0);
WB.del(bad.word.id);
ok('可以删除', WB.mine().length === 3);
ok('不熟的排前面', WB.mine()[0].box <= WB.mine()[WB.mine().length - 1].box);

/* ---------- 4. 出题 ---------- */
console.log('\n[4] 出题');
reset();
ok('空单词本出不了题', WB.buildQuiz(8).length === 0);
['teacher', 'doctor', 'nurse', 'driver', 'cook', 'waiter'].forEach(w => WB.add(w));
let qs = WB.buildQuiz(8);
ok('出题数量正确', qs.length === 6, 'got=' + qs.length);
ok('每题 4 个选项', qs.every(q => q.opts.length === 4));
ok('每题的正确答案在选项里', qs.every(q => q.opts.indexOf(q.ans) >= 0));
ok('选项不重复', qs.every(q => new Set(q.opts).size === 4));
ok('两种题型交替出现', qs.some(q => q.askEn) && qs.some(q => !q.askEn));
/* 干扰项必须是真实存在的词 */
const allZh = new Set(D.list.map(w => w.zh));
const allEn = new Set(D.list.map(w => w.en));
ok('干扰项都是词库里真实存在的词', qs.every(q => q.opts.every(o => q.askEn ? allZh.has(o) : allEn.has(o))));
ok('干扰项不会混进正确答案本身', qs.every(q => q.opts.filter(o => o === q.ans).length === 1));

/* ---------- 5. 判题：答对 ---------- */
console.log('\n[5] 判题 · 答对');
reset();
WB.add('teacher');
let q0 = WB.buildQuiz(1)[0];
let beforeBox = WB.mine()[0].box;
let j = WB.judge(q0, q0.ans);
ok('答对判为 true', j.ok === true);
ok('熟练度 +1', WB.mine()[0].box === beforeBox + 1, 'box=' + WB.mine()[0].box);
ok('答对计数 +1', WB.mine()[0].right === 1);
ok('答对不进错题本', WB.wrongList().length === 0);

/* ---------- 6. 判题：答错 → 错题本 ---------- */
console.log('\n[6] 判题 · 答错 → 进错题本');
reset();
WB.add('teacher');
let q1 = WB.buildQuiz(1)[0];
let wrongOpt = q1.opts.filter(o => o !== q1.ans)[0];
let j2 = WB.judge(q1, wrongOpt);
ok('答错判为 false', j2.ok === false);
ok('答错进错题本', WB.wrongList().length === 1);
ok('错题本记了正确和错误答案', WB.wrongList()[0].your === wrongOpt && WB.wrongList()[0].right === q1.ans);
ok('错题本带中文提示', WB.wrongList()[0].note.indexOf('=') > 0, WB.wrongList()[0].note);
ok('答错不扣水滴', (S.state.water || 0) === 0);
ok('答错不扣阳光', (S.state.sun || 0) === 20);
ok('答错熟练度不会低于 1', WB.mine()[0].box >= 1);
/* 同一个词再错一次，次数累加而不是新增一条 */
WB.judge(q1, wrongOpt);
ok('同词再错只累加次数', WB.wrongList().length === 1 && WB.wrongList()[0].times === 2);

/* ---------- 7. 答对后错题自动消失 ---------- */
console.log('\n[7] 会了就出本子');
reset();
WB.add('teacher');
let q2 = WB.buildQuiz(1)[0];
WB.judge(q2, q2.opts.filter(o => o !== q2.ans)[0]);
ok('错了一次，在本子里', WB.wrongList().length === 1);
WB.judge(q2, q2.ans);
ok('答对后自动从错题本撤掉', WB.wrongList().length === 0);

/* ---------- 8. 错题重练 ---------- */
console.log('\n[8] 错题重练');
reset();
['teacher', 'doctor'].forEach(w => { WB.add(w); });
let q3 = WB.buildQuiz(2);
q3.forEach(q => WB.judge(q, q.opts.filter(o => o !== q.ans)[0]));
ok('两道都错了，本子里 2 条', WB.wrongList().length === 2);
let st8 = WB.start('wrong');
ok('可以开始错题重练', st8 === true);
ok('错题模式标记正确', WB.quiz && WB.quiz.mode === 'wrong');
ok('重练的全部来自错题', WB.quiz.list.length === 2, 'n=' + (WB.quiz && WB.quiz.list.length));
WB.quiz.list.forEach(q => WB.judge(q, q.ans));
ok('全部答对后错题本清空', WB.wrongList().length === 0);

/* ---------- 9. 完整答题流程 ---------- */
console.log('\n[9] 完整答题流程');
reset();
['teacher', 'doctor', 'nurse', 'driver'].forEach(w => WB.add(w));
WB.start('normal');
ok('开始了 4 题', WB.quiz.list.length === 4);
ok('起始在第 1 题', WB.quiz.idx === 0);
Kid.act('wbPick', '0');
ok('选了一个选项后被记下', WB.quiz.picks[0] !== undefined);
const pickAgain = Kid.act('wbPick', '1');
ok('同一题不能重复改答案', pickAgain === false);
Kid.act('wbNext');
ok('进入第 2 题', WB.quiz.idx === 1);
/* 一路答完 */
let guard = 0;
while (WB.quiz && guard++ < 20) { Kid.act('wbPick', '0'); Kid.act('wbNext'); }
ok('答完自动收尾', WB.quiz === null);
ok('收尾时弹了结算窗', !!modal && modal.title.indexOf('/') > 0, modal && modal.title);

/* ---------- 10. 中途退出 ---------- */
reset();
['teacher', 'doctor'].forEach(w => WB.add(w));
WB.start('normal');
Kid.act('wbQuit');
ok('可以中途退出', WB.quiz === null);

/* ---------- 11. 朗读 ---------- */
console.log('\n[11] 朗读');
reset();
spoken.length = 0;
Kid.act('wbSay', 'teacher');
ok('朗读被调用', spoken.length === 1 && spoken[0] === 'teacher');

/* ---------- 12. 渲染 ---------- */
console.log('\n[12] 页面渲染');
reset();
['teacher', 'doctor'].forEach(w => WB.add(w));
WB.buildQuiz(1);
let h1 = WB.panel();
ok('面板能渲染', typeof h1 === 'string' && h1.length > 200);
ok('面板无 undefined', h1.indexOf('undefined') < 0);
ok('面板无 NaN', h1.indexOf('NaN') < 0);
ok('面板含查词输入框', h1.indexOf('wb-input') >= 0);
ok('面板含单词本标题', h1.indexOf('我的单词本') >= 0);
ok('面板含错题本区块', h1.indexOf('错题本') >= 0);
/* 答题界面 */
WB.start('normal');
let h2 = WB.quizPanel();
ok('答题界面能渲染', typeof h2 === 'string' && h2.length > 200);
ok('答题界面无 undefined', h2.indexOf('undefined') < 0);
ok('答题界面有选项按钮', h2.indexOf('wbPick') >= 0);
/* 空状态 */
reset();
let h3 = WB.panel();
ok('空单词本能正常渲染', h3.indexOf('undefined') < 0 && h3.indexOf('还是空的') >= 0);
/* 挂在英语页里 */
reset(); WB.add('teacher');
Kid.page = 'english';
let hEn = Kid.render();
ok('英语页里出现查单词区块', hEn.indexOf('查单词') >= 0);
ok('英语页渲染无 undefined', hEn.indexOf('undefined') < 0);

/* ---------- 13. 错题本删除与清空 ---------- */
console.log('\n[13] 错题本管理');
reset();
WB.add('teacher');
let q4 = WB.buildQuiz(1)[0];
WB.judge(q4, q4.opts.filter(o => o !== q4.ans)[0]);
ok('有 1 条错题', WB.wrongList().length === 1);
Kid.act('wbWrongDel', WB.wrongList()[0].id);
ok('可以删单条', WB.wrongList().length === 0);
WB.judge(q4, q4.opts.filter(o => o !== q4.ans)[0]);
Kid.act('wbWrongClear');
ok('可以清空（带二次确认）', WB.wrongList().length === 0);
ok('清空后单词本还在', WB.mine().length === 1);

/* ---------- 14. 中译英（双向查词） ---------- */
console.log('\n[14] 中译英 · 双向查词');
reset();
let z1 = WB.search('老师');
ok('中文能查英文', z1.hit === 'exact' && z1.list.some(w => w.en === 'teacher'), JSON.stringify(z1.list.slice(0,3).map(w=>w.en)));
ok('标记了查询方向是中文', z1.dir === 'zh');
ok('查「医生」出 doctor', WB.search('医生').list.some(w => w.en === 'doctor'));
ok('查「跑」出 run', WB.search('跑').list.some(w => w.en === 'run'));
ok('查「游泳」出 swim', WB.search('游泳').list.some(w => w.en === 'swim'));
ok('中文查不到时返回 none', WB.search('这个词肯定没有').hit === 'none');
ok('中文查不到时 dir 仍是 zh', WB.search('这个词肯定没有').dir === 'zh');
ok('带分号的释义能被拆开匹配（开心→happy）', WB.search('开心').list.some(w => w.en === 'happy'));
/* 英文不受影响 */
let z2 = WB.search('teacher');
ok('英文查询方向是 en', z2.dir !== 'zh' && z2.hit === 'exact');
ok('英文仍能查出中文', z2.list[0].zh === '老师');
/* 中文结果里不应出现空释义 */
ok('中文命中的词都有英文和中文', z1.list.every(w => w.en && w.zh));

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
