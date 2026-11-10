import { useEffect } from 'react';
import type { Subtitle, Words, WordsSource } from './subtitle';

// Says a part of the lesson's current words through the teacher's subtitle,
// and nothing more once the part leaves the lesson.
export function useSubtitleWords(subtitle: Subtitle, source: WordsSource, words: Words) {
  const { text, thinking, hidden } = words;
  useEffect(() => {
    subtitle.say(source, { text, thinking, hidden });
  }, [subtitle, source, text, thinking, hidden]);
  useEffect(() => () => subtitle.say(source, undefined), [subtitle, source]);
}
