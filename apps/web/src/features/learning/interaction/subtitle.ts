import { createListeners } from '../../../shared/lib/listeners';

// Everything the teacher says goes through one subtitle: the narrated lines,
// the replies to the child's questions, what the answer and the hints say.
// Each part of the lesson speaks as its own source, and the subtitle shows the
// newest words any of them said.
export type WordsSource = 'narration' | 'answer' | 'hint' | 'question';

// What a source says: words, the teacher thinking about a reply, or words
// that are said but not shown, like a narrated line with captions off. Hidden
// words still count as the newest, so an older reply does not come back.
// `again` counts how often the same words were brought back, as when the
// child hears a line again, which makes them the newest once more.
export type Words = Readonly<{
  text?: string;
  thinking?: boolean;
  hidden?: boolean;
  again?: number;
}>;
export type Said = Readonly<{ source: WordsSource }> & Words;

const spoken = ['text', 'thinking', 'again'] as const;

const saysSomething = (words?: Words): words is Words =>
  !!words && (!!words.text || !!words.thinking);

// The same speech, whether or not it is shown.
const sameSpeech = (one?: Words, other?: Words) =>
  spoken.every((part) => one?.[part] === other?.[part]);

export function createSubtitle() {
  // The sources with something to say, the one that spoke last at the end.
  const said = new Map<WordsSource, Words>();
  let newest: Said | undefined;
  const { notify, subscribe } = createListeners();
  return {
    // A source says new words, or nothing more when `words` is empty. Only
    // showing or hiding the same words keeps their place, so turning the
    // captions on or off never puts an older line over a newer reply.
    say(source: WordsSource, words?: Words) {
      const before = said.get(source);
      if (sameSpeech(before, words) && before?.hidden === words?.hidden) return;
      if (!sameSpeech(before, words)) said.delete(source);
      if (saysSomething(words)) said.set(source, words);
      const last = [...said].at(-1);
      newest = last && { source: last[0], ...last[1] };
      notify();
    },
    newest: () => newest,
    subscribe,
  };
}

export type Subtitle = ReturnType<typeof createSubtitle>;
