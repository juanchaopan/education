import type { StageLook } from './stage-look';

// A stage look for the lesson stage's own stories, so they show every part of
// the stage without borrowing a lesson's pictures: a plain dusk backdrop with
// a dark clearing in its middle, and a simple round teacher. Like a lesson's
// own look, its palette is written out in full and never borrows the site's
// tokens, so the stage looks the same whatever the site's theme.
const svg = (markup: string) => `data:image/svg+xml,${encodeURIComponent(markup)}`;

// The story stage's recurring colours; the palette below adds an alpha
// suffix to some of them.
const light = '#fffefa';
const gold = '#e5b950';
const cream = '#f3e8d6';
const ink = '#243c37';
const shade = '#0d1820';
const leaf = '#226451';
const leafHi = '#398271';

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
  <circle cx="68" cy="116" r="24" fill="${light}"/><circle cx="126" cy="116" r="24" fill="${light}"/>
  <circle cx="72" cy="120" r="10" fill="${ink}"/><circle cx="122" cy="120" r="10" fill="${ink}"/>
  <path d="M86 146L97 160L108 146Z" fill="${gold}"/>
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
    face: { x: 0.155, y: 0.3, size: 0.69 },
  },
  // The table the stories set in the clearing, with what stands on it.
  staging: { x: 380, y: 320, width: 520, height: 200 },
  palette: {
    sky: 'linear-gradient(#3e5f86, #2b3a3c)',
    text: light,
    accent: gold,
    title: cream,
    titleShade: shade,
    titleEdge: '#13232b',
    sunlight: '#ffd9a64d',
    shadeLow: '#101a20c4',
    shadeHigh: '#18263040',
    button: leaf,
    buttonHover: leafHi,
    buttonEdge: gold,
    buttonShadow: `${shade}6e`,
    titleBar: light,
    titleBarShade: shade,
    titleBarDot: gold,
    replay: '#1f3340c0',
    replayEdge: `${cream}a0`,
    replayPlaying: '#8a5f3c',
    replayCall: `${gold}59`,
    caption: ink,
    captionEdge: `${gold}8a`,
    captionShadow: '#0a141a80',
    captionText: light,
    speaker: gold,
    teacherShadow: `${shade}66`,
    teacherGround: shade,
    halo: gold,
    haloStrong: cream,
    glow: gold,
    ghostShadow: `${shade}91`,
    cue: light,
    cueEdge: ink,
    ambience: cream,
    boardInk: ink,
  },
};
