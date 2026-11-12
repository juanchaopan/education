import type { KeyActionOf, ScenePictureOf } from '@education/problems/lesson-content';
import type { lessonTemplateLesson } from '@education/problems/lessons/lesson-template';
import type { LessonRecording } from '../../interaction/lesson-record';
import { pebbles, type Move, type TemplateState } from './story';

// How the template tells the teacher what is on screen and what the child
// did, in the words its content declares: the pebbles still on the table and
// those in the bowl, and each pebble put in the bowl. A copied lesson
// describes its own state and moves here.
type Picture = ScenePictureOf<typeof lessonTemplateLesson>;
type Action = KeyActionOf<typeof lessonTemplateLesson>;

function picture({ inBowl }: TemplateState): Picture {
  return {
    things: [
      { place: 'table', thing: 'pebble', count: pebbles - inBowl },
      { place: 'bowl', thing: 'pebble', count: inBowl },
    ],
    states: [],
  };
}

const action = (_state: TemplateState, _move: Move, taken: boolean): Action | undefined =>
  taken ? 'pebble-to-bowl' : undefined;

export const templateRecording = { picture, action } satisfies LessonRecording<TemplateState, Move>;
