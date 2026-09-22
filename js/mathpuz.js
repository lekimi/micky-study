/* ===========================================================
   数学趣味闯关 · 出题引擎（window.MATHP）
   纯逻辑，不碰 DOM；所有题目由「关卡号」决定，同一个号永远同一道题
   =========================================================== */
(function (global) {

  /* ---------- 确定性随机：同一个种子永远出同一道题 ---------- */
  function hash(str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function ri(rnd, n) { return Math.floor(rnd() * n); }          /* 0..n-1 */
  function pick1(rnd, arr) { return arr[ri(rnd, arr.length)]; }
  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = ri(rnd, i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function uniqNum(list, ban) {
    var out = [], seen = {};
    list.forEach(function (x) {
      if (x == null || seen[x]) return;
      if (typeof x === 'number' && (!isFinite(x) || x < 0)) return;
      seen[x] = 1; out.push(x);
    });
    (ban || []).forEach(function (b) {
      if (seen[b]) out = out.filter(function (x) { return x !== b; });
    });
    return out;
  }

  /* =========================================================
     一、找规律（30 关）
     ========================================================= */
  var SEQ_RULES = [
    { id: 'add', from: 1, to: 5, name: '每次加同一个数' },
    { id: 'sub', from: 6, to: 10, name: '每次减同一个数，或者跳着加' },
    { id: 'mul', from: 11, to: 14, name: '每次乘同一个数' },
    { id: 'sq', from: 15, to: 18, name: '平方数 / 越加越多' },
    { id: 'fib', from: 19, to: 22, name: '前面两个加起来等于后面一个' },
    { id: 'two', from: 23, to: 26, name: '两个数列交叉着排' },
    { id: 'mix', from: 27, to: 28, name: '先乘再加' },
    { id: 'shape', from: 29, to: 30, name: '图形在循环' }
  ];

  function seqRule(level) {
    for (var i = 0; i < SEQ_RULES.length; i++) {
      if (level >= SEQ_RULES[i].from && level <= SEQ_RULES[i].to) return SEQ_RULES[i].id;
    }
    return 'add';
  }

  function seq(level) {
    var rnd = mulberry32(hash('seq|' + level));
    var rule = seqRule(level);
    var n = 6;
    var blank = (level <= 6) ? n - 1 : (rnd() < 0.45 ? n - 2 : n - 1);
    var items = [], ans = 0, why = '', kind = 'num', d = 0, a0 = 0;

    if (rule === 'add' || rule === 'sub') {
      var minus = (rule === 'sub') && rnd() < 0.45;
      d = (rule === 'add') ? (1 + ri(rnd, 4) + Math.floor((level - 1) / 3)) : (2 + ri(rnd, 4));
      if (minus) { a0 = 40 + ri(rnd, 20); }
      else { a0 = 1 + ri(rnd, 6); }
      for (var i = 0; i < n; i++) items.push(minus ? a0 - d * i : a0 + d * i);
      why = minus ? ('每次减 ' + d + '：' + items[blank - 1] + ' − ' + d + ' = ' + items[blank])
        : ('每次加 ' + d + '：' + items[blank - 1] + ' + ' + d + ' = ' + items[blank]);
    } else if (rule === 'mul') {
      var m = pick1(rnd, [2, 2, 3]);
      a0 = 1 + ri(rnd, 3);
      for (var i2 = 0; i2 < n; i2++) items.push(a0 * Math.pow(m, i2));
      why = '每次乘 ' + m + '：' + items[blank - 1] + ' × ' + m + ' = ' + items[blank];
    } else if (rule === 'sq') {
      if (rnd() < 0.5) {                       /* 平方数 */
        var st = 1 + ri(rnd, 2);
        for (var i3 = 0; i3 < n; i3++) { var v = st + i3; items.push(v * v); }
        why = '是平方数：' + items[blank] + ' = ' + Math.sqrt(items[blank]) + ' × ' + Math.sqrt(items[blank]);
      } else {                                  /* 越加越多：+1 +2 +3 ... */
        var s0 = 1 + ri(rnd, 4), cur = s0;
        items.push(cur);
        for (var k = 1; k < n; k++) { cur += k + ri(rnd, 1); items.push(cur); }
        var step = items[blank] - items[blank - 1];
        why = '加的数越来越大：这一步加 ' + step + '，' + items[blank - 1] + ' + ' + step + ' = ' + items[blank];
      }
    } else if (rule === 'fib') {
      var f1 = 1 + ri(rnd, 3), f2 = f1 + 1 + ri(rnd, 3);
      items.push(f1, f2);
      for (var i4 = 2; i4 < n; i4++) items.push(items[i4 - 1] + items[i4 - 2]);
      why = '前面两个加起来：' + items[blank - 2] + ' + ' + items[blank - 1] + ' = ' + items[blank];
    } else if (rule === 'two') {
      var g1 = 1 + ri(rnd, 4), d1 = 1 + ri(rnd, 3), g2 = 10 + ri(rnd, 9), d2 = 2 + ri(rnd, 4);
      for (var i5 = 0; i5 < n; i5++) items.push(i5 % 2 === 0 ? g1 + d1 * Math.floor(i5 / 2) : g2 + d2 * Math.floor(i5 / 2));
      why = '单数位置一列、双数位置一列，分开看：这一格是第 ' + (blank % 2 === 0 ? '一' : '二') + '列的第 ' + (Math.floor(blank / 2) + 1) + ' 个数';
    } else if (rule === 'mix') {
      var mm = pick1(rnd, [2, 3]), pp = 1 + ri(rnd, 3), c2 = 1 + ri(rnd, 3);
      items.push(c2);
      for (var i6 = 1; i6 < n; i6++) items.push(items[i6 - 1] * mm + pp);
      why = '先乘 ' + mm + ' 再加 ' + pp + '：' + items[blank - 1] + ' × ' + mm + ' + ' + pp + ' = ' + items[blank];
    } else {                                    /* 图形规律 */
      kind = 'shape';
      var bank = [['🔺', '🔵'], ['🌰', '🌰🌰', '🌰🌰🌰', '🌰🌰🌰🌰'], ['⭐', '🌙'], ['🍎', '🍌', '🍇']];
      var set = pick1(rnd, bank);
      var grows = set.length > 2 && rnd() < 0.5;
      if (grows) {
        for (var i7 = 0; i7 < n; i7++) items.push(new Array(i7 + 2).join('🌰'));
        why = '每一格都比上一格多一个';
      } else {
        for (var i8 = 0; i8 < n; i8++) items.push(set[i8 % set.length]);
        why = '按 ' + set.join(' → ') + ' 一直循环';
      }
    }

    ans = items[blank];

    /* 干扰项：从「看起来也说得通」的错答案里挑，别用随机数糊弄 */
    var cand;
    if (kind === 'shape') {
      cand = uniqNum(items.slice(), [ans]);
      while (cand.length < 3) cand.push(cand.length ? cand[cand.length - 1] + ' ' : '⬜');
      cand = cand.slice(0, 3);
    } else {
      var prev = items[blank - 1] != null ? items[blank - 1] : items[0];
      var dlt = (typeof ans === 'number' && typeof prev === 'number') ? Math.abs(ans - prev) : 1;
      dlt = dlt || 1;
      cand = uniqNum([ans + dlt, ans - dlt, ans + dlt * 2, ans + 1, ans - 1, ans + dlt + 1, prev], [ans]);
      cand = cand.filter(function (x) { return x >= 0; }).slice(0, 3);
      while (cand.length < 3) cand.push(ans + 10 + cand.length);
    }
    var opts = shuffle(cand.concat([ans]), rnd).slice(0, 4);
    if (opts.indexOf(ans) < 0) opts[0] = ans;

    return {
      kind: kind, rule: rule, items: items, blank: blank,
      answer: ans, opts: opts, why: why
    };
  }

  /* =========================================================
     二、算 24 点（24 关）
     ========================================================= */
  var OPS = ['+', '-', '*', '/'];
  function opSym(o) { return o === '*' ? '×' : (o === '/' ? '÷' : o); }

  /* 求解：中间结果必须整除（二年级不做分数），返回最多 cap 个解 */
  function solve24(nums, cap, wantSteps) {
    var out = [], firstSteps = null;
    function rec(list, exprs, steps) {
      if (out.length >= cap) return;
      if (list.length === 1) {
        if (Math.abs(list[0] - 24) < 1e-9) {
          out.push(exprs[0]);
          if (wantSteps && !firstSteps) firstSteps = steps.slice();
        }
        return;
      }
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = list[i], b = list[j], ea = exprs[i], eb = exprs[j];
          var rest = [], restE = [];
          for (var k = 0; k < list.length; k++) {
            if (k !== i && k !== j) { rest.push(list[k]); restE.push(exprs[k]); }
          }
          var cand = [
            [a + b, '(' + ea + '+' + eb + ')', a + '+' + b + '=' + (a + b)],
            [a - b, '(' + ea + '-' + eb + ')', Math.max(a, b) + '-' + Math.min(a, b) + '=' + (a - b)],
            [b - a, '(' + eb + '-' + ea + ')', Math.max(a, b) + '-' + Math.min(a, b) + '=' + (b - a)]
          ];
          if (a !== 0 && b !== 0) cand.push([a * b, '(' + ea + '*' + eb + ')', a + '×' + b + '=' + (a * b)]);
          if (b !== 0 && a % b === 0) cand.push([a / b, '(' + ea + '/' + eb + ')', a + '÷' + b + '=' + (a / b)]);
          if (a !== 0 && b % a === 0) cand.push([b / a, '(' + eb + '/' + ea + ')', b + '÷' + a + '=' + (b / a)]);
          for (var c = 0; c < cand.length; c++) {
            var cd = cand[c];
            if (cd[0] < -999 || cd[0] > 9999) continue;
            rest.push(cd[0]); restE.push(cd[1]);
            if (wantSteps) steps.push(cd[2]);
            rec(rest, restE, steps);
            if (wantSteps && steps.length) steps.pop();
            rest.pop(); restE.pop();
            if (out.length >= cap) return;
          }
        }
      }
    }
    rec(nums.slice(), nums.map(function (x) { return String(x); }), []);
    return { count: out.length, expr: out[0] || '', steps: firstSteps || [] };
  }

  function p24Range(level) {
    if (level <= 8) return { max: 9, easy: 2 };        /* 数字小、解法多 */
    if (level <= 16) return { max: 10, easy: 1 };
    return { max: 12, easy: 0 };
  }

  function p24(level) {
    var rnd = mulberry32(hash('p24|' + level));
    var rg = p24Range(level);
    var cap = level <= 8 ? 6 : 3;                       /* 允许的「解法条数」上限：越少越难 */
    var fallbackNums = null, fallback = null;
    for (var t = 0; t < 600; t++) {
      var nums = [];
      for (var i = 0; i < 4; i++) nums.push(1 + ri(rnd, rg.max));
      var r = solve24(nums, cap + 1, true);
      if (r.count >= 1 && r.count <= cap) {
        return { nums: nums, expr: r.expr, steps: r.steps, count: r.count, level: level };
      }
      if (r.count >= 1 && !fallback) { fallbackNums = nums; fallback = r; }
    }
    var fn = fallbackNums || [4, 6, 2, 3];
    var fb = fallback || solve24(fn, 2, true);
    return { nums: fn, expr: fb.expr, steps: fb.steps, count: fb.count, level: level };
  }

  /* 校验孩子拼出来的算式：tokens = [{t:'n',v:3}|{t:'o',v:'+'}|{t:'o',v:'('}...] */
  function check24(nums, tokens) {
    var used = [], i;
    for (i = 0; i < tokens.length; i++) if (tokens[i].t === 'n') used.push(tokens[i].v);
    var want = nums.slice().sort(function (a, b) { return a - b; });
    var got = used.slice().sort(function (a, b) { return a - b; });
    if (got.length < want.length) return { ok: false, msg: '还有数字没用上呢（要用完 4 个，每个用一次）' };
    if (got.length > want.length) return { ok: false, msg: '有数字被用了两次，检查一下' };
    for (i = 0; i < want.length; i++) if (want[i] !== got[i]) return { ok: false, msg: '用的数字和题目给的不一样' };

    /* 语法检查：括号配对 + 不能两个运算符挨着 + 不能以运算符结尾 */
    var depth = 0;
    for (i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (tk.t === 'o' && tk.v === '(') depth++;
      if (tk.t === 'o' && tk.v === ')') { depth--; if (depth < 0) return { ok: false, msg: '括号放反啦' }; }
    }
    if (depth !== 0) return { ok: false, msg: '括号没配对，再看看' };
    for (i = 0; i < tokens.length; i++) {
      var a = tokens[i], b = tokens[i + 1];
      if (!b) { if (a.t === 'o' && a.v !== ')') return { ok: false, msg: '算式还没写完' }; break; }
      if (a.t === 'o' && b.t === 'o' && !(a.v === ')' || b.v === '(' || (a.v === '(' && b.v === '('))) {
        if (!(a.v === ')' && (b.v === '+' || b.v === '-' || b.v === '*' || b.v === '/' || b.v === ')')) &&
          !(b.v === '(' && (a.v === '(' || a.v === '+' || a.v === '-' || a.v === '*' || a.v === '/'))) {
          return { ok: false, msg: '两个符号挨在一起了' };
        }
      }
    }

    /* 递归下降求值；除法必须整除 */
    var pos = 0, err = null, divBad = false;
    function isOp(v) { return v === '+' || v === '-' || v === '*' || v === '/'; }
    function expr() {
      var v = term();
      while (pos < tokens.length && tokens[pos].t === 'o' && (tokens[pos].v === '+' || tokens[pos].v === '-')) {
        var o = tokens[pos++].v, r = term();
        v = (o === '+') ? v + r : v - r;
      }
      return v;
    }
    function term() {
      var v = factor();
      while (pos < tokens.length && tokens[pos].t === 'o' && (tokens[pos].v === '*' || tokens[pos].v === '/')) {
        var o = tokens[pos++].v, r = factor();
        if (o === '*') v = v * r;
        else {
          if (r === 0) { err = '不能除以 0 哦'; return v; }
          if (v % r !== 0) { divBad = true; }
          v = v / r;
        }
      }
      return v;
    }
    function factor() {
      if (pos >= tokens.length) { err = '算式不完整'; return 0; }
      var tk = tokens[pos];
      if (tk.t === 'n') { pos++; return tk.v; }
      if (tk.t === 'o' && tk.v === '(') {
        pos++; var v = expr();
        if (pos < tokens.length && tokens[pos].t === 'o' && tokens[pos].v === ')') pos++;
        else err = '少了一个右括号';
        return v;
      }
      if (tk.t === 'o' && tk.v === '-') { pos++; return -factor(); }
      err = '算式读不懂，再拼一次'; pos++; return 0;
    }

    var val = expr();
    if (err) return { ok: false, msg: err };
    if (pos < tokens.length) return { ok: false, msg: '算式后面多余了东西' };
    if (divBad) return { ok: false, msg: '这样除不尽哦，换一种拼法试试（除法要能整除）' };
    if (Math.abs(val - 24) < 1e-9) return { ok: true, value: val };
    return { ok: false, value: val, msg: '算出来是 ' + Math.round(val * 100) / 100 + '，不是 24，再试试～' };
  }

  /* =========================================================
     三、数独
     ========================================================= */
  function sdGeom(size) {
    if (size === 4) return { br: 2, bc: 2 };
    if (size === 6) return { br: 2, bc: 3 };
    return { br: 3, bc: 3 };
  }
  function sdBoxOf(size, r, c) {
    var g = sdGeom(size);
    return Math.floor(r / g.br) * (size / g.bc) + Math.floor(c / g.bc);
  }
  function popc(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }

  /* 求解器：位掩码 + 最少候选优先；cap = 最多找几个解（用于唯一解校验） */
  function sdSolve(grid, size, cap, rnd) {
    var N = size, full = (1 << N) - 1;
    var rows = [], cols = [], boxs = [], i;
    for (i = 0; i < N; i++) { rows.push(0); cols.push(0); boxs.push(0); }
    for (i = 0; i < N * N; i++) {
      var v0 = grid[i]; if (!v0) continue;
      var r0 = Math.floor(i / N), c0 = i % N, b0 = sdBoxOf(size, r0, c0), bit0 = 1 << (v0 - 1);
      rows[r0] |= bit0; cols[c0] |= bit0; boxs[b0] |= bit0;
    }
    var sols = [];
    function rec() {
      if (sols.length >= cap) return;
      var best = -1, bestMask = 0, bestCnt = 999;
      for (var k = 0; k < N * N; k++) {
        if (grid[k]) continue;
        var r = Math.floor(k / N), c = k % N, b = sdBoxOf(size, r, c);
        var m = full & ~(rows[r] | cols[c] | boxs[b]);
        var cnt = popc(m);
        if (cnt === 0) return;
        if (cnt < bestCnt) { bestCnt = cnt; best = k; bestMask = m; if (cnt === 1) break; }
      }
      if (best < 0) { sols.push(grid.slice()); return; }
      var rr = Math.floor(best / N), cc = best % N, bb = sdBoxOf(size, rr, cc);
      var vals = [];
      for (var v = 1; v <= N; v++) if (bestMask & (1 << (v - 1))) vals.push(v);
      if (rnd) shuffle(vals, rnd);
      for (var q = 0; q < vals.length; q++) {
        var vv = vals[q], bit = 1 << (vv - 1);
        grid[best] = vv; rows[rr] |= bit; cols[cc] |= bit; boxs[bb] |= bit;
        rec();
        grid[best] = 0; rows[rr] &= ~bit; cols[cc] &= ~bit; boxs[bb] &= ~bit;
        if (sols.length >= cap) return;
      }
    }
    rec();
    return sols;
  }

  var SD_CONF = {
    4: { levels: 15, givens: function (l) { return 10 - Math.floor((l - 1) / 3); } },   /* 10 → 6 */
    6: { levels: 30, givens: function (l) { return 22 - Math.floor((l - 1) / 3); } },   /* 22 → 13 */
    9: { levels: 20, givens: function (l) { return 40 - Math.floor((l - 1) * 0.68); } } /* 40 → 27 */
  };

  var sdCache = {};
  function sudoku(size, level) {
    var key = size + '_' + level;
    if (sdCache[key]) return sdCache[key];
    var conf = SD_CONF[size] || SD_CONF[4];
    level = Math.max(1, Math.min(conf.levels, level));
    var rnd = mulberry32(hash('sd|' + size + '|' + level));
    var N = size * size;
    var empty = []; for (var i = 0; i < N; i++) empty.push(0);
    var sol = sdSolve(empty, size, 1, rnd)[0];
    var puzzle = sol.slice();
    var order = []; for (var j = 0; j < N; j++) order.push(j);
    shuffle(order, rnd);
    var target = conf.givens(level), cur = N;
    for (var k = 0; k < order.length && cur > target; k++) {
      var idx = order[k], bak = puzzle[idx];
      if (!bak) { cur--; continue; }
      puzzle[idx] = 0;
      if (sdSolve(puzzle, size, 2).length !== 1) puzzle[idx] = bak;
      else cur--;
    }
    var out = { size: size, level: level, puzzle: puzzle, solution: sol, givens: cur, box: sdGeom(size) };
    sdCache[key] = out;
    return out;
  }

  /* 提示：挑一个空格，直接告诉他正确答案（优先选候选最少的格子） */
  function sudokuHint(puzzle, solution, size) {
    var N = size, full = (1 << N) - 1;
    var rows = [], cols = [], boxs = [], i;
    for (i = 0; i < N; i++) { rows.push(0); cols.push(0); boxs.push(0); }
    for (i = 0; i < N * N; i++) {
      var v0 = puzzle[i]; if (!v0) continue;
      var r0 = Math.floor(i / N), c0 = i % N, b0 = sdBoxOf(size, r0, c0), bit0 = 1 << (v0 - 1);
      rows[r0] |= bit0; cols[c0] |= bit0; boxs[b0] |= bit0;
    }
    var best = -1, bestCnt = 999;
    for (i = 0; i < N * N; i++) {
      if (puzzle[i]) continue;
      var r = Math.floor(i / N), c = i % N, b = sdBoxOf(size, r, c);
      var cnt = popc(full & ~(rows[r] | cols[c] | boxs[b]));
      if (cnt < bestCnt) { bestCnt = cnt; best = i; }
    }
    if (best < 0) return null;
    return { idx: best, val: solution[best], row: Math.floor(best / N), col: best % N };
  }

  /* 找出所有和答案不一致的格子（用于「检查」按钮，只提示数量不涂红） */
  function sudokuWrong(grid, solution) {
    var bad = [];
    for (var i = 0; i < solution.length; i++) if (grid[i] && grid[i] !== solution[i]) bad.push(i);
    return bad;
  }

  /* =========================================================
     四、思维拓展（32 关 = 4 种题型 × 8 关）
     ========================================================= */
  var BRAIN_TYPES = [
    { id: 'balance', name: '天平代换', emoji: '⚖️', dir: '代数' },
    { id: 'blocks', name: '数方块', emoji: '🧱', dir: '几何' },
    { id: 'net', name: '折纸盒', emoji: '📦', dir: '几何' },
    { id: 'maze', name: '跳格迷宫', emoji: '🗺️', dir: '路径' }
  ];

  function brainType(level) { return BRAIN_TYPES[Math.floor((level - 1) / 8) % 4]; }

  /* ---- 天平代换：几个等式，求其中一个是多少 ---- */
  var FRUITS = ['🍎', '🍌', '🍇', '🍓', '🥕', '🍑', '🍍', '🥝'];
  function brainBalance(level, rnd) {
    var sub = ((level - 1) % 8) + 1;
    var k = sub <= 4 ? 2 : 3;                       /* 未知量个数 */
    var lim = sub <= 2 ? 6 : (sub <= 5 ? 9 : 12);   /* 数值范围 */
    for (var t = 0; t < 400; t++) {
      var vals = [];
      for (var i = 0; i < k; i++) vals.push(1 + ri(rnd, lim));
      var eqs = [], sigs = {}, dup = false;
      for (var e = 0; e < k; e++) {
        var cf = [];
        for (var c = 0; c < k; c++) cf.push(ri(rnd, 3) === 0 ? 0 : (sub >= 6 && ri(rnd, 3) === 0 ? 2 : 1));
        if (cf.filter(function (x) { return x > 0; }).length < 2) { cf[0] = 1; cf[1 % k] = 1; }
        var sig = cf.join(',');
        if (sigs[sig]) { dup = true; break; }      /* 两个等式一模一样就重来 */
        sigs[sig] = 1;
        var sum = 0;
        for (var c2 = 0; c2 < k; c2++) sum += cf[c2] * vals[c2];
        eqs.push({ cf: cf, sum: sum });
      }
      if (dup || eqs.length !== k) continue;
      /* 唯一解校验：暴力枚举 */
      var sols = [];
      (function loop(idx, cur) {
        if (sols.length > 1) return;
        if (idx === k) {
          for (var q = 0; q < eqs.length; q++) {
            var s = 0;
            for (var z = 0; z < k; z++) s += eqs[q].cf[z] * cur[z];
            if (s !== eqs[q].sum) return;
          }
          sols.push(cur.slice());
          return;
        }
        for (var v = 1; v <= lim + 3; v++) { cur[idx] = v; loop(idx + 1, cur); if (sols.length > 1) return; }
        cur[idx] = 0;
      })(0, []);
      if (sols.length !== 1) continue;
      if (sols[0].join() !== vals.join()) continue;   /* 解必须就是设定的那一组 */

      var emos = shuffle(FRUITS.slice(), rnd).slice(0, k);
      var ask = ri(rnd, k);
      var shown = eqs.map(function (eq) {
        var parts = [];
        for (var z = 0; z < k; z++) {
          if (!eq.cf[z]) continue;
          for (var n = 0; n < eq.cf[z]; n++) parts.push(emos[z]);
        }
        return { left: parts, sum: eq.sum };
      });
      var ans = vals[ask];
      var cand = uniqNum([ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, vals[(ask + 1) % k], 2 * ans], [ans])
        .filter(function (x) { return x >= 1; }).slice(0, 3);
      while (cand.length < 3) cand.push(ans + 4 + cand.length);
      var opts = shuffle(cand.concat([ans]), rnd).slice(0, 4);
      if (opts.indexOf(ans) < 0) opts[0] = ans;
      return {
        type: 'balance', emos: emos, eqs: shown, ask: ask, askEmo: emos[ask],
        answer: ans, opts: opts,
        why: '把等式里能替换的先替换掉：' + emos.map(function (e2, i2) {
          return e2 + ' = ' + vals[i2];
        }).join('，') + '。所以 ' + emos[ask] + ' = ' + ans
      };
    }
    /* 兜底：两两之和（一定有唯一解） */
    var a = 2, b = 3, c = 4;
    return {
      type: 'balance', emos: ['🍎', '🍌', '🍇'],
      eqs: [{ left: ['🍎', '🍌'], sum: a + b }, { left: ['🍌', '🍇'], sum: b + c }, { left: ['🍎', '🍇'], sum: a + c }],
      ask: 0, askEmo: '🍎', answer: a, opts: shuffle([a, b, c, a + b], rnd),
      why: '三个和加起来 = 2 个（🍎+🍌+🍇），先求出总和再减'
    };
  }

  /* ---- 数方块：看立体图数一共有几个小方块 ---- */
  function brainBlocks(level, rnd) {
    var sub = ((level - 1) % 8) + 1;
    var n = sub <= 2 ? 2 : (sub <= 5 ? 3 : 4);
    var maxH = sub <= 2 ? 2 : (sub <= 5 ? 3 : 4);
    var h = [], total = 0;
    for (var r = 0; r < n; r++) {
      var row = [];
      for (var c = 0; c < n; c++) {
        var v = 1 + ri(rnd, maxH);
        row.push(v); total += v;
      }
      h.push(row);
    }
    var cand = uniqNum([total + 1, total - 1, total + 2, total - 2, total + n, total - n], [total])
      .filter(function (x) { return x >= 1; }).slice(0, 3);
    while (cand.length < 3) cand.push(total + 3 + cand.length);
    var opts = shuffle(cand.concat([total]), rnd).slice(0, 4);
    if (opts.indexOf(total) < 0) opts[0] = total;
    return {
      type: 'blocks', h: h, n: n, answer: total, opts: opts,
      why: '前面挡住的也要数进去：一行一行加，' + h.map(function (row) {
        return '(' + row.join('+') + ')';
      }).join(' + ') + ' = ' + total
    };
  }

  /* ---- 折纸盒：展开图折成正方体后，谁在谁的对面 ---- */
  var NETS = [
    { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]], opp: [[1, 3], [2, 4], [0, 5]] },
    { cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]], opp: [[0, 3], [1, 4], [2, 5]] },
    { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]], opp: [[0, 4], [1, 3], [2, 5]] }
  ];
  var NET_MARKS = ['★', '●', '▲', '■', '◆', '♥'];
  function brainNet(level, rnd) {
    var sub = ((level - 1) % 8) + 1;
    var net = NETS[(sub - 1) % NETS.length];
    var marks = shuffle(NET_MARKS.slice(), rnd).slice(0, 6);
    var ask = ri(rnd, 6);
    var oppIdx = null;
    net.opp.forEach(function (p) {
      if (p[0] === ask) oppIdx = p[1];
      if (p[1] === ask) oppIdx = p[0];
    });
    var ans = marks[oppIdx];
    var others = marks.filter(function (m, i) { return i !== oppIdx && i !== ask; });
    var opts = shuffle(others.slice(0, 3).concat([ans]), rnd).slice(0, 4);
    if (opts.indexOf(ans) < 0) opts[0] = ans;
    return {
      type: 'net', cells: net.cells, marks: marks, ask: ask, askMark: marks[ask],
      answer: ans, opts: opts, oppIdx: oppIdx,
      why: '折起来以后，' + marks[ask] + ' 和 ' + ans + ' 隔着整个盒子，正好面对面'
    };
  }

  /* ---- 跳格迷宫：每次直着走「格子里写的步数」 ---- */
  function brainMaze(level, rnd) {
    var sub = ((level - 1) % 8) + 1;
    var n = sub <= 2 ? 4 : (sub <= 5 ? 5 : 6);
    var maxStep = sub <= 3 ? 2 : 3;
    function reach(grid, n) {
      var seen = {}, q = [[0, 0]], steps = { '0,0': 0 };
      seen['0,0'] = 1;
      var head = 0;
      while (head < q.length) {
        var cur = q[head++], r = cur[0], c = cur[1];
        var k = grid[r * n + c];
        var dirs = [[-k, 0], [k, 0], [0, -k], [0, k]];
        for (var d = 0; d < dirs.length; d++) {
          var nr = r + dirs[d][0], nc = c + dirs[d][1];
          if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
          var key = nr + ',' + nc;
          if (seen[key]) continue;
          seen[key] = 1; steps[key] = steps[r + ',' + c] + 1;
          q.push([nr, nc]);
        }
      }
      return { seen: seen, steps: steps };
    }
    for (var t = 0; t < 300; t++) {
      var grid = [];
      for (var i = 0; i < n * n; i++) grid.push(1 + ri(rnd, maxStep));
      grid[0] = 1 + ri(rnd, maxStep);
      grid[n * n - 1] = 0;                     /* 终点格随便，走到就算赢 */
      var rc = reach(grid, n);
      var goalKey = (n - 1) + ',' + (n - 1);
      var st = rc.steps[goalKey];
      if (!rc.seen[goalKey]) continue;
      if (st < 2 || st > n + 2) continue;      /* 太短没意思，太长太绕 */
      return {
        type: 'maze', n: n, grid: grid, answer: st, start: 0, goal: n * n - 1,
        why: '从 ▶ 出发，每次只能上下左右直着走「格子里写的步数」，最少 ' + st + ' 步到 🏁'
      };
    }
    var g2 = [];
    for (var z = 0; z < 16; z++) g2.push(z === 15 ? 0 : 2);
    g2[0] = 2; g2[2] = 1; g2[8] = 1;
    return { type: 'maze', n: 4, grid: g2, answer: 2, start: 0, goal: 15, why: '按格子里的数字直着跳，两步就能到终点' };
  }

  function brain(level) {
    var rnd = mulberry32(hash('brain|' + level));
    var t = brainType(level);
    if (t.id === 'balance') return brainBalance(level, rnd);
    if (t.id === 'blocks') return brainBlocks(level, rnd);
    if (t.id === 'net') return brainNet(level, rnd);
    return brainMaze(level, rnd);
  }

  /* =========================================================
     对外接口
     ========================================================= */
  global.MATHP = {
    hash: hash, rnd: mulberry32, shuffle: shuffle, ri: ri,
    SEQ_LEVELS: 30, P24_LEVELS: 24, BRAIN_LEVELS: 32,
    SD_CONF: SD_CONF, BRAIN_TYPES: BRAIN_TYPES,
    seq: seq, seqRule: seqRule,
    p24: p24, check24: check24, opSym: opSym, solve24: solve24,
    sudoku: sudoku, sudokuHint: sudokuHint, sudokuWrong: sudokuWrong, sdSolve: sdSolve,
    brain: brain, brainType: brainType
  };
})(window);
