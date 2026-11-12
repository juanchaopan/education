import type { LessonFlow } from '@education/problems/lesson-content';
import type { ComponentType } from 'react';
import type { FlowAnswerProps } from './flow-answer';
import { SceneBySceneAnswer } from './SceneBySceneAnswer';

// The answer part of each lesson flow on the shared lesson page. A flow added
// to the list gets its own part here, which the type check asks for.
export const flowAnswers: Readonly<Record<LessonFlow, ComponentType<FlowAnswerProps>>> = {
  'scene-by-scene': SceneBySceneAnswer,
};
