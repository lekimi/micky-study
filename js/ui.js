/* ===========================================================
   ui.js —— 素材（SVG）/ 弹窗 / Toast / 故事化鼓励文案
   =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 植物 SVG（PVZ 画风简笔版） ---------- */
  var SVG = {
    sunflower: function () {
      var petals = '';
      for (var i = 0; i < 12; i++) {
        var a = (i * 30) * Math.PI / 180;
        var cx = 50 + Math.cos(a) * 27;
        var cy = 46 + Math.sin(a) * 27;
        petals += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="10" ry="8" transform="rotate(' + (i * 30) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" fill="#FFC72C" stroke="#E09B0E" stroke-width="2"/>';
      }
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="46" y="52" width="8" height="42" rx="4" fill="#4E9A1E"/>' +
        '<ellipse cx="42" cy="70" rx="13" ry="7" fill="#5FB327" transform="rotate(-25 42 70)"/>' +
        petals +
        '<circle cx="50" cy="46" r="20" fill="#8B5E3C"/>' +
        '<circle cx="43" cy="42" r="3.6" fill="#2B1B0E"/>' +
        '<circle cx="57" cy="42" r="3.6" fill="#2B1B0E"/>' +
        '<circle cx="44" cy="41" r="1.3" fill="#fff"/>' +
        '<circle cx="58" cy="41" r="1.3" fill="#fff"/>' +
        '<path d="M45 52 Q50 57 55 52" stroke="#2B1B0E" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    },

    peashooter: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="44" y="54" width="9" height="40" rx="4" fill="#4E9A1E"/>' +
        '<ellipse cx="36" cy="72" rx="14" ry="7" fill="#5FB327" transform="rotate(-25 36 72)"/>' +
        '<ellipse cx="50" cy="44" rx="24" ry="22" fill="#63C22B"/>' +
        '<ellipse cx="50" cy="38" rx="19" ry="15" fill="#7AD63F"/>' +
        '<path d="M68 36 L88 28 L88 52 L68 46 Z" fill="#4E9A1E"/>' +
        '<ellipse cx="87" cy="40" rx="5" ry="9" fill="#3D7A16"/>' +
        '<circle cx="42" cy="40" r="4" fill="#fff"/>' +
        '<circle cx="43" cy="41" r="2.4" fill="#22310F"/>' +
        '<circle cx="57" cy="40" r="4" fill="#fff"/>' +
        '<circle cx="58" cy="41" r="2.4" fill="#22310F"/>' +
        '</svg>';
    },

    wallnut: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50 14 C72 14 82 34 82 52 C82 74 68 88 50 88 C32 88 18 74 18 52 C18 34 28 14 50 14 Z" fill="#C98A4B"/>' +
        '<path d="M50 20 C66 20 74 36 74 52 C74 70 63 82 50 82 C40 82 32 74 28 64 C40 58 46 44 44 30 C46 24 48 20 50 20 Z" fill="#E0A55F"/>' +
        '<circle cx="40" cy="48" r="4.6" fill="#fff"/>' +
        '<circle cx="41" cy="49" r="2.6" fill="#3B2A16"/>' +
        '<circle cx="60" cy="48" r="4.6" fill="#fff"/>' +
        '<circle cx="61" cy="49" r="2.6" fill="#3B2A16"/>' +
        '<path d="M42 64 Q50 71 58 64" stroke="#8B5E3C" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    },

    zombie: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="34" y="52" width="32" height="40" rx="6" fill="#6E7B8B"/>' +
        '<path d="M34 60 L20 70 L24 76 L36 70 Z" fill="#8FA07C"/>' +
        '<path d="M66 56 L86 60 L86 68 L66 66 Z" fill="#8FA07C"/>' +
        '<ellipse cx="50" cy="34" rx="24" ry="26" fill="#9DB082"/>' +
        '<path d="M28 20 C36 8 64 8 72 20 L72 26 C64 18 36 18 28 26 Z" fill="#6B4A2A"/>' +
        '<circle cx="41" cy="32" r="5" fill="#fff"/>' +
        '<circle cx="42" cy="33" r="2.6" fill="#8B1E1E"/>' +
        '<circle cx="60" cy="32" r="5" fill="#fff"/>' +
        '<circle cx="61" cy="33" r="2.6" fill="#8B1E1E"/>' +
        '<path d="M38 48 L44 48 L44 54 L38 54 Z" fill="#fff"/>' +
        '<path d="M52 48 L58 48 L58 54 L52 54 Z" fill="#fff"/>' +
        '<path d="M36 44 Q50 40 64 44" stroke="#5C6B48" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    },

    sun: function () {
      return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="26" fill="#FFD54A" stroke="#F0A81C" stroke-width="4"/>' +
        '<circle cx="50" cy="50" r="16" fill="#FFE68A"/>' +
        '</svg>';
    }
  };

  /* ---------- 故事化鼓励文案（高敏感孩子友好） ---------- */
  var STORY = {
    taskSubmitted: [
      { e: '🌻', t: '向日葵收到了！', m: '你把「完成的消息」交给向日葵啦。\n妈妈看一眼就会点亮它，耐心等一小会儿～' },
      { e: '📮', t: '消息飞出去啦', m: '你的努力被记在小本本上了。\n妈妈那边已经收到，很快就来看。' }
    ],
    approved: [
      { e: '☀️', t: '阳光 +1！', m: '妈妈点亮了这颗小太阳，它现在正式属于你啦。' },
      { e: '🌻', t: '向日葵转过身来', m: '「谢谢你今天来浇水。」\n向日葵朝着你笑了一下。' }
    ],
    allDone: [
      { e: '🏆', t: '今天全部完成！', m: '固定任务一个不落，2 阳光 + 2 全勤阳光到手！\n向日葵种植也解锁啦，去草坪上种一株吧。' }
    ],
    waterGain: [
      { e: '💧', t: '水滴 +{n}', m: '你把这滴水存进了池塘。\n攒够 3 滴，豌豆射手就会「啪」地把僵尸打退一步！' }
    ],
    zombieForward: [
      { e: '🧟', t: '小僵尸往前挪了一步', m: '它挠挠头，慢慢往前走了一点点。\n别怕——它走得慢，你一努力它就往后退。\n明天完成一次，我们就能把它推回去！' }
    ],
    zombieBack: [
      { e: '🌱', t: '啪！打中了！', m: '豌豆射手射出一颗豌豆，僵尸后退了一步。\n你攒的水滴真的有用！' }
    ],
    zombieEat: [
      { e: '😢', t: '僵尸溜进花园了', m: '它吃掉了一株向日葵，还带走了一点阳光。\n不过没关系——向日葵的种子还在你手里，\n明天再种一株，花园会重新热闹起来的。' }
    ],
    noSunToday: [
      { e: '🌤️', t: '今天有点阴天', m: '今天的任务没有全部完成，所以今天没有新阳光。\n但是！你已经攒下的阳光一颗都不会少，\n它们都在你的小花园里好好待着呢。\n明天太阳一出来，就能继续攒啦。' }
    ],
    planted: [
      { e: '🌱', t: '种好啦！', m: '{name}在草坪上站稳了。\n它会一直陪着你完成任务。' }
    ],
    mathTimeUp: [
      { e: '⏳', t: '今天的闯关时间用完啦', m: '小僵尸们回家睡觉去了，明天再来挑战它们！\n明天一早会自动补满时间，\n也可以去奖励中心用积分换一点时间。' }
    ],
    appTimeUp: [
      { e: '⏳', t: '今天的使用时间到啦', m: '眼睛该休息一下了。\n去外面跑一跑，或者翻本纸质书吧。\n\n（每日三项固定任务的打卡不受影响，\n明天一早时间会自动补满。）' }
    ],
    notEnoughSun: [
      { e: '🌻', t: '阳光还没攒够', m: '还差一点点就够了。\n完成明天的任务，阳光就会慢慢多起来的～' }
    ],
    redeemed: [
      { e: '🎁', t: '兑换成功！', m: '你用自己攒的阳光换到了「{name}」。\n记得去找妈妈兑现哦！' }
    ],
    sunGain: [
      { e: '☀️', t: '阳光到账！', m: '完成校内任务，阳光又多了一点。\n攒起来可以种向日葵，也能去奖励中心换东西。' }
    ],
    weekPenalty: [
      { e: '🐌', t: '上周有任务没做完', m: '僵尸往前挪了一步，还顺手带走了 5 个阳光。\n没关系——这星期攒够水滴就能把它打回去。\n而且越早完成，水滴还越多呢！' }
    ]
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- UI ---------- */
  /* ---------- 妈妈的悄悄话 · 模板库 ----------
     口吻设定：搞怪、随和、机灵古怪、不走寻常路的妈妈。
     不煽情、不说教、不「妈妈为你骄傲」，像真人在他耳边贫一句。 */
  var NOTE_TPL = [
    { t: '搞怪', list: [
      '今天允许你多吃一块饼干，别告诉你爸。',
      '我查过了，今天不适合写作业，但适合写完作业。',
      '宣布一件事：从现在起，你有权把最难的那件事放到最后做。',
      '你要是今天把字练了，我就考虑把「不许在沙发上跳」这条家规暂停一天。',
      '提醒一下：僵尸最怕的字是「认真」，你今天用了吗？',
      '别问，问就是妈妈今天心情很好，见者有份，多给你一朵小红花。',
      '如果今天有件事很难，你就假装它是个僵尸，一脚踢开。',
      '本人郑重声明：你今天可以犯三次错，用完为止，明天补满。',
      '听说有人今天要打败大 boss，我赌两包辣条你赢。',
      '本消息阅后即焚，看完就忘了吧，只有那句「多吃饭」是真的。',
      '警告：今天妈妈可能会突然抱你一下，别躲，躲也没用。',
      '我刚做了个决定，决定今天不催你。你自己看着办，反正我忍得住。'
    ] },
    { t: '随和', list: [
      '今天不用特别棒，正常发挥就行。',
      '写不完也没事，跟我说一声，咱俩一起想办法。',
      '累了就去躺一会儿，天塌下来有妈妈顶着。',
      '没拿到的星星不算丢，它就是在那儿等你下次来拿。',
      '你要是哪样都不想做，来找我，我们聊五分钟再说。',
      '今天想先做哪样就先做哪样，顺序你定。'
    ] },
    /* 「陪着」这一类只在心情差的时候用：完全不提任务、不提学习、不要求他做任何事 */
    { t: '陪着', list: [
      '我今天什么都不要求你，就在这儿。',
      '你不用解释，我也不问。',
      '难过就难过一会儿，不用快点好起来。',
      '今天允许你什么都不做，真的允许。',
      '你不用当懂事的孩子，当一会儿小孩就行。',
      '要是想说话，我在；不想说，我也在。',
      '抱不抱？不抱也行，我待会儿再问一次。',
      '我给你留了热水，想喝自己倒。',
      '今天可以早点睡，剩下的明天再说。',
      '你今天已经很不容易了，歇着吧。'
    ] },
    { t: '机灵', list: [
      '给你个暗号：觉得难的时候，捏三下自己的耳朵，我就在想你了。',
      '今天的隐藏任务——找出一个你昨天还不会、今天会了的东西。找到了告诉我。',
      '我发现一个秘密：先做最讨厌的那件事，剩下一天都像在放假。你试试？',
      '给你个特权：今天可以指定一个人陪你玩十分钟，我除外也得答应。',
      '要是有人惹你不高兴，你就在心里把他想成一只很慢的僵尸，然后超过他。',
      '偷偷告诉你，妈妈的绝招是：搞不定的时候先去喝口水。'
    ] },
    { t: '惊喜', list: [
      '今晚有惊喜，具体内容保密，但你今天乖的话会更大份。',
      '冰箱第二层有东西，写完作业再去看。',
      '今天放学回来，我先不讲道理，先给你一个抱抱。',
      '我藏了个小东西在你书包侧袋，自己找。',
      '周末计划我改了，改成你想的那个。别问，我已经决定了。'
    ] },
    { t: '打气', list: [
      '你昨天那一下挺厉害的，我看见了。',
      '不用跟谁比，跟昨天的自己比就行。',
      '你卡住的时候，比你自己以为的更接近答案。',
      '错了就错了，擦掉重写这个动作本身就很帅。',
      '要是今天只做成一件事，那也够本了。'
    ] }
  ];

  /* 心情 → 该用哪种语气（AI 自动悄悄话用）
     原则：心情越差，越要「只陪伴、不要求」，绝不让他振作、绝不派任务 */
  var NOTE_BY_MOOD = {
    sun: { cats: ['搞怪', '惊喜', '机灵'], tone: '他今天心情不错，可以贫一点、闹一点。' },
    cloud: { cats: ['随和', '机灵', '搞怪'], tone: '他今天有点闷，但不严重。轻松一点，别追问。' },
    rain: { cats: ['陪着', '随和'], tone: '他今天心里在下雨。别让他振作，别讲道理，只是陪着、让他知道有人看见。可以提一嘴今天不用勉强，但不要安排他做任何事。' },
    storm: { cats: ['陪着'], tone: '他今天情绪很不好。绝对不能要求他做任何事，不能说「要坚强」「别难过」，不能提学习、作业、任务，只说你在这儿、什么都不用做。' },
    none: { cats: ['搞怪', '随和'], tone: '不知道他今天什么心情，说句轻松的就好。' }
  };

  var UI = {
    SVG: SVG,

    toast: function (msg) {
      var root = document.getElementById('toast-root');
      if (!root) return;
      var el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      root.appendChild(el);
      setTimeout(function () {
        el.style.transition = 'opacity .3s';
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 320);
      }, 1900);
    },

    /* 故事化弹窗 */
    story: function (key, vars, onClose) {
      var list = STORY[key];
      if (!list) return;
      var s = pick(list);
      var title = s.t, msg = s.m;
      if (vars) {
        Object.keys(vars).forEach(function (k) {
          title = title.split('{' + k + '}').join(vars[k]);
          msg = msg.split('{' + k + '}').join(vars[k]);
        });
      }
      UI.modal({ emoji: s.e, title: title, text: msg, okText: '好的！', onClose: onClose });
    },

    modal: function (opt) {
      var root = document.getElementById('modal-root');
      if (!root) return;
      var buttons = opt.buttons || [{ text: opt.okText || '知道啦', cls: 'btn-green', act: 'close' }];
      var html = '<div class="modal-mask"><div class="modal-box">' +
        (opt.emoji ? '<div class="modal-emoji">' + opt.emoji + '</div>' : '') +
        (opt.title ? '<div class="modal-title">' + opt.title + '</div>' : '') +
        (opt.text ? '<div class="modal-text">' + opt.text + '</div>' : '') +
        (opt.body || '') +
        '<div class="mt8">' +
        buttons.map(function (b, i) {
          return '<button class="btn ' + (b.cls || 'btn-wood') + ' mb8" data-i="' + i + '">' + b.text + '</button>';
        }).join('<div style="height:8px"></div>') +
        '</div></div></div>';
      root.innerHTML = html;

      var mask = root.querySelector('.modal-mask');
      function close() {
        root.innerHTML = '';
        if (opt.onClose) opt.onClose();
      }
      mask.addEventListener('click', function (e) {
        if (e.target === mask && opt.dismissible !== false) close();
      });
      root.querySelectorAll('[data-i]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var b = buttons[+btn.getAttribute('data-i')];
          if (b.onClick) { b.onClick(close); }
          else close();
        });
      });
    },

    confirm: function (title, text, onYes, yesText) {
      UI.modal({
        emoji: '❓', title: title, text: text,
        buttons: [
          { text: yesText || '确定', cls: 'btn-green', onClick: function (c) { c(); if (onYes) onYes(); } },
          { text: '再想想', cls: 'btn-ghost', onClick: function (c) { c(); } }
        ]
      });
    },

    /* 转义，防止用户输入的文字破坏页面 */
    esc: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  UI.NOTE_TPL = NOTE_TPL;
  UI.NOTE_BY_MOOD = NOTE_BY_MOOD;
  global.UI = UI;
})(window);
