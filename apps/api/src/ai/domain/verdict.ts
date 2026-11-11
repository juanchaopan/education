// A child who guesses an answer and asks whether it is right has to check it
// against the scene; the problem's own rules judge the final answer. A teacher
// sentence that says the guess is right or wrong settles it for the child, so
// such a sentence is never shown.

// A clause that opens with a bare yes or no, after an optional interjection:
// 「对，……」「对对，……」「嗯嗯对」「是的。」「对啦！」「不是九哦」「错啦，……」.
const clauseVerdict =
  /(?:^|[，,。！!？?；;：:～~\s])(?:(?:嗯|哦|噢|啊|好)+[，,、]?)?(?:(?:对|是)+(?:的|啊|呀|哦|呢|了|啦|哒|嘛)?(?=[，,。！!？?；;、～~\s]|$)|不是|错了|错啦)/u;

// Praise or correction anywhere in the sentence: 「你猜对了」「做错了」「不太对」「答案正确」.
// 「对不对」 is the teacher asking the child to check, and 「核对」「对比」「数一数对面」
// only contain the character, so none of them counts.
const verdictPhrase =
  /(?:猜|说|答|算|数|想|做|写|找|选|画|认)得?(?:对|错)(?![不面比着齐准应照称])|(?<!对)不(?:太|大)?对(?!称)|没错|正确|是对的|是错的|就对了/u;

export function givesVerdict(sentence: string) {
  return clauseVerdict.test(sentence) || verdictPhrase.test(sentence);
}
