import { useRef, useState } from 'react';
import type { LessonRecord } from '@education/contracts';
import type { LearningScope } from './learning-request';
import { useQuestionHelp } from './useQuestionHelp';
import { useQuestionReply } from './useQuestionReply';
import { useVoiceInput } from './useVoiceInput';
import type { VoiceOptions } from './voice-input';

type Options = VoiceOptions & {
  // The step in which the child gives the final answer, where a question is
  // help and is recorded as such.
  answerStep?: string;
};

const unrecorded: LessonRecord = { now: { things: [], states: [] }, ended: [], actions: [] };

// A question the child asks out loud in the middle of a scene, holding the
// button while speaking. The child reads over what was heard and corrects it
// before it goes to the teacher, about the scene it was asked in and with the
// lesson's record as it stood then, or drops it. A question is never an
// attempt; sent while the child is answering it is recorded as help first,
// and does not go out until that is recorded. The last question sent stays
// known, for the child to read while the reply comes.
export function useLessonQuestion(
  scope: LearningScope,
  stepId: string,
  record: () => LessonRecord,
  { answerStep, ...voiceOptions }: Options = {},
) {
  const voice = useVoiceInput(scope, stepId, 'hold', voiceOptions);
  const teacher = useQuestionReply(scope);
  const askedIn = useRef({ stepId, record: unrecorded });
  const [asked, setAsked] = useState<string>();
  const answering = stepId === answerStep;
  const help = useQuestionHelp(scope, answering);

  return {
    voice: voice.state,
    blocked: voice.blocked,
    reply: teacher.state,
    asked,
    sending: help.recording,
    sendFailed: help.failed,
    press() {
      askedIn.current = { stepId, record: record() };
      help.reset();
      return voice.start();
    },
    release: voice.release,
    edit: voice.edit,
    drop: voice.cancel,
    async send() {
      if (voice.state.status !== 'review' || !voice.state.text.trim()) return;
      if (answering && !(await help.counted())) return;
      const text = voice.confirm();
      if (!text) return;
      setAsked(text);
      void teacher.ask({ ...askedIn.current, text });
    },
    guide() {
      voice.guide();
      teacher.guide();
    },
  };
}
