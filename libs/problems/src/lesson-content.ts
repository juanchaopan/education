import type { BackdropId } from './backdrops.js';

// What a lesson says and finds, declared once for each problem and read by the
// site and the server alike: the lesson flow it follows, the library backdrop
// it plays on, its scenes in teaching order, the scene that asks for the final
// answer, its variation, what a model may see of each scene, the words the
// teacher says in each, the conclusions its scenes find, and the words its
// scenes and the child's key actions are told in when the child asks the
// teacher. It holds no judging rules, which only the server's plugins have,
// so the site may load it.

// The lesson flows a problem can follow, the skeleton of its lesson; see the
// handbook's 课堂流程清单. `scene-by-scene` is 逐幕探究: each scene finds a
// small conclusion by hand, a short final answer follows, then a variation.
// `derive-and-solve` is 列式求解: the same objects stay on screen while the
// child pushes them through key moments and an equation grows from what is
// seen; the child gives every solution, judged as a set, checks each on the
// same picture, then a variation.
export const lessonFlows = ['scene-by-scene', 'derive-and-solve'] as const;
export type LessonFlow = (typeof lessonFlows)[number];

// How the board draws an amount. It draws every single thing, as many as the
// count, unless told otherwise: `group` gathers them into frames of that many,
// the way a scene gathered them, and `times` writes how many there are, of
// things or of frames, as 「k×」 before one of them, where drawing them all
// would make the board too tall or too wide.
export type AmountDrawing = Readonly<{ group?: number; times?: boolean }>;

// How many of one of the lesson's pictures, for example three apples. The
// count always counts single things, so a thing keeps one unit across the
// lesson however its amounts are drawn.
export type Amount<Picture extends string> = readonly [
  count: number,
  picture: Picture,
  drawing?: AmountDrawing,
];

// The most single things, or frames, the board draws one by one in an
// amount; past it an amount writes 「k×」.
export const drawnAtMost = 8;

// One conclusion a scene finds:
// - `says`, the sentence a screen reader reads for it;
// - `amounts`, the amounts that weigh the same, in order, which a lesson
//   whose way of teaching keeps its conclusions on the conclusion board
//   draws there; a lesson that keeps them in its own picture leaves them out;
// - `from`, the first scene that finds it;
// - `uses` and `hints`, the scenes, and the answer's hints, that use it;
// - `answer`, what it says once the child has answered right, with the
//   amount the board then writes on, if any;
// - `supposed`, a changed condition the variation sets, 假如.
export type Conclusion<Shot extends string, Picture extends string> = Readonly<{
  id: string;
  says: string;
  amounts?: readonly [Amount<Picture>, ...Amount<Picture>[]];
  from: Shot;
  uses?: readonly Shot[];
  hints?: readonly string[];
  answer?: Readonly<{ amount?: Amount<Picture>; says: string }>;
  supposed?: boolean;
}>;

// The variation a lesson ends with once its final answer is right: another
// problem, with one key condition changed. `guessScene` sets the condition
// and asks the child to guess what comes of it, the child works it out by
// hand in the scenes after it, `reasonScene` asks why it came out so, and
// `revealScene` says what it came to: the conclusion `result`, 那么, which
// it finds right after the condition. `keeps` names the problem's
// conclusions the variation still uses, which the board keeps in sight while
// it puts the others away; `choices` are what the child may tap as kept and
// as changed when saying the reason is not possible, by id, with the words
// the drops show. The server's rule judges the ids, so both read them here.
export type LessonVariation<Shot extends string> = Readonly<{
  guessScene: Shot;
  reasonScene: Shot;
  revealScene: Shot;
  result: string;
  keeps: readonly string[];
  choices: Readonly<Record<string, string>>;
}>;

// A line the teacher says, and the scene it is said in.
export type LessonLine<Shot extends string> = Readonly<{ scene: Shot; text: string }>;

// A scene as a model may see it, `prompt`: what is on screen and what the
// child does next, without the final count. `entry` is what the teacher says
// on arriving, whether by playing on or by coming back to a saved scene.
export type LessonScene<Line extends string> = Readonly<{ prompt: string; entry: readonly Line[] }>;

// The words a lesson's scenes are told in, by id: the places on screen, for
// example 天平左盘（画面左边）; the things there, each with its name and the
// word it is counted with, 棵 for 青菜; how the picture stands, for example
// 天平是平的; and the child's key actions, for example 从右盘拿走一个苹果. The
// site sends only these ids and counts, and the server tells the teacher the
// words.
export type RecordWords<
  Place extends string,
  Thing extends string,
  State extends string,
  Action extends string,
> = Readonly<{
  places: Readonly<Record<Place, string>>;
  things: Readonly<Record<Thing, Readonly<{ name: string; unit: string }>>>;
  states: Readonly<Record<State, string>>;
  actions: Readonly<Record<Action, string>>;
}>;
export type AnyRecordWords = RecordWords<string, string, string, string>;

// A scene's picture at one moment: how many of each thing lie at each place,
// and how the picture stands. Its lists are plain arrays, as the question
// request that carries it declares them.
export type ScenePicture<
  Place extends string = string,
  Thing extends string = string,
  State extends string = string,
> = Readonly<{
  things: Readonly<{ place: Place; thing: Thing; count: number }>[];
  states: State[];
}>;

// A problem's lesson. `vocabulary` is the problem's own words, which speech
// recognition is told to expect in every scene. Its lines are listed in the
// order they are said, and its conclusions in the order the board shows
// them. `answerScene` asks for the final answer; the page plays past it only
// once the child has answered right, so the scenes after it count as
// answered, for the conclusion board and for what a model may see.
export type LessonContent<
  Shot extends string,
  Line extends string,
  Picture extends string,
  Words extends AnyRecordWords = AnyRecordWords,
> = Readonly<{
  problem: Readonly<{ id: string; version: number }>;
  flow: LessonFlow;
  backdrop: BackdropId;
  vocabulary: readonly string[];
  shots: readonly [Shot, ...Shot[]];
  answerScene: Shot;
  variation?: LessonVariation<Shot>;
  lines: Readonly<Record<Line, LessonLine<Shot>>>;
  scenes: Readonly<Record<Shot, LessonScene<Line>>>;
  conclusions: readonly Conclusion<Shot, Picture>[];
  recordWords: Words;
}>;

// A lesson's content with its scene, line, picture and record word names kept
// exact: the scenes are named by `shots` and the lines by `lines`, so a scene,
// an entry line, the answer scene, a variation's scene or a conclusion's
// scene that names anything else does not compile.
export function lessonContent<
  const Shot extends string,
  const Line extends string,
  const Picture extends string,
  const Words extends AnyRecordWords,
>(
  content: Omit<
    LessonContent<Shot, Line, Picture, Words>,
    'answerScene' | 'variation' | 'lines' | 'scenes' | 'conclusions'
  > &
    Readonly<{
      answerScene: NoInfer<Shot>;
      variation?: LessonVariation<NoInfer<Shot>>;
      lines: Readonly<Record<Line, LessonLine<NoInfer<Shot>>>>;
      scenes: Readonly<Record<NoInfer<Shot>, LessonScene<NoInfer<Line>>>>;
      conclusions: readonly Conclusion<NoInfer<Shot>, Picture>[];
    }>,
): LessonContent<Shot, Line, Picture, Words> {
  return content;
}

// Any lesson's content, as the checks read it.
export type AnyLessonContent = LessonContent<string, string, string>;
type AnyConclusion = AnyLessonContent['conclusions'][number];

// The pictures a lesson's conclusions are drawn with, which a board that
// shows them must have.
export type PictureOf<Content> =
  Content extends LessonContent<string, string, infer Picture> ? Picture : never;

// The record words a lesson's content declares, and a scene picture and key
// action told in them, for a lesson to describe its scenes with exact names.
export type RecordWordsOf<Content> =
  Content extends LessonContent<string, string, string, infer Words> ? Words : never;
export type ScenePictureOf<Content> = ScenePicture<
  keyof RecordWordsOf<Content>['places'] & string,
  keyof RecordWordsOf<Content>['things'] & string,
  keyof RecordWordsOf<Content>['states'] & string
>;
export type KeyActionOf<Content> = keyof RecordWordsOf<Content>['actions'] & string;

// Whether a scene is one of the scenes of the variation a lesson declares,
// its guess scene or one after it: another problem, which the board and the
// teacher tell apart from the one before it.
export function inVariation<Shot extends string>(
  { shots, variation }: Pick<LessonContent<Shot, string, string>, 'shots' | 'variation'>,
  shot: Shot,
) {
  return variation !== undefined && shots.indexOf(shot) >= shots.indexOf(variation.guessScene);
}

const missing = (from: readonly string[], within: readonly string[]) =>
  from.filter((name) => !within.includes(name));

const declared = (words: Readonly<Record<string, unknown>>, id: string) => Object.hasOwn(words, id);

// The ids in a scene picture that the lesson's record words do not declare.
export function pictureProblems({ recordWords }: AnyLessonContent, picture: ScenePicture) {
  const { places, things, states } = recordWords;
  return [
    ...picture.things.flatMap(({ place, thing }) => [
      ...(declared(places, place) ? [] : [`place ${place} is not declared`]),
      ...(declared(things, thing) ? [] : [`thing ${thing} is not declared`]),
    ]),
    ...picture.states
      .filter((state) => !declared(states, state))
      .map((state) => `state ${state} is not declared`),
  ];
}

// Whether the lesson's record words declare a key action.
export const declaresAction = ({ recordWords }: AnyLessonContent, action: string) =>
  declared(recordWords.actions, action);

// Every line is said in one of the scenes, and every scene says something on
// arriving, from its own lines.
function lineProblems({ shots, lines, scenes }: AnyLessonContent) {
  const said = Object.entries(lines);
  return [
    ...said
      .filter(([, { scene }]) => !shots.includes(scene))
      .map(([id, { scene }]) => `line ${id} is said in ${scene}, which is not a scene`),
    ...shots.flatMap((shot) => {
      const entry = scenes[shot]?.entry ?? [];
      const own = said.filter(([, { scene }]) => scene === shot).map(([id]) => id);
      return [
        ...(entry.length ? [] : [`scene ${shot} has no entry lines`]),
        ...missing(entry, own).map((line) => `entry line ${line} is not a line of scene ${shot}`),
      ];
    }),
  ];
}

// 逐幕探究 asks for the count in one of the lesson's scenes, and a correct
// count plays on into the scene after it.
function sceneBySceneProblems({ shots, answerScene }: AnyLessonContent) {
  const at = shots.indexOf(answerScene);
  if (at < 0) return [`answer scene ${answerScene} is not a scene`];
  return at + 1 < shots.length ? [] : [`answer scene ${answerScene} has no scene after it`];
}

// 列式求解 asks for every solution in one of the lesson's scenes and plays on
// into the scene that checks them on the same picture. The equation the
// child solves is a conclusion found before the answer scene and used in it.
function deriveAndSolveProblems(content: AnyLessonContent) {
  const { shots, answerScene, conclusions } = content;
  const asked = shots.indexOf(answerScene);
  const solved = conclusions.some(
    ({ from, uses = [] }) => shots.indexOf(from) < asked && uses.includes(answerScene),
  );
  return [
    ...sceneBySceneProblems(content),
    ...(solved || asked < 0
      ? []
      : [`answer scene ${answerScene} uses no conclusion found before it to solve`]),
  ];
}

// What each lesson flow asks of a lesson that follows it.
const flowRules: Readonly<Record<LessonFlow, (content: AnyLessonContent) => string[]>> = {
  'scene-by-scene': sceneBySceneProblems,
  'derive-and-solve': deriveAndSolveProblems,
};

function flowProblems(content: AnyLessonContent) {
  const { flow } = content;
  const rules = Object.hasOwn(flowRules, flow) ? flowRules[flow] : undefined;
  return rules ? rules(content) : [`the lesson follows flow ${flow}, which is not in the list`];
}

// The variation's scenes follow the final answer in the order the child
// meets them.
function variationOrderProblems(
  { shots, answerScene }: AnyLessonContent,
  { guessScene, reasonScene, revealScene }: LessonVariation<string>,
) {
  const scenes = [guessScene, reasonScene, revealScene];
  const order = [answerScene, ...scenes].map((shot) => shots.indexOf(shot));
  const inOrder = order.every((at, index) => index === 0 || at > (order[index - 1] ?? at));
  return [
    ...scenes
      .filter((shot) => !shots.includes(shot))
      .map((shot) => `variation scene ${shot} is not a scene`),
    ...(inOrder
      ? []
      : ['the variation does not guess, reason and reveal after the answer scene, in that order']),
  ];
}

// The variation keeps only conclusions the problem found before it, finds
// its result in its reveal right after the condition it sets, and offers at
// least two reasons to tap, each with its words.
function variationProblems(content: AnyLessonContent) {
  const { variation, conclusions } = content;
  if (!variation) return [];
  const { revealScene, result, keeps, choices } = variation;
  const at = (id: string) => conclusions.findIndex((conclusion) => conclusion.id === id);
  const kept = (id: string) => {
    const found = conclusions[at(id)];
    return found !== undefined && !inVariation(content, found.from);
  };
  const placed =
    conclusions[at(result)]?.from === revealScene && conclusions[at(result) - 1]?.supposed === true;
  const words = Object.entries(choices);
  return [
    ...variationOrderProblems(content, variation),
    ...keeps
      .filter((id) => !kept(id))
      .map((id) => `the variation keeps ${id}, which is not a conclusion found before it`),
    ...(placed
      ? []
      : [
          `the variation's result ${result} is not found in ${revealScene} right after its condition`,
        ]),
    ...(words.length >= 2 ? [] : ['the variation has fewer than two reasons to tap']),
    ...words.filter(([, word]) => !word.trim()).map(([id]) => `reason ${id} has no words`),
  ];
}

// The longest record word a lesson may declare.
export const recordWordMaxLength = 30;

// The record words name every place, thing, state and action in a few words:
// the teacher reads them, and a child hears what the teacher says of them.
function recordWordProblems({ recordWords }: AnyLessonContent) {
  const { places, things, states, actions } = recordWords;
  const words = [
    ...Object.entries(places),
    ...Object.entries(things).flatMap(([id, { name, unit }]) => [
      [id, name],
      [id, unit],
    ]),
    ...Object.entries(states),
    ...Object.entries(actions),
  ];
  return words
    .filter(([, word]) => !word?.trim() || word.length > recordWordMaxLength)
    .map(([id]) => `record word ${id} is empty or longer than ${recordWordMaxLength} characters`);
}

// The amounts the board draws for a conclusion: its own, and the one it
// writes on once the answer is right.
export const drawnAmounts = ({ amounts, answer }: AnyConclusion) => [
  ...(amounts ?? []),
  ...(answer?.amount ? [answer.amount] : []),
];

// Frames split an amount into whole groups of two or more.
const dividedBy = (count: number, group: number) =>
  Number.isInteger(group) && group >= 2 && count % group === 0;

// One by one the board draws no more than so many things, or frames, and
// 「k×」 needs more than one to multiply. `many` counts the frames, or the
// things when there are no frames, and `each` the things in a frame.
function crowdProblems(amount: string, many: number, each: number, times: boolean) {
  const drawn =
    each > 1 ? `in more than ${drawnAtMost} frames` : `one by one, more than ${drawnAtMost}`;
  return [
    ...(times && many < 2 ? [`${amount} as 「k×」 with nothing to multiply`] : []),
    ...(each > drawnAtMost ? [`${amount} in frames of more than ${drawnAtMost}`] : []),
    ...(!times && many > drawnAtMost ? [`${amount} ${drawn}, with no 「k×」`] : []),
  ];
}

// What the board would draw of an amount: whole things, in frames that
// divide them, and no more one by one than it can.
function drawnProblems(id: string, [count, picture, drawing = {}]: Amount<string>) {
  const amount = `conclusion ${id} draws ${count} ${picture}`;
  if (!Number.isInteger(count) || count < 1) return [`${amount}, which is not a count`];
  const { group, times = false } = drawing;
  if (group !== undefined && !dividedBy(count, group)) {
    return [`${amount} in frames of ${group}, which do not divide them`];
  }
  const each = group ?? 1;
  return crowdProblems(amount, count / each, each, times);
}

// A changed condition is set once the final answer is right: in the
// variation, when the lesson declares one.
function supposedEarly(content: AnyLessonContent, from: string) {
  const { shots, answerScene, variation } = content;
  if (variation) return !inVariation(content, from);
  return shots.indexOf(from) <= shots.indexOf(answerScene);
}

// A conclusion is first found in one of the scenes and used only from there
// on; a changed condition is set in the variation; its amounts are counts
// of single things the board can draw.
function conclusionProblems(content: AnyLessonContent, conclusion: AnyConclusion) {
  const { shots } = content;
  const { id, from, uses = [], supposed } = conclusion;
  const first = shots.indexOf(from);
  if (first < 0) return [`conclusion ${id} first shows in ${from}, which is not a scene`];
  return [
    ...uses
      .filter((shot) => shots.indexOf(shot) < first)
      .map((shot) => `conclusion ${id} is used in ${shot}, which is not a scene from ${from} on`),
    ...(supposed && supposedEarly(content, from)
      ? [`conclusion ${id} supposes a change before the variation starts`]
      : []),
    ...drawnAmounts(conclusion).flatMap((amount) => drawnProblems(id, amount)),
  ];
}

// Everything wrong with a lesson's content, or nothing: lines said in no
// scene, scenes that say nothing on arriving or arrive with another scene's
// lines, a flow not in the list or whose needs the scenes do not meet, a
// variation out of order, keeping what the problem never found, with its
// result out of place or with too few reasons to tap, record words empty or
// too long, and conclusions declared twice, found in no scene, used before
// they are found, supposing a change before the variation, or with amounts
// the board cannot draw.
export function lessonContentProblems(content: AnyLessonContent) {
  const ids = content.conclusions.map(({ id }) => id);
  return [
    ...lineProblems(content),
    ...flowProblems(content),
    ...variationProblems(content),
    ...recordWordProblems(content),
    ...ids
      .filter((id, index) => ids.indexOf(id) !== index)
      .map((id) => `conclusion ${id} is declared twice`),
    ...content.conclusions.flatMap((conclusion) => conclusionProblems(content, conclusion)),
  ];
}
