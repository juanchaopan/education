import { lazy } from 'react';

// Each lesson page, loaded when a child opens it.
export const GardenBalanceLesson = lazy(async () => ({
  default: (await import('../features/learning/pages/GardenBalanceLesson')).GardenBalanceLesson,
}));
