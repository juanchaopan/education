import { LinkButton } from '../../../shared/ui/LinkButton';
import { StageNotice } from '../components/lesson-stage/StageNotice';

// Shown in the picture to a visitor, who can watch and play but whose place,
// questions and answers are not kept, where a signed-in child's microphone
// would be.
export function LessonSignInNotice() {
  return (
    <StageNotice icon="user" label="登录" text="登录后能保存进度">
      <LinkButton to="/child">去孩子空间登录</LinkButton>
    </StageNotice>
  );
}
