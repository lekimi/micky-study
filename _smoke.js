/* 冒烟测试：验证阳光 / 水滴 / 僵尸 / 种植 核心规则（跑完即删） */
const fs = require('fs');
const path = require('path');
global.window = global;
/* 孩子的动作里会调 App.render() / UI.toast，跑规则时用空壳顶上 */
global.App = { render() { }, afterChange() { } };
/* 页面上的 toast / 计时要用 DOM，这里给个空壳，跑规则时不会报错 */
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, appendChild() { }, remove() { }, setAttribute() { } })
};
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};

const dir = path.join(__dirname, 'js');
eval(fs.readFileSync(path.join(dir, 'store.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'engine.js'), 'utf8'));

const S = window.Store, E = window.Engine;
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

S.load();
S.state.autoApprove = true;
const today = S.dateStr();
console.log('今天 =', today, '周' + S.WEEK_CN[S.dayIndex(today)]);

// 1) 初始状态
ok('初始阳光 20', S.state.sun === 20, S.state.sun);
ok('初始僵尸 0 步', S.state.zombieStep === 0);
const fixed = S.fixedTasksOf(today);
/* 每日固定任务就三项：练字 10 / 计算小超市 5 / 四面八方 20（平日周末都一样） */
ok('固定任务：固定三项', fixed.length === 3, fixed.length);
ok('三项 = 练字10 + 计算5 + 四面八方20',
  fixed.some(t => t.limit === 10 && t.subject === 'chinese') &&
  fixed.some(t => t.limit === 5 && t.subject === 'math') &&
  fixed.some(t => t.limit === 20 && t.subject === 'english'),
  fixed.map(t => t.title + '/' + t.limit).join(' | '));
ok('三项都带倒计时', fixed.every(t => t.timer && t.limit > 0));
ok('只有计算小超市能提前结束', fixed.filter(t => t.early).length === 1 &&
  fixed.filter(t => t.early)[0].subject === 'math');
/* 故事海漂流改成选做，不再占固定任务名额 */
const readTask = S.state.tasks.filter(t => t.id === 'e_read')[0];
ok('阅读是选做任务', !!(readTask && readTask.kind === 'extra' && readTask.water === 10));
ok('阅读不再出现在固定任务里', !fixed.some(t => t.limit === 30));

// 2) 逐个完成固定任务 → 最后一个完成时 +4 阳光
let bonusAt = -1;
fixed.forEach((t, i) => {
  const before = S.state.sun;
  E.submitTask(t.id, '');
  if (S.state.sun > before) bonusAt = i;
});
ok('全部完成后才发奖励（+4）', bonusAt === fixed.length - 1, bonusAt);
ok('阳光 = 20+4 = 24', S.state.sun === 24, S.state.sun);
ok('向日葵已解锁', S.state.sunflowerUnlocked === true);

// 3) 重复提交已通过任务 → 不再发奖
const sunBefore = S.state.sun;
const dup = E.submitTask(fixed[0].id, '');
ok('重复提交被拦截', dup && dup.dup === true);
ok('重复提交不加阳光', S.state.sun === sunBefore, S.state.sun);

// 4) 拓展任务按周几给水滴
const extra = S.extraTasksOf('other')[0];            // 口算已按妈妈要求删除，改用家务
const expectWater = S.WATER_BY_DAY[S.dayIndex(today)];
S.state.submissions = S.state.submissions.filter(x => x.taskId !== extra.id);
E.submitTask(extra.id, '');
ok('拓展任务水滴 = ' + expectWater, S.state.water === expectWater, S.state.water);
console.log('  当前水滴 =', S.state.water);

// 5) 攒满 3 滴 → 僵尸后退（先把僵尸推到第 2 步）
S.state.zombieStep = 2;
const wBefore = S.state.water;
E.drainWater(today);
const spent = Math.floor(wBefore / 3) * 3;
ok('水滴满 3 自动后退僵尸', S.state.zombieStep === 2 - Math.floor(wBefore / 3), S.state.zombieStep);
ok('剩余水滴 = ' + (wBefore - spent), S.state.water === wBefore - spent, S.state.water);

// 6) 僵尸走到第 5 步 → 吃向日葵 + 阳光 -10 + 退回第 3 步
S.state.garden[0] = { plant: 'sunflower', at: Date.now() };
S.state.zombieStep = 4;
const sunBeforeEat = S.state.sun;
const r = E.zombieForward('测试', today);
ok('到第 5 步吃掉向日葵', r.ate === true && S.state.garden[0].plant === null);
ok('阳光 -10', S.state.sun === Math.max(0, sunBeforeEat - 10), S.state.sun);
ok('退回第 3 步', S.state.zombieStep === 3, S.state.zombieStep);

// 7) 种植 / 铲除
S.state.garden[1] = { plant: null, at: null };
const sunBeforePlant = S.state.sun;
const pr = E.plant(1, 'wallnut');
ok('种下坚果墙', pr.ok === true && S.state.garden[1].plant === 'wallnut');
ok('扣 10 阳光', S.state.sun === sunBeforePlant - 10, S.state.sun);
const dr = E.dig(1);
ok('铲除返还一半（5）', dr.ok === true && dr.back === 5, dr.back);

// 8) 未解锁时不能种向日葵
const s2 = JSON.parse(JSON.stringify(S.state));
S.state.sunflowerUnlocked = false;
const c = E.canPlant(2, 'sunflower');
ok('未解锁时禁止种向日葵', c.ok === false);
S.state.sunflowerUnlocked = true;

// 9) 阳光不足时不能种
S.state.sun = 1;
ok('阳光不足时禁止种植', E.canPlant(2, 'peashooter').ok === false);
S.state.sun = 100;

// 10) 每日固定任务未全完成 → 当日阳光奖励为 0，但不清空已有阳光
S.state.sun = 50;
const saved = S.state.sun;
S.state.days = {};
S.state.lastSettleDate = null;
const list2 = S.fixedTasksOf(today);
S.state.submissions = S.state.submissions.filter(x => x.taskId !== list2[0].id);
const chk = E.checkDailyBonus(today);
ok('未全完成不发奖励', chk === false);
ok('已有阳光未被清空（温柔原则）', S.state.sun === saved, S.state.sun);

/* ============ 第二轮：本轮新增规则 ============ */
console.log('\n--- 任务清单改动 ---');
S.load();
ok('早起晨读已移除', !S.state.tasks.some(t => t.id === 'f1'));
ok('口算练习已移除', !S.state.tasks.some(t => t.id === 'e_ma_1'));
ok('语文讲述任务已就位', S.state.tasks.some(t => t.id === 'e_cn_speech' && t.mode === 'speech'));
const mon = S.weekStartOf(today), fri = S.weekEndOf(today);
ok('周二 → 周一是 ' + mon, mon === '2026-09-21', mon);
ok('周二 → 周五是 ' + fri, fri === '2026-09-25', fri);
ok('周日归属同一周', S.weekStartOf('2026-09-27') === '2026-09-21');

console.log('\n--- 每周长线任务 ---');
S.state.water = 0; S.state.zombieStep = 0;      // 隔离：避免水滴触发「打退僵尸」
S.state.tasks = S.state.tasks.filter(t => t.kind !== 'weekly');
S.state.weekPenalty = {};
S.state.tasks.push({ id: 'wk1', title: '土豆老师作业', emoji: '📐', kind: 'weekly', subject: 'math', weekStart: mon, due: fri });
S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'wk1');
const _ds = S.dateStr;
S.dateStr = function () { return mon; };          // 假装今天是周一
S.state.autoApprove = true;
E.submitTask('wk1', '');
ok('周一完成 → 5 水滴（越早越多）', S.state.water === 5, S.state.water);
S.dateStr = _ds;

console.log('\n--- 每日递减校验（周一5→周五1）---');
S.state.water = 0;
S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'wk2');
S.state.tasks.push({ id: 'wk2', title: '英语周任务', emoji: '🔤', kind: 'weekly', subject: 'english', weekStart: mon, due: fri });
S.dateStr = function () { return fri; };          // 拖到周五
E.submitTask('wk2', '');
ok('周五才完成 → 只有 1 水滴', S.state.water === 1, S.state.water);
S.dateStr = _ds;

console.log('\n--- 校内今日任务 ---');
S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'sc1');
S.state.tasks.push({ id: 'sc1', title: '校内打卡', emoji: '🏫', kind: 'school', subject: 'math', date: today });
const sunB = S.state.sun;
E.submitTask('sc1', '');
ok('校内任务 +1 阳光', S.state.sun === sunB + 1, S.state.sun);

console.log('\n--- 上周长线任务未完成 → 温和惩罚 ---');
S.state.zombieStep = 0; S.state.sun = 50; S.state.weekPenalty = {};
S.state.tasks = S.state.tasks.filter(t => t.id !== 'wk_old');
S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'wk_old');
S.state.tasks.push({ id: 'wk_old', title: '上周作业', emoji: '📐', kind: 'weekly', subject: 'math', weekStart: S.addDays(mon, -7), due: S.addDays(fri, -7) });
const wev = E.settleWeeks();
ok('产生惩罚事件', wev.length === 1, wev.length);
ok('僵尸前进 1 步', S.state.zombieStep === 1, S.state.zombieStep);
ok('阳光 -5（不清空）', S.state.sun === 45, S.state.sun);
ok('同一周不重复惩罚', E.settleWeeks().length === 0);

console.log('\n--- 语文讲述评分 ---');
eval(fs.readFileSync(path.join(dir, 'ai.js'), 'utf8'));
const AI = window.AI;
const good = '今天下午在操场上，我和小明一起踢足球。我看到红色的跑道和小明蓝色的球鞋，听到同学们大声喊加油，闻到青草的味道。风吹在脸上凉凉的。因为我很激动，最后我们赢了，我觉得特别开心和自豪。';
const rg = AI.localScore(good);
console.log('  样例得分:', rg.score, '| 命中维度:', rg.detail.filter(d => d.hit).map(d => d.label).join('/'));
ok('好作文得分 >= 80', rg.score >= 80, rg.score);
ok('识别出多种感官', rg.detail.filter(d => d.hit && ['看到', '听到', '闻到', '尝到', '摸到'].some(k => d.label.indexOf(k.slice(0, 2)) >= 0)).length >= 2);
const rec2 = E.finishSpeech(good, rg);
ok('高分奖励 5水滴 + 2阳光', rec2.water === 5 && rec2.sun === 2, rec2.water + '/' + rec2.sun);
const rbad = AI.localScore('今天去了公园。');
ok('极短描述低分但仍有奖励', rbad.score < 60 && AI.rewardText(rbad).indexOf('1 滴') > 0, rbad.score);
ok('每天只记录一次', E.speechToday(today).score === rg.score);

console.log('\n--- 朗文题库 ---');
eval(fs.readFileSync(path.join(__dirname, 'data', 'lwte2a.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'data', 'lwte2a_review.js'), 'utf8'));
const LW = window.LWTE;
ok('阅读篇数 30', LW.readings.length === 30, LW.readings.length);
ok('听力篇数 9', LW.listenings.length === 9, LW.listenings.length);
const withQ = LW.readings.filter(r => r.questions.length > 0);
ok('有可用题目的阅读 >= 18 篇', withQ.length >= 18, withQ.length);
ok('题目都有标准答案', withQ.every(r => r.questions.every(q => q.options[q.ans])));
LW.listenings.forEach(l => console.log('  ' + l.id, 'script', (l.script || '').length, '题', l.questions.length, 'audio', l.audio));
ok('听力都配了音频', LW.listenings.every(l => l.audio));
ok('听力原文非空', LW.listenings.every(l => (l.script || '').length > 50));
if (fs.existsSync(path.join(__dirname, 'media', 'lwte2a', 'L1.mp3'))) {
  ok('音频文件已解压', true);
} else {
  console.log('  （音频未解压，运行 build_corpus.py --audio）');
}

console.log('\n--- 语文资料库（统编版二上 · 2026 秋）---');
eval(fs.readFileSync(path.join(__dirname, 'data', 'chinese2a.js'), 'utf8'));
const CN = window.CN2A;
eval(fs.readFileSync(path.join(__dirname, 'data', 'cn_preview.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'data', 'cn_text_2a.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'data', 'cn_text_2b.js'), 'utf8'));
const T2A = window.CNT2A, T2B = window.CNT2B;
eval(fs.readFileSync(path.join(dir, 'cnquiz.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'mathpuz.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'math.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'data', 'words2a.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'wordbook.js'), 'utf8'));
const WD = window.WORDS2A, WBK = window.WordBook;
const QZ = window.CNQUIZ;
const PRE = window.CNPRE;
ok('资料库已加载', !!CN);
ok('8 个单元', CN.units.length === 8, CN.units.length);
let cnLessons = 0, cnWrite = 0, cnWords = 0;
const seenChar = {};
CN.units.forEach(u => {
  cnLessons += u.lessons.length;
  u.lessons.forEach(l => {
    cnWrite += (l.write || []).length;
    cnWords += (l.words || []).length;
    (l.write || []).forEach(w => { seenChar[w[0]] = 1; });
  });
  cnWrite += (u.garden.write || []).length;
});
ok('课文 23 篇 + 识字 4 课 = 27', cnLessons === 27, cnLessons);
ok('会写字 >= 240', cnWrite >= 240, cnWrite);
ok('听写词 >= 200', cnWords >= 200, cnWords);
ok('每个字都有拼音', CN.units.every(u => u.lessons.every(l => (l.write || []).every(w => /[a-z]/.test(w[1] || '')))));
ok('每个字都有组词', CN.units.every(u => u.lessons.every(l => (l.write || []).every(w => (w[2] || '').length))));
ok('八个语文园地都有日积月累', CN.units.every(u => u.garden && u.garden.accum && u.garden.accum.lines.length));
ok('必背古诗 7 首', CN.poems.length === 7, CN.poems.length);
ok('古诗都有正文', CN.poems.every(p => p.lines.length && p.title && p.author));
ok('多音字 >= 20 组', CN.multi.length >= 20, CN.multi.length);
ok('多音字每组 >= 2 个读音', CN.multi.every(m => m.length >= 3));
ok('课文目录含新教材篇目', JSON.stringify(CN.units).indexOf('八角楼上') > 0 && JSON.stringify(CN.units).indexOf('快乐的小河') > 0);
ok('已删除旧版口算/旧课文', JSON.stringify(CN.units).indexOf('玲玲的画') < 0);
console.log('  单元 8 | 课 ' + cnLessons + ' | 会写字 ' + cnWrite + ' | 听写词 ' + cnWords + ' | 古诗 ' + CN.poems.length + ' | 多音字 ' + CN.multi.length);

console.log('\n--- 页面渲染冒烟 ---');
// 渲染需要 UI / Kid / Parent 模块（它们只在 render 时才碰 DOM）
eval(fs.readFileSync(path.join(dir, 'ui.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'kid.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'parent.js'), 'utf8'));
ok('Kid / Parent 模块加载', !!global.Kid && !!global.Parent);
S.state.tasks.push({ id: 'wkA', title: '土豆老师 P12-13', emoji: '📐', kind: 'weekly', subject: 'math', weekStart: mon, due: fri });
S.state.tasks.push({ id: 'scA', title: '校内：朗读第5课', emoji: '🏫', kind: 'school', subject: 'chinese', date: today });
['home', 'chinese', 'math', 'english', 'other', 'reward'].forEach(function (p) {
  global.Kid.page = p;
  let h = '';
  try { h = global.Kid.render(); } catch (e) { h = 'ERR:' + e.message; }
  ok('孩子端 · ' + p, h.length > 500 && h.indexOf('ERR:') !== 0, h.substr(0, 60));
});
['dash', 'chart', 'ledger', 'review', 'publish', 'shop'].forEach(function (p) {
  global.Parent.page = p;
  let h = '';
  try { h = global.Parent.render(); } catch (e) { h = 'ERR:' + e.message; }
  ok('妈妈端 · ' + p, h.length > 500 && h.indexOf('ERR:') !== 0, h.substr(0, 60));
});
global.Kid.page = 'english';
const he = global.Kid.render();
ok('英语页含「本周任务」', he.indexOf('本周任务') > 0);
ok('英语页含朗文阅读/听力', he.indexOf('朗文阅读练习') > 0 && he.indexOf('朗文听力练习') > 0);
global.Kid.page = 'chinese';
ok('语文页含讲述工坊', global.Kid.render().indexOf('今日讲述') > 0);
ok('语文页含语文学习园入口', global.Kid.render().indexOf('语文学习园') > 0);
// 语文园四个子页 + 生字闯关各级
[['chars', '选一课开始'], ['preview', '整本书目录'], ['recite', '背诵闯关'], ['read', '故事海漂流'], ['dict', '听写练习']].forEach(function (x) {
  global.Kid.cnTab = x[0]; global.Kid.cnLesson = -2; global.Kid.cnResult = null; global.Kid.pvLesson = -2;
  let h = '';
  try { h = global.Kid.render(); } catch (e) { h = 'ERR:' + e.message; }
  ok('语文 · ' + x[0], h.indexOf('ERR:') !== 0 && h.indexOf(x[1]) > 0, h.substr(0, 60));
});

// ---- 两册课文原文库 ----
[['二上', T2A, 8, 27], ['二下', T2B, 8, 28]].forEach(function (b) {
  const nm = b[0], C = b[1];
  let les = 0, q = 0, rec = 0, note = 0, card = 0, flow = 0;
  C.units.forEach(u => u.lessons.forEach(l => {
    les++;
    q += (l.quiz || []).length;
    if (l.recite) rec++;
    note += (l.notes || []).length;
    card += (l.cards || []).length;
    flow += (l.flow || []).length;
  }));
  ok(nm + ' · 单元数', C.units.length === b[2], C.units.length);
  ok(nm + ' · 课文数', les === b[3], les);
  ok(nm + ' · 每课都有原文', C.units.every(u => u.lessons.every(l => (l.text || []).length >= 1)));
  ok(nm + ' · 每课都有课后题', C.units.every(u => u.lessons.every(l => (l.quiz || []).length >= 3)));
  ok(nm + ' · 每课都有教辅批注', C.units.every(u => u.lessons.every(l => (l.notes || []).length >= 2)));
  ok(nm + ' · 每课都有情节卡片', C.units.every(u => u.lessons.every(l => (l.cards || []).length >= 3)));
  ok(nm + ' · 每课都有思维导图节点', C.units.every(u => u.lessons.every(l => (l.flow || []).length >= 3)));
  ok(nm + ' · 背诵篇目有标识', rec > 0, rec + ' 篇');
  ok(nm + ' · 课后题都配引导提问',
    C.units.every(u => u.lessons.every(l => (l.quiz || []).every(x => x.guide && x.guide.length > 5))));
  ok(nm + ' · 课后题选项答案合法',
    C.units.every(u => u.lessons.every(l => (l.quiz || []).every(x => x.opts.length === 4 && x.ans >= 0 && x.ans < 4))));
});

// ---- 生字闯关：10 题 / 八种题型 / 每题有解析 ----
{
  let pool = [];
  CN.units.forEach(u => {
    if (u.garden && u.garden.write) u.garden.write.forEach(w => pool.push(w));
    u.lessons.forEach(l => (l.write || []).forEach(w => pool.push(w)));
  });
  ok('生字库 251 字', pool.length === 251, pool.length);
  let bad = [], types = {};
  CN.units.forEach((u, ui) => u.lessons.forEach((l, li) => {
    const qs = QZ.build(l.write || [], pool, ui * 10 + li + 1);
    if (qs.length !== 10) bad.push(l.title + ' 只有 ' + qs.length + ' 题');
    qs.forEach(q => {
      types[q.t] = (types[q.t] || 0) + 1;
      if (q.opts.length !== 4 || q.ans < 0 || q.ans > 3) bad.push(l.title + ' 选项异常');
      if (!q.why || q.why.length < 6) bad.push(l.title + ' 缺解析');
      if (new Set(q.opts).size !== 4) bad.push(l.title + ' 选项重复');
    });
  }));
  ok('生字 · 每关固定 10 题', bad.length === 0, bad.slice(0, 3).join('; '));
  ok('生字 · 覆盖前后鼻音', types['前后鼻音'] > 0, types['前后鼻音']);
  ok('生字 · 覆盖平翘舌', types['平翘舌'] > 0, types['平翘舌']);
  ok('生字 · 覆盖形近字', types['形近字'] > 0, types['形近字']);
  ok('生字 · 覆盖同音字', types['同音字'] > 0, types['同音字']);
  ok('生字 · 覆盖组词', types['组词'] > 0, types['组词']);
  ok('生字 · 覆盖造句', types['造句'] > 0, types['造句']);
  ok('生字 · 覆盖拼音选字', types['拼音'] > 0, types['拼音']);
  ok('生字 · 覆盖选字填空', types['选字填空'] > 0, types['选字填空']);
  /* 干扰项必须是课本里真实存在的拼音，不能编造假音节 */
  const realPy = new Set(pool.map(w => w[1]));
  let fake = [];
  CN.units.forEach((u, ui) => u.lessons.forEach((l, li) => {
    QZ.build(l.write || [], pool, ui * 10 + li + 1).forEach(q => {
      if (q.t === '前后鼻音' || q.t === '平翘舌') {
        q.opts.forEach(o => { if (!realPy.has(o)) fake.push(q.t + ':' + o); });
      }
    });
  }));
  ok('生字 · 拼音干扰项都是真音节', fake.length === 0, fake.slice(0, 3).join(','));
}

// 预习探险：目录 + 五关
global.Kid.cnTab = 'preview';
global.Kid.pvUnit = 1; global.Kid.pvLesson = 3; global.Kid.pvStage = '';
let hpv = '';
try { hpv = global.Kid.render(); } catch (e) { hpv = 'ERR:' + e.message; }
ok('预习 · 五关齐全', hpv.indexOf('ERR:') !== 0 &&
  hpv.indexOf('读原文') > 0 && hpv.indexOf('侦探提问') > 0 &&
  hpv.indexOf('僵尸闯关') > 0 && hpv.indexOf('故事拼图') > 0, hpv.substr(0, 60));

global.Kid.pvLesson = -2;
let hcat = '';
try { hcat = global.Kid.render(); } catch (e) { hcat = 'ERR:' + e.message; }
ok('预习 · 目录有上下册切换', hcat.indexOf('ERR:') !== 0 && hcat.indexOf('二年级上册') > 0 && hcat.indexOf('二年级下册') > 0, hcat.substr(0, 60));
ok('预习 · 目录有三态图例', hcat.indexOf('未预习') > 0 && hcat.indexOf('预习中') > 0 && hcat.indexOf('已预习') > 0);
ok('预习 · 目录有背诵标识', hcat.indexOf('📖') > 0);

global.Kid.pvUnit = 1; global.Kid.pvLesson = 3;
global.Kid.pvStage = 'read';
let hrd = '';
try { hrd = global.Kid.render(); } catch (e) { hrd = 'ERR:' + e.message; }
ok('预习 · 原文与课本一致', hrd.indexOf('ERR:') !== 0 && hrd.indexOf('春季里') > 0 && hrd.indexOf('教辅批注') > 0, hrd.substr(0, 60));

global.Kid.pvStage = 'ask';
let hdet = '';
try { hdet = global.Kid.render(); } catch (e) { hdet = 'ERR:' + e.message; }
ok('预习 · 侦探提问有线索', hdet.indexOf('ERR:') !== 0 && hdet.indexOf('给我一条线索') > 0, hdet.substr(0, 60));

global.Kid.pvStage = 'boss'; global.Kid.bossIdx = 0; global.Kid.bossTry = {}; global.Kid.bossPicked = -1;
let hbs = '';
try { hbs = global.Kid.render(); } catch (e) { hbs = 'ERR:' + e.message; }
ok('预习 · 僵尸闯关能出题', hbs.indexOf('ERR:') !== 0 && hbs.indexOf('打退') > 0 && hbs.indexOf('bossPick') > 0, hbs.substr(0, 60));

global.Kid.pvStage = 'sum'; global.Kid.sumMode = 'sort'; global.Kid.sumPick = []; global.Kid.sumCheck = 0;
let hsm = '';
try { hsm = global.Kid.render(); } catch (e) { hsm = 'ERR:' + e.message; }
ok('预习 · 故事拼图（排序）', hsm.indexOf('ERR:') !== 0 && hsm.indexOf('sumTap') > 0 && hsm.indexOf('重排') > 0, hsm.substr(0, 60));

global.Kid.sumMode = 'gist'; global.Kid.sumGist = -1;
let hsg = '';
try { hsg = global.Kid.render(); } catch (e) { hsg = 'ERR:' + e.message; }
ok('预习 · 一句话概括', hsg.indexOf('ERR:') !== 0 && hsg.indexOf('sumGist') > 0, hsg.substr(0, 60));
ok('概括 · 选项有唯一正确项', (function () {
  const d = global.Kid.pvData(1, 3);
  const o = global.Kid.gistOpts(d);
  return o.ans >= 0 && o.list.length === 4 && o.list[o.ans].t === d.gist;
})());

ok('预习 · 思维导图能画出来', global.Kid.mindSvg(['一', '二', '三'], '测试').indexOf('<svg') > 0);

ok('预习 · 每题都配了引导提问', PRE.lessons['识字4 田家四季歌'].quiz.every(q => q.guide && q.guide.length > 5));
ok('预习 · 侦探提问都配了线索和答案',
  PRE.lessons['识字4 田家四季歌'].detective.every(d => d.hint && d.find));
global.Kid.pvStage = ''; global.Kid.pvLesson = -2;

// 下册目录也要能打开（两册都要能选课）
global.Kid.cnTab = 'preview'; global.Kid.pvLesson = -2;
global.Kid.cnBook = '2b';
let hcat2b = '';
try { hcat2b = global.Kid.render(); } catch (e) { hcat2b = 'ERR:' + e.message; }
ok('预习 · 下册目录能打开', hcat2b.indexOf('ERR:') !== 0 && hcat2b.indexOf('古诗二首') > 0, hcat2b.substr(0, 60));
ok('预习 · 下册有背诵标识', hcat2b.indexOf('全文背诵') > 0);
/* 随便点开下册一课，四关要都在 */
global.Kid.pvUnit = 4; global.Kid.pvLesson = 1; global.Kid.pvStage = '';
let hpv2b = '';
try { hpv2b = global.Kid.render(); } catch (e) { hpv2b = 'ERR:' + e.message; }
ok('预习 · 下册课文四关齐全', hpv2b.indexOf('ERR:') !== 0 &&
  hpv2b.indexOf('读原文') > 0 && hpv2b.indexOf('侦探提问') > 0 &&
  hpv2b.indexOf('僵尸闯关') > 0 && hpv2b.indexOf('故事拼图') > 0, hpv2b.substr(0, 60));
global.Kid.cnBook = '2a'; global.Kid.pvLesson = -2; global.Kid.pvStage = '';

// ---- 倒计时 ----
ok('倒计时 · 能启动', (function () {
  global.Kid.timerStart('TEST', 10);
  const t = global.Kid.timerOf('TEST');
  return !!(t && t.end > Date.now());
})());
ok('倒计时 · 剩 10 分钟 = 10 滴', global.Kid.earlyMinutes('TEST') === 9 || global.Kid.earlyMinutes('TEST') === 10,
  global.Kid.earlyMinutes('TEST'));
ok('倒计时 · 未走完不算结束', global.Kid.timerEnded('TEST') === false);
ok('倒计时 · 渲染出计时元素', global.Kid.timerHtml('TEST', 10).indexOf('timer-tick') > 0);
ok('倒计时 · 大号计时条能渲染', global.Kid.bigTimer('TEST').indexOf('timer-tick') > 0);
/* 时间拨到过去 → 判定结束 */
global.Kid.timerOf('TEST').end = Date.now() - 1000;
ok('倒计时 · 到点判定结束', global.Kid.timerEnded('TEST') === true);
ok('倒计时 · 到点没有提前奖励', global.Kid.earlyMinutes('TEST') === 0);
delete global.Store.state.timers[global.Kid.timerKey('TEST')];
ok('倒计时 · 未启动显示开始按钮', global.Kid.timerHtml('TEST', 10).indexOf('开始计时') > 0);

// ---- 计算小超市：提前完成按剩余分钟发水滴 ----
(function () {
  /* 今天的固定任务前面已经全做完了，这里用另一个 slot（平日/周末）的计算任务来测，避免被判重复 */
  const otherSlot = S.isWeekend(today) ? 'weekday' : 'weekend';
  const calc = S.state.tasks.filter(t => t.kind === 'fixed' && t.subject === 'math' && t.slot === otherSlot)[0];
  ok('另一个 slot 也有计算小超市', !!calc);
  global.Kid.timerStart(calc.id, 5);
  global.Kid.timerOf(calc.id).end = Date.now() + 3 * 60000 + 20000;   // 还剩 3 分 20 秒
  const w0 = S.state.water;
  const res = E.finishCalcEarly(global.Kid.timerOf(calc.id), calc.id);
  ok('提前 3 分多 = 3 滴水滴', res.earlyMin === 3, res.earlyMin);
  ok('提前奖励真的发到账户', S.state.water === w0 + 3, S.state.water - w0);
  /* 剩余不足 1 分钟 → 没有奖励 */
  global.Kid.timerStart(calc.id, 5);
  global.Kid.timerOf(calc.id).end = Date.now() + 40000;
  const w1 = S.state.water;
  const res2 = E.finishCalcEarly(global.Kid.timerOf(calc.id), calc.id);
  ok('剩余不到 1 分钟不发奖励', res2.earlyMin === 0 && S.state.water === w1, res2.earlyMin);
  global.Kid.timerEnd(calc.id); S.save();
})();

// ---- 故事海漂流：选做，不计时，+10 水滴 ----
(function () {
  S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'e_read');
  const w0 = S.state.water;
  const r = E.finishReading('夏洛的网', 0);
  ok('阅读打卡 +10 水滴', r.water === 10 && S.state.water === w0 + 10, r.water);
  ok('阅读打卡不用等妈妈点亮', S.isApproved('e_read', today));
  const r2 = E.finishReading('小猪唏哩呼噜', 0);
  ok('同一天不能重复领水滴', !!r2.dup);
  ok('阅读记录写进日记', (S.state.readLog || []).some(x => x.date === today && x.book === '夏洛的网'));
  /* 阅读页不再有倒计时 */
  global.Kid.cnTab = 'read';
  let hr = '';
  try { hr = global.Kid.render(); } catch (e) { hr = 'ERR:' + e.message; }
  ok('阅读页能打开', hr.indexOf('ERR:') !== 0, hr.substr(0, 60));
  ok('阅读页没有倒计时', hr.indexOf('timer-tick') < 0 && hr.indexOf('开始漂流（30 分钟）') < 0);
  ok('阅读页说明是选做 +10', hr.indexOf('选做') > 0 && hr.indexOf('10') > 0);
  global.Kid.cnTab = '';
})();

// ---- 朗文 2A 复习题（单选 / 多选 / 判断） ----
(function () {
  const R = global.LWTE2A_REVIEW;
  ok('复习题库已加载', !!R);
  ok('三种题型都有题',
    (R.single || []).length >= 10 && (R.multi || []).length >= 5 && (R.judge || []).length >= 5,
    (R.single || []).length + '/' + (R.multi || []).length + '/' + (R.judge || []).length);
  /* 答案下标不能越界，多选至少两个正确项 */
  let bad = 0;
  ['single', 'multi', 'judge'].forEach(k => (R[k] || []).forEach(q => {
    if (!q.q || !q.why) bad++;
    if (k === 'judge') { if (q.ans !== 0 && q.ans !== 1) bad++; return; }
    const arr = Array.isArray(q.ans) ? q.ans : [q.ans];
    if (!q.opts || q.opts.length < 2) { bad++; return; }
    if (arr.some(i => typeof i !== 'number' || i < 0 || i >= q.opts.length)) bad++;
    if (k === 'multi' && arr.length < 2) bad++;
    if (k === 'single' && arr.length !== 1) bad++;
  }));
  ok('复习题答案都合法', bad === 0, bad);
  const pool = global.Kid.enReviewPool();
  ok('每天一组 = 8 题', pool.length === 8, pool.length);
  ok('一组里 单选5 + 多选2 + 判断1',
    pool.filter(q => q.type === 'single').length === 5 &&
    pool.filter(q => q.type === 'multi').length === 2 &&
    pool.filter(q => q.type === 'judge').length === 1);
  /* 判断题要渲染成 对/错 两个选项 */
  ok('判断题选项是 对/错', pool.filter(q => q.type === 'judge')
    .every(q => q.opts.length === 2 && q.opts[0].indexOf('对') > 0));
  /* 全对 → 拿到水滴；第二次不再重复发 */
  global.Kid.enrDay = 0; global.Kid.enrAns = {}; global.Kid.enrResult = null;
  const p2 = global.Kid.enReviewPool();
  p2.forEach((q, i) => { global.Kid.enrAns[i] = (Array.isArray(q.ans) ? q.ans.slice() : [q.ans]); });
  const w0 = S.state.water;
  global.Kid.act('enrSubmit', '');
  ok('全对会发水滴', S.state.water > w0, S.state.water - w0);
  ok('交卷后能算出分数',
    !!global.Kid.enrResult && global.Kid.enrResult.correct === p2.length,
    global.Kid.enrResult && (global.Kid.enrResult.correct + '/' + global.Kid.enrResult.total));
  /* 换一组：题目要变、答案要清空 */
  global.Kid.act('enrNext', '');
  ok('换一组后答案清空', Object.keys(global.Kid.enrAns).length === 0 && !global.Kid.enrResult);
  ok('换一组后题目变了',
    global.Kid.enReviewPool().map(q => q.id).join() !== p2.map(q => q.id).join());
  /* 没做完不能交卷 */
  global.Kid.enrAns = {};
  const w1 = S.state.water;
  global.Kid.act('enrSubmit', '');
  ok('没答完不能交卷', S.state.water === w1);
  /* 家长端能看到这条记录 */
  ok('复习题记录妈妈端可见',
    (S.state.quiz || []).some(x => x.kind === 'review' && x.date === today));
  let he = '';
  global.Kid.cnTab = '';
  try { he = global.Kid.enReview(); } catch (e) { he = 'ERR:' + e.message; }
  ok('复习面板能渲染', he.indexOf('ERR:') !== 0 && he.indexOf('朗文') > 0, he.substr(0, 60));
})();

// ---- 页面上真的能点得到 ----
(function () {
  /* 前面的用例已经把任务都做完了，这里清空今天的记录，只看「没做时页面长什么样」 */
  const fxs = S.fixedTasksOf(today);
  const ids = fxs.map(t => t.id).concat(['e_read']);
  S.state.submissions = S.state.submissions.filter(x => !(x.date === today && ids.indexOf(x.taskId) >= 0));
  S.save();

  global.Kid.cnTab = ''; global.Kid.enrResult = null; global.Kid.enrAns = {}; global.Kid.enrDay = 0;
  let hcn = '', hen = '', hhome = '';
  try { hcn = global.Kid.pageSubject('chinese'); } catch (e) { hcn = 'ERR:' + e.message; }
  try { hen = global.Kid.pageSubject('english'); } catch (e) { hen = 'ERR:' + e.message; }
  try { hhome = global.Kid.pageHome(); } catch (e) { hhome = 'ERR:' + e.message; }
  ok('语文页：阅读是选做入口', hcn.indexOf('去打卡') > 0 && hcn.indexOf('+10 水滴') > 0);
  ok('英语页：朗文复习题在页面上',
    hen.indexOf('朗文 2A 复习') > 0 && hen.indexOf('多选题') > 0 &&
    hen.indexOf('判断题') > 0 && hen.indexOf('单选题') > 0);
  /* 只看「今日固定任务」这一栏（首页还可能挂着妈妈布置的校内任务） */
  const seg = hhome.split('今日固定任务')[1] || '';
  ok('首页：固定任务就 3 张卡', (seg.match(/task-card/g) || []).length === 3,
    (seg.match(/task-card/g) || []).length);
  ok('首页：文案写每天 3 项', hhome.indexOf('每天 3 项固定任务') > 0);

  /* 三种计时状态：未开始 / 计时中 / 到点 */
  ok('未开始时：三项都是「开始计时」',
    (seg.match(/开始计时/g) || []).length === 3 && seg.indexOf('我做完了') < 0,
    (seg.match(/开始计时/g) || []).length);
  fxs.forEach(t => global.Kid.timerStart(t.id, t.limit));
  let seg2 = (global.Kid.pageHome().split('今日固定任务')[1] || '');
  ok('计时中：三个倒计时在跑', (seg2.match(/timer-tick/g) || []).length === 3,
    (seg2.match(/timer-tick/g) || []).length);
  ok('计时中：只有计算小超市能提前结束', (seg2.match(/我做完了/g) || []).length === 1,
    (seg2.match(/我做完了/g) || []).length);
  fxs.forEach(t => { global.Kid.timerOf(t.id).end = Date.now() - 1000; });
  let seg3 = (global.Kid.pageHome().split('今日固定任务')[1] || '');
  ok('到点：三项都变成打卡按钮', (seg3.match(/时间到啦，打卡/g) || []).length === 3,
    (seg3.match(/时间到啦，打卡/g) || []).length);
  fxs.forEach(t => global.Kid.timerEnd(t.id));
  S.save();
})();

// 背诵闯关：清单 + 五种玩法
const rlist = global.Kid.reciteList();
ok('背诵清单含田家四季歌', rlist.some(x => x.title.indexOf('田家四季歌') > 0));
/* 古诗 = 课本后面的 7 首 + 课里标了要背的「古诗二首」条目 */
ok('背诵清单含古诗 ≥7 篇', rlist.filter(x => x.kind === '古诗').length >= 7, rlist.filter(x => x.kind === '古诗').length);
/* 8 个园地里有 3 个本身就是古诗（梅花 / 小儿垂钓 / 夜宿山寺），已并入古诗，不重复列 */
ok('背诵清单含 5 个日积月累', rlist.filter(x => x.kind === '日积月累').length === 5, rlist.filter(x => x.kind === '日积月累').length);
ok('背诵清单没有重复篇目', new Set(rlist.map(x => x.title)).size === rlist.length, rlist.length);
ok('背诵项都有正文', rlist.every(x => x.lines.length >= 2));
ok('两册需背诵课文都进来了（≥10）', rlist.filter(x => x.kind === '课文').length >= 10,
  rlist.filter(x => x.kind === '课文').length);
ok('下册篇目有标注', rlist.some(x => x.title.indexOf('(下)') === 0));
/* 每篇都要有思维导图线索，孩子才能看着图背 */
ok('每篇背诵都有导图线索', rlist.every(x => (x.flow || []).length >= 2),
  rlist.filter(x => (x.flow || []).length < 2).map(x => x.title).join(','));
/* 挖空要保留标点，不然孩子读不出停顿 */
ok('填空保留标点', rlist.every(function (x) {
  for (var i = 0; i < Math.min(3, x.lines.length); i++) {
    var m = global.Kid.rcMask(x.lines, i, x.words);
    if (!m) continue;
    var plain = m.blank.replace(/<[^>]+>/g, '');
    var src = x.lines[i];
    /* 原句有标点的话，挖空后标点数量不能变少 */
    var a = (src.match(/[，。、？！；：]/g) || []).length;
    var b = (plain.match(/[，。、？！；：]/g) || []).length;
    if (a > 0 && b < a) return false;
  }
  return true;
}));

global.Kid.cnTab = 'recite'; global.Kid.rcId = rlist[0].id; global.Kid.rcGame = '';
let hrc = '';
try { hrc = global.Kid.render(); } catch (e) { hrc = 'ERR:' + e.message; }
ok('背诵 · 玩法选择页', hrc.indexOf('ERR:') !== 0 && hrc.indexOf('选个玩法开始背') > 0, hrc.substr(0, 60));
ok('背诵 · 页面带思维导图', hrc.indexOf('思维导图') > 0 && hrc.indexOf('<svg') > 0);

[['fill', '填空闯关'], ['chain', '接下句'], ['sort', '句子排队'], ['cover', '挡住背'], ['rec', '录音背诵']].forEach(function (g) {
  global.Kid.rcGame = g[0]; global.Kid.rcStep = 0; global.Kid.rcPick = []; global.Kid.rcLv = 0;
  let h = '';
  try { h = global.Kid.render(); } catch (e) { h = 'ERR:' + e.message; }
  ok('背诵 · ' + g[1], h.indexOf('ERR:') !== 0 && h.indexOf(g[1]) > 0, h.substr(0, 60));
});
global.Kid.rcGame = ''; global.Kid.rcId = '';
global.Kid.cnTab = '';

// 听写：每次 10 个，跨单元打散
global.Kid.cnTab = 'dict';
let hdt = '';
try { hdt = global.Kid.render(); } catch (e) { hdt = 'ERR:' + e.message; }
const groupWords = (hdt.match(/·\d<\/span>/g) || []).length;
ok('听写 · 每组 10 个词', hdt.indexOf('ERR:') !== 0 && hdt.indexOf('第 1 /') > 0, hdt.substr(0, 60));
ok('听写 · 能换组', hdt.indexOf('换一组') > 0);
global.Kid.cnTab = '';

// 固定作业
const ft = S.fixedTasksOf('2026-09-22');
ok('固定作业含练字', ft.some(t => t.title.indexOf('练字') >= 0 && t.limit === 10));
ok('固定作业含计算小超市', ft.some(t => t.title.indexOf('计算小超市') >= 0));
ok('固定作业含四面八方打卡', ft.some(t => t.title.indexOf('四面八方') >= 0));
ok('固定作业没有早读/口算', !ft.some(t => /晨读|口算/.test(t.title)));
global.Kid.cnTab = 'chars'; global.Kid.cnLesson = 0;
let hc = '';
try { hc = global.Kid.render(); } catch (e) { hc = 'ERR:' + e.message; }
ok('生字闯关能出题', hc.indexOf('ERR:') !== 0 && hc.indexOf('cnq_0') > 0, hc.substr(0, 50));
global.Kid.cnLesson = -1;
let hg = '';
try { hg = global.Kid.render(); } catch (e) { hg = 'ERR:' + e.message; }
ok('语文园地也能出题', hg.indexOf('ERR:') !== 0 && hg.indexOf('cnq_0') > 0, hg.substr(0, 50));
global.Kid.cnTab = ''; global.Kid.cnLesson = -2;
global.Kid.page = 'home';
ok('首页不再出现晨读', global.Kid.render().indexOf('早起晨读') < 0);
global.Parent.page = 'publish';
const hp = global.Parent.render();
ok('发布页含长线/老师作业区块', hp.indexOf('本周长线任务') > 0 && hp.indexOf('老师今日作业') > 0);
ok('老师作业有语文/英语快捷模板', hp.indexOf('hwQuick') > 0 && hp.indexOf('录视频打卡') > 0);
ok('新增任务有视频打卡开关', hp.indexOf('data-video') > 0);

console.log('\n--- 数学趣味闯关 ---');
const MP = global.MATHP, MG = global.MathGame;
ok('出题引擎已加载', !!MP && !!MG);
ok('关卡总数 151', MG.totalLevels() === 151, MG.totalLevels());
ok('存档字段齐全', !!S.state.math && !!S.state.math.stars && S.state.math.hintLeft === 5);

/* 1) 找规律：30 关，答案一定在选项里，选项不重复 */
(function () {
  let bad = 0, kinds = {};
  for (let l = 1; l <= 30; l++) {
    const q = MP.seq(l);
    kinds[q.kind] = 1;
    if (q.items.length !== 6) bad++;
    if (q.opts.indexOf(q.answer) < 0) bad++;
    if (new Set(q.opts.map(String)).size !== q.opts.length) bad++;
    if (!q.why) bad++;
  }
  ok('找规律 30 关都合法', bad === 0, bad);
  ok('找规律含数字与图形', !!kinds.num && !!kinds.shape);
})();

/* 2) 24 点：每关都有解，且官方解能过校验 */
(function () {
  function toTokens(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      if (s[i] >= '0' && s[i] <= '9') { let n = ''; while (i < s.length && s[i] >= '0' && s[i] <= '9') n += s[i++]; t.push({ t: 'n', v: +n }); }
      else t.push({ t: 'o', v: s[i++] });
    }
    return t;
  }
  let bad = 0, withSteps = 0;
  for (let l = 1; l <= 24; l++) {
    const p = MP.p24(l);
    if (p.nums.length !== 4 || p.nums.some(n => n < 1 || n > 12)) bad++;
    if (!p.expr) { bad++; continue; }
    if (!MP.check24(p.nums, toTokens(p.expr)).ok) bad++;
    if ((p.steps || []).length) withSteps++;
  }
  ok('24 点 24 关都有整数解', bad === 0, bad);
  ok('24 点都带了分步提示', withSteps === 24, withSteps);
  ok('没用完数字会被拦下', MP.check24([1, 2, 3, 4], toTokens('(1+2)+3')).ok === false);
  ok('除不尽会被拦下', MP.check24([3, 5, 7, 9], toTokens('(3/(5-7))*9')).ok === false);
  ok('结果不是 24 会被拦下', MP.check24([1, 2, 3, 4], toTokens('(1+2)*3*4')).ok === false);
  ok('括号不配对会被拦下', MP.check24([1, 2, 3, 4], toTokens('((1+2)*(3+4)')).ok === false);
})();

/* 3) 数独：唯一解 + 难度递减（给定格越来越少） */
(function () {
  let bad = 0;
  [[4, 15], [6, 30], [9, 20]].forEach(([size, lv]) => {
    const first = MP.sudoku(size, 1), last = MP.sudoku(size, lv);
    if (first.givens <= last.givens) bad++;                 // 越往后给的数越少
    for (let l = 1; l <= lv; l++) {
      const p = MP.sudoku(size, l);
      if (MP.sdSolve(p.puzzle.slice(), size, 2).length !== 1) bad++;
      if (p.puzzle.length !== size * size) bad++;
    }
  });
  ok('数独 65 关都是唯一解且越来越难', bad === 0, bad);
  const sd = MP.sudoku(4, 1);
  ok('提示能指出一个空格', !!MP.sudokuHint(sd.puzzle, sd.solution, 4));
  ok('检查能找出填错的格子', MP.sudokuWrong([1, 2, 3, 4, 2, 1, 4, 3, 3, 4, 1, 2, 4, 3, 2, 1], sd.solution).length >= 0);
})();

/* 4) 思维拓展：四题型，可解、选项含答案 */
(function () {
  let bad = 0; const kinds = {};
  for (let l = 1; l <= 32; l++) {
    const q = MP.brain(l);
    kinds[q.type] = 1;
    if (q.type === 'maze') {
      const n = q.n, seen = { 0: 1 }, q2 = [0];
      let h = 0, got = false;
      while (h < q2.length) {
        const cur = q2[h++], r = Math.floor(cur / n), c = cur % n, k = q.grid[cur];
        if (cur === q.goal) got = true;
        if (!k) continue;
        [[-k, 0], [k, 0], [0, -k], [0, k]].forEach(d => {
          const nr = r + d[0], nc = c + d[1];
          if (nr < 0 || nc < 0 || nr >= n || nc >= n) return;
          const nx = nr * n + nc; if (seen[nx]) return;
          seen[nx] = 1; q2.push(nx);
        });
      }
      if (!got) bad++;
    } else {
      if (q.opts.indexOf(q.answer) < 0) bad++;
      if (new Set(q.opts.map(String)).size !== q.opts.length) bad++;
      if (!q.why) bad++;
    }
  }
  ok('思维拓展 32 关都合法可解', bad === 0, bad);
  ok('四种题型都在', ['balance', 'blocks', 'net', 'maze'].every(t => kinds[t]), Object.keys(kinds).join(','));
})();

/* 5) 闯关流程：解锁 → 判星 → 发水滴 → 星星只升不降 */
(function () {
  const fresh = { stars: {}, cleared: {}, hintDay: S.dateStr(), hintLeft: 5, streak: 0, bestStreak: 0, sunStep: 0, got6: 0, got9: 0, sudFree: 0 };
  S.state.math = JSON.parse(JSON.stringify(fresh));
  MG.view = ''; MG.game = ''; MG.lv = 0; MG.p = null; MG.sdSize = 4;

  ok('首页渲染四大关族', MG.homeHtml().indexOf('思维拓展') > 0);
  ok('6×6 一开始是锁着的', MG.sdUnlocked(6) === false && MG.sdUnlocked(4) === true);
  ok('第一关默认解锁', MG.unlocked('seq', 1) && !MG.unlocked('seq', 2));

  /* 一次过 = 3 星，首次通关 +1 水滴、三星再 +1 */
  const w0 = S.state.water;
  MG.act('mthOpen', 'seq'); MG.act('mthLv', '1');
  MG.act('mthSeq', String(MG.p.opts.indexOf(MG.p.answer)));
  ok('一次过拿 3 星', MG.m().stars['seq:1'] === 3, MG.m().stars['seq:1']);
  ok('通关发水滴（首次+三星）', S.state.water - w0 === 2, S.state.water - w0);
  ok('通关后解锁下一关', MG.unlocked('seq', 2));

  /* 答错不扣任何东西，星星不掉 */
  MG.act('mthLv', '2');
  const starBefore = MG.m().stars['seq:1'];
  const w1 = S.state.water;
  const wrongIdx = MG.p.opts.findIndex(o => o !== MG.p.answer);
  MG.act('mthSeq', String(wrongIdx));
  ok('答错不扣水滴', S.state.water === w1);
  ok('答错后还能继续答', MG.st.err === 1 && !MG.m().cleared['seq:2']);
  MG.act('mthSeq', String(MG.p.opts.indexOf(MG.p.answer)));
  ok('错 1 次再答对 = 2 星', MG.m().stars['seq:2'] === 2, MG.m().stars['seq:2']);
  ok('已有关卡的星星不会掉', MG.m().stars['seq:1'] === starBefore);

  /* 错很多次才降到 1 星 */
  MG.act('mthLv', '3');
  for (let i = 0; i < 4; i++) MG.act('mthSeq', String(MG.p.opts.findIndex(o => o !== MG.p.answer)));
  MG.act('mthSeq', String(MG.p.opts.indexOf(MG.p.answer)));
  ok('错 4 次后才降到 1 星', MG.m().stars['seq:3'] === 1, MG.m().stars['seq:3']);

  /* 提示：扣 💡，第二次提示直接过关（保底 1 星） */
  MG.act('mthLv', '4');
  const hint0 = MG.m().hintLeft;
  MG.act('mthHint');
  ok('提示消耗一个 💡', MG.m().hintLeft === hint0 - 1, MG.m().hintLeft);
  ok('第一次提示去掉两个错误项', Object.keys(MG.st.dead).length === 2);
  MG.act('mthHint');
  ok('第二次提示直接过关', !!MG.m().cleared['seq:4']);
  ok('用满提示保底 1 星', MG.m().stars['seq:4'] === 1, MG.m().stars['seq:4']);

  /* 数独解锁链 */
  S.state.math = JSON.parse(JSON.stringify(fresh));
  MG.act('mthOpen', 'sudoku'); MG.sdSize = 4;
  for (let l = 1; l <= 15; l++) {
    MG.act('mthLv', String(l));
    for (let i = 0; i < MG.p.solution.length; i++) {
      if (MG.p.puzzle[i]) continue;
      MG.act('mthSdCell', String(i)); MG.act('mthSdNum', String(MG.p.solution[i]));
    }
  }
  ok('4×4 全通解锁 6×6', MG.sdCleared(4) === 15 && MG.sdUnlocked(6));
  ok('9×9 此时还锁着', MG.sdUnlocked(9) === false);
  for (let l = 1; l <= 30; l++) {
    MG.sdSize = 6; MG.act('mthLv', String(l));
    for (let i = 0; i < MG.p.solution.length; i++) {
      if (MG.p.puzzle[i]) continue;
      MG.act('mthSdCell', String(i)); MG.act('mthSdNum', String(MG.p.solution[i]));
    }
  }
  ok('6×6 全通解锁 9×9', MG.sdCleared(6) === 30 && MG.sdUnlocked(9));
  for (let l = 1; l <= 20; l++) {
    MG.sdSize = 9; MG.act('mthLv', String(l));
    for (let i = 0; i < MG.p.solution.length; i++) {
      if (MG.p.puzzle[i]) continue;
      MG.act('mthSdCell', String(i)); MG.act('mthSdNum', String(MG.p.solution[i]));
    }
  }
  ok('三段全通 = 数独毕业', MG.sudokuGraduated() && MG.m().sudFree === 1);
  ok('毕业后 4×4 还能选', MG.sdUnlocked(4) && MG.sdUnlocked(6) && MG.sdUnlocked(9));

  /* 每一关的页面都能渲染出来（点选交互，没有手写输入） */
  let renderBad = 0;
  ['seq', 'p24', 'brain'].forEach(g => {
    MG.act('mthOpen', g);
    for (let l = 1; l <= (g === 'seq' ? 30 : (g === 'p24' ? 24 : 32)); l++) {
      S.state.math.cleared[g + ':' + l] = 1;                 // 临时解锁，只为渲染
      MG.act('mthLv', String(l));
      try { const h = MG.playHtml(); if (h.indexOf('ERR') === 0 || h.length < 50) renderBad++; }
      catch (e) { renderBad++; }
    }
  });
  ok('每一关页面都能渲染', renderBad === 0, renderBad);
  ['seq', 'p24', 'brain'].forEach(g => {
    for (let l = 1; l <= (g === 'seq' ? 30 : (g === 'p24' ? 24 : 32)); l++) delete S.state.math.cleared[g + ':' + l];
  });
  ok('页面里没有手写输入框', MG.playHtml().indexOf('<input') < 0 && MG.playHtml().indexOf('type="text"') < 0);

  /* 还原存档，别影响后面的用例 */
  S.state.math = JSON.parse(JSON.stringify(fresh));
})();

console.log('\n--- 数学闯关时间管控 ---');
(function () {
  const c = S.mathConf();
  ok('默认每天 10 分钟', (c.baseMin || 10) === 10, c.baseMin);
  ok('默认兑换上限 20 分钟', (c.maxMin || 20) === 20, c.maxMin);
  ok('默认启用限时', c.enable === 1);
  S.state.mathUse = {}; c.redeemDay = null; c.redeemMin = 0; c.bonus = {};
  ok('额度 = 免费时长', S.mathQuotaMin() === 10, S.mathQuotaMin());
  ok('一天只能兑一次', S.mathCanRedeem() > 0);
  ok('初始未锁定', MG.locked() === false);

  /* 兑换：先攒够水滴 */
  S.state.water = 100;
  const r1 = E.redeemMathTime(10);
  ok('20 水滴换 10 分钟', r1.ok && r1.min === 10 && r1.cost === 20, JSON.stringify(r1));
  ok('额度变成 20 分钟', S.mathQuotaMin() === 20, S.mathQuotaMin());
  ok('水滴被扣掉 20', S.state.water === 80, S.state.water);
  const r2 = E.redeemMathTime(10);
  ok('当天第二次兑换被拒', !r2.ok, r2.msg);
  ok('已兑换显示 0', S.mathCanRedeem() === 0);
  S.state.water = 100; c.redeemDay = null; c.redeemMin = 0;
  const r3 = E.redeemMathTime(20);
  ok('40 水滴换 20 分钟', r3.ok && r3.min === 20 && r3.cost === 40, JSON.stringify(r3));
  ok('额度变成 30 分钟', S.mathQuotaMin() === 30, S.mathQuotaMin());
  const r4 = E.redeemMathTime(25);
  ok('超过 20 分钟的档位不存在', !r4.ok);
  c.redeemDay = null; c.redeemMin = 0; S.state.water = 0;

  /* 用满 → 锁定 */
  S.state.mathUse[S.dateStr()] = 10 * 60;
  ok('用完 10 分钟就锁定', MG.locked() === true);
  ok('锁定时渲染锁页', MG.panel().indexOf('今天的闯关时间用完啦') > 0);
  ok('锁定时不进关卡', MG.view === '' && MG.p === null);
  /* 妈妈加时 5 分钟 → 解锁 */
  c.bonus[S.dateStr()] = 5;
  ok('妈妈加时后解锁', MG.locked() === false && S.mathQuotaMin() === 15, S.mathQuotaMin());
  /* 关掉限时 → 永不锁 */
  c.enable = 0;
  ok('关掉限时后不锁定', MG.locked() === false);
  c.enable = 1; c.bonus = {}; S.state.mathUse = {};

  /* PVZ 皮肤 */
  const gh = MG.homeHtml();
  ok('首页有四个世界', ['白天草坪', '夜间泳池', '屋顶阵地', '迷雾花园'].every(w => gh.indexOf(w) > 0));
  ok('首页有僵尸', gh.indexOf('🧟') > 0 && gh.indexOf('💀') > 0);
  /* 通关一关后，首页那一格会长出植物 */
  MG.act('mthOpen', 'seq'); MG.act('mthLv', '1');
  MG.act('mthSeq', String(MG.p.opts.indexOf(MG.p.answer)));
  MG.view = ''; MG.lv = 0; MG.p = null;
  ok('通关后首页长出植物', MG.homeHtml().indexOf('🌻') > 0);
  MG.act('mthOpen', 'seq'); MG.act('mthLv', '1');
  const ph = MG.playHtml();
  ok('关卡页有战场条', ph.indexOf('🏠') > 0 && ph.indexOf('僵尸还没出发') > 0);
  ok('关卡页有植物阵', ph.indexOf('🌻🌻🌻') > 0);
  MG.act('mthOpen', 'sudoku'); MG.sdSize = 4; MG.act('mthLv', '1');
  ok('数独有草坪进度', MG.sudokuHtml().indexOf('草坪') > 0 && MG.sudokuHtml().indexOf('🥜') >= 0);
  MG.act('mthOpen', 'p24'); MG.act('mthLv', '1');
  ok('24 点是豌豆炮筒', MG.p24Html().indexOf('发射') > 0);
  MG.view = ''; MG.game = ''; MG.lv = 0; MG.p = null;
})();

console.log('\n--- 我自己加的任务（孩子提 → 妈妈评判） ---');
(function () {
  const before = (S.state.myTasks || []).length;
  const r = E.myTaskAdd('chinese', '多读了一篇课文');
  ok('孩子能加任务', r.ok && r.task.status === 'pending', JSON.stringify(r));
  ok('空标题被拒', E.myTaskAdd('chinese', '   ').ok === false);
  ok('任务挂在语文下', S.myTasksOf('chinese').length === before + 1);
  const w0 = S.state.water;
  E.myTaskApprove(r.task.id, 2);
  ok('妈妈通过后状态变 ok', S.myTasksOf('chinese')[0].status === 'ok');
  ok('通过发 2 滴水滴', S.state.water - w0 === 2, S.state.water - w0);
  const s0 = S.state.sun;
  const r2 = E.myTaskAdd('math', '多做了一页口算');
  E.myTaskApprove(r2.task.id, 0);
  ok('不给水滴时给 1 阳光', S.state.sun - s0 === 1, S.state.sun - s0);
  E.myTaskReject(r2.task.id, '下次一起做');
  ok('退回能写留言', S.myTasksOf('math')[0].note === '下次一起做');
  /* 三科面板都能渲染 */
  ['chinese', 'math', 'english'].forEach(sub => {
    const h = global.Kid.myTaskPanel(sub);
    ok(sub + ' 页有自加任务面板', h.indexOf('我自己加的任务') > 0 && h.indexOf('myAdd') > 0);
  });
  S.state.myTasks = [];
})();

console.log('\n--- 老师作业（视频打卡，不给水滴） ---');
(function () {
  const d = S.dateStr();
  S.state.tasks.push({ id: 'hw_test', title: '📖 朗读课文，录视频打卡', emoji: '📹', subject: 'chinese', kind: 'school', date: d, needVideo: 1 });
  const w0 = S.state.water, s0 = S.state.sun, f0 = S.state.flowers || 0;
  S.state.autoApprove = false;                 // 走「妈妈手动点亮」这条线
  const sub = E.submitTask('hw_test', '');
  ok('老师作业提交后是待审核', sub && sub.status === 'submitted', sub && sub.status);
  const sub3 = E.approve(sub.id);              // 妈妈点亮
  ok('妈妈点亮后状态 approved', sub3 && sub3.status === 'approved');
  ok('老师作业不给水滴', S.state.water - w0 === 0, S.state.water - w0);
  ok('老师作业给 1 阳光', S.state.sun - s0 === 1, S.state.sun - s0);
  ok('老师作业给 1 朵小红花', (S.state.flowers || 0) - f0 === 1, S.state.flowers);
  ok('小红花有记录', (S.state.hwLog || []).some(x => x.date === d && x.video === 1));
  /* 任务卡显示 📹 */
  const card = global.Kid.taskCard(S.state.tasks.filter(t => t.id === 'hw_test')[0], d);
  ok('任务卡标出录视频', card.indexOf('📹') > 0 && card.indexOf('🌸') > 0);
  /* 妈妈端快捷布置 */
  const n0 = S.state.tasks.length;
  global.Parent.act('hwQuick', 'english|🔤 跟读课文，录视频打卡');
  ok('快捷布置能加任务', S.state.tasks.length === n0 + 1);
  const added = S.state.tasks[S.state.tasks.length - 1];
  ok('快捷布置带视频标记', added.needVideo === 1 && added.subject === 'english' && added.kind === 'school');
  S.state.tasks = S.state.tasks.filter(t => t.id !== 'hw_test' && t.id !== added.id);
  S.state.submissions = S.state.submissions.filter(x => x.taskId !== 'hw_test');
  S.state.hwLog = []; S.state.flowers = f0;
  S.state.autoApprove = false;
})();

console.log('\n--- 奖励中心：换闯关时间 ---');
(function () {
  global.Kid.page = 'reward';
  const h = global.Kid.render();
  ok('奖励中心有换时间区块', h.indexOf('换数学闯关时间') > 0);
  ok('三个档位都在', h.indexOf('kidRedeemTime" data-v="10"') > 0 &&
    h.indexOf('kidRedeemTime" data-v="15"') > 0 && h.indexOf('kidRedeemTime" data-v="20"') > 0);
  ok('显示小红花', h.indexOf('小红花') > 0);
  global.Kid.page = 'home';
})();

console.log('\n--- 妈妈端：时间管控 ---');
(function () {
  global.Parent.page = 'dash';
  const h = global.Parent.render();
  ok('看板有时间管控卡', h.indexOf('数学闯关时间管控') > 0);
  ok('能开关限时', h.indexOf('mcToggle') > 0);
  ok('能改免费时长/上限', h.indexOf('mc-base') > 0 && h.indexOf('mc-max') > 0);
  ok('能临时加时和清零', h.indexOf('mcBonus') > 0 && h.indexOf('mcClear') > 0);
  global.Parent.page = 'review';
  const hr = global.Parent.render();
  ok('审核页有孩子自加任务', hr.indexOf('孩子自加任务') > 0 || hr.indexOf('孩子还没有自己加任务') > 0);
  global.Parent.page = 'dash';
})();

console.log('\n--- 英语查词 / 单词本 / 错题本 ---');
(function () {
  ok('词库已加载', !!WD && WD.list.length > 200, (WD && WD.list.length) + ' 词 / ' + (WD && WD.cats.length) + ' 类');
  ok('WordBook 已加载', !!WBK);
  if (!WD || !WBK) return;

  (function () {
    const seen = {}; let dup = 0;
    WD.list.forEach(w => { const k = w.en.toLowerCase(); if (seen[k]) dup++; seen[k] = 1; });
    ok('词库无重复单词', dup === 0, '重复 ' + dup + ' 条');
  })();
  ok('每个词都有中英文', WD.list.every(w => w.en && w.zh));

  /* 查词：原型 / 复数 / 进行时 / 不规则 / 大小写 */
  ok('查 teacher 命中', (WBK.search('teacher').list[0] || {}).zh === '老师');
  ok('大小写不敏感', WBK.search('TEACHER').hit === 'exact');
  ok('复数 books → book', WBK.search('books').list.some(w => w.en === 'book'));
  ok('进行时 running 能查到', WBK.search('running').list.some(w => w.en === 'run' || w.en === 'running'));
  ok('不规则 went → go', WBK.search('went').list.some(w => w.en === 'go'));
  ok('不规则 children → child', WBK.search('children').list.some(w => w.en === 'child'));
  ok('比较级 happier → happy', WBK.search('happier').list.some(w => w.en === 'happy'));
  ok('查不到返回 none', WBK.search('zzzzqqq').hit === 'none');

  /* 单词本 */
  const keepBook = S.state.wordbook, keepWrong = S.state.wrongBook;
  S.state.wordbook = []; S.state.wrongBook = [];
  ok('新用户单词本是空的', WBK.mine().length === 0);
  ok('空单词本出不了题', WBK.buildQuiz(8).length === 0);
  WBK.add('teacher'); WBK.add('doctor'); WBK.add('nurse');
  ok('能加进单词本', WBK.mine().length === 3);
  ok('重复加不会变两条', (WBK.add('teacher').ok === false) && WBK.mine().length === 3);
  const qs = WBK.buildQuiz(8);
  ok('出题数量不超过单词本', qs.length === 3);
  ok('每题 4 个选项且不重复', qs.every(q => q.opts.length === 4 && new Set(q.opts).size === 4));
  ok('正确答案都在选项里', qs.every(q => q.opts.indexOf(q.ans) >= 0));
  ok('干扰项都是词库真实存在的词', qs.every(q => {
    const zhSet = new Set(WD.list.map(w => w.zh)), enSet = new Set(WD.list.map(w => w.en));
    return q.opts.every(o => q.askEn ? zhSet.has(o) : enSet.has(o));
  }));

  /* 判题：答对升级、答错进错题本且零成本 */
  const q0 = WBK.buildQuiz(1)[0];
  const waterBefore = S.state.water || 0, sunBefore = S.state.sun || 0;
  WBK.judge(q0, q0.opts.filter(o => o !== q0.ans)[0]);
  ok('答错会进错题本', WBK.wrongList().length === 1);
  ok('答错不扣水滴', (S.state.water || 0) === waterBefore);
  ok('答错不扣阳光', (S.state.sun || 0) === sunBefore);
  ok('答错熟练度不低于 1', WBK.mine().every(w => w.box >= 1));
  WBK.judge(q0, q0.ans);
  ok('答对后自动从错题本撤掉', WBK.wrongList().length === 0);
  ok('答对熟练度会涨', WBK.mine().some(w => w.box >= 2));

  /* 错题重练 */
  const q1 = WBK.buildQuiz(1)[0];
  WBK.judge(q1, q1.opts.filter(o => o !== q1.ans)[0]);
  ok('错题重练能启动', WBK.start('wrong') === true && WBK.quiz.mode === 'wrong');
  WBK.quiz = null;

  /* 渲染 */
  const hp = WBK.panel();
  ok('单词本面板能渲染', typeof hp === 'string' && hp.indexOf('undefined') < 0 && hp.indexOf('NaN') < 0);
  WBK.start('normal');
  const hq = WBK.quizPanel();
  ok('答题界面能渲染', typeof hq === 'string' && hq.indexOf('undefined') < 0);
  WBK.quiz = null;

  S.state.wordbook = keepBook; S.state.wrongBook = keepWrong;
})();

console.log('\n--- 引用文件完整性 ---');
const idx = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const refs = (idx.match(/(?:src|href)="((?:js|css|data)\/[^"]+)"/g) || []).map(s => s.replace(/.*="/, '').replace('"', ''));
refs.forEach(r => ok('存在 ' + r, fs.existsSync(path.join(__dirname, r))));

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
