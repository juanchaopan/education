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

function single(words: Iterable<string>) {
  const values = new Set<number>();
  for (const word of words) {
    const heard = value(word);
    if (heard === undefined) return undefined;
    values.add(heard);
  }
  return values.size === 1 ? [...values][0] : undefined;
}

// The one whole number a child said, such as 9 from「九根」or「是9根」. When the
// answer is counted in a unit, the number said with that unit decides, so
//「一棵青菜和九根黄瓜一样重」is nine cucumbers. Saying no number, an
// unreadable one or two different ones leaves it unknown, so the child is
// asked again instead of being judged on a guess.
export function spokenNumber(text: string, unit?: string): number | undefined {
  const plain = text.replace(notNumbers, '');
  if (unit) {
    const counted = [...plain.matchAll(new RegExp(`(${numeral})${unit}`, 'g'))].map(
      ([, word]) => word!,
    );
    if (counted.length) return single(counted);
  }
  return single([...plain.matchAll(new RegExp(numeral, 'g'))].map(([word]) => word));
}
