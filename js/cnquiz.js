/* ==========================================================
   语文生字闯关 · 出题引擎
   一关固定 10 题，题型覆盖：
     n      前后鼻音（in/ing  en/eng  an/ang）
     s      平翘舌（z/zh  c/ch  s/sh）
     shape  形近字
     homo   同音字
     word   组词
     sent   造句（选字填空）
     py     看拼音选字
     wd     看词语选字
   每题都带 why（答错时的简短解析）
   ========================================================== */
(function () {
  var g = typeof window !== 'undefined' ? window : global;

  /* ---------------- 拼音工具 ---------------- */
  var TONE = {
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v'
  };
  function stripTone(py) {
    var out = '';
    for (var i = 0; i < py.length; i++) {
      var ch = py[i];
      out += (TONE[ch] || ch);
    }
    return out;
  }
  /* 拆出声母和韵母（够用即可） */
  var SM = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'z', 'c', 's', 'r', 'y', 'w'];
  function split(py) {
    var p = stripTone(py).toLowerCase();
    for (var i = 0; i < SM.length; i++) {
      if (p.indexOf(SM[i]) === 0) return { s: SM[i], y: p.slice(SM[i].length) };
    }
    return { s: '', y: p };
  }
  /* 前后鼻音：把 n 结尾与 ng 结尾互换 */
  function swapNasal(fin) {
    if (fin.length > 2 && fin.slice(-2) === 'ng') return fin.slice(0, -1);       // ing -> in
    if (fin.slice(-1) === 'n' && fin !== 'n') return fin + 'g';                 // in  -> ing
    return '';
  }
  /* 平翘舌：z/zh c/ch s/sh 互换 */
  var RETRO = { 'z': 'zh', 'c': 'ch', 's': 'sh', 'zh': 'z', 'ch': 'c', 'sh': 's' };
  function swapRetro(sm) { return RETRO[sm] || ''; }

  /* ---------------- 形近字表（易混字分组） ---------------- */
  var SHAPE = [
    ['人', '入', '八'], ['日', '曰', '田'], ['己', '已', '巳'], ['干', '于', '千'],
    ['土', '士'], ['大', '太', '犬'], ['天', '无', '夫'], ['王', '主', '玉'],
    ['木', '术', '本'], ['未', '末'], ['目', '自', '且'], ['白', '自', '百'],
    ['了', '子'], ['力', '刀'], ['儿', '几', '九'], ['小', '少'], ['山', '出'],
    ['牛', '午'], ['厂', '广'], ['尸', '户', '尺'], ['我', '找'], ['外', '处'],
    ['晴', '睛', '情', '清', '请'], ['青', '清', '情', '晴', '请'], ['浇', '烧', '绕', '饶'],
    ['桃', '跳', '挑', '逃'], ['孩', '该', '核'], ['哪', '那'], ['皮', '坡', '破', '波', '被'],
    ['披', '坡', '破', '波'], ['眼', '很', '跟', '根'], ['肚', '吐', '土'], ['顶', '项', '钉'],
    ['两', '俩'], ['宽', '完'], ['塘', '糖'], ['脑', '恼'], ['铜', '桐', '洞', '筒'],
    ['队', '对'], ['领', '邻'], ['巾', '币'], ['杨', '扬', '场', '汤'], ['柏', '伯', '拍'],
    ['棉', '绵'], ['杉', '衫'], ['化', '花', '华'], ['桂', '挂', '佳'], ['歌', '哥'],
    ['丛', '从'], ['深', '探'], ['猫', '描'], ['朋', '明'], ['熊', '能'], ['拍', '怕'],
    ['云', '去'], ['辛', '幸'], ['苦', '古'], ['忙', '忘'], ['肥', '胖'], ['场', '杨', '汤'],
    ['晴', '睛'], ['渴', '喝'], ['话', '活'], ['际', '标'], ['抬', '台'], ['答', '搭'],
    ['信', '言'], ['蛙', '娃', '洼'], ['孩', '刻'], ['跳', '逃', '桃'], ['傍', '旁', '榜'],
    ['海', '梅', '悔'], ['作', '做', '昨'], ['坏', '环'], ['给', '结'], ['法', '去'],
    ['知', '短'], ['识', '织'], ['肚', '肥'], ['宽', '家'], ['哪', '那', '挪'],
    ['极', '及', '级'], ['片', '斤'], ['带', '戴'], ['变', '弯'], ['北', '比'],
    ['冰', '水'], ['江', '红'], ['海', '每'], ['洋', '样'], ['田', '由', '甲'],
    ['底', '低'], ['岁', '多'], ['船', '沿'], ['铅', '沿'], ['珠', '株'], ['笔', '毛'],
    ['灯', '打'], ['电', '由'], ['发', '友'], ['先', '失'], ['闭', '闲'], ['脸', '检'],
    ['沉', '沈'], ['窗', '囱'], ['圆', '园'], ['汽', '气'], ['体', '休'], ['住', '往'],
    ['柱', '住'], ['称', '秤'], ['杆', '干'], ['船', '般'], ['站', '战'], ['然', '燃'],
    ['画', '划'], ['幅', '副'], ['评', '平'], ['报', '服'], ['纸', '低'], ['拿', '掌'],
    ['并', '开'], ['及', '极'], ['糟', '遭'], ['楼', '数'], ['脑', '胸'], ['筋', '助'],
    ['奖', '桨'], ['催', '摧'], ['评', '苹'], ['脏', '肚'], ['懒', '赖'], ['糟', '槽'],
    ['蜜', '密'], ['拨', '拔'], ['温', '湿'], ['暖', '缓'], ['该', '刻'], ['孩', '咳'],
    ['浇', '晓'], ['使', '便'], ['特', '持'], ['转', '传'], ['轻', '经'], ['城', '诚'],
    ['锋', '峰', '蜂'], ['洒', '酒'], ['温', '湿'], ['留', '榴'], ['冒', '帽'], ['需', '须'],
    ['迈', '边'], ['荆', '刺'], ['瓣', '辫', '辩'], ['莹', '萤'], ['觅', '觉'], ['献', '楠'],
    ['糕', '羔'], ['磨', '摩'], ['糖', '塘'], ['蔗', '遮'], ['熬', '傲'], ['售', '集'],
    ['确', '却'], ['汁', '计'], ['菜', '采'], ['具', '真'], ['桌', '卓'], ['味', '未'],
    ['宙', '庙'], ['州', '洲'], ['涌', '勇'], ['峰', '锋'], ['耸', '茸'], ['峡', '侠'],
    ['谊', '宜'], ['浓', '农'], ['齐', '济'], ['奋', '愤'], ['繁', '敏'], ['艾', '义'],
    ['舟', '丹'], ['堂', '赏'], ['乞', '气'], ['巧', '朽'], ['郎', '朗'], ['饼', '拼'],
    ['赏', '常'], ['菊', '鞠'], ['宵', '消'], ['传', '转'], ['统', '充'], ['菠', '波'],
    ['煎', '箭'], ['烧', '浇'], ['茄', '加'], ['烤', '考'], ['煮', '者'], ['爆', '暴'],
    ['炖', '顿'], ['蒸', '烝'], ['炸', '昨'], ['粥', '弱'], ['蛋', '蚕'], ['蘑', '磨'],
    ['菇', '姑'], ['郁', '有'], ['囱', '窗'], ['般', '船'], ['精', '睛'], ['灵', '录'],
    ['苹', '平'], ['叮', '丁'], ['咛', '宁'], ['渡', '度'], ['荫', '阴'], ['撑', '掌'],
    ['姨', '胰'], ['弟', '第'], ['拼', '饼'], ['母', '每'], ['抬', '胎'], ['戏', '找'],
    ['教', '孝'], ['室', '到'], ['课', '棵'], ['摆', '罢'], ['座', '坐'], ['靠', '告'],
    ['抢', '枪'], ['嘻', '喜'], ['肃', '萧'], ['晌', '响'], ['审', '申'], ['视', '现'],
    ['悦', '说'], ['悉', '采'], ['棚', '朋'], ['驮', '驼'], ['磨', '摩'], ['坊', '访'],
    ['浅', '线'], ['试', '式'], ['蹄', '啼'], ['既', '即'], ['突', '犬'], ['掉', '悼'],
    ['慌', '荒'], ['忠', '中'], ['盏', '浅'], ['稠', '调'], ['稀', '希'], ['渠', '染'],
    ['积', '织'], ['碰', '并'], ['宇', '字'], ['宙', '由'], ['稳', '急'], ['绑', '邦'],
    ['咳', '孩'], ['钩', '钓'], ['喷', '愤'], ['浴', '俗'], ['罩', '卓'], ['竖', '坚'],
    ['竿', '杆'], ['舞', '无'], ['痛', '通'], ['烦', '须'], ['蹲', '遵'], ['寂', '叔'],
    ['寞', '莫'], ['编', '遍'], ['顾', '颂'], ['颈', '劲'], ['蚣', '松'], ['牌', '碑'],
    ['坑', '抗'], ['籽', '仔'], ['泉', '原'], ['破', '坡'], ['搬', '般'], ['愣', '楞'],
    ['茵', '因'], ['缺', '缸'], ['挺', '庭'], ['舒', '舍'], ['绒', '戎'], ['翅', '翘'],
    ['膀', '榜'], ['斑', '班'], ['挣', '争'], ['茧', '虽'], ['规', '见'], ['待', '侍'],
    ['挪', '那'], ['挣', '睁'], ['射', '谢'], ['值', '植'], ['艰', '很'], ['箭', '前'],
    ['裂', '列'], ['窜', '串'], ['炎', '淡'], ['庄', '压'], ['稼', '家'], ['滋', '兹'],
    ['腾', '藤'], ['启', '户'], ['桑', '嗓'], ['棚', '硼'], ['轮', '论'], ['搬', '般'],
    ['凿', '齿'], ['渠', '梁'], ['妻', '凄'], ['探', '深'], ['奔', '卉'], ['制', '刷']
  ];

  /* ---------------- 造句题素材（句中挖一个字） ---------------- */
  var SENT = [
    { s: '小蝌蚪_____着长长的尾巴，快活地游来游去。', a: '甩' },
    { s: '青蛙_____着碧绿的衣裳，露着雪白的肚皮。', a: '披' },
    { s: '蒲公英妈妈准备了降落_____。', a: '伞' },
    { s: '苍耳给孩子穿上带刺的_____甲。', a: '铠' },
    { s: '农民伯伯早起勤耕作，归来_____月光。', a: '戴' },
    { s: '一年农事了，大家笑_____。', a: '盈盈' },
    { s: '春天像个害羞的小姑娘，_____遮掩掩。', a: '遮' },
    { s: '解冻的小溪_____叮咚咚，那是春天的琴声。', a: '叮' },
    { s: '邓爷爷精心地_____选了一棵茁壮的柏树苗。', a: '挑' },
    { s: '雪孩子冲进屋里，_____着呛人的烟找小白兔。', a: '冒' },
    { s: '妈妈的_____赞消除了我一天的疲劳。', a: '称' },
    { s: '纸船在水里_____呀漂，风筝在天上飘呀飘。', a: '漂' },
    { s: '北斗七星总是_____着北极星转。', a: '绕' },
    { s: '雾把大海_____了起来，什么都看不见了。', a: '藏' },
    { s: '日月潭湖中央的小岛把湖水_____成两半。', a: '分' },
    { s: '葡萄一大串一大串_____在绿叶底下。', a: '挂' },
    { s: '松鼠_____下一只纸船，放进小溪里。', a: '折' },
    { s: '雷锋叔叔_____着迷路的孩子，冒着蒙蒙细雨。', a: '抱' },
    { s: '千人糕要经过很多很多人的_____动才能做成。', a: '劳' },
    { s: '大象用耳朵一_____，就能把虫子赶跑。', a: '扇' }
  ];

  var Q = {
    stripTone: stripTone, split: split, swapNasal: swapNasal, swapRetro: swapRetro,
    SHAPE: SHAPE, SENT: SENT
  };

  /* ---------------- 打乱 + 取干扰项 ---------------- */
  function shuffle(arr, seed) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var r = (seed * 7 + i * 13 + 3) % (i + 1);
      var t = a[i]; a[i] = a[r]; a[r] = t;
    }
    return a;
  }
  function pickN(pool, n, seed, exclude) {
    var out = [];
    var cand = pool.filter(function (x) { return exclude.indexOf(x) < 0; });
    for (var i = 0; i < cand.length && out.length < n; i++) {
      var p = cand[(seed * 5 + i * 3) % cand.length];
      if (out.indexOf(p) < 0) out.push(p);
    }
    return out;
  }
  function uniq(a) {
    var o = [];
    a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); });
    return o;
  }

  /* ---------------- 主出题函数 ----------------
     chars: 本课生字 [ [字, 拼音, '组词|组词'] , ... ]
     pool : 全册生字（供干扰项）
     seed : 随机种子（同一天同一课结果稳定）
     返回 10 题
  --------------------------------------------- */
  Q.build = function (chars, pool, seed) {
    var qs = [];
    if (!chars || !chars.length) return qs;

    var allChars = pool.map(function (w) { return w[0]; });
    var pyMap = {};                      // 字 → 拼音
    var wordMap = {};                    // 字 → [组词]
    var baseMap = {};                    // 无声调拼音 → [字]
    pool.forEach(function (w) {
      pyMap[w[0]] = w[1];
      wordMap[w[0]] = (w[2] || '').split('|').filter(Boolean);
      var b = stripTone(w[1]);
      if (!baseMap[b]) baseMap[b] = [];
      if (baseMap[b].indexOf(w[0]) < 0) baseMap[b].push(w[0]);
    });

    /* 课本里真实出现过的所有拼音（带声调），干扰项只从这里取 */
    var realPys = uniq(pool.map(function (w) { return w[1]; }).filter(Boolean));

    /* 每种题型有配额，保证一关里八种都能见到 */
    var CAP = { 前后鼻音: 3, 平翘舌: 2, 形近字: 3, 同音字: 2, 组词: 2, 拼音: 2, 选字填空: 2, 造句: 1 };
    var B = { 前后鼻音: [], 平翘舌: [], 形近字: [], 同音字: [], 组词: [], 拼音: [], 选字填空: [], 造句: [] };
    function room(t) { return B[t].length < CAP[t]; }

    /* --- 题型 1：前后鼻音 --- */
    chars.forEach(function (w) {
      if (!room('前后鼻音')) return;
      var c = w[0], py = w[1];
      var sp = split(py), fin = sp.y;
      var otherFin = swapNasal(fin);
      if (!otherFin) return;
      var right = py;
      /* 干扰项只取课本里真实存在、韵母正好差 n/ng 的音，不编造假音节 */
      var sameSm = [], otherSm2 = [];
      realPys.forEach(function (kp) {
        if (kp === py) return;
        var ksp = split(kp);
        if (ksp.y !== otherFin) return;
        if (ksp.s === sp.s) sameSm.push(kp); else otherSm2.push(kp);
      });
      var wrongs = uniq(sameSm.concat(otherSm2)).slice(0, 3);
      if (wrongs.length < 3) return;
      var opts = shuffle([right].concat(wrongs), seed + 1);
      B.前后鼻音.push({
        t: '前后鼻音',
        q: '「' + c + '」的读音是哪一个？',
        opts: opts, ans: opts.indexOf(right),
        why: '「' + c + '」读 ' + right + '。注意 ' + (fin.slice(-2) === 'ng' ? 'ing/eng/ang' : 'in/en/an') +
          ' 是' + (fin.slice(-2) === 'ng' ? '后鼻音（舌头往后）' : '前鼻音（舌头往前）') + '，别和' +
          (fin.slice(-2) === 'ng' ? 'in/en/an' : 'ing/eng/ang') + '搞混啦。'
      });
    });

    /* --- 题型 2：平翘舌 --- */
    chars.forEach(function (w) {
      if (!room('平翘舌')) return;
      var c = w[0], py = w[1];
      var sp = split(py);
      var otherSm = swapRetro(sp.s);
      if (!otherSm) return;
      var right = py;
      /* 同样是只取课本里真实存在的音 */
      var sameY = [], otherY = [];
      realPys.forEach(function (kp) {
        if (kp === py) return;
        var ksp = split(kp);
        if (ksp.s !== otherSm) return;
        if (ksp.y === sp.y) sameY.push(kp); else otherY.push(kp);
      });
      var wrongs = uniq(sameY.concat(otherY)).slice(0, 3);
      if (wrongs.length < 3) return;
      var opts = shuffle([right].concat(wrongs), seed + 2);
      B.平翘舌.push({
        t: '平翘舌',
        q: '「' + c + '」的读音是哪一个？',
        opts: opts, ans: opts.indexOf(right),
        why: '「' + c + '」读 ' + right + '。' + sp.s + ' 是' +
          (sp.s.length === 2 ? '翘舌音（舌尖卷起来）' : '平舌音（舌尖放平）') + '，和 ' + otherSm + ' 不一样。'
      });
    });

    /* --- 题型 3：形近字 --- */
    chars.forEach(function (w) {
      if (!room('形近字')) return;
      var c = w[0];
      for (var i = 0; i < SHAPE.length; i++) {
        var grp = SHAPE[i];
        if (grp.indexOf(c) < 0) continue;
        var others = grp.filter(function (x) { return x !== c; });
        if (!others.length) continue;
        var words = wordMap[c] || [];
        var useWord = words.length ? words[0] : c;
        var wrongs = others.slice(0, 3);
        while (wrongs.length < 3) {
          var extra = pickN(allChars, 1, seed + wrongs.length + 11, [c].concat(wrongs))[0];
          if (!extra) break;
          wrongs.push(extra);
        }
        if (wrongs.length < 3) continue;
        var opts = shuffle([c].concat(wrongs), seed + 3 + B.形近字.length);
        B.形近字.push({
          t: '形近字',
          q: '「' + useWord + '」这个词语里应该用哪个字？',
          opts: opts, ans: opts.indexOf(c),
          why: '应该选「' + c + '」。' + c + ' 和 ' + others.join('、') +
            ' 长得很像，区别只在一点点笔画，写的时候要看仔细。'
        });
        break;
      }
    });

    /* --- 题型 4：同音字 --- */
    chars.forEach(function (w) {
      if (!room('同音字')) return;
      var c = w[0], b = stripTone(w[1]);
      var same = (baseMap[b] || []).filter(function (x) { return x !== c; });
      if (!same.length || !wordMap[c] || !wordMap[c].length) return;
      var words = wordMap[c];
      var useWord = words[0];
      var wrongs = same.slice(0, 3);
      while (wrongs.length < 3) {
        var ex = pickN(allChars, 1, seed + 40 + wrongs.length + B.同音字.length, [c].concat(wrongs))[0];
        if (!ex) break;
        wrongs.push(ex);
      }
      if (wrongs.length < 3) return;
      var opts = shuffle([c].concat(wrongs), seed + 4);
      B.同音字.push({
        t: '同音字',
        q: '「' + useWord + '」里应该写哪个「' + b + '」？',
        opts: opts, ans: opts.indexOf(c),
        why: '这里要写「' + c + '」。' + c + '、' + wrongs.join('、') + ' 读音都一样，但意思不一样，要看词语选字。'
      });
    });

    /* --- 题型 5：组词 --- */
    chars.forEach(function (w) {
      if (!room('组词')) return;
      var c = w[0], words = wordMap[c] || [];
      if (!words.length) return;
      var right = words[0];
      var others = [];
      /* 每个字只出一个词，干扰项才不会长得都一样 */
      shuffle(pool, seed + 6).forEach(function (x) {
        if (x[0] === c || others.length >= 3) return;
        var wds = wordMap[x[0]] || [];
        if (wds.length && wds[0] !== right && others.indexOf(wds[0]) < 0) others.push(wds[0]);
      });
      if (others.length < 3) return;
      var opts = shuffle([right].concat(others), seed + 5);
      B.组词.push({
        t: '组词',
        q: '下面哪个词语里有「' + c + '」这个字？',
        opts: opts, ans: opts.indexOf(right),
        why: '「' + right + '」里有「' + c + '」。「' + c + '」还可以组成：' + words.slice(0, 3).join('、') + '。'
      });
    });

    /* --- 题型 6：看拼音选字 --- */
    chars.forEach(function (w) {
      if (!room('拼音')) return;
      var c = w[0];
      var wrongs = pickN(allChars, 3, seed + 6 + B.拼音.length, [c]);
      if (wrongs.length < 3) return;
      var opts = shuffle([c].concat(wrongs), seed + 7);
      B.拼音.push({
        t: '拼音',
        q: '拼音 ' + w[1] + ' 是哪个字？',
        opts: opts, ans: opts.indexOf(c),
        why: '答案是「' + c + '」，读 ' + w[1] + '。' + ((wordMap[c] || []).length ? '可以组成：' + wordMap[c].slice(0, 2).join('、') + '。' : '')
      });
    });

    /* --- 题型 7：看词语选字（挖空） --- */
    chars.forEach(function (w) {
      if (!room('选字填空')) return;
      var c = w[0], words = wordMap[c] || [];
      if (!words.length) return;
      var right = words[0];
      var blank = right.split('').map(function (ch) { return ch === c ? '（　）' : ch; }).join('');
      var wrongs = pickN(allChars, 3, seed + 8 + B.选字填空.length * 3, [c]);
      if (wrongs.length < 3) return;
      var opts = shuffle([c].concat(wrongs), seed + 9);
      B.选字填空.push({
        t: '选字填空',
        q: '「' + blank + '」括号里应该填哪个字？',
        opts: opts, ans: opts.indexOf(c),
        why: '填「' + c + '」，组成「' + right + '」。'
      });
    });

    /* --- 题型 8：造句选字 --- */
    var sentPool = shuffle(SENT, seed + 10);
    for (var si = 0; si < sentPool.length && room('造句'); si++) {
      var it = sentPool[si];
      /* 优先用本课的字；本课没有就用全册学过的字 */
      var inLesson = chars.some(function (w) { return w[0].length && it.a.indexOf(w[0]) >= 0; });
      var inPool = allChars.some(function (x) { return it.a.indexOf(x) >= 0; });
      if (!inLesson && !(inPool && !B.造句.length)) continue;
      var wrongs = pickN(allChars, 3, seed + 11 + si, [it.a]);
      if (wrongs.length < 3) continue;
      var opts = shuffle([it.a].concat(wrongs), seed + 12 + si);
      B.造句.push({
        t: '造句',
        q: '句子里该用哪个字？\n' + it.s,
        opts: opts, ans: opts.indexOf(it.a),
        why: '这里填「' + it.a + '」，整句是：' + it.s.replace('_____', '「' + it.a + '」') + '。'
      });
    }

    /* ---- 轮转组装：每种题型先各来一题，再补第二轮，保证题型齐全 ---- */
    var order = ['前后鼻音', '平翘舌', '形近字', '同音字', '组词', '选字填空', '造句', '拼音'];
    var idx = {};
    order.forEach(function (t) { idx[t] = 0; });
    var round = 0;
    while (qs.length < 10 && round < 6) {
      var added = false;
      for (var oi = 0; oi < order.length && qs.length < 10; oi++) {
        var ty = order[oi];
        var arr = B[ty];
        while (idx[ty] < arr.length && idx[ty] >= CAP[ty]) idx[ty] = CAP[ty];
        if (idx[ty] < Math.min(arr.length, CAP[ty])) {
          qs.push(arr[idx[ty]++]); added = true;
        }
      }
      if (!added) break;
      round++;
    }
    /* 还不够 10 题 —— 用看拼音选字补齐 */
    var guard = 0;
    while (qs.length < 10 && guard < 80) {
      guard++;
      var w = chars[guard % chars.length];
      if (!w) break;
      var c = w[0];
      var wrongs = pickN(allChars, 3, seed + 20 + guard, [c]);
      if (wrongs.length < 3) continue;
      var opts = shuffle([c].concat(wrongs), seed + 30 + guard);
      qs.push({
        t: '拼音',
        q: '拼音 ' + w[1] + ' 是哪个字？',
        opts: opts, ans: opts.indexOf(c),
        why: '答案是「' + c + '」，读 ' + w[1] + '。' +
          ((wordMap[c] || []).length ? '可以组成：' + wordMap[c].slice(0, 2).join('、') + '。' : '')
      });
    }

    /* 打乱题型顺序，别让孩子猜到规律 */
    return shuffle(qs, seed + 99).slice(0, 10);
  };

  g.CNQUIZ = Q;
})();
