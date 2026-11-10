import { useEffect, useRef } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import styles from './VoiceMeter.module.css';

type Props = {
  // How loud the microphone is now, from 0 to about 1; without it the bars
  // only breathe, to show the microphone is open.
  level?: () => number;
};

// Speech near a microphone reads about a tenth of full scale, so the bars
// reach their full height well before the loudest sound.
const gain = 8;
// Fast enough to follow syllables, slow enough to cost nothing.
const readEveryMs = 50;

// Five bars that rise and fall with the child's voice while the microphone
// listens. The bars follow the microphone from outside React, so the page is
// not drawn again for every reading.
export function VoiceMeter({ level }: Props) {
  const bars = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!level) return;
    const timer = setInterval(() => {
      const loudness = Math.min(1, level() * gain);
      bars.current?.style.setProperty('--level', loudness.toFixed(2));
    }, readEveryMs);
    return () => clearInterval(timer);
  }, [level]);
  return (
    <span
      ref={bars}
      className={classNames(styles.meter, !level && styles.breathing)}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
