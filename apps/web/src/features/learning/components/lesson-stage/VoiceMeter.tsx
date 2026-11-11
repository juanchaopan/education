import { useEffect, useRef } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import styles from './VoiceMeter.module.css';

type Props = {
  // How loud the microphone is now, from 0 to about 1; without it the bars
  // only breathe, to show the microphone is open. It is read on a timer, so
  // it should stay the same function for as long as the microphone is open.
  level?: () => number;
};

// Speech near a microphone reads about a tenth of full scale, so the bars
// reach their full height well before the loudest sound.
const gain = 8;
// Fast enough to follow syllables, slow enough to cost nothing.
const readEveryMs = 50;

// Five bars that rise and fall with the child's voice while the microphone
// listens. The bars follow the microphone from outside React, so the page is
// not drawn again for every reading, and a reading that has not changed, as
// in silence, leaves the bars alone.
export function VoiceMeter({ level }: Props) {
  const bars = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!level) return;
    const timer = setInterval(() => {
      const style = bars.current?.style;
      const loudness = Math.min(1, level() * gain).toFixed(2);
      if (style && style.getPropertyValue('--level') !== loudness)
        style.setProperty('--level', loudness);
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
