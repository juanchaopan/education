import type { AccountArt } from '../features/family/components/AccountLayout';
import type { ChildHomeArt } from '../features/family/components/ChildHomeLayout';
import { backdrops } from '../features/learning/media/backdrops/backdrops';
import { teachers } from '../features/learning/media/teachers/teachers';

// The picture beside the account pages and the sign-in: the art studio of the
// lesson scenes in its evening light, with the rabbit who teaches standing in
// it. Both come from the lesson picture library, so these pages share the
// lessons' look without a picture of their own.
export const accountArt: AccountArt = {
  backdrop: backdrops['art-studio-evening'].image,
  teacher: teachers.rabbit.image,
};

// The child's home: the toy classroom by day, the library corner on a rainy
// night, and the rabbit peeking over the books.
export const childHomeArt: ChildHomeArt = {
  day: backdrops['toy-classroom-day'].image,
  night: backdrops['library-corner-rainy'].image,
  teacher: teachers.rabbit.image,
};
