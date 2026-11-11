import type { Box, StagePalette } from '../../components/lesson-stage/stage-look';
import type { TeacherRole } from '../lesson-definition';

// How the lesson stands on its library backdrop, forest-picnic-morning: the
// squirrel at the left of the stump table, the props on the table top. The
// props' box must lie inside the backdrop's clearing in every scene; the
// definition check measures it.

export const templateTeacher: TeacherRole = {
  id: 'squirrel',
  place: { x: 120, y: 230, width: 180, height: 252 },
  ground: { cx: 210, cy: 478, rx: 70, ry: 12 },
};

// The two pebbles, the bowl and the cues between them.
export const templateStaging: Box = { x: 380, y: 300, width: 440, height: 180 };

// Colours taken from the backdrop: morning moss green, cream and honey gold.
export const templatePalette: StagePalette = {
  sky: 'radial-gradient(ellipse at 50% 30%, #f1e2b4, #5d7f55 64%, #1d3022)',
  text: '#fffbea',
  accent: '#ffe39a',
  title: '#fff6d2',
  titleShade: '#16261a',
  titleEdge: '#1c3121',
  sunlight: '#fff0b85a',
  shadeLow: '#15261cc0',
  shadeHigh: '#1a30273a',
  button: '#2e5a3ce8',
  buttonHover: '#3f7a52',
  buttonEdge: '#ffe8ad',
  buttonShadow: '#18301f6c',
  teacherShadow: '#17311f66',
  teacherGround: '#2c3220',
  halo: '#ffe9ac',
  haloStrong: '#fff8cc',
  glow: '#fff6b8',
  ghostShadow: '#13281c8f',
  cue: '#fff4c0',
  cueEdge: '#8a6a2e',
  ambience: '#fff1bd',
  boardInk: '#5e4122',
};
