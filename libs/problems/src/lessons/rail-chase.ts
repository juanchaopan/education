import { lessonContent } from '../lesson-content.js';

// 六年级学而思讲义：数轴上，黄车（长 2 格）的中点 M 在 −1，蓝车（长 6 格）的
// 中点 N 在 9，两车同时向右开，黄车每秒 2 格，蓝车每秒 1 格。经过几秒，M、N
// 相距 4 格？The owl brings the child back into the problem slowly, then the
// child pushes the cars through key seconds while the derivation grows on
// the derivation board, from the ten squares between them at the start to
// |10 − t| = 4 and its two cases. The child gives both times, checks them on
// the same tracks, and a variation with a faster yellow car follows. The
// lesson never stops at 6 or 14 seconds before the answer, and no scene
// prompt states them.
export const railChaseLesson = lessonContent({
  problem: { id: 'rail-chase', version: 1 },
  flow: 'derive-and-solve',
  vocabulary: [
    '黄车',
    '蓝车',
    '中点',
    '相距',
    '四格',
    '每秒',
    '追回',
    '空隙',
    '绝对值',
    '方程',
    '第几秒',
  ],
  shots: [
    'story',
    'speed',
    'question',
    'start-gap',
    'one-second',
    'two-seconds',
    'three-seconds',
    'name-t',
    'catch-up',
    'past',
    'distance',
    'equation',
    'two-ways',
    'solve',
    'check-six',
    'check-fourteen',
    'vary',
    'vary-seven',
  ],
  lines: {
    storyWorkshop: {
      scene: 'story',
      text: '这里是一间轨道工作室。桌上铺着两条长长的小轨道，一条在上面，一条在下面。',
    },
    storyCars: {
      scene: 'story',
      text: '上面的轨道上，停着一辆黄色的小车；下面的轨道上，停着一辆蓝色的小车。两辆车的车头，都朝着右边。',
    },
    storyStart: {
      scene: 'story',
      text: '等一会儿，两辆车会在同一个时刻出发，一直往右开。我们先认识一下它们。',
    },
    speedIntro: {
      scene: 'speed',
      text: '两辆小车跑得不一样快。点一点黄车，看看它一秒走多远。',
    },
    speedYellow: {
      scene: 'speed',
      text: '黄车快。每过一秒，它往前走两格。看，就是车前这两格这么远。再点一点蓝车。',
    },
    speedBlue: { scene: 'speed', text: '蓝车慢一些。每过一秒，它只走一格。' },
    speedBoth: { scene: 'speed', text: '记住了吗？黄车每秒走两格，蓝车每秒走一格。' },
    questionGround: {
      scene: 'question',
      text: '两辆车一快一慢，都往右开。现在看看，题目要我们找什么。',
    },
    questionPoints: {
      scene: 'question',
      text: '我们不看整辆车，只看车子正中间的那个点。黄车中间的点叫 M，蓝车中间的点叫 N。点一点 M，再点一点 N。',
    },
    questionAsk: {
      scene: 'question',
      text: '题目问的就是这两个点：M 和 N，什么时候正好相距四格？',
    },
    questionFour: { scene: 'question', text: '四格有多长？就是题目旁边这么长。' },
    questionSteps: {
      scene: 'question',
      text: '两辆车一起往右开，什么时候，M 和 N 之间正好是这么长？我们一步一步来找。',
    },
    startGround: {
      scene: 'start-gap',
      text: '车还没开。先看看，一开始 M 和 N 隔着多远。',
    },
    startAsk: {
      scene: 'start-gap',
      text: '从两个点各拉一条线下来。点一点两条线中间的这一段。',
    },
    startCount: {
      scene: 'start-gap',
      text: '数一数，一共十格。一开始，蓝车领先黄车十格。',
    },
    startKeep: {
      scene: 'start-gap',
      text: '这十格我们留在下面。等车开起来，看看它会怎么变。',
    },
    oneGround: { scene: 'one-second', text: '一开始，M 和 N 隔着十格。现在，车要开了。' },
    oneGuess: {
      scene: 'one-second',
      text: '先猜一猜：开起来以后，M 和 N 中间的空隙，会变长，还是变短？想好了，就推一推黄车。',
    },
    oneStop: {
      scene: 'one-second',
      text: '停一下。这一秒，黄车走了两格，蓝车也往前走了一格。',
    },
    oneCompare: {
      scene: 'one-second',
      text: '把两段路程上下对齐，黄车多走了一格。多走的这一格，就是它追回来的。',
    },
    oneGold: {
      scene: 'one-second',
      text: '所以中间的空隙，从十格变成了九格。看，起点那十格里，有一格变成了金色，这就是追回的一格。',
    },
    twoGround: { scene: 'two-seconds', text: '现在走了一秒，空隙是九格。' },
    twoAsk: { scene: 'two-seconds', text: '是不是每一秒都这样呢？再推一秒看看。' },
    twoStop: {
      scene: 'two-seconds',
      text: '又追回了一格。起点的十格里，已经有两格是金色的；中间的空隙，还剩八格。',
    },
    threeGround: { scene: 'three-seconds', text: '两秒过去了，空隙是八格。' },
    threeThink: {
      scene: 'three-seconds',
      text: '这一回先别急着推。想一想：再走一秒，一共走了三秒，会追回几格？空隙还剩几格？想好了再推。',
    },
    threeStop: {
      scene: 'three-seconds',
      text: '三秒，追回三格，金格子有三格了。十减三，空隙还剩七格。和你想的一样吗？',
    },
    nameGround: {
      scene: 'name-t',
      text: '看看这三秒：一秒追回一格，两秒追回两格，三秒追回三格。你发现规律了吗？走了几秒，就追回几格。',
    },
    nameT: {
      scene: 'name-t',
      text: '可是秒数一直在变，一会儿是三，一会儿是四。我们给它起个名字，就叫 t。走了 t 秒，就追回 t 格。',
    },
    nameAsk: {
      scene: 'name-t',
      text: '那蓝车还领先几格呢？点一点起点那十格里，还没变成金色的那一段。',
    },
    nameRest: {
      scene: 'name-t',
      text: '这一段，和上面的空隙一样长，就是蓝车还领先的格数。一开始领先十格，追回了 t 格，蓝车还领先十减 t 格。',
    },
    nameCheck: {
      scene: 'name-t',
      text: '刚才三秒的时候，十减三是七，空隙正好七格。对上了。',
    },
    catchGround: { scene: 'catch-up', text: '我们得出：走了 t 秒，蓝车还领先十减 t 格。' },
    catchPush: {
      scene: 'catch-up',
      text: '接着推吧。一边推，一边看中间的空隙一格一格变短。',
    },
    catchMeet: {
      scene: 'catch-up',
      text: '停。两个点上下对齐了，空隙一格也没有了。十减十，正好是零：谁也不领先。',
    },
    catchAhead: {
      scene: 'catch-up',
      text: '可车还在开呀。再往前，谁会跑到前面去？中间的空隙又会怎样？',
    },
    pastGround: { scene: 'past', text: '两个点刚刚对齐，空隙是零。推过去看看。' },
    pastPassed: {
      scene: 'past',
      text: '黄车超过去了！两个点之间又隔开了，你数一数，隔着一格。',
    },
    pastMinus: {
      scene: 'past',
      text: '可是，要是还用十减 t 来算：十减十一，得负一。蓝车领先负一格？这是什么意思呢？点一点这段空隙，我们看个明白。',
    },
    pastWhy: {
      scene: 'past',
      text: '十减 t 说的是蓝车领先几格。现在黄车跑到了前面，蓝车不但不领先，还落后了一格。领先负一格，就是黄车反过来领先一格。',
    },
    pastSign: {
      scene: 'past',
      text: '所以负号告诉我们谁在前：现在是黄车在前。可是两个点之间的长度，还是实实在在的一格。',
    },
    distanceGround: {
      scene: 'distance',
      text: '领先负几格，就是黄车反过来领先几格。',
    },
    distancePush: { scene: 'distance', text: '再推一秒，验证一下。' },
    distanceAgain: {
      scene: 'distance',
      text: '十减十二，得负二：黄车领先两格。数一数空隙，正好两格。算出来带负号，量出来是正的。',
    },
    distanceAbs: {
      scene: 'distance',
      text: '距离只管有多长，不管谁在前。数学里有个记号，专门把负号去掉、只留下长度，叫绝对值，写的时候用两根竖线把它夹起来。',
    },
    distanceCheck: {
      scene: 'distance',
      text: '所以，距离就是十减 t 的绝对值。追上以前也能用：三秒的时候，十减三的绝对值，还是七。',
    },
    equationGround: {
      scene: 'equation',
      text: '有了距离的式子，就可以回到题目了。',
    },
    equationAsk: {
      scene: 'equation',
      text: '题目问什么时候相距四格？点一点题目里的「四格」。',
    },
    equationSet: {
      scene: 'equation',
      text: '距离是十减 t 的绝对值，题目要它等于四。所以，十减 t 的绝对值，等于四。这就是我们要解的方程。',
    },
    waysGround: {
      scene: 'two-ways',
      text: '绝对值等于四，意思是两个点之间隔着四格。',
    },
    waysAsk: {
      scene: 'two-ways',
      text: '可是，谁在前呢？还记得吗，追上以前蓝车在前，追过以后黄车在前。点一点这两张小图。',
    },
    waysBlue: {
      scene: 'two-ways',
      text: '蓝车在前四格：蓝车领先四格，十减 t 等于四。',
    },
    waysYellow: {
      scene: 'two-ways',
      text: '黄车在前四格：蓝车领先负四格，十减 t 等于负四。两种站法，距离都是四格。',
    },
    solveGround: {
      scene: 'solve',
      text: '题目要找 M 和 N 正好相距四格的时刻。下面写着两种站法的两条式子。',
    },
    solveAsk: {
      scene: 'solve',
      text: '两种站法，各算一算：是第几秒？M 和 N 正好相距四格的时刻，每一个都说出来。',
    },
    checkGround: {
      scene: 'check-six',
      text: '你说出了时刻。我们回到起点，把车再开一遍，看看你说的时刻是不是真的相距四格。推一推黄车吧。',
    },
    checkSix: {
      scene: 'check-six',
      text: '停一下。两车中间刚好四格，蓝车还在前面。黄车已经追回六格，所以这是第六秒。',
    },
    fourteenGround: {
      scene: 'check-fourteen',
      text: '我们在核对第二个时刻。接着推，看看黄车跑到前面以后。',
    },
    checkFourteen: {
      scene: 'check-fourteen',
      text: '又是四格。这次黄车在前：蓝车领先负四格，也就是黄车领先四格。这是第十四秒。',
    },
    checkTwo: {
      scene: 'check-fourteen',
      text: '两个时刻，方向相反，距离却一样。这就是这条方程有两个解的原因。',
    },
    varyGround: {
      scene: 'vary',
      text: '换个条件试试。假如黄车跑得更快，每秒走三格；蓝车还是每秒一格。一开始还是隔着十格。',
    },
    varyGuess: {
      scene: 'vary',
      text: '这一回，M 和 N 什么时候相距四格？先在心里猜一猜，每一个时刻都想好。想好了，就推一推黄车。',
    },
    varyStop: { scene: 'vary', text: '停。' },
    varyOn: { scene: 'vary-seven', text: '现在黄车每秒走三格。接着推，看看下一次。' },
    varyStopAgain: { scene: 'vary-seven', text: '停。' },
    varyWhy: { scene: 'vary-seven', text: '和你猜的一样吗？想一想，为什么是这两个时刻。' },
    varyReveal: {
      scene: 'vary-seven',
      text: '黄车每秒追回两格了。十格追到只剩四格，要追回六格，用三秒；追过去再拉开四格，一共追回十四格，用七秒。还是前后两次。',
    },
  },
  scenes: {
    story: {
      prompt:
        '桌上有上下两条轨道，上面停着一辆黄色的小车，下面停着一辆蓝色的小车，车头都朝右。老师在介绍它们，孩子只看和听，点车时车灯会亮一下。',
      entry: ['storyWorkshop', 'storyCars', 'storyStart'],
    },
    speed: {
      prompt:
        '两辆车停在起点。孩子先点黄车，车前亮出一秒走的两格；再点蓝车，车前亮出一秒走的一格。黄车每秒走两格，蓝车每秒走一格。',
      entry: ['speedIntro'],
    },
    question: {
      prompt:
        '黄车正中间的点叫 M，蓝车正中间的点叫 N。孩子点一点 M 和 N。题目问 M 和 N 什么时候正好相距四格，题目条旁边画着四格有多长。',
      entry: ['questionGround', 'questionPoints'],
    },
    'start-gap': {
      prompt:
        '车还没开。从 M 和 N 各拉一条线下来，孩子点两条线中间的一段，跟着一格一格数出一开始两点隔着几格，这几格留在下面叫起点的格子。',
      entry: ['startGround', 'startAsk'],
    },
    'one-second': {
      prompt:
        '孩子先猜车开起来以后两点之间的空隙会变长还是变短，再推黄车走一秒，车自动停在一秒。看同样走一秒时黄车比蓝车多走几格，起点的格子里追回的一格变成金色。',
      entry: ['oneGround', 'oneGuess'],
    },
    'two-seconds': {
      prompt: '孩子再推一秒，车停在两秒，看看每一秒是不是都追回同样多，空隙还剩几格。',
      entry: ['twoGround', 'twoAsk'],
    },
    'three-seconds': {
      prompt:
        '孩子先在心里算走三秒会追回几格、空隙还剩几格，再推车，车停在三秒，用起点的格子和空隙核对。',
      entry: ['threeGround', 'threeThink'],
    },
    'name-t': {
      prompt:
        '车停在三秒。把走的秒数叫 t，走了 t 秒就追回 t 格。孩子点起点格子里还没变金的一段，它和上面的空隙一样长，看出蓝车还领先几格怎样用 t 写出来。',
      entry: ['nameGround', 'nameT', 'nameAsk'],
    },
    'catch-up': {
      prompt:
        '孩子接着推车，空隙一格一格变短，车自动停在两个中点上下对齐的那一刻，用蓝车领先几格的式子算出是零。',
      entry: ['catchGround', 'catchPush'],
    },
    past: {
      prompt:
        '孩子推车越过对齐的地方，车停在下一秒，黄车跑到了前面。用蓝车领先几格的式子算出负数，可两点之间明明隔着格子。孩子点两点之间的空隙，看出领先负几格就是黄车反过来领先几格。',
      entry: ['pastGround'],
    },
    distance: {
      prompt:
        '孩子再推一秒，车停下，又是算出负数、量出正的格数。老师介绍绝对值：只留下长度、不管谁在前，并写出距离的式子，用追上以前和追过以后的例子核对。',
      entry: ['distanceGround', 'distancePush'],
    },
    equation: {
      prompt: '车停着。孩子点题目条上的四格，把距离的式子和题目要的四格连成一条方程。',
      entry: ['equationGround', 'equationAsk'],
    },
    'two-ways': {
      prompt:
        '车停着。轨道旁有两张小图：蓝车在前隔四格、黄车在前隔四格。孩子依次点两张小图，把方程分成两种站法的两条式子，这一幕不说时刻。',
      entry: ['waysGround', 'waysAsk'],
    },
    solve: {
      prompt:
        '车停着，不能推。推导板上是两种站法的两条式子。孩子各算一算，说出 M 和 N 正好相距四格的每一个时刻。',
      entry: ['solveGround', 'solveAsk'],
    },
    'check-six': {
      prompt:
        '孩子已经答对。车回到起点，孩子再推一次车，车停在蓝车在前、两点隔四格的那一刻，核对第一个时刻。',
      entry: ['checkGround'],
    },
    'check-fourteen': {
      prompt:
        '孩子接着推车，越过对齐的地方，车停在黄车在前、两点又隔四格的那一刻，核对第二个时刻，看两个时刻方向相反、距离一样。',
      entry: ['fourteenGround'],
    },
    vary: {
      prompt:
        '换个条件：黄车每秒走三格，蓝车还是每秒一格，一开始还是隔十格。孩子先在心里猜两点什么时候相距四格，再推车，车在第一个相距四格的时刻停下，老师只说「停」。',
      entry: ['varyGround', 'varyGuess'],
    },
    'vary-seven': {
      prompt:
        '还是黄车每秒走三格。孩子接着推车，车在第二个相距四格的时刻停下。老师请孩子想想和猜的一样吗、为什么，再说出每秒追回的格数怎样变了、两个时刻是怎么来的。',
      entry: ['varyOn'],
    },
  },
  // What each scene finds stays in the picture: the speeds beside the cars,
  // the start strip with its gold squares and the derivation board. The
  // board's lines are drawn by the scene; these are what they say. The times
  // are written on the equation only once the child has answered right. The
  // faster yellow car stands right after the rate it changes.
  conclusions: [
    { id: 'speeds', says: '黄车每秒走 2 格，蓝车每秒走 1 格', from: 'speed' },
    { id: 'start-gap', says: '一开始 M 和 N 相距 10 格，蓝车领先', from: 'start-gap' },
    { id: 'rate', says: '每秒追回 2 − 1 = 1 格', from: 'one-second' },
    {
      id: 'faster',
      says: '假如黄车每秒走 3 格，每秒追回 3 − 1 = 2 格',
      from: 'vary',
      uses: ['vary', 'vary-seven'],
      supposed: true,
    },
    { id: 'rest', says: '走了 t 秒，蓝车还领先 10 − t 格', from: 'name-t' },
    { id: 'distance', says: '距离 = |10 − t|', from: 'distance' },
    {
      id: 'equation',
      says: '|10 − t| = 4',
      from: 'equation',
      uses: ['two-ways', 'solve'],
      answer: { says: '|10 − t| = 4，t = 6 或 t = 14' },
    },
    {
      id: 'cases',
      says: '蓝车在前时 10 − t = 4，黄车在前时 10 − t = −4',
      from: 'two-ways',
      uses: ['solve', 'check-six', 'check-fourteen'],
      hints: ['blue-ahead', 'yellow-ahead'],
    },
  ],
});
