import { transcriptionReservation } from './transcription.js';
import { MAX_FEEDBACK_OUTPUT_TOKENS, reservationCostFor } from './tutoring-cost.js';

const reservations = [reservationCostFor(MAX_FEEDBACK_OUTPUT_TOKENS), transcriptionReservation];

// What the monthly budget must still cover for every kind of paid request to be
// admitted, so the parent's status never reads available while one is refused.
export const largestReservationCost = reservations.reduce((largest, amount) =>
  amount > largest ? amount : largest,
);
