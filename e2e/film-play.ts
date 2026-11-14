// Playing a lesson film by hand, whichever lesson it is.

// One thing the child does in the film: the move, what shows once the film
// has taken it, and the recordings the teacher then says, by file name.
export type FilmMove = { move: () => Promise<void>; shown?: () => Promise<void>; says: string[] };

// Waits until the recordings named, and nothing else, have each played to
// their end since the last wait (see narration-check.ts).
export type Listener = { heard: (recordings: readonly string[]) => Promise<void> };

// Makes the moves one after another, each once the film has taken the last,
// and whatever a test checks after each.
export async function play(
  moves: readonly FilmMove[],
  after: (move: FilmMove) => Promise<void> = async () => {},
) {
  for (const step of moves) {
    await step.move();
    await step.shown?.();
    await after(step);
  }
}
