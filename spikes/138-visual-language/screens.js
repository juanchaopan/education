const params = new URLSearchParams(location.search);
const theme = params.get('theme') ?? 'a';
const screen = params.get('screen') ?? 'home';
document.documentElement.dataset.theme = theme;
document.documentElement.dataset.screen = screen;

const THEME_NAMES = { a: '手作工作台', b: '暮光剧场', c: '晨光绘本' };

const brand = () => `
  <a class="brand" href="#">
    <span class="brand-mark">${icon('sprout')}</span>
    <span class="brand-name">小小探索家</span>
  </a>`;

const storyHills = () => `
  <svg class="hills" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe2b8"/><stop offset=".6" stop-color="#fff3dc"/><stop offset="1" stop-color="#f4f8e8"/>
      </linearGradient>
      <radialGradient id="sun" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff6c8"/><stop offset=".55" stop-color="#ffd36b"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="320" fill="url(#sky)"/>
    <circle cx="930" cy="96" r="120" fill="url(#sun)"/>
    <circle cx="930" cy="96" r="42" fill="#ffd56e"/>
    <g fill="#fff" opacity=".9">
      <ellipse cx="220" cy="70" rx="70" ry="20"/><ellipse cx="270" cy="58" rx="46" ry="24"/>
      <ellipse cx="640" cy="104" rx="56" ry="14"/><ellipse cx="676" cy="94" rx="34" ry="18"/>
    </g>
    <path d="M0 230 C160 170 300 190 430 215 S720 170 860 190 1100 160 1200 180 V320 H0Z" fill="#bfe0a3"/>
    <path d="M0 262 C180 222 360 240 520 258 S860 214 1040 236 1160 240 1200 232 V320 H0Z" fill="#8fca7a"/>
    <path d="M0 296 C220 270 420 284 640 292 S1000 270 1200 280 V320 H0Z" fill="#6bb563"/>
    <g fill="#4f9a52">
      <circle cx="1040" cy="214" r="26"/><circle cx="1072" cy="206" r="20"/><rect x="1052" y="220" width="8" height="26" fill="#8a5a3a"/>
    </g>
  </svg>`;

const kidTopbar = () => `
  <header class="topbar">
    ${brand()}
    <nav class="tabs" aria-label="主导航">
      <a class="tab is-active" href="#">${icon('sparkle')}<span>探索</span></a>
      <a class="tab" href="#">${icon('star')}<span>星星</span></a>
    </nav>
    <div class="who">
      <span class="avatar">米</span>
      <span class="who-name">小米</span>
      <button class="icon-btn ghost" aria-label="退出">${icon('logout')}</button>
    </div>
  </header>`;

const problemCard = ({ img, title, theater, minutes, state, progress, tone }) => `
  <article class="card problem-card">
    <div class="thumb" style="--img:url(assets/${img})">
      <span class="badge ${tone}">${state}</span>
      <span class="play-chip">${icon('play')}</span>
    </div>
    <div class="problem-body">
      <h3>${title}</h3>
      <p class="meta"><span>${theater}</span><span class="dot"></span>${icon('clock')}<span>${minutes} 分钟</span></p>
      ${progress ? `<div class="progress" style="--p:${progress}"><span></span></div>` : ''}
    </div>
  </article>`;

const sceneArt = (img) => (theme === 'c' ? storyHills() : `<div class="hero-img" style="--img:url(assets/${img})"></div>`);

function home() {
  return `
  <div class="app kid">
    ${kidTopbar()}
    <main class="page">
      <section class="hero">
        <div class="hero-art">${sceneArt('garden-plate.webp')}</div>
        <div class="hero-copy">
          <h1>小米，今天想探索什么？</h1>
          <button class="resume">
            <span class="resume-thumb" style="--img:url(assets/garden-plate.webp)"></span>
            <span class="resume-text"><strong>一棵青菜有多重？</strong><small>继续 · 第 3 幕</small></span>
            <span class="resume-play">${icon('play')}</span>
          </button>
        </div>
      </section>

      <section class="filters" aria-label="选择题目">
        <div class="seg">
          <button class="seg-item is-on">一年级</button><button class="seg-item">二年级</button><button class="seg-item">三年级</button><button class="seg-item">六年级</button>
          <button class="seg-item more" aria-label="更多年级">${icon('chevronDown')}</button>
        </div>
        <div class="chips">
          <button class="chip is-on">${icon('ruler')}数学</button>
          <button class="chip">${icon('pencil')}语文</button>
        </div>
      </section>

      <section class="shelf">
        <header class="shelf-head"><h2>学而思</h2><span class="count">3</span></header>
        <div class="grid">
          ${problemCard({ img: 'garden-plate.webp', title: '一棵青菜有多重？', theater: '菜园小剧场', minutes: 6, state: '继续', progress: 0.5, tone: 'go' })}
          ${problemCard({ img: 'pencil-plate.webp', title: '彩铅怎么配对？', theater: '画室小剧场', minutes: 5, state: '新', tone: 'new' })}
          ${problemCard({ img: 'rail-plate.webp', title: '小火车追上了吗？', theater: '模型工作室', minutes: 7, state: '★ 3', tone: 'done' })}
        </div>
      </section>
    </main>
  </div>`;
}

function login() {
  const pin = [1, 1, 1, 0, 0, 0]
    .map((filled, i) => `<span class="pin-dot ${filled ? 'is-filled' : ''} ${i === 3 ? 'is-next' : ''}"></span>`)
    .join('');
  return `
  <div class="app kid login-page">
    <main class="login">
      <div class="login-art">
        ${sceneArt('pencil-plate.webp')}
        <img class="mascot" src="assets/garden-rabbit.webp" alt="" />
      </div>
      <form class="card login-card" onsubmit="return false">
        ${brand()}
        <h1>欢迎回来</h1>
        <label class="field"><span class="field-icon">${icon('home')}</span><input value="K7M4-Q2" aria-label="家庭码" /></label>
        <label class="field"><span class="field-icon">${icon('user')}</span><input value="小米" aria-label="昵称" /></label>
        <div class="pin" role="group" aria-label="六位 PIN">${pin}</div>
        <label class="toggle"><input type="checkbox" checked /><span class="toggle-track"><span class="toggle-thumb"></span></span><span>记住这台设备</span></label>
        <button class="btn primary block">进入${icon('chevron')}</button>
        <div class="login-links">
          <a href="#">${icon('key')}第一次来</a>
          <a href="#">${icon('users')}请家长帮忙</a>
        </div>
      </form>
    </main>
  </div>`;
}

const bars = (values) =>
  `<div class="bars">${values.map((v, i) => `<span style="--h:${v}" class="${i === values.length - 1 ? 'is-today' : ''}"></span>`).join('')}</div>`;

const kidCard = ({ initial, name, grade, alt, stats, week }) => `
  <article class="card kid-card">
    <header><span class="avatar ${alt ? 'alt' : ''}">${initial}</span><div><h2>${name}</h2><p>${grade}</p></div><button class="icon-btn ghost" aria-label="${name}的设置">${icon('sliders')}</button></header>
    <div class="stats">
      <div><strong>${stats[0]}</strong><span>题</span></div>
      <div><strong>${stats[1]}</strong><span>独立完成</span></div>
      <div><strong>${stats[2]}</strong><span>分钟</span></div>
    </div>
    ${bars(week)}
  </article>`;

function parent() {
  const nav = [
    ['home', '总览', true],
    ['users', '孩子'],
    ['calendar', '练习安排'],
    ['chart', '学习记录'],
    ['shield', '隐私与数据'],
  ];
  return `
  <div class="app parent">
    <aside class="sidebar">
      ${brand()}
      <nav class="side-nav" aria-label="家长空间">
        ${nav.map(([i, t, on]) => `<a href="#" class="side-link ${on ? 'is-active' : ''}">${icon(i)}<span>${t}</span></a>`).join('')}
      </nav>
      <div class="side-foot"><span class="avatar small">王</span><span class="side-mail">wang@example.com</span><button class="icon-btn ghost" aria-label="退出">${icon('logout')}</button></div>
    </aside>
    <main class="page parent-main">
      <header class="parent-head">
        <div><p class="eyebrow">家长空间</p><h1>本周</h1></div>
        <div class="head-actions">
          <button class="code-chip" aria-label="复制家庭码">${icon('home')}<span>K7M4-Q2</span>${icon('copy')}</button>
          <button class="btn primary">${icon('key')}邀请孩子</button>
        </div>
      </header>

      <section class="kids">
        ${kidCard({ initial: '米', name: '小米', grade: '一年级', stats: [5, 3, 42], week: [0.2, 0.5, 0, 0.8, 0.4, 0.6, 1] })}
        ${kidCard({ initial: '乐', name: '乐乐', grade: '六年级', alt: true, stats: [2, 2, 18], week: [0, 0.3, 0.6, 0, 0, 0.5, 0.2] })}
      </section>

      <div class="two-col">
        <section class="card panel">
          <header class="panel-head"><h2>${icon('bulb')}值得再练</h2></header>
          <ul class="rows">
            <li><span class="row-thumb" style="--img:url(assets/garden-plate.webp)"></span><span class="row-main"><strong>一棵青菜有多重？</strong><small>小米 · 提示 2 次后完成</small></span><button class="btn soft small">${icon('plus')}安排</button></li>
            <li><span class="row-thumb" style="--img:url(assets/rail-plate.webp)"></span><span class="row-main"><strong>小火车追上了吗？</strong><small>乐乐 · 答错 1 次</small></span><button class="btn soft small">${icon('plus')}安排</button></li>
          </ul>
        </section>
        <section class="card panel">
          <header class="panel-head"><h2>${icon('calendar')}已安排</h2><button class="icon-btn" aria-label="添加练习">${icon('plus')}</button></header>
          <ul class="rows">
            <li><span class="row-thumb" style="--img:url(assets/pencil-plate.webp)"></span><span class="row-main"><strong>彩铅怎么配对？</strong><small>小米 · 周三前</small></span><span class="pill">未开始</span></li>
          </ul>
        </section>
      </div>

      <section class="card panel settings">
        <a class="setting" href="#">${icon('sparkle')}<span>AI 老师</span><span class="pill ok">${icon('check')}已授权</span>${icon('chevron')}</a>
        <a class="setting" href="#">${icon('download')}<span>导出家庭数据</span>${icon('chevron')}</a>
        <a class="setting danger" href="#">${icon('trash')}<span>删除家庭</span>${icon('chevron')}</a>
      </section>
    </main>
    <nav class="bottom-nav" aria-label="家长空间">
      ${nav.slice(0, 4).map(([i, t, on]) => `<a href="#" class="${on ? 'is-active' : ''}">${icon(i)}<span>${t}</span></a>`).join('')}
    </nav>
  </div>`;
}

function lesson() {
  return `
  <div class="app lesson">
    <section class="stage" style="--img:url(assets/garden-plate.webp)">
      <button class="glass-btn back" aria-label="返回题库">${icon('back')}</button>
      <div class="stage-title"><span>菜园小剧场</span><strong>一棵青菜有多重？</strong></div>
      <div class="stage-tools">
        <button class="glass-btn" aria-label="重听">${icon('replay')}</button>
        <button class="glass-btn" aria-label="字幕">${icon('volume')}</button>
      </div>
      <figure class="caption">
        <img src="assets/garden-rabbit.webp" alt="" />
        <figcaption>平了。现在，一棵青菜和三个苹果一样重。</figcaption>
      </figure>
    </section>
    <section class="dock">
      <button class="mic" aria-label="问老师"><span class="mic-ring"></span><span class="mic-core">${icon('mic')}</span></button>
      <div class="heard">
        <span class="heard-label">${icon('volume')}<span>我听到</span></span>
        <strong class="heard-value">9 根</strong>
        <div class="heard-actions">
          <button class="btn primary">${icon('check')}对</button>
          <button class="btn soft">${icon('replay')}重说</button>
        </div>
      </div>
      <button class="icon-btn hint" aria-label="提示">${icon('bulb')}<span class="hint-count">2</span></button>
    </section>
  </div>`;
}

function kit() {
  return `
  <div class="app kit-page">
    <header class="kit-head">${brand()}<h1>部件样张 · ${THEME_NAMES[theme]}</h1></header>
    <main class="kit">
      <section class="card kit-block">
        <h2>按钮</h2>
        <div class="row-wrap">
          <button class="btn primary">${icon('play')}开始</button>
          <button class="btn primary is-pressed">按下</button>
          <button class="btn soft">${icon('replay')}再听一遍</button>
          <button class="btn text">稍后</button>
          <button class="btn danger">${icon('trash')}删除</button>
        </div>
        <div class="row-wrap">
          <button class="icon-btn" aria-label="返回">${icon('back')}</button>
          <button class="icon-btn" aria-label="重听">${icon('replay')}</button>
          <button class="icon-btn" aria-label="提示">${icon('bulb')}</button>
          <button class="icon-btn" aria-label="复制">${icon('copy')}</button>
          <button class="mic small" aria-label="说话"><span class="mic-ring"></span><span class="mic-core">${icon('mic')}</span></button>
        </div>
      </section>
      <section class="card kit-block">
        <h2>输入</h2>
        <label class="field"><span class="field-icon">${icon('user')}</span><input placeholder="昵称" /></label>
        <label class="field is-error"><span class="field-icon">${icon('lock')}</span><input value="12345" aria-label="密码" /><span class="field-tail">${icon('eye')}</span></label>
        <p class="field-msg">${icon('info')}至少 15 个字符</p>
        <div class="row-wrap">
          <label class="toggle"><input type="checkbox" checked /><span class="toggle-track"><span class="toggle-thumb"></span></span><span>开</span></label>
          <span class="chip is-on">${icon('ruler')}数学</span><span class="chip">${icon('pencil')}语文</span>
        </div>
      </section>
      <section class="card kit-block">
        <h2>提示与状态</h2>
        <div class="toast ok">${icon('check')}<span>已复制</span></div>
        <div class="toast warn">${icon('wifiOff')}<span>网络断了，已存好</span><button class="btn text small">重试</button></div>
        <div class="empty">
          <span class="empty-art">${icon('sprout')}</span>
          <strong>还没有记录</strong>
        </div>
        <div class="loader" aria-label="加载中"><span></span><span></span><span></span></div>
      </section>
      <section class="card kit-block">
        <h2>题目卡与星星</h2>
        ${problemCard({ img: 'garden-plate.webp', title: '一棵青菜有多重？', theater: '菜园小剧场', minutes: 6, state: '继续', progress: 0.5, tone: 'go' })}
        <div class="stars">${icon('starFill', 'on')}${icon('starFill', 'on')}${icon('starFill')}</div>
      </section>
    </main>
  </div>`;
}

const SCREENS = { home, login, parent, lesson, kit };
document.getElementById('root').innerHTML = SCREENS[screen]();
