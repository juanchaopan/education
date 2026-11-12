import type { IconName } from './icons';

// The colours of a subject's default cover, as the tokens name them.
export type SubjectTone = 'math' | 'chinese' | 'english' | 'other';

export type SubjectLook = Readonly<{ tone: SubjectTone; icon: IconName }>;

// How each subject is drawn: the colours of its default cover and its icon,
// which also marks the subject's chip on the shelf. A new subject gets its own
// row once the maintainer has seen its icon and colours.
const looks: Readonly<Record<string, SubjectLook>> = {
  数学: { tone: 'math', icon: 'math' },
  语文: { tone: 'chinese', icon: 'chinese' },
  英语: { tone: 'english', icon: 'english' },
};

// A subject the table does not know yet is a closed book on wheat.
const otherLook: SubjectLook = { tone: 'other', icon: 'book' };

export function subjectLook(subject: string): SubjectLook {
  return Object.hasOwn(looks, subject) ? looks[subject]! : otherLook;
}
