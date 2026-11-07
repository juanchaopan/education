import { feedbackTextMaxLength } from '@education/contracts';
import type { VoiceState } from '../data-access/useVoiceInput';
import { voiceMessage } from '../interaction/voice-message';
import action from './LessonAction.module.css';
import panel from './LessonPanel.module.css';
import styles from './VoiceInputPanel.module.css';

type Props = {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onGuide: () => void;
  onEdit: (text: string) => void;
  onConfirm: () => void;
  onDiscard: () => void;
};

function Button({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={action.button} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

function Actions({ state, ...on }: Props) {
  switch (state.status) {
    case 'starting':
      return <Button label="取消" onClick={on.onCancel} />;
    case 'recording':
      return (
        <>
          <Button label="说完了" onClick={on.onStop} />
          <Button label="不录了" onClick={on.onCancel} />
        </>
      );
    case 'transcribing':
      return <Button label="不等了，直接打字" onClick={on.onGuide} />;
    case 'review':
      return (
        <>
          <Button label="用这句话" onClick={on.onConfirm} disabled={!state.text.trim()} />
          <Button label="重新录" onClick={on.onStart} />
          <Button label="不用了" onClick={on.onDiscard} />
        </>
      );
    case 'unavailable':
      // A device without recording cannot be fixed by trying again.
      return state.reason === 'unsupported' ? null : (
        <Button label="再录一次" onClick={on.onStart} />
      );
    case 'idle':
      return <Button label="按一下，开始说" onClick={on.onStart} />;
    default:
      return <Button label="再录一次" onClick={on.onStart} />;
  }
}

// The heard text is shown in an ordinary text field, so it is never treated as markup.
export function VoiceInputPanel(props: Props) {
  const { state, onEdit } = props;
  return (
    <section className={panel.panel} aria-label="用说的回答">
      <p role="status" className={panel.message}>
        {voiceMessage(state)}
      </p>
      {state.status === 'review' && (
        <label className={styles.review}>
          <span className={styles.label}>听到的话</span>
          <textarea
            className={styles.text}
            value={state.text}
            maxLength={feedbackTextMaxLength}
            rows={3}
            onChange={(event) => onEdit(event.target.value)}
          />
        </label>
      )}
      <div className={panel.actions}>
        <Actions {...props} />
      </div>
    </section>
  );
}
