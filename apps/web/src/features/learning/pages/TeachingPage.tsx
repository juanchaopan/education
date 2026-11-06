import { useState } from 'react';
import type { HelpEvent, TeachingDefinition, TeachingStep } from '@education/contracts';
import { TeachingStepView } from '../components/TeachingStepView';
import styles from '../components/TeachingStepView.module.css';
import { helpOptions, recordHelp } from '../model';

function focusHeading(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

export function TeachingPage({ title, teaching }: { title: string; teaching: TeachingDefinition }) {
  const [index, setIndex] = useState(0);
  const [events, setEvents] = useState<HelpEvent[]>([]);
  const step = teaching.steps[index];

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      {step ? (
        <ActiveStep
          key={step.id}
          step={step}
          progress={`第 ${index + 1} 步，共 ${teaching.steps.length} 步`}
          nextLabel={index + 1 < teaching.steps.length ? '下一步' : '看完引导'}
          events={events}
          onHelp={(kind) => setEvents((history) => recordHelp(history, step.id, kind))}
          onNext={() => setIndex(index + 1)}
        />
      ) : (
        <h2 className={styles.instruction} ref={focusHeading} tabIndex={-1}>
          这次引导看完了
        </h2>
      )}
    </div>
  );
}

type Notice = 'repeat' | 'retry' | 'empty' | 'confirm' | 'unavailable';

function ActiveStep({
  step,
  progress,
  nextLabel,
  events,
  onHelp,
  onNext,
}: {
  step: TeachingStep;
  progress: string;
  nextLabel: string;
  events: readonly HelpEvent[];
  onHelp: (kind: HelpEvent['kind']) => void;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState<Notice>();
  const help = helpOptions(step, events);
  const messages = {
    repeat: `再看一次。${step.instruction}`,
    retry: step.retryInstruction,
    empty: '先写下你的想法，再一起看看。',
    confirm: '请确认这就是你想表达的内容。',
    unavailable: '这一步暂时无法判断。你可以试试小提示，或继续看引导。',
  };

  return (
    <TeachingStepView
      progress={progress}
      instruction={step.instruction}
      headingRef={focusHeading}
      answer={answer}
      onAnswer={(text) => {
        setAnswer(text);
        setNotice(undefined);
      }}
      notice={notice && messages[notice]}
      helpCount={events.length}
      shownHint={help.shown}
      nextHint={help.next?.kind}
      onHint={onHelp}
      onRepeat={() => {
        onHelp('repeat');
        setNotice('repeat');
      }}
      onRetry={() => {
        onHelp('retry');
        setNotice('retry');
      }}
      checking={notice === 'confirm'}
      onCheck={() => setNotice(answer.trim() ? 'confirm' : 'empty')}
      onConfirm={() => setNotice('unavailable')}
      nextLabel={nextLabel}
      onNext={onNext}
    />
  );
}
