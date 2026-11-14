import type { AnswerInput } from '@education/contracts';
import type { LessonContent } from './lesson-content.js';
import type { AnsweringPolicy, FeedbackStep, Judgement, VariationPolicy } from './plugin.js';

// Judges a final answer that is a count. The expected whole number is correct
// and any other whole number is a mistake; anything else, such as words, a
// fraction or a list, was not understood, so it is never counted as wrong.
export function wholeNumberAnswer(answer: number): AnsweringPolicy['checkCompletion'] {
  return (input) => {
    if (typeof input !== 'number' || !Number.isInteger(input)) return 'uncertain';
    return input === answer ? 'correct' : 'incorrect';
  };
}

const wholeNumbers = (input: AnswerInput): input is number[] =>
  Array.isArray(input) &&
  input.length > 0 &&
  input.every((value) => typeof value === 'number' && Number.isInteger(value));

// Judges a final answer that is every number that fits, such as both times
// two points are four squares apart. The child's whole numbers are taken as
// a set, so their order and a number said twice do not matter: exactly the
// expected numbers are correct, and any other set, one with a number missing
// or one too many, is a mistake. Anything but a list of whole numbers, an
// empty list included, was not understood, so it is never counted as wrong.
export function numberSetAnswer(answers: readonly number[]): AnsweringPolicy['checkCompletion'] {
  const expected = new Set(answers);
  return (input) => {
    if (!wholeNumbers(input)) return 'uncertain';
    const said = new Set(input);
    const same = said.size === expected.size && [...said].every((value) => expected.has(value));
    return same ? 'correct' : 'incorrect';
  };
}

// Sounds that carry no words, which speech recognition writes down when a
// child hesitates.
const fillers = /[嗯啊呃哦唔额噢]/g;
const wordCharacters = /[一-鿿0-9]/g;

// Whether a sentence says anything at all: at least two characters of words
// or digits once hesitation sounds are left out.
function saysSomething(text: string) {
  return (text.replace(fillers, '').match(wordCharacters)?.length ?? 0) >= 2;
}

const sameChoices = (chosen: readonly string[], expected: readonly string[]) =>
  chosen.length === expected.length && expected.every((id) => chosen.includes(id));

// Judges a variation's reason. A spoken reason with no words in it cannot be
// judged; any other is judged by the problem's own rule, which tells a clear
// reason from one that is reversed, half said or about something else. Tapped
// choices are right when exactly the expected ones are tapped as kept and as
// changed; a tap of a choice the lesson does not have, or no tap at all,
// cannot be judged.
export function variationReason({
  says,
  choices,
  kept,
  changed,
}: {
  says: (text: string) => Exclude<Judgement, 'uncertain'>;
  choices: readonly string[];
  kept: readonly string[];
  changed: readonly string[];
}): VariationPolicy['checkReason'] {
  return (reason) => {
    if ('say' in reason) return saysSomething(reason.say) ? says(reason.say) : 'uncertain';
    const chosen = [...reason.choose.kept, ...reason.choose.changed];
    if (!chosen.length || !chosen.every((id) => choices.includes(id))) return 'uncertain';
    return sameChoices(reason.choose.kept, kept) && sameChoices(reason.choose.changed, changed)
      ? 'correct'
      : 'incorrect';
  };
}

// What a model may see for each scene of a lesson, by the scene's id: the
// scene's prompt as the lesson's content declares it, and the problem's own
// words, which speech recognition is told to expect in every scene.
export function sceneSteps<Shot extends string>({
  shots,
  scenes,
  vocabulary,
}: Pick<LessonContent<Shot, string, string>, 'shots' | 'scenes' | 'vocabulary'>) {
  return Object.fromEntries(
    shots.map((shot) => [shot, { prompt: scenes[shot].prompt, vocabulary }]),
  ) as Readonly<Record<Shot, FeedbackStep>>;
}
