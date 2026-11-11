import { classNames } from '../../../../shared/lib/class-names';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import styles from './StageTools.module.css';

type Props = {
  // A line is sounding now.
  speaking: boolean;
  // A line did not come out and waits to be heard again.
  again: boolean;
  captions: boolean;
  sound: boolean;
  onReplay: () => void;
  onCaptions: () => void;
  onSound: () => void;
};

// The tools in the stage's top corner: hear the line again, captions, sound.
// The replay drop glows while a line sounds, and turns honey and calls for a
// tap while a line that did not come out waits. Without sound the captions
// are the only way to follow, so they show as on and cannot be turned off
// then, whatever the child chose for them.
export function StageTools({ speaking, again, captions, sound, ...on }: Props) {
  const captionsOn = captions || !sound;
  return (
    <div className={styles.tools} role="group" aria-label="课堂工具">
      <span className={classNames(styles.replay, speaking && styles.playing, again && styles.call)}>
        <Dewdrop
          icon="replay"
          tone={again ? 'honey' : 'clear'}
          label={again ? '再听一次' : '重听这一句'}
          onClick={on.onReplay}
        />
      </span>
      <Dewdrop
        icon={captionsOn ? 'captions' : 'captionsOff'}
        label="字幕"
        aria-pressed={captionsOn}
        disabled={!sound}
        onClick={on.onCaptions}
      />
      <Dewdrop
        icon={sound ? 'sound' : 'soundOff'}
        label="声音"
        aria-pressed={sound}
        onClick={on.onSound}
      />
    </div>
  );
}
