import type { AccountArt } from '../features/family/components/AccountLayout';
import { backdrops } from '../features/learning/media/backdrops/backdrops';
import { teachers } from '../features/learning/media/teachers/teachers';

// The picture beside the parents' account pages: the art studio of the
// lesson scenes in its evening light, with the rabbit who teaches standing in
// it. Both come from the lesson picture library, so the account pages share
// the lessons' look without a picture of their own.
export const accountArt: AccountArt = {
  backdrop: backdrops['art-studio-evening'].image,
  teacher: teachers.rabbit.image,
};
