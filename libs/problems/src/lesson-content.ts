// What a lesson says and finds, declared once for each problem and read by the
// site and the server alike: the lesson flow it follows, its scenes in
// teaching order, the scene that asks for the final answer, what a model may
// see of each scene, the words the teacher says in each, and the conclusions
// its scenes find. It holds no judging rules, which only the server's plugins
// have, so the site may load it.

// The lesson flows a problem can follow, the skeleton of its lesson; see the
// handbook's 课堂流程清单. `scene-by-scene` is 逐幕探究: each scene finds a
// small conclusion by hand, a short final answer follows, then a variation.
export const lessonFlows = ['scene-by-scene'] as const;
export type LessonFlow = (typeof lessonFlows)[number];

// How many of one of the lesson's pictures, for example three apples.
export type Amount<Picture extends string> = readonly [count: number, picture: Picture];

// One conclusion a scene finds:
// - `says`, the sentence a screen reader reads for it;
// - `amounts`, the amounts that weigh the same, in order;
// - `from`, the first scene that finds it;
// - `uses` and `hints`, the scenes, and the answer's hints, that use it;
// - `answer`, the final count it is written on with once the child has
//   answered right, and the sentence it then reads as;
// - `supposed`, a changed condition, which comes right after the
//   conclusion it changes.
export type Conclusion<Shot extends string, Picture extends string> = Readonly<{
  id: string;
  says: string;
  amounts: readonly [Amount<Picture>, ...Amount<Picture>[]];
  from: Shot;
  uses?: readonly Shot[];
  hints?: readonly string[];
  answer?: Readonly<{ amount: Amount<Picture>; says: string }>;
  supposed?: boolean;
}>;

// A line the teacher says, and the scene it is said in.
export type LessonLine<Shot extends string> = Readonly<{ scene: Shot; text: string }>;

// A scene as a model may see it, `prompt`: what is on screen and what the
// child does next, without the final count. `entry` is what the teacher says
// on arriving, whether by playing on or by coming back to a saved scene.
export type LessonScene<Line extends string> = Readonly<{ prompt: string; entry: readonly Line[] }>;

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
> = Readonly<{
  problem: Readonly<{ id: string; version: number }>;
  flow: LessonFlow;
  vocabulary: readonly string[];
  shots: readonly [Shot, ...Shot[]];
  answerScene: Shot;
  lines: Readonly<Record<Line, LessonLine<Shot>>>;
  scenes: Readonly<Record<Shot, LessonScene<Line>>>;
  conclusions: readonly Conclusion<Shot, Picture>[];
}>;

// A lesson's content with its scene, line and picture names kept exact: the
// scenes are named by `shots` and the lines by `lines`, so a scene, an entry
// line, the answer scene or a conclusion's scene that names anything else
// does not compile.
export function lessonContent<
  const Shot extends string,
  const Line extends string,
  const Picture extends string,
>(
  content: Omit<
    LessonContent<Shot, Line, Picture>,
    'answerScene' | 'lines' | 'scenes' | 'conclusions'
  > &
    Readonly<{
      answerScene: NoInfer<Shot>;
      lines: Readonly<Record<Line, LessonLine<NoInfer<Shot>>>>;
      scenes: Readonly<Record<NoInfer<Shot>, LessonScene<NoInfer<Line>>>>;
      conclusions: readonly Conclusion<NoInfer<Shot>, Picture>[];
    }>,
): LessonContent<Shot, Line, Picture> {
  return content;
}

// Any lesson's content, as the checks read it.
export type AnyLessonContent = LessonContent<string, string, string>;
type AnyConclusion = AnyLessonContent['conclusions'][number];

// The pictures a lesson's conclusions are drawn with, which a board that
// shows them must have.
export type PictureOf<Content> =
  Content extends LessonContent<string, string, infer Picture> ? Picture : never;

const missing = (from: readonly string[], within: readonly string[]) =>
  from.filter((name) => !within.includes(name));

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

// What each lesson flow asks of a lesson that follows it.
const flowRules: Readonly<Record<LessonFlow, (content: AnyLessonContent) => string[]>> = {
  'scene-by-scene': sceneBySceneProblems,
};

function flowProblems(content: AnyLessonContent) {
  const { flow } = content;
  const rules = Object.hasOwn(flowRules, flow) ? flowRules[flow] : undefined;
  return rules ? rules(content) : [`the lesson follows flow ${flow}, which is not in the list`];
}

// A conclusion is first found in one of the scenes and used only from there
// on; a supposed one stands beside the conclusion before it, which is found
// by then.
function conclusionProblems(
  { id, from, uses = [], supposed }: AnyConclusion,
  before: AnyConclusion | undefined,
  shots: readonly string[],
) {
  const first = shots.indexOf(from);
  if (first < 0) return [`conclusion ${id} first shows in ${from}, which is not a scene`];
  const beside = !supposed || (before !== undefined && shots.indexOf(before.from) <= first);
  return [
    ...uses
      .filter((shot) => shots.indexOf(shot) < first)
      .map((shot) => `conclusion ${id} is used in ${shot}, which is not a scene from ${from} on`),
    ...(beside
      ? []
      : [`conclusion ${id} supposes a change but has no conclusion on the board to stand beside`]),
  ];
}

// Everything wrong with a lesson's content, or nothing: lines said in no
// scene, scenes that say nothing on arriving or arrive with another scene's
// lines, a flow not in the list or whose needs the scenes do not meet, and
// conclusions declared twice, found in no scene, used before they are found,
// or supposed with nothing to stand beside.
export function lessonContentProblems(content: AnyLessonContent) {
  const { shots, conclusions } = content;
  const ids = conclusions.map(({ id }) => id);
  return [
    ...lineProblems(content),
    ...flowProblems(content),
    ...ids
      .filter((id, index) => ids.indexOf(id) !== index)
      .map((id) => `conclusion ${id} is declared twice`),
    ...conclusions.flatMap((conclusion, index) =>
      conclusionProblems(conclusion, conclusions[index - 1], shots),
    ),
  ];
}
