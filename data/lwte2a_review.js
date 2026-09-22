/* ===========================================================
   lwte2a_review.js —— 朗文 2A 复习 · 校内同步练习题库
   依据家长提供的《朗文 2A 复习资料》整理：
     Chapter 1  Coming to School
     Unit       About me
     Unit       People who help me
     Unit       What's the matter?
     Unit       公园规则（祈使句 / 指示牌）
     Unit       Places in the park（方位介词）
   题型：单选题 single / 多选题 multi / 判断题 judge
   每条都带 why 解析，答错时讲给孩子听。
   =========================================================== */
window.LWTE2A_REVIEW = {
  meta: { title: '朗文 2A 复习 · 校内同步题', book: 'Longman Welcome to English 2A' },

  units: [
    { id: 'u1', name: 'Chapter 1 · Coming to School（来学校）' },
    { id: 'u2', name: 'Unit · About me（关于我）' },
    { id: 'u3', name: 'Unit · People who help me（帮助我的人）' },
    { id: 'u4', name: "Unit · What's the matter?（身体不舒服）" },
    { id: 'u5', name: 'Unit · 公园规则（祈使句）' },
    { id: 'u6', name: 'Unit · Places in the park（公园里的地方）' }
  ],

  /* ---------------- 单选题 ---------------- */
  single: [
    {
      id: 's1', u: 'u1', q: '— How do you come to school? — I come to school ____ .',
      opts: ['on bus', 'by bus', 'in bus', 'by foot'], ans: 1,
      why: '“乘某交通工具”用 by + 交通工具，如 by bus / by car。“步行”要用 on foot，不用 by foot。'
    },
    {
      id: 's2', u: 'u1', q: 'One pupil ____ by car.',
      opts: ['come', 'comes', 'coming', 'to come'], ans: 1,
      why: 'One pupil 是第三人称单数，动词要加 s，所以是 comes。'
    },
    {
      id: 's3', u: 'u1', q: 'I go to school ____ .',
      opts: ['by foot', 'on foot', 'on feet', 'by feet'], ans: 1,
      why: '“走路去”固定说法是 on foot，也等于 I walk to school.。'
    },
    {
      id: 's4', u: 'u1', q: 'We also come to school ____ school bus.',
      opts: ['by', 'on', 'in', 'at'], ans: 0,
      why: 'by school bus 乘校车。by 后面直接跟交通工具，不加 a / the。'
    },
    {
      id: 's5', u: 'u1', q: 'Tom and I ____ in a group of four. 我们四个人一组。',
      opts: ['get into groups', 'gets into groups', 'getting into groups', 'get on groups'], ans: 0,
      why: 'get into groups 加入小组。主语是两个人（复数），动词用原形 get。'
    },
    {
      id: 's6', u: 'u1', q: 'Let’s ____ into groups of four.',
      opts: ['get', 'gets', 'getting', 'got'], ans: 0,
      why: 'Let’s = Let us，后面永远跟动词原形。'
    },
    {
      id: 's7', u: 'u2', q: '— Where do you live? — I live ____ Shanghai.',
      opts: ['at', 'on', 'in', 'to'], ans: 2,
      why: '住在城市、城区这样的大地方用 in，如 in Shanghai / in Tianhe District。'
    },
    {
      id: 's8', u: 'u2', q: 'I live ____ Hainan Island.',
      opts: ['in', 'on', 'at', 'under'], ans: 1,
      why: '住在岛上要用 on，如 on Hainan Island。这是课本特别强调的一点。'
    },
    {
      id: 's9', u: 'u2', q: '— What’s your telephone number? — ____ 18233440.',
      opts: ['It’s', 'They’re', 'I’m', 'He’s'], ans: 0,
      why: '问电话号码用 It’s + 号码，也可以直接说数字。'
    },
    {
      id: 's10', u: 'u2', q: '报电话号码时，502 可以读作 ____ 。',
      opts: ['five two', 'five zero two', 'five hundred two', 'five double two'], ans: 1,
      why: '电话号码里遇到 0 要读作 zero 或 oh，所以 502 读 five zero two（或 five oh two）。'
    },
    {
      id: 's11', u: 'u2', q: '566 除了 five six six，还可以读作 ____ 。',
      opts: ['five double six', 'double five six', 'five six double', 'two five six'], ans: 0,
      why: '连着两个相同数字，可以说 double + 数字，所以 566 读作 five double six。'
    },
    {
      id: 's12', u: 'u2', q: '— Do you like making new friends? — Yes, I do. I like ____ .',
      opts: ['make friends', 'making friends', 'makes friends', 'made friends'], ans: 1,
      why: 'like 后面接动词时用 -ing 形式，所以是 like making friends。'
    },
    {
      id: 's13', u: 'u3', q: '— ____ your Maths teacher? — My Maths teacher is Mr Li.',
      opts: ['Who’s', 'What’s', 'Where’s', 'How’s'], ans: 0,
      why: '问“谁”用疑问词 who，Who’s = Who is。'
    },
    {
      id: 's14', u: 'u3', q: 'This is ____ Wang. 这是王小姐。',
      opts: ['Mr', 'Mrs', 'Miss', 'Ms'], ans: 2,
      why: 'Miss 用于未婚女士（小姐）；Mr 是先生，Mrs 是太太。'
    },
    {
      id: 's15', u: 'u3', q: 'My mother is a nurse. ____ helps sick people.',
      opts: ['He', 'She', 'Her', 'His'], ans: 1,
      why: '主语位置要用主格 she；her 是宾格，不能放句首作主语。'
    },
    {
      id: 's16', u: 'u3', q: 'I give ____ a book. 我给他一本书。',
      opts: ['he', 'him', 'his', 'himself'], ans: 1,
      why: 'give 是动词，后面的人称代词要用宾格 him，不能用主格 he。'
    },
    {
      id: 's17', u: 'u3', q: 'Mr White speaks to ____ . 怀特先生跟她说话。',
      opts: ['she', 'her', 'hers', 'he'], ans: 1,
      why: '介词 to 后面也要用宾格 her，不能用主格 she。'
    },
    {
      id: 's18', u: 'u3', q: 'Do you like ____ ? 你喜欢他吗？',
      opts: ['he', 'him', 'his', 'hers'], ans: 1,
      why: '动词 like 后面用宾格 him；喜欢她用 her。'
    },
    {
      id: 's19', u: 'u3', q: '下面哪个词是“善于帮忙的、愿意帮忙的”？',
      opts: ['kind', 'helpful', 'friendly', 'unfriendly'], ans: 1,
      why: 'helpful 有帮助的、愿意帮忙的；kind 是友好的、慈祥的；friendly 是友善的。'
    },
    {
      id: 's20', u: 'u3', q: '下列单词中，和 school 押韵的是 ____ 。',
      opts: ['cool', 'sun', 'nose', 'shop'], ans: 0,
      why: 'school 和 cool 尾音相同，是 rhyming words（押韵词）。'
    },
    {
      id: 's21', u: 'u4', q: '— What’s the matter? — I have ____ . 我的牙疼。',
      opts: ['a toothache', 'a headache', 'a stomachache', 'a cold'], ans: 0,
      why: 'toothache 牙疼；headache 头疼；stomachache 胃疼；a cold 感冒。'
    },
    {
      id: 's22', u: 'u4', q: '— What’s the matter? — I have a ____ . 我嗓子疼。',
      opts: ['sore throat', 'broken arm', 'fever', 'cough'], ans: 0,
      why: 'a sore throat 喉咙痛、嗓子疼。'
    },
    {
      id: 's23', u: 'u4', q: 'A dentist works in a clinic and takes care of your ____ .',
      opts: ['teeth', 'books', 'buses', 'jacket'], ans: 0,
      why: 'dentist 是牙医，在诊所（clinic）工作，照看牙齿。'
    },
    {
      id: 's24', u: 'u5', q: '____ walk on the grass. 不要走在草地上。',
      opts: ['Don’t', 'Doesn’t', 'Not', 'No'], ans: 0,
      why: '祈使句的否定在句首加 Don’t，后面跟动词原形。'
    },
    {
      id: 's25', u: 'u5', q: 'Look at the sign. It ____ : Do not climb the trees.',
      opts: ['says', 'say', 'saying', 'said'], ans: 0,
      why: '描述指示牌上的内容用 It says: ...，it 是第三人称单数，所以用 says。'
    },
    {
      id: 's26', u: 'u5', q: 'I ____ to go out to play with my friends. 我想和朋友出去玩。',
      opts: ['want', 'wants', 'wanting', 'am want'], ans: 0,
      why: 'want to do sth. 想要做某事，主语 I 用动词原形 want。'
    },
    {
      id: 's27', u: 'u5', q: 'You can’t pick the flowers. 换一种说法是 ____ 。',
      opts: ['Don’t pick the flowers.', 'Don’t picking the flowers.', 'No pick the flowers.', 'Not pick the flowers.'], ans: 0,
      why: 'You can’t + 动词原形 和 Don’t + 动词原形 意思相同，都是“不要做”。'
    },
    {
      id: 's28', u: 'u6', q: 'Where ____ the toilets?',
      opts: ['is', 'are', 'am', 'be'], ans: 1,
      why: 'the toilets 是复数，要用 Where are ...？回答用 They’re ...。'
    },
    {
      id: 's29', u: 'u6', q: 'The toilets are ____ the cable car. 厕所在缆车的后面。',
      opts: ['between', 'in front of', 'behind', 'near'], ans: 2,
      why: 'behind 表示“在……后面”；between 是在两者之间；in front of 是在前面。'
    },
    {
      id: 's30', u: 'u6', q: 'The climbing frame is ____ the big wheel and the merry-go-round.',
      opts: ['between', 'behind', 'in front of', 'under'], ans: 0,
      why: 'between ... and ... 表示“在……和……之间”，两个事物之间用 between。'
    },
    {
      id: 's31', u: 'u6', q: 'I like ____ my bike in the park.',
      opts: ['ride', 'riding', 'rides', 'rode'], ans: 1,
      why: 'like + 动词的 -ing 形式，表示喜欢做某事。'
    },
    {
      id: 's32', u: 'u6', q: 'You ____ drink a cup of tea. 你可以喝一杯茶。',
      opts: ['can', 'cans', 'canning', 'to can'], ans: 0,
      why: 'can 是情态动词，后面接动词原形，而且没有人称变化。'
    }
  ],

  /* ---------------- 多选题 ---------------- */
  multi: [
    {
      id: 'm1', u: 'u1', q: '下面哪些是“乘某交通工具”的正确说法？（可多选）',
      opts: ['by bus', 'by bicycle', 'on foot', 'by minibus'], ans: [0, 1, 3],
      why: 'by + 交通工具都可以；on foot 是“步行”，它不算交通工具，所以不选。'
    },
    {
      id: 'm2', u: 'u1', q: '下面哪些说法等于 “I walk to school.”？（可多选）',
      opts: ['I go to school on foot.', 'I come to school by foot.', 'I go to school by walking.', 'I come to school on foot.'], ans: [0, 3],
      why: '走路上学 = on foot，可以用 go to school on foot 或 come to school on foot。by foot 和 by walking 都不对。'
    },
    {
      id: 'm3', u: 'u2', q: '下面哪些是课本里的中国城市或地名？（可多选）',
      opts: ['Beijing', 'Hangzhou', 'Hainan Island', 'Guangzhou'], ans: [0, 1, 2, 3],
      why: '北京、杭州、海南岛、广州都是本单元的城市地名，还有 Shanghai / Nanjing。'
    },
    {
      id: 'm4', u: 'u2', q: '关于 also 和 too，下面说法正确的是？（可多选）',
      opts: ['too 常用在肯定句或一般疑问句的句末', 'also 一般放在肯定句中，行前系后', 'too 一般放在句首', '句末的 too 前面通常加逗号'], ans: [0, 1, 3],
      why: 'too 放句末、前面常有逗号；also 在实意动词之前、系动词/情态动词/助动词之后（行前系后）。too 不放句首。'
    },
    {
      id: 'm5', u: 'u3', q: '下面哪些是学校老师的称呼？（可多选）',
      opts: ['PE teacher', 'Maths teacher', 'park keeper', 'English teacher'], ans: [0, 1, 3],
      why: 'PE teacher 体育老师、Maths teacher 数学老师、English teacher 英语老师；park keeper 是公园管理员，不是老师。'
    },
    {
      id: 'm6', u: 'u3', q: '下面哪些词是描述“人的性格”的形容词？（可多选）',
      opts: ['kind', 'helpful', 'friendly', 'uniform'], ans: [0, 1, 2],
      why: 'kind 友好的、helpful 有帮助的、friendly 友善的，都是形容人的形容词；uniform 是“制服”，是名词。'
    },
    {
      id: 'm7', u: 'u3', q: '加了前缀 un- 之后意思变成“不……”的有哪些？（可多选）',
      opts: ['friendly → unfriendly', 'kind → unkind', 'cool → uncool', 'happy → unhappy'], ans: [0, 1],
      why: '本单元学的是 friendly → unfriendly（不友好的）和 kind → unkind（不友善的）。'
    },
    {
      id: 'm8', u: 'u3', q: '下面哪些是由“动词 + er”变成的表示人的名词？（可多选）',
      opts: ['teacher', 'driver', 'dentist', 'dancer'], ans: [0, 1, 3],
      why: 'teach→teacher、drive→driver、dance→dancer（以 e 结尾直接加 r）；dentist 是牙医，不是动词加 er 变来的。'
    },
    {
      id: 'm9', u: 'u4', q: '下面哪些是课本里表示“身体不舒服”的词组？（可多选）',
      opts: ['a cough', 'a cold', 'a broken arm', 'a fever'], ans: [0, 1, 2, 3],
      why: 'a cough 咳嗽、a cold 感冒、a broken arm 受伤的手臂、a fever 发烧，都是本单元的词组。'
    },
    {
      id: 'm10', u: 'u4', q: '下面哪些句子中的人称代词用得对？（可多选）',
      opts: ['She is a teacher.', 'I give him a book.', 'Mr White speaks to her.', 'I give he a book.'], ans: [0, 1, 2],
      why: '主格 she/he 放主语位置；动词或介词后面要用宾格 him/her。所以 “I give he a book.” 是错的。'
    },
    {
      id: 'm11', u: 'u5', q: '下面哪些句子是祈使句（表示命令、请求、劝告）？（可多选）',
      opts: ['Don’t walk on the grass.', 'Please have a seat here.', 'I like swimming.', 'Let me help you.'], ans: [0, 1, 3],
      why: '祈使句以动词原形开头（Do 型/Be 型/Let 型）。I like swimming. 是陈述句，不是祈使句。'
    },
    {
      id: 'm12', u: 'u5', q: '下面哪些改写是对的？（可多选）',
      opts: ['Don’t pick the flowers. = You can’t pick the flowers.', 'Don’t feed the ducks. = You can’t feed the ducks.', 'Don’t climb the trees. = You can climb the trees.', 'No smoking! 表示禁止吸烟'], ans: [0, 1, 3],
      why: 'Don’t + 动词原形 等于 You can’t + 动词原形；No + 动词 -ing 表示禁止，如 No smoking! / No fishing!。“Don’t climb” 改成 “You can climb” 意思正好反了。'
    },
    {
      id: 'm13', u: 'u5', q: '下面哪些是“想做某事”的正确句子？（可多选）',
      opts: ['I want to go to the toilet.', 'I want to play basketball.', 'I want play basketball.', 'I want to buy a new toy.'], ans: [0, 1, 3],
      why: 'want 后面一定要跟 to + 动词原形，所以 “I want play basketball.” 少了 to。'
    },
    {
      id: 'm14', u: 'u6', q: '下面哪些是公园里常见的指示牌内容？（可多选）',
      opts: ['Do not pick the flowers.', 'Do not throw litter.', 'Do not climb the trees.', 'Do not do your homework.'], ans: [0, 1, 2],
      why: '摘花、扔垃圾、爬树都是公园里被禁止的行为；作业和公园规则没有关系。'
    },
    {
      id: 'm15', u: 'u6', q: '下面哪些是“公园里的地方”？（可多选）',
      opts: ['a playground', 'a snack bar', 'a tennis court', 'a swimming pool'], ans: [0, 1, 2, 3],
      why: 'playground 操场、snack bar 小吃店、tennis court 网球场、swimming pool 游泳池，都是本单元的地点词。'
    },
    {
      id: 'm16', u: 'u6', q: '关于方位介词，下面说法正确的是？（可多选）',
      opts: ['between 表示“在两者之间”，常和 and 连用', 'in front of 表示“在……前面”', 'behind 表示“在……后面”', 'between 可以只接一个东西'], ans: [0, 1, 2],
      why: 'between 是两者之间，后面要有两个对象，如 between the swings and the see-saw。'
    }
  ],

  /* ---------------- 判断题 ---------------- */
  judge: [
    {
      id: 'j1', u: 'u1', q: '“I come to school on bus.” 这句话是对的。', ans: 1,
      why: '乘公交车要说 by bus，“on foot”才是步行。'
    },
    {
      id: 'j2', u: 'u1', q: 'on foot 和 walk 意思相通，都表示“步行”。', ans: 0,
      why: 'I walk to school. = I go to school on foot. 两句意思一样。'
    },
    {
      id: 'j3', u: 'u1', q: 'by ferry 表示“乘渡轮”。', ans: 0,
      why: 'ferry 是渡轮，by ferry 就是乘渡轮、乘船。'
    },
    {
      id: 'j4', u: 'u2', q: '“Where do you live?” 可以回答 “I live in Shanghai.”。', ans: 0,
      why: '问住在哪里用 Where do you live?，回答 I live in + 地点。'
    },
    {
      id: 'j5', u: 'u2', q: '住在岛上的时候要用 on，如 I live on Hainan Island.。', ans: 0,
      why: '城市、区域用 in；岛屿用 on，这是课本特别提醒的地方。'
    },
    {
      id: 'j6', u: 'u2', q: 'also 一般放在肯定句中，位置是“行前系后”。', ans: 0,
      why: 'also 放在实意动词之前、系动词/情态动词/助动词之后，如 We also come to school by school bus.。'
    },
    {
      id: 'j7', u: 'u2', q: '上出租车用 get on，上公交车也用 get on。', ans: 1,
      why: '上小汽车、出租车（底盘低、不用抬腿）用 get in；上公交车、火车（有阶梯）用 get on。'
    },
    {
      id: 'j8', u: 'u3', q: '人称代词 he 的宾格是 him，she 的宾格是 her。', ans: 0,
      why: '主格 she/he 放主语位置，宾格 her/him 放在动词或介词后面。'
    },
    {
      id: 'j9', u: 'u3', q: '“I give he a book.” 这句话是对的。', ans: 1,
      why: 'give 后面要用宾格 him，正确说法是 “I give him a book.”。'
    },
    {
      id: 'j10', u: 'u3', q: 'Who’s = Who is，用来问“谁是……”。', ans: 0,
      why: 'Who’s your Maths teacher? = Who is your Maths teacher?。'
    },
    {
      id: 'j11', u: 'u3', q: '“Here you are.” 通常在把东西递给别人时说，对方一般回答 Thank you.。', ans: 0,
      why: 'Please give me an apple. — Here you are. — Thank you. 这是课本里的对话。'
    },
    {
      id: 'j12', u: 'u4', q: '“What’s the matter?” 是在问对方怎么了、哪里不舒服。', ans: 0,
      why: '回答用 I have a cough / a cold / a fever / a sore throat …… 这些表示身体不舒服。'
    },
    {
      id: 'j13', u: 'u5', q: '祈使句一般以动词原形开头，没有时态和数的变化。', ans: 0,
      why: '祈使句用来表示命令、请求、劝告、警告和禁止，动词用原形，句末用句号或感叹号。'
    },
    {
      id: 'j14', u: 'u5', q: '所有表示“禁止”的句子都必须用 Don’t 开头。', ans: 1,
      why: '还可以用 No 开头表示禁止，如 No smoking!（禁止吸烟）、No fishing!（禁止钓鱼）。'
    },
    {
      id: 'j15', u: 'u5', q: '指示牌上很多句子都以 Do not 开头，但也可以写成 Don’t。', ans: 0,
      why: 'Do not pick the flowers. = Don’t pick the flowers.，两种写法都可以。'
    },
    {
      id: 'j16', u: 'u6', q: '“Where is the playground?” 问的是单数的地点。', ans: 0,
      why: '单数地点用 Where is + 地点？回答用 It’s + 方位介词 + 地点。'
    },
    {
      id: 'j17', u: 'u6', q: '回答 “Where are the toilets?” 要用 “They’re behind the cable car.”。', ans: 0,
      why: '复数地点用 Where are ...？回答用 They’re + 方位介词 + 地点。'
    },
    {
      id: 'j18', u: 'u6', q: '“I like swim.” 是正确的表达。', ans: 1,
      why: 'like 后面要接动词的 -ing 形式，应该是 “I like swimming.”。'
    },
    {
      id: 'j19', u: 'u6', q: '“What a lot of people!” 是感叹句，用来表示惊讶。', ans: 0,
      why: '感叹句用来表达喜、怒、哀、乐和惊奇、惊讶，常由 what 或 how 引导。'
    },
    {
      id: 'j20', u: 'u6', q: 'can 是情态动词，后面接动词原形，如 I can write my name.。', ans: 0,
      why: 'can / can’t 后面一律跟动词原形，而且没有人称和数的变化。'
    }
  ]
};
