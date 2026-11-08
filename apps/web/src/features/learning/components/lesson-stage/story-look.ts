import type { StageLook } from './stage-look';

// A stage look for the lesson stage's own stories, so they show every part of
// the stage without borrowing a lesson's pictures: a plain dusk backdrop with
// a dark clearing in its middle, and a simple round teacher.
const svg = (markup: string) => `data:image/svg+xml,${encodeURIComponent(markup)}`;

const backdrop = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x2="0" y2="1">
      <stop stop-color="#3e5f86"/><stop offset=".55" stop-color="#d79a72"/><stop offset="1" stop-color="#2b3a3c"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <path d="M0 560Q300 470 640 540T1600 520V900H0Z" fill="#33524a"/>
  <path d="M0 650Q500 590 900 640T1600 630V900H0Z" fill="#22382f"/>
  <ellipse cx="800" cy="700" rx="520" ry="120" fill="#1a2a25" opacity=".55"/>
</svg>`);

const teacher = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 194 271">
  <ellipse cx="97" cy="170" rx="78" ry="96" fill="#c98a5b"/>
  <ellipse cx="97" cy="190" rx="50" ry="62" fill="#f3d9b7"/>
  <circle cx="68" cy="116" r="24" fill="#fffefa"/><circle cx="126" cy="116" r="24" fill="#fffefa"/>
  <circle cx="72" cy="120" r="10" fill="#243c37"/><circle cx="122" cy="120" r="10" fill="#243c37"/>
  <path d="M86 146L97 160L108 146Z" fill="#e5b950"/>
  <path d="M32 92L52 52L74 88Z M162 92L142 52L120 88Z" fill="#a46c45"/>
</svg>`);

export const storyLook: StageLook = {
  label: '示例互动短片',
  worldLabel: '可互动的示例道具',
  title: '示例题目',
  theater: '示例小剧场',
  backdrop: { image: backdrop, focus: 'center' },
  cameras: { closer: { zoom: 1.12, x: 2, y: 2 } },
  teacher: {
    name: '小猫头鹰',
    image: teacher,
    place: { x: 150, y: 220, width: 160, height: 224 },
    ground: { cx: 230, cy: 446, rx: 64, ry: 11 },
  },
  palette: {
    sky: 'linear-gradient(#3e5f86, #2b3a3c)',
    text: 'var(--paper)',
    accent: 'var(--gold)',
    title: 'var(--peach)',
    titleShade: '#0d1820',
    titleEdge: '#13232b',
    sunlight: '#ffd9a64d',
    shadeLow: '#101a20c4',
    shadeHigh: '#18263040',
    button: 'var(--teal-dark)',
    buttonHover: 'var(--teal)',
    buttonEdge: 'var(--gold)',
    buttonShadow: '#0d18206e',
    titleBar: 'var(--paper)',
    titleBarShade: '#0d1820',
    titleBarDot: 'var(--gold)',
    replay: '#1f3340c0',
    replayEdge: '#f3e8d6a0',
    replayPlaying: '#8a5f3c',
    replayCall: '#e5b95059',
    caption: 'var(--ink)',
    captionEdge: '#e5b9508a',
    captionShadow: '#0a141a80',
    captionText: 'var(--paper)',
    speaker: 'var(--gold)',
    teacherShadow: '#0d182066',
    teacherGround: '#0d1820',
    halo: 'var(--gold)',
    haloStrong: 'var(--peach)',
    glow: 'var(--gold)',
    ghostShadow: '#0d182091',
  },
};
