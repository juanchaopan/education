// Per-process bound only; database-backed deployment leases remain unverified.
export class Admission {
  active = 0;
  waiting = [];
  async run(job) {
    if (this.active >= 2) {
      if (this.waiting.length >= 4) throw new Error('BUSY');
      await new Promise((resolve) => this.waiting.push(resolve));
    } else this.active++;
    try {
      return await job();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
