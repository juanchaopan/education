// A book is finished once it has problems and the child has done every one.
export const finished = (done: number, total: number) => total > 0 && done === total;
