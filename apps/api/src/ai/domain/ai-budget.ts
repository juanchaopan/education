import { transcriptionReservation } from './transcription.js';
import { MAX_FEEDBACK_OUTPUT_TOKENS, reservationCostFor } from './tutoring-cost.js';

const feedbackReservation = reservationCostFor(MAX_FEEDBACK_OUTPUT_TOKENS);

// What the monthly budget must still cover for every kind of paid request to be
// admitted, so the parent's status never reads available while one is refused.
export const largestReservationCost =
  transcriptionReservation > feedbackReservation ? transcriptionReservation : feedbackReservation;
