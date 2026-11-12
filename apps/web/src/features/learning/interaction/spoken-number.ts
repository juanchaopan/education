const digits: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

// Arabic numerals, full width ones as speech recognition sometimes writes them,
// and Chinese numerals below a hundred such as 九、十二、二十、两.
const numeral = '[0-9０-９]+|[零〇一二两三四五六七八九十]+';
// Words that say 一 without meaning one, as in「一样重」or「一共九根」.
const notNumbers = /一样|一共|一起|一下|一点|一定|一些|一边|一直/g;
// What may stand between two numbers said as a list, as in「六秒和十四秒」or
//「6、14 秒」.
const joiner = /^\s*(和|跟|与|或者?|还有|、|，|,)\s*$/;

function chinese(word: string) {
  const [tens, ones] = word.split('十');
  if (ones === undefined) return word.length === 1 ? digits[word] : undefined;
  if (word.indexOf('十') !== word.lastIndexOf('十')) return undefined;
  const ten = tens ? digits[tens] : 1;
  const one = ones ? digits[ones] : 0;
  if (ten === undefined || one === undefined || tens.length > 1 || ones.length > 1) return;
  return ten * 10 + one;
}

function value(word: string) {
  if (/^[0-9０-９]+$/.test(word))
    return Number(word.replace(/[０-９]/g, (wide) => String(wide.charCodeAt(0) - 0xff10)));
  return chinese(word);
}

// A number as it was said: its words and where they end in the sentence.
type Said = Readonly<{ word: string; start: number; end: number }>;

function numbersIn(text: string): Said[] {
  return [...text.matchAll(new RegExp(numeral, 'g'))].map((match) => ({
    word: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

// The numbers said with the answer's unit: each one the unit follows, and
// each one listed right before such a number, as 6 in「6 和 14 秒」.
function counted(text: string, said: readonly Said[], unit: string) {
  const kept = said.map(({ end }) => text.startsWith(unit, end));
  for (let index = said.length - 2; index >= 0; index--) {
    const between = text.slice(said[index]!.end, said[index + 1]!.start);
    if (!kept[index] && kept[index + 1] && joiner.test(between)) kept[index] = true;
  }
  return said.filter((_, index) => kept[index]);
}

// The distinct values of the words, in the order they were first said, or
// nothing when one cannot be read.
function distinct(said: readonly Said[]) {
  const values: number[] = [];
  for (const { word } of said) {
    const heard = value(word);
    if (heard === undefined) return undefined;
    if (!values.includes(heard)) values.push(heard);
  }
  return values.length ? values : undefined;
}

// The whole numbers a child said, each once, in the order said: 6 and 14
// from「六秒和十四秒」. When the answer is counted in a unit, the numbers said
// with that unit decide, so「十减 t 等于四，是第六秒」is the sixth second.
// Saying no number, or an unreadable one, leaves the answer unknown, so the
// child is asked again instead of being judged on a guess.
export function spokenNumbers(text: string, unit?: string): readonly number[] | undefined {
  const plain = text.replace(notNumbers, '');
  const said = numbersIn(plain);
  const withUnit = unit ? counted(plain, said, unit) : [];
  return distinct(withUnit.length ? withUnit : said);
}

// The one whole number a child said, such as 9 from「九根」or「是9根」. Two
// different numbers leave it unknown, as no number does.
export function spokenNumber(text: string, unit?: string): number | undefined {
  const heard = spokenNumbers(text, unit);
  return heard?.length === 1 ? heard[0] : undefined;
}
