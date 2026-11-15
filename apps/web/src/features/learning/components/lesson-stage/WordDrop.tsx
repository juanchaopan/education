import styles from './WordDrop.module.css';

type Props = {
  // The words the drop shows, which are also its name.
  word: string;
  lit: boolean;
  onToggle: () => void;
};

// A long glass drop with a few words on it, for a choice made of words
// rather than a number: tapping lights it green or puts it out again, and
// a screen reader hears whether it is lit.
export function WordDrop({ word, lit, onToggle }: Props) {
  return (
    <button type="button" className={styles.drop} aria-pressed={lit} onClick={onToggle}>
      {word}
    </button>
  );
}
