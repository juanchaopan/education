import type { QuestionPhase } from '../components/lesson-stage/QuestionBox';
import type { QuestionReplyState } from '../data-access/useQuestionReply';
import type { VoiceState } from '../data-access/voice-input';
import { usesMicrophone } from '../voice/microphone-turn';
import { fallbackMessage } from './ai-help-message';
import type { Words } from './subtitle';
import { voiceMessage, type Alternative } from './voice-message';

// Where a question stands: the voice being recorded or heard, and the
// teacher's reply to the last question sent, which is still known.
type Question = Readonly<{
  voice: VoiceState;
  reply: QuestionReplyState;
  asked?: string;
  sendFailed: boolean;
}>;

// A question is never needed to go on, so speech that cannot be used only
// sends the child back to the scene.
const carryOn: Alternative = { instead: '我们接着做题吧。' };

// What the question box beside the microphone shows, if anything: the voice
// while the child holds it, the words being heard, the words to read over,
// or the question sent, while its reply is on the way.
export function questionPhase({ voice, reply, asked }: Question): QuestionPhase | undefined {
  if (usesMicrophone(voice.status)) return 'listening';
  if (voice.status === 'transcribing') return 'hearing';
  if (voice.status === 'review') return 'review';
  if (voice.status === 'idle' && reply.status === 'pending' && asked) return 'asked';
  return undefined;
}

function replyWords(reply: QuestionReplyState, guidance: string): Words {
  switch (reply.status) {
    case 'pending':
      return { thinking: true };
    case 'ready':
      return { text: reply.reply };
    case 'fallback':
      return { text: `${fallbackMessage(reply.reason)}${guidance}` };
    case 'guidance':
      return { text: `好的，不等了。${guidance}` };
    default:
      return {};
  }
}

// What the teacher says about the question, in its subtitle: why speech
// could not be used, a question that did not go out, the teacher thinking,
// and the reply. When the teacher cannot answer, the scene's own guidance,
// its last line, says what to do next. While the child speaks or reads over
// the words, the teacher says nothing; the question box shows them.
export function questionWords(question: Question, guidance: string): Words {
  const { voice, reply, sendFailed } = question;
  switch (voice.status) {
    case 'idle':
      return replyWords(reply, guidance);
    case 'review':
      return sendFailed ? { text: '暂时连不上，还没发出去。' } : {};
    case 'unavailable':
    case 'fallback':
    case 'unheard':
    case 'guidance':
      return { text: voiceMessage(voice, carryOn) };
    default:
      return {};
  }
}
