
const scene = document.querySelector('#scene');
const colors = [['红','#ec4855'],['橙','#ef872c'],['黄','#ffcb39'],['绿','#62b449'],['青','#30bdc2'],['蓝','#4078d9'],['紫','#9657c6']];
let readAloud = false;
let lastLine = '';
let toneContext;
const element = (id) => document.getElementById(id);
const line = (message) => {
  lastLine = message;
  element('feedback').textContent = message;
  if (readAloud) speak(message);
};
function speak(message) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const voice = speechSynthesis.getVoices().find(({lang}) => /^zh[-_]CN$/i.test(lang));
  if (!voice) {
    element('audio-info').textContent = '这台浏览器没有可用的普通话声音。请看画面提示。';
    return;
  }
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'zh-CN';
  utterance.voice = voice;
  utterance.rate = 0.88;
  speechSynthesis.speak(utterance);
}
function chime(notes) {
  if (!readAloud || !window.AudioContext) return;
  toneContext ??= new AudioContext();
  void toneContext.resume();
  notes.forEach((frequency, index) => {
    const start = toneContext.currentTime + index * .10;
    const oscillator = toneContext.createOscillator();
    const volume = toneContext.createGain();
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(.045, start);
    volume.gain.exponentialRampToValueAtTime(.001, start + .14);
    oscillator.connect(volume).connect(toneContext.destination);
    oscillator.start(start);
    oscillator.stop(start + .15);
  });
}
function support() {
  return '<div class="tools"><button class="secondary" id="audio" aria-pressed="false">开启朗读和音效</button><button class="secondary" id="example">看看孩子可以怎么问</button><span id="audio-info">追问为预写示例</span></div>';
}
function wireSupport(example) {
  const audio = element('audio');
  audio.setAttribute('aria-pressed', String(readAloud));
  audio.textContent = readAloud ? '关闭朗读和音效' : '开启朗读和音效';
  audio.onclick = () => {
    readAloud = !readAloud;
    audio.setAttribute('aria-pressed', String(readAloud));
    audio.textContent = readAloud ? '关闭朗读和音效' : '开启朗读和音效';
    if (readAloud) speak(lastLine);
    else window.speechSynthesis?.cancel();
  };
  element('example').onclick = () => line(example());
}
function transfer(prompt, button, correct) {
  const section = element('transfer');
  section.hidden = false;
  section.innerHTML = '<p><strong>换一种情况</strong></p><p>' + prompt + '</p><form class="answer"><input aria-label="变化题答案" inputmode="numeric" required pattern="[0-9]+"><button class="primary">' + button + '</button></form><p role="status"></p>';
  let attempts = 0;
  const input = section.querySelector('input');
  input.focus();
  section.querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    attempts++;
    const message = Number(input.value) === correct
      ? (attempts === 1 ? '这次变化题的数字答对了。再说说你是怎么想的。' : '这次改对了。再说说你是怎么想的。')
      : '这个数还不合适。把你的想法说出来，想想换了什么条件。';
    section.querySelector('[role=status]').textContent = message;
    if (readAloud) speak(message);
  };
}

function balance() {
  scene.innerHTML = '<article class="stage balance-stage"><p class="eyebrow">第 7 题 · 菜园里的秤</p><h1>谁能和青菜一样重？</h1><p class="intro">一棵青菜和几根黄瓜能让天平平衡？先去看看苹果这条线索。</p><div class="clues"><div>🥬 2 棵青菜 ＝ 🍎 6 个苹果</div><div>🍎 1 个苹果 ＝ 🥒 3 根黄瓜</div></div><div class="balance-layout"><section class="scale-card"><h2>试试这架天平</h2><div class="scale"><div class="pivot"></div><div class="arm" id="arm"><div class="pan left" id="left"></div><div class="pan right" id="right"></div></div><div class="pin"></div></div><p class="scale-status" id="scale-status"></p><button class="scale-action" id="split">两边各取走一半</button><button class="scale-action primary" id="check-scale" hidden>我想好了</button></section><aside class="side-panel"><p class="eyebrow">菜园篮子</p><p>点黄瓜或拖到右盘。先猜猜要放几根，再试试看。</p><button id="cuke" class="cuke" aria-label="加一根黄瓜">🥒 +1</button> <button id="remove" aria-label="取下一根黄瓜">−1</button><p class="note" id="feedback" role="status"></p></aside></div><section id="transfer" class="transfer" hidden></section>' + support() + '</article>';
  let mode = 'clue';
  let apples = 0;
  let cucumbers = 0;
  const produce = (icon, count) => ('<span class="produce" aria-hidden="true">' + icon + '</span>').repeat(count);
  function paint() {
    element('left').innerHTML = produce('🥬', mode === 'clue' ? 2 : 1);
    const appleArt = mode === 'half' || mode === 'exchange'
      ? Array.from({length:apples}, (_, index) => '<button class="produce apple" aria-label="换第 ' + (index + 1) + ' 个苹果">🍎</button>').join('')
      : produce('🍎', apples);
    element('right').innerHTML = appleArt + produce('🥒', cucumbers);
    for (const apple of element('right').querySelectorAll('.apple')) {
      apple.onclick = () => {
        exchangeApple();
        (element('right').querySelector('.apple') || split).focus();
      };
    }
    const rightWeight = apples * 3 + cucumbers;
    const leftWeight = mode === 'clue' ? 18 : 9;
    const difference = rightWeight - leftWeight;
    element('arm').style.setProperty('--tilt', Math.max(-10, Math.min(10, difference * 2.4)) + 'deg');
    const contents = [apples ? apples + ' 个苹果' : '', cucumbers ? cucumbers + ' 根黄瓜' : ''].filter(Boolean).join('和') || '空着';
    element('scale-status').textContent = (mode === 'clue' ? '左盘 2 棵青菜' : '左盘 1 棵青菜') + ' · 右盘 ' + contents + ' · ' + (difference === 0 ? '平衡' : difference > 0 ? '右边重' : '左边重');
    element('cuke').disabled = mode === 'clue' || mode === 'done' || cucumbers >= 12;
    element('remove').disabled = mode === 'clue' || mode === 'done' || cucumbers === 0;
  }
  function addCucumber() {
    if (element('cuke').disabled) return;
    cucumbers++;
    paint();
    if (cucumbers === 9) line('两边平了！你可以多放一根试试，看看哪边更重。');
    else line(cucumbers < 9 ? '青菜这边更重。' : '黄瓜这边更重。可以取下一根。');
    chime([300]);
  }
  const split = element('split');
  function exchangeApple() {
    mode = 'exchange';
    apples--;
    cucumbers += 3;
    split.textContent = '清空右盘，我来试';
    split.onclick = () => {
      mode = 'predict';
      cucumbers = 0;
      apples = 0;
      split.hidden = true;
      element('check-scale').hidden = false;
      paint();
      line('先想想要换几组，再把黄瓜放到右盘试一试。');
      element('cuke').focus();
    };
    line(apples > 0 ? '换掉 1 个苹果，天平没有倾斜。剩下的苹果也可以这样换。' : '每个苹果都换成了一组黄瓜。说说为什么天平一直没歪。');
    chime([375, 480]);
    paint();
  }
  split.onclick = () => {
    if (mode === 'clue') {
      mode = 'half';
      apples = 3;
      split.textContent = '用 3 根黄瓜换 1 个苹果';
      line('天平还是平的。1 棵青菜和 3 个苹果一样重。点右盘里的一个苹果，看看能换出什么。');
    } else {
      exchangeApple();
      return;
    }
    chime([375, 480]);
    paint();
  };
  const cuke = element('cuke');
  const pan = element('right');
  let start = null;
  let dragged = false;
  cuke.onpointerdown = (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    start = {x:event.clientX,y:event.clientY,id:event.pointerId};
    dragged = false;
    cuke.setPointerCapture(event.pointerId);
  };
  const insidePan = ({clientX,clientY}) => {
    const box = pan.getBoundingClientRect();
    return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
  };
  cuke.onpointermove = (event) => {
    if (start?.id !== event.pointerId) return;
    dragged ||= Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8;
    cuke.classList.toggle('grabbed', dragged);
    pan.classList.toggle('over', dragged && insidePan(event));
  };
  cuke.onpointerup = (event) => {
    if (start?.id !== event.pointerId) return;
    if (dragged && insidePan(event)) addCucumber();
    start = null;
    cuke.classList.remove('grabbed');
    pan.classList.remove('over');
  };
  cuke.onpointercancel = () => {
    start = null;
    dragged = false;
    cuke.classList.remove('grabbed');
    pan.classList.remove('over');
  };
  cuke.onclick = (event) => {
    if (!dragged || event.detail === 0) addCucumber();
    dragged = false;
  };
  element('check-scale').onclick = () => {
    if (cucumbers !== 9) {
      line('看看天平往哪边斜。要让它平下来，右盘该加还是该减？');
      return;
    }
    mode = 'done';
    paint();
    element('check-scale').hidden = true;
    chime([520, 690]);
    line('你能说说 3 个苹果怎样换成这 9 根黄瓜吗？');
    transfer('还是 2 棵青菜和 6 个苹果一样重。这次 1 个苹果和 2 根黄瓜一样重。1 棵青菜和几根黄瓜一样重？', '试试', 6);
  };
  element('remove').onclick = () => { cucumbers--; paint(); line('看天平往哪边动，再想还差多少。'); };
  apples = 6;
  paint();
  wireSupport(() => {
    if (mode === 'clue') return '孩子：为什么两边都要拿掉？老师：先看这两盘各有几份一样多的东西。要是只从左盘拿走一份，你猜哪边会往下？';
    if (mode === 'half' || mode === 'exchange') return '孩子：能把苹果换成黄瓜吗？老师：看看第二条线索。拿走一个苹果，要补上几根黄瓜才会一样重？';
    if (mode === 'done') return '孩子：下次苹果更轻怎么办？老师：先找一棵青菜能换几个苹果，再看每个苹果现在能换几根黄瓜。试着用变化题里的线索说一遍。';
    return '孩子：我已经放了 ' + cucumbers + ' 根，还差多少？老师：每 3 根可以圈成一组。你现在凑出几组？原来右边有几个苹果要换？';
  });
  line('先看左盘有几棵青菜。只想知道一棵的重量，你会怎么分？');
}

function pencils() {
  const art = (index, mini = false) => '<i aria-hidden="true" class="pencil-art' + (mini ? ' mini' : '') + '" style="--ink:' + colors[index][1] + '"></i>';
  scene.innerHTML = '<article class="stage pencil-stage"><p class="eyebrow">第 5 题 · 彩铅工作室</p><h1>给彩铅找搭档</h1><p class="intro">从七支不同颜色的铅笔里挑两支。怎样找全所有搭配？</p><div class="pencil-layout"><section class="desk"><div class="pencil-row">' + colors.map(([name], index) => '<button class="pencil" aria-label="' + name + '色铅笔" aria-pressed="false" data-index="' + index + '">' + art(index) + '<span>' + name + '</span></button>').join('') + '</div><div class="pair-preview" id="pair-preview"></div><div class="tools"><button class="secondary" id="lock" disabled>先固定第一支</button><button class="secondary" id="clear">放回桌上</button></div><p class="note" id="feedback" role="status"></p></section><aside class="album"><h2>搭配收藏夹</h2><p id="count">已找到 0 种</p><div class="pairs" id="pairs"></div><form class="answer" id="total"><input aria-label="总搭配数" inputmode="numeric" required pattern="[0-9]+"><button class="primary">一共有几种</button></form></aside></div><section id="transfer" class="transfer" hidden></section>' + support() + '</article>';
  const buttons = [...scene.querySelectorAll('.pencil')];
  const pairs = new Set();
  let first = null;
  let second = null;
  let locked = false;
  const pairKey = (left,right) => [left,right].sort((a,b) => a-b).join('-');
  function paint() {
    for (const [index, button] of buttons.entries()) {
      button.setAttribute('aria-pressed', String(index === first || index === second));
      const paired = locked && index !== first && pairs.has(pairKey(first,index));
      button.classList.toggle('paired',paired);
      button.setAttribute('aria-label', colors[index][0] + '色铅笔' + (paired ? '，这对已收录' : ''));
    }
    element('lock').disabled = first === null;
    element('lock').textContent = locked ? '松开第一支' : '固定第一支，再找搭档';
    element('pair-preview').innerHTML = first === null ? '点一支铅笔开始' : art(first, true) + colors[first][0] + (locked ? ' · 固定' : '') + (second === null ? '　＋　等搭档' : '　＋　' + art(second, true) + colors[second][0]);
  }
  function pick(index) {
    if (first === null) {
      first = index;
      line('现在给这支' + colors[first][0] + '色铅笔挑一个搭档。');
    } else if (first === index) {
      line('这支铅笔已经选过了。请给它找另一种颜色。');
    } else {
      second = index;
      const key = pairKey(first,index);
      if (pairs.has(key)) {
        line(colors[first][0] + '和' + colors[index][0] + '已经在收藏夹里。交换拿取顺序，搭配还是同一对。');
      } else {
        pairs.add(key);
        element('pairs').insertAdjacentHTML('beforeend','<span class="pair" aria-label="' + colors[first][0] + '和' + colors[index][0] + '">' + art(first,true) + art(index,true) + '</span>');
        element('count').textContent = '已找到 ' + pairs.size + ' 种';
        const seen = [...pairs].filter((pair) => pair.split('-').includes(String(first))).length;
        line(locked
          ? (seen === 6 ? '这一支和所有别的颜色都搭过了。换一支固定，想想哪对已经出现过。' : '保持第一支不动，试一个它还没配过的颜色。')
          : '这对收进来了。你可以固定第一支，再挨个试它的搭档。');
        chime([460,580]);
      }
      if (!locked) {
        first = index;
        second = null;
      }
    }
    paint();
  }
  for (const [index, button] of buttons.entries()) button.onclick = () => pick(index);
  element('lock').onclick = () => {
    locked = !locked;
    second = null;
    paint();
    line(locked ? '现在一直拿着' + colors[first][0] + '色，其他颜色依次试一遍。' : '可以把两支放回桌上，选另一支当开头。');
  };
  element('clear').onclick = () => {
    first = null;
    second = null;
    locked = false;
    paint();
    line('铅笔都放回去了。收藏夹留着，看看接下来怎样避免重复。');
  };
  element('total').onsubmit = (event) => {
    event.preventDefault();
    if (Number(event.currentTarget.querySelector('input').value) !== 21) {
      line('还要再检查一下。可以先固定一支，数它能配几支，再换一支看看会少掉哪些旧搭配。');
      return;
    }
    line('数字对了。说说换到第二支开头时，为什么少了一种新搭配。');
    if (element('transfer').hidden) transfer('收起其中两支，现在桌上只有五种不同颜色。还是选两支，有几种搭配？', '试试', 10);
  };
  wireSupport(() => first === null
    ? '孩子：我怕会漏。老师：先拿起一支，让它一直待在手里。看看另外几支中，哪一支还没和它配过。'
    : '孩子：换一支当开头，刚才那对还要算吗？老师：回看收藏夹里的两种颜色。调换先拿哪一支，选到的是同一对吗？');
  paint();
  line('选两种颜色试一试。再调换拿取顺序，看看收藏夹会不会多出一对。');
}

function route() {
  window.speechSynthesis?.cancel();
  const path = location.hash === '#pencils' ? '#pencils' : '#balance';
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === path) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  if (path === '#pencils') pencils();
  else balance();
}
window.addEventListener('hashchange', route);
route();



