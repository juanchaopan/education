import type { ReactNode } from 'react';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { Spoken } from '../../../../shared/ui/Spoken';
import { VoiceMeter } from './VoiceMeter';
import { WaitingDots } from './WaitingDots';
import styles from './AnswerCapsule.module.css';

// The parts every capsule the child answers in is built from: the glass
// pill itself, the microphone listening and the words being heard, what was
// heard, and the honey drop that asks to speak again.

// The pill, named for what the child does in it, which tells screen readers
// the question it answers.
export function Capsule({
  label,
  question,
  children,
}: {
  label: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.capsule} aria-label={label}>
      <Spoken>{question}</Spoken>
      {children}
    </section>
  );
}

// The microphone open: a meter that moves with the child's voice and a
// drop to say it is done.
export function Listening({
  message,
  level,
  onFinish,
}: {
  message: string;
  level?: () => number;
  onFinish: () => void;
}) {
  return (
    <>
      <VoiceMeter level={level} />
      <Spoken>{message}</Spoken>
      <Dewdrop icon="stop" tone="clay" label="说完了" onClick={onFinish} />
    </>
  );
}

// What the child said on its way to being heard, with a drop to stop waiting.
export function Hearing({ onStopWaiting }: { onStopWaiting: () => void }) {
  return (
    <>
      <WaitingDots label="正在听你说了什么" />
      <Dewdrop icon="close" size="small" label="不等了" onClick={onStopWaiting} />
    </>
  );
}

// A small line, such as 我听到, over what it is about, large, in the title
// font.
export function Heard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span className={styles.heard}>
      <small>{title}</small>
      {children}
    </span>
  );
}

// Numbers as they were heard, each with its unit, side by side.
export function Counts({ said, unit }: { said: readonly number[]; unit?: string }) {
  return (
    <span className={styles.numbers}>
      {said.map((count) => (
        <span key={count} className={styles.count}>
          {count}
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
      ))}
    </span>
  );
}

export function SayAgain({
  label,
  blocked,
  onListen,
}: {
  label: string;
  blocked: boolean;
  onListen: () => void;
}) {
  return (
    <Dewdrop
      icon="sayAgain"
      tone="honey"
      size="large"
      label={label}
      disabled={blocked}
      onClick={onListen}
    />
  );
}
