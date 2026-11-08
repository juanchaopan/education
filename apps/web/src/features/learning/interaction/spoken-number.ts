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
const numeral = /[0-9０-９]+|[零〇一二两三四五六七八九十]+/g;

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

// The one whole number a child said, such as 9 from「九根」or「是9根」. Saying
// no number, an unreadable one or two different numbers leaves it unknown, so
// the child is asked again instead of being judged on a guess.
export function spokenNumber(text: string): number | undefined {
  const values = new Set<number>();
  for (const [word] of text.matchAll(numeral)) {
    const heard = value(word);
    if (heard === undefined) return undefined;
    values.add(heard);
  }
  return values.size === 1 ? [...values][0] : undefined;
}
