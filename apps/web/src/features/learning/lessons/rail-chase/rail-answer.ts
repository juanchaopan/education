import { numberList, type CountWords } from '../../interaction/spoken-answer';

export const answerQuestion = '两车的中点 M 和 N 什么时候相距四格？';
// Every second the cars drive before the yellow car runs off the track.
export const answerChoices = Array.from({ length: 16 }, (_, index) => index + 1);
// The authored hints, in the order a child who asks again receives them: the
// case with the blue car ahead first, then the one with the yellow car ahead.
export const answerHints = ['blue-ahead', 'yellow-ahead'] as const;

const has = (said: readonly number[], ...times: number[]) =>
  said.length === times.length && times.every((time) => said.includes(time));

// What a wrong answer most likely is: one of the two times alone, the
// distance taken for a time, or the second the two points line up.
function mistake(said: readonly number[]) {
  if (has(said, 6)) return '你找到了蓝车在前的那一次。黄车跑到前面以后，还有一次也隔四格，再想想？';
  if (has(said, 14))
    return '你找到了黄车在前的那一次。黄车追上以前，蓝车在前的时候，还有一次也隔四格，再想想？';
  if (said.includes(4))
    return '4 是两个点之间的距离，不是时刻。想一想：第几秒的时候，它们隔着四格？';
  if (said.includes(10)) return '第 10 秒时两个点正好对齐，一格也不隔。再看看下面那两条式子。';
}

// The times are said in seconds; a wrong answer is explained from every
// number the child said.
export const answerWords: CountWords = {
  unit: '秒',
  explain: (said) =>
    mistake(said) ??
    `${numberList(said)} 秒还不对。先看蓝车在前那一行：十减几等于四？再看黄车在前那一行。`,
};
