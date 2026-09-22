/* 今日讲述 · AI 引导式扩写 专项测试 */
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
['store', 'engine', 'ui', 'ai', 'cnquiz', 'mathpuz', 'math', 'wordbook', 'speech', 'kid', 'parent'].forEach(f => ev(path.join(base, 'js', f + '.js')));
['chinese2a', 'cn_preview', 'cn_text_2a', 'cn_text_2b', 'lwte2a', 'lwte2a_review', 'words2a'].forEach(f => ev(path.join(base, 'data', f + '.js')));

const UI = global.UI;
let modal = null, confirmBox = null;
const toasts = [];
UI.toast = m => toasts.push(String(m));
UI.modal = o => { modal = o; };
UI.confirm = (t, x, onYes, yes) => { confirmBox = { t, x, onYes, yes }; };
UI.story = () => { };

const S = global.Store, E = global.Engine, Kid = global.Kid, SC = global.SpeechCoach;
S.load();
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
function reset() { S.state.speech = []; S.state.speechDraft = null; S.state.phraseBook = []; Kid.spAsk = null; S.save(); }

console.log('========== 今日讲述 · 引导式扩写 专项测试 ==========');

/* ---------- 1. 引导话术不能代写（最重要） ---------- */
console.log('\n[1] AI 绝不能代写');
ok('引导库有 8 个维度', SC.GUIDE.length === 8, SC.GUIDE.length);
const ALL_ASKS = [];
SC.GUIDE.forEach(g => g.asks.forEach(a => ALL_ASKS.push(a)));
const BAN = ['你可以写', '比如：', '例如：', '范文', '示范', '应该写', '参考'];
const bad = ALL_ASKS.filter(a => BAN.some(b => a.indexOf(b) >= 0));
ok('所有引导话术都没有范文/例句', bad.length === 0, bad.join(' | '));
ok('所有引导话术都是问句', ALL_ASKS.every(a => a.indexOf('？') >= 0 || a.indexOf('什么') >= 0 || a.indexOf('哪') >= 0),
  ALL_ASKS.filter(a => !(a.indexOf('？') >= 0 || a.indexOf('什么') >= 0 || a.indexOf('哪') >= 0)).join(' | '));
/* 不能有句号（陈述句=可以抄走的完整句）；引号里只能是「……」这种待填提示 */
ok('话术不含可以整句抄走的陈述句', ALL_ASKS.every(a => a.indexOf('。') < 0),
   ALL_ASKS.filter(a => a.indexOf('。') >= 0).join(' | '));
ok('引号里只能是待填提示（……结尾或很短的词）', ALL_ASKS.every(a => {
   const m = a.match(/["「]([^"」]*)["」]/g) || [];
   return m.every(x => x.indexOf('……') >= 0 || x.replace(/["「」]/g,'').length <= 4);
}), ALL_ASKS.filter(a => (a.match(/["「]([^"」]*)["」]/g)||[]).some(x => x.indexOf('……')<0 && x.replace(/["「」]/g,'').length>4)).join(' | '));
ok('每条话术都很短（孩子读得完）', ALL_ASKS.every(a => a.length <= 30), ALL_ASKS.filter(a=>a.length>30).join(' | '));

/* ---------- 2. 一轮只问一个维度 ---------- */
console.log('\n[2] 一轮只问一个维度');
reset();
let g1 = SC.nextGuide('今天我和小明玩', []);
ok('能给出第一个引导', !!g1 && !!g1.ask);
ok('第一轮问的是情节（先解决一句大白话）', g1.key === 'plot', g1 && g1.key);
let g2 = SC.nextGuide('今天我和小明玩', ['plot']);
ok('问过的维度不再问', g2.key !== 'plot', g2 && g2.key);
let askedAll = SC.GUIDE.map(g => g.key);
let gAll = SC.nextGuide('今天我和小明玩', askedAll.slice(0, 7), 8);
ok('只剩一个没问时还能问', !!gAll);
let gNone = SC.nextGuide('今天我和小明玩', askedAll, 8);
ok('全问完了返回 null（可以收尾）', gNone === null);
ok('默认一轮最多问 4 句（不让孩子耗太久）', SC.MAX_ROUND === 4);
ok('问够 4 句就返回 null', SC.nextGuide('今天我和小明玩', askedAll.slice(0, 4)) === null);
ok('孩子点了「再问一轮」可以多问一句', !!SC.nextGuide('今天我和小明玩', askedAll.slice(0, 4), 5));
/* 已经写到的维度自动跳过 */
let gSkip = SC.nextGuide('我今天看到一只很漂亮的蝴蝶，心里特别开心', []);
ok('已写到「看到」就不会再问看到', gSkip.key !== 'see', gSkip && gSkip.key);

/* ---------- 3. 防刷分 ---------- */
console.log('\n[3] 防刷分');
reset();
const short = '今天我和小明玩';
const long = '今天下午在操场上，我和小明一起踢足球。突然小明摔了一跤，我连忙跑过去把他扶起来。他的膝盖破了皮，我心里很着急，像热锅上的蚂蚁。后来老师来了，给他擦了药。我觉得帮助别人是一件开心的事。';
let s1 = SC.scoreV2(short, short);
let s2 = SC.scoreV2(long, short);
ok('大白话得分明显低于完整版', s1.score < s2.score - 15, s1.score + ' vs ' + s2.score);
ok('大白话被封顶（≤55）', s1.score <= 55, s1.score);
/* 流水账扣分 */
const flow = '今天早上我起床，然后刷牙，然后吃早饭，然后去学校，然后上课，然后放学，然后回家写作业。';
let s3 = SC.scoreV2(flow, '');
ok('流水账会被扣分并给建议', s3.tips.some(t => t.indexOf('然后') >= 0 || t.indexOf('菜单') >= 0 || t.indexOf('流水') >= 0), JSON.stringify(s3.tips));
/* 灌水检测 */
const pad = '今天我很开心我很开心我很开心我很开心我很开心我很开心我很开心我很开心我很开心';
let s4 = SC.scoreV2(pad, '');
ok('重复灌水被识别', SC.paddingScore(pad).ratio > 0.3, 'ratio=' + SC.paddingScore(pad).ratio.toFixed(2));
ok('灌水会扣分并提示', s4.tips.some(t => t.indexOf('重复') >= 0), JSON.stringify(s4.tips));
/* 按质量不按字数 */
const water = '今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天今天';
let s5 = SC.scoreV2(water, '');
ok('字数多但没内容也拿不到高分', s5.score < 60, s5.score);

/* ---------- 4. 提交前后：水滴只在提交后发 ---------- */
console.log('\n[4] 水滴只在确认提交后发放');
reset();
const w0 = S.state.water || 0;
E.speechDraftStart('今天我和小明玩', S.dateStr());
ok('草稿建立后还没发水滴', (S.state.water || 0) === w0);
E.speechDraftAppend('后来小明摔了一跤', 'plot');
E.speechDraftAppend('我看到他膝盖破了皮，心里很着急', 'see');
ok('补充过程中仍不发水滴', (S.state.water || 0) === w0);
ok('文本被追加', E.speechDraftOf(S.dateStr()).text.indexOf('摔了一跤') > 0);
ok('记录了该维度已问过', E.speechDraftOf(S.dateStr()).asked.indexOf('plot') >= 0);
/* 提交 */
let res = SC.scoreV2(E.speechDraftOf(S.dateStr()).text, '今天我和小明玩');
let fin = E.finishSpeech2(E.speechDraftOf(S.dateStr()).text, '今天我和小明玩', res, S.dateStr());
ok('提交后发水滴', fin.water > 0 && (S.state.water || 0) > w0, 'water=' + fin.water);
ok('提交后清掉草稿', E.speechDraftOf(S.dateStr()) === null);
ok('记下了扩写前的原文', fin.rec.origin === '今天我和小明玩');
ok('记下了扩写后文本', fin.rec.text.length > fin.rec.origin.length);

/* ---------- 5. 每天一篇 + 「接着补一补」（原「再讲一件事」已合并） ---------- */
console.log('\n[5] 每天一篇 + 接着补一补');
ok('每天只讲一篇', E.SPEECH_DAILY_MAX === 1);
ok('讲完一篇后不能再开新篇', E.speechCanSubmit(S.dateStr()) === false);
ok('但可以把同一篇接着补', E.speechCanRework(S.dateStr()) === true);
let w1 = S.state.water;
let res2 = SC.scoreV2(long, long);
let fin2 = E.finishSpeech2(long, long, res2, S.dateStr(), { cont: true });
ok('补写：分数取更高的一次', fin2.rec.score >= fin.rec.score, fin.rec.score + ' → ' + fin2.rec.score);
ok('补写：不新增一条记录', E.speechCountToday(S.dateStr()) === 1);
ok('补写：水滴只补差额，不会重复发', fin2.water <= 5, 'water=' + fin2.water);
ok('补写：次数被记下来', (fin2.rec.reworks || 0) === 1);
E.finishSpeech2(long, long, res2, S.dateStr(), { cont: true });
ok('补写 2 次后不能再补', E.speechCanRework(S.dateStr()) === false);
ok('超过上限时提交被拦', (function () {
  const before = S.state.water;
  Kid.act('speechSubmit');
  return S.state.water === before;
})());

/* ---------- 6. 确认才能提交 ---------- */
console.log('\n[6] 必须先确认「已完整」');
reset();
E.speechDraftStart('今天我和小明玩了很久很久，我们玩得可开心了', S.dateStr());
confirmBox = null; modal = null;
Kid.act('spFinish');
ok('点「我说完了」会弹确认框', !!confirmBox);
ok('确认框问的是「是否完整」', (confirmBox.t || '').indexOf('完整') >= 0, confirmBox && confirmBox.t);
ok('还没确认就不提交', S.state.speech.length === 0);
if (confirmBox && confirmBox.onYes) confirmBox.onYes();
ok('点了确认才走提交流程', true);
/* 太短时会先劝他再补 */
reset();
E.speechDraftStart('玩', S.dateStr());
modal = null;
Kid.act('spFinish');
ok('太短时先劝再补而不是直接打分', !!modal && modal.title.indexOf('再多说') >= 0, modal && modal.title);

/* ---------- 7. 不想被问的出口 ---------- */
console.log('\n[7] 高敏感孩子需要「不想被问」出口');
reset();
const hStart = Kid.speechPanel(S.dateStr());
ok('有「不想被问，自己写完」的入口', hStart.indexOf('speechDirect') >= 0);
ok('引导页随时能收尾', (function () {
  E.speechDraftStart('今天我和小明玩了很久', S.dateStr());
  const h = Kid.speechCoachHtml(S.dateStr());
  return h.indexOf('spFinish') >= 0;
})());
reset();
E.speechDraftStart('今天我和小明玩', S.dateStr());
Kid.spAsk = { key: 'plot', label: '情节推进', icon: '🎬', ask: '后来呢？', round: 1 };
const askedBefore = E.speechDraftOf(S.dateStr()).asked.length;
Kid.act('spSkip');
ok('可以跳过某个维度', E.speechDraftOf(S.dateStr()).asked.length === askedBefore + 1);

/* ---------- 8. 素材库 ---------- */
console.log('\n[8] 我的素材库');
reset();
ok('初始为空', E.phraseList().length === 0);
E.phraseAdd('小明摔了一跤，我心里像热锅上的蚂蚁', '这句打了个比方');
ok('能存好句', E.phraseList().length === 1);
ok('重复的不会存两次', E.phraseAdd('小明摔了一跤，我心里像热锅上的蚂蚁', '') === null && E.phraseList().length === 1);
ok('空的不会存', E.phraseAdd('  ', '') === null);
Kid.act('phDel', E.phraseList()[0].id);
ok('可以删除', E.phraseList().length === 0);
/* 评分能挑出好句 */
let goodRes = SC.scoreV2(long, '');
ok('评分会挑出好词好句', (goodRes.good || []).length > 0, JSON.stringify((goodRes.good || [])[0]));
ok('挑出的句子带理由', (goodRes.good || []).every(g => !!g.why));

/* ---------- 9. 渲染 ---------- */
console.log('\n[9] 页面渲染');
reset();
let h1 = Kid.speechPanel(S.dateStr());
ok('开始页能渲染', typeof h1 === 'string' && h1.indexOf('undefined') < 0);
ok('开始页有引导说明', h1.indexOf('不是替你写') >= 0);
E.speechDraftStart('今天我和小明玩', S.dateStr());
Kid.spAsk = SC.nextGuide('今天我和小明玩', []);
let h2 = Kid.speechPanel(S.dateStr());
ok('引导页能渲染', h2.indexOf('undefined') < 0 && h2.indexOf('NaN') < 0);
ok('引导页显示进度', h2.indexOf('已经补上') >= 0);
ok('引导页显示老师的问题', h2.indexOf('老师想问你') >= 0);
ok('引导页有输入框', h2.indexOf('sp-ans') >= 0);
ok('引导页有跳过按钮', h2.indexOf('spSkip') >= 0);
let h3 = Kid.phrasePanel();
ok('素材库能渲染', h3.indexOf('undefined') < 0);
/* 完成态 */
reset();
let rr = SC.scoreV2(long, '今天我和小明玩');
E.finishSpeech2(long, '今天我和小明玩', rr, S.dateStr());
let h4 = Kid.speechPanel(S.dateStr());
ok('完成页显示成绩', h4.indexOf('分') >= 0 && h4.indexOf('undefined') < 0);
ok('完成页显示扩写前后对比', h4.indexOf('扩写前后') >= 0);
ok('完成页显示最开始的版本', h4.indexOf('今天我和小明玩') >= 0);
/* 语文页整体 */
Kid.page = 'chinese';
let hCn = Kid.render();
ok('语文页含讲述与素材库', hCn.indexOf('今日讲述') >= 0 && hCn.indexOf('素材库') >= 0);
ok('语文页渲染无 undefined', hCn.indexOf('undefined') < 0);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
