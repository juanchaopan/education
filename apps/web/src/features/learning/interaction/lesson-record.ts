import {
  recordActionsMax,
  recordCountMax,
  recordScenesMax,
  type KeyAction,
  type LessonRecord,
  type ScenePicture,
} from '@education/contracts';

// How a lesson tells the teacher what happens in it, in the ids its content
// declares: the picture a state of its film shows, and the key action a move
// is, if any, whether the scene took it or not, for example dragging the
// wrong thing first.
export type LessonRecording<State, Move> = Readonly<{
  picture: (state: State) => ScenePicture;
  action: (state: State, move: Move, taken: boolean) => string | undefined;
}>;

// What the page has seen of the lesson since the child opened it: the scene
// on screen and its picture now, the picture each earlier scene ended with,
// in teaching order, and the child's latest key actions.
export type LessonLog = Readonly<{ shot?: string } & LessonRecord>;

const blank: ScenePicture = { things: [], states: [] };
export const emptyLog: LessonLog = { now: blank, ended: [], actions: [] };

// Arriving at a scene ends the one on screen with its last picture. Whatever
// was seen of this scene or a later one belongs to an earlier pass, as when
// the child starts over or picks up a saved place, and is forgotten.
export function logArrival(
  log: LessonLog,
  shots: readonly string[],
  shot: string,
  picture: ScenePicture,
): LessonLog {
  const at = shots.indexOf(shot);
  const before = (stepId: string) => shots.indexOf(stepId) < at;
  const left = log.shot !== undefined && before(log.shot) ? log.shot : undefined;
  const kept = log.ended.filter(({ stepId }) => before(stepId) && stepId !== left);
  const ended = left === undefined ? kept : [...kept, { stepId: left, picture: log.now }];
  return {
    shot,
    now: picture,
    ended: ended.slice(-recordScenesMax),
    actions: log.actions.filter(({ stepId }) => before(stepId)),
  };
}

// A key action, counted with the same one just before it in the same scene,
// keeping only the latest.
function counted(actions: KeyAction[], stepId: string, action: string) {
  const last = actions.at(-1);
  if (last?.stepId === stepId && last.action === action)
    return [...actions.slice(0, -1), { ...last, times: Math.min(last.times + 1, recordCountMax) }];
  return [...actions, { stepId, action, times: 1 }].slice(-recordActionsMax);
}

// A move in the scene on screen: its key action, if it is one, and the
// picture it leaves when the scene stays.
export function logMove(
  log: LessonLog,
  action: string | undefined,
  picture: ScenePicture | undefined,
): LessonLog {
  const { shot } = log;
  if (shot === undefined) return log;
  return {
    ...log,
    now: picture ?? log.now,
    actions: action === undefined ? log.actions : counted(log.actions, shot, action),
  };
}

// The record a question carries, as the page has seen the lesson so far.
export const lessonRecord = ({ now, ended, actions }: LessonLog): LessonRecord => ({
  now,
  ended,
  actions,
});
