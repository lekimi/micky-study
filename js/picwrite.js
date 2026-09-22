/* ===========================================================
   picwrite.js —— 看图写话教练（window.PicWrite）

   乐乐最在意的：怕孩子以后作文辅导起来头疼。
   所以这里专门练「看图写话」—— 给一幅画面，按维度引导他写完整。

   为什么不用真照片？
     ① 版权/来源不好搞  ② 家里打印的卷子上的图没法导进来
   所以改成「画面设定卡」：用大图标 + 一句话交代画面里有什么，
   孩子照样要观察、要想象、要写，效果一样，而且随时能换。

   复用 speech.js 的引导维度和评分，不重复造轮子。
   =========================================================== */
(function (global) {
  'use strict';

  function U() { return global.UI; }
  function S() { return global.Store; }
  function E() { return global.Engine; }

  /* 场景卡：icon 画面 / scene 画面里有什么 / who 人物 / hint 可以往哪想 */
  var SCENES = [
    {
      id: 'P1', icon: '🌧️', title: '下雨天的校门口',
      scene: '放学了，天突然下起大雨。校门口挤满了接孩子的家长，有一个同学站在屋檐下，没带伞。',
      who: '我、那个没带伞的同学、其他家长',
      hint: '他会怎么办？你看到了什么？你心里怎么想的？'
    },
    {
      id: 'P2', icon: '🐱', title: '路边的小猫',
      scene: '放学路上，墙角有一只很小的猫，毛湿湿的，一直在叫。旁边有几个同学在看着。',
      who: '我、同学们、小猫',
      hint: '它是什么样子的？它叫的声音像什么？你们做了什么？'
    },
    {
      id: 'P3', icon: '🏫', title: '教室里的意外',
      scene: '上课的时候，前面同学的铅笔盒「啪」地掉在地上，东西撒了一地。全班都看过来了。',
      who: '我、那个同学、老师',
      hint: '声音是什么样的？他脸上什么表情？后来怎么样了？'
    },
    {
      id: 'P4', icon: '🌳', title: '公园里的一件事',
      scene: '周末在公园，一个小朋友在草地上跑，摔了一跤，膝盖破了皮，哭了起来。他妈妈跑过来了。',
      who: '我、那个小朋友、他妈妈',
      hint: '你看到什么了？听到了什么？你心里是什么感觉？'
    },
    {
      id: 'P5', icon: '🎂', title: '一次惊喜',
      scene: '你回到家，推开门，屋里黑黑的。突然灯亮了，桌上摆着蛋糕，家人一起喊你的名字。',
      who: '我、爸爸妈妈、可能还有其他人',
      hint: '开门前你以为会发生什么？灯亮的那一刻你是什么感觉？'
    },
    {
      id: 'P6', icon: '⚽', title: '操场上的比赛',
      scene: '体育课上，两组同学在拔河（或者踢球）。绳子中间的红布一会儿往这边，一会儿往那边。',
      who: '我、同学们、老师',
      hint: '大家喊了什么？你手上什么感觉？最后赢了还是输了？'
    },
    {
      id: 'P7', icon: '🍂', title: '秋天的路上',
      scene: '秋天，路两边落满了叶子。有个人在扫叶子，扫成一大堆。几个孩子跑过去跳进叶子堆里。',
      who: '我、扫地的爷爷奶奶或环卫工人、几个孩子',
      hint: '叶子是什么颜色的？踩上去什么声音？扫的人是什么表情？'
    },
    {
      id: 'P8', icon: '🐶', title: '第一次照顾一个小生命',
      scene: '家里来了一只小狗（或者你第一次给花浇水、喂鱼）。它很小，有点怕人，躲在角落里。',
      who: '我、小狗（或小花/小鱼）',
      hint: '它长什么样？它怕的时候是什么动作？你做了什么让它不怕？'
    },
    {
      id: 'P9', icon: '🚑', title: '有人需要帮忙',
      scene: '在小区里，一位老奶奶提着很重的东西，走得很慢，停下来歇了两次。',
      who: '我、老奶奶、旁边的人',
      hint: '她脸上什么样？你心里想了什么？你做了什么？做完什么感觉？'
    },
    {
      id: 'P10', icon: '🎨', title: '做坏了一件事',
      scene: '你想帮忙做一件事（端水、收拾桌子、画画），结果弄坏了/打翻了。当时屋里很安静。',
      who: '我、妈妈或老师',
      hint: '弄坏那一刻你听到了什么？你心里怕不怕？后来怎么解决的？'
    },
    {
      id: 'P11', icon: '🌙', title: '睡不着的一个晚上',
      scene: '晚上该睡了，可你一直睡不着。窗外有月亮，外面有声音，屋里很安静。',
      who: '我、可能还有家人',
      hint: '你听到了什么声音？你心里在想什么？后来怎么睡着的？'
    },
    {
      id: 'P12', icon: '🏆', title: '被表扬的那一次',
      scene: '老师（或妈妈）当着大家的面表扬了你。你的脸有点热，不知道手该放哪。',
      who: '我、老师或妈妈、同学们',
      hint: '被表扬的时候你身体哪里感觉到了？你脸上什么样？你当时说了什么？'
    }
  ];

  /* 看图写话专用的开场引导（先观察画面，再动笔） */
  var WARMUP = [
    { k: 'who', q: '画面里有谁？先说出来。' },
    { k: 'what', q: '他们在做什么？' },
    { k: 'where', q: '这是在什么时候、什么地方？' }
  ];

  function sceneById(id) {
    return SCENES.filter(function (x) { return x.id === id; })[0] || null;
  }

  /* 今天该练哪幅图（按日期轮转，保证不重复太快） */
  function todayScene() {
    var t = S().dateStr();
    var n = 0;
    for (var i = 0; i < t.length; i++) n += t.charCodeAt(i) * (i + 1);
    n += (PicWrite.round || 0) * 7;
    return SCENES[n % SCENES.length];
  }

  /* ---------------- 界面 ---------------- */
  function panel() {
    var sc = todayScene();
    var d = E().speechDraftOf(S().dateStr());
    var SC = global.SpeechCoach;
    var inWrite = !!(d && d.mode === 'pic');

    /* ① 选图 */
    if (!inWrite) {
      var listHtml = SCENES.map(function (x) {
        var on = (x.id === sc.id);
        return '<button class="btn ' + (on ? 'btn-green' : 'btn-ghost') + '" style="width:100%;min-height:56px;text-align:left;padding:10px 12px;margin-bottom:8px" ' +
          'data-act="picPick" data-v="' + x.id + '">' +
          '<span style="font-size:22px">' + x.icon + '</span> ' +
          '<b>' + U().esc(x.title) + '</b>' + (on ? ' <span class="task-tag ok">今天推荐</span>' : '') +
          '</button>';
      }).join('');

      return '<div class="card mt12" style="background:#F3FAF0;border:2px solid #B7DFB7">' +
        '<div class="sec-title">🖼️ 看图写话</div>' +
        '<div class="muted" style="font-size:13px;line-height:1.8;margin-bottom:8px">' +
        '挑一幅画面，老师会一句句问你，帮你把它写成一小段。' +
        '<b>练的就是作文的基本功</b>：有谁、在干什么、后来怎么了、心里怎么想。' +
        '</div>' + listHtml + '</div>';
    }

    /* ② 正在写 */
    var s2 = sceneById(d.picId) || sc;
    var cur = Kid.spAsk || null;
    var got = SC ? SC.covered(d.text) : [];
    var pct = SC ? Math.round(got.length / SC.GUIDE.length * 100) : 0;

    var chips = SC ? SC.GUIDE.map(function (g) {
      var on = !!SC.has(d.text, g.words);
      return '<span class="task-tag ' + (on ? 'ok' : '') + '" style="font-size:12px;opacity:' + (on ? 1 : 0.55) + '">' +
        g.icon + ' ' + g.label + '</span>';
    }).join(' ') : '';

    var askHtml = '';
    if (cur) {
      askHtml = '<div style="background:#EAF3FB;border:2px solid #B5D4F4;border-radius:14px;padding:12px;margin-top:10px">' +
        '<div style="font-size:12px;font-weight:900;color:#185FA5;margin-bottom:4px">' +
        '👩‍🏫 第 ' + cur.round + ' 轮 · ' + cur.icon + ' ' + U().esc(cur.label) + '</div>' +
        '<div style="font-size:17px;font-weight:900;color:#0C447C;line-height:1.6">' + U().esc(cur.ask) + '</div>' +
        '</div>' +
        (cur.choices && cur.choices.length
          ? '<div style="margin-top:10px"><div style="font-size:12px;font-weight:900;color:#7A6248;margin-bottom:6px">' +
          '想不出来？点一个再补完整：</div><div style="display:flex;flex-wrap:wrap;gap:6px">' +
          cur.choices.map(function (c) {
            return '<button class="pill-btn" style="min-height:52px;font-size:13px;padding:8px 12px" ' +
              'data-act="spChoice" data-v="' + U().esc(c) + '">' + U().esc(c) + '</button>';
          }).join('') + '</div></div>'
          : '') +
        '<textarea class="field mt8" id="sp-ans" rows="3" placeholder="把你想到的话写在这里…" style="min-height:96px;line-height:1.8"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn btn-green" style="flex:1;min-height:52px" data-act="spAnswer">说好了，加上去</button>' +
        '<button class="btn btn-ghost" style="width:auto;min-height:52px;padding:10px 16px;font-size:14px" data-act="spSkip">这个我没有</button>' +
        '</div>';
    } else {
      askHtml = '<button class="btn btn-lav mt8" data-act="spAsk">🤔 让老师再问我一句</button>';
    }

    return '<div class="card mt12" style="background:#F3FAF0;border:2px solid #B7DFB7">' +
      '<div class="sec-title">🖼️ 看图写话 · ' + U().esc(s2.title) + '</div>' +
      /* 画面描述 */
      '<div style="background:#fff;border:2px solid #EFDDB8;border-radius:14px;padding:12px;text-align:center">' +
      '<div style="font-size:52px;line-height:1.2">' + s2.icon + '</div>' +
      '<div style="font-weight:800;color:#5C4322;line-height:1.9;margin-top:6px;text-align:left">' +
      U().esc(s2.scene) + '</div>' +
      '<div class="muted" style="font-size:12px;margin-top:6px;text-align:left">💭 ' + U().esc(s2.hint) + '</div>' +
      '</div>' +
      '<div style="height:12px;border-radius:6px;background:#EADFC0;overflow:hidden;margin:10px 0 6px">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#8FD44A,#5BA82B)"></div></div>' +
      '<div class="muted" style="font-size:12px;font-weight:800">已经补上 ' + got.length + ' / ' + (SC ? SC.GUIDE.length : 8) + ' 个方面</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0">' + chips + '</div>' +
      '<div style="background:#FFFDF4;border:2px solid #EFDDB8;border-radius:14px;padding:12px">' +
      '<div style="font-size:11px;font-weight:900;color:#B07A2E">你现在写的（' + (SC ? SC.len(d.text) : d.text.length) + ' 字）</div>' +
      '<div style="font-weight:700;color:#5C4322;line-height:1.9;margin-top:4px">' + U().esc(d.text) + '</div>' +
      '</div>' +
      askHtml +
      '<button class="btn btn-ghost mt8" data-act="spFinish">✋ 我写完了，就这样</button>' +
      '<button class="btn btn-ghost mt8" data-act="picQuit" style="font-size:14px">换一幅图</button>' +
      '</div>';
  }

  var PicWrite = {
    SCENES: SCENES,
    WARMUP: WARMUP,
    sceneById: sceneById,
    todayScene: todayScene,
    panel: panel,
    round: 0,

    act: function (name, v) {
      var date = S().dateStr();
      if (name === 'picPick') {
        var s3 = sceneById(v);
        if (!s3) return false;
        var st = S().state;
        /* 开头：先把画面里的「谁、在干什么」写下来，这就是作文的第一句 */
        var seed = '图上画的是：' + s3.scene;
        st.speechDraft = {
          date: date, origin: seed, text: seed,
          asked: [], mode: 'pic', picId: s3.id
        };
        S().save();
        Kid.spAsk = null;
        return true;
      }
      if (name === 'picQuit') {
        S().state.speechDraft = null;
        S().save();
        Kid.spAsk = null;
        return true;
      }
      return false;
    }
  };

  global.PicWrite = PicWrite;
})(window);
