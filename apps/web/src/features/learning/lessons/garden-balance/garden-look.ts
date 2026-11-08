import type { Camera, StageLook } from '../../components/lesson-stage/stage-look';
import plate from './assets/garden-plate.webp';
import rabbit from './assets/garden-rabbit.webp';
import { teacher, type Shot } from './script';

// The scale fills the frame while it is halved and weighed, the single apple
// is seen up close, and the swaps keep the whole scale in view.
const halving: Camera = { zoom: 1.1, x: -1, y: 1.8 };
const swapping: Camera = { zoom: 1.11, y: 1 };

const cameras: Record<Shot, Camera> = {
  leaves: halving,
  apples: halving,
  exchange: { zoom: 1.19, x: 3, y: 3 },
  bridge: swapping,
  answer: swapping,
  variation: swapping,
  end: swapping,
};

// The garden film as it looks: its plate, the rabbit at the scale's left, and
// the warm evening colours taken from the plate.
export const gardenLook: StageLook = {
  label: '菜园天平互动短片',
  worldLabel: '可互动的菜园道具',
  title: '一棵青菜有多重？',
  theater: '菜园小剧场',
  backdrop: { image: plate, focus: 'center 56%' },
  cameras,
  teacher: {
    name: teacher,
    image: rabbit,
    place: { x: 174, y: 210, width: 194, height: 271 },
    ground: { cx: 262, cy: 472, rx: 75, ry: 13 },
  },
  palette: {
    sky: 'radial-gradient(ellipse at 64% 32%, #e5c990, #47735b 66%, #122a25)',
    text: '#fff8e6',
    accent: '#ffe7a8',
    title: '#fff3cb',
    titleShade: '#101f12',
    titleEdge: '#14271a',
    sunlight: '#ffe8a35e',
    shadeLow: '#12211fc4',
    shadeHigh: '#162b323b',
    button: '#20483bec',
    buttonHover: '#34795d',
    buttonEdge: '#ffe5a6',
    buttonShadow: '#152c246e',
    titleBar: '#fff6d3',
    titleBarShade: '#12221a',
    titleBarDot: '#efd181',
    replay: '#263b34be',
    replayEdge: '#ffefb6a0',
    replayPlaying: '#917043',
    replayCall: '#ffe7a859',
    caption: '#173029ec',
    captionEdge: '#f5d7958a',
    captionShadow: '#081b1680',
    captionText: '#fff7e4',
    speaker: '#ffda86',
    teacherShadow: '#14312266',
    teacherGround: '#2a2b19',
    halo: '#ffe7a7',
    haloStrong: '#fff7c6',
    glow: '#fff5b2',
    ghostShadow: '#10252391',
  },
};
