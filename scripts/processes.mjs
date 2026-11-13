// Running programs from the check scripts that start containers, which must
// stay alive through an interrupt long enough to remove them.
import { spawn, spawnSync } from 'node:child_process';

// Starts a program; `exit` resolves with its exit code. A program that could
// not start, or that a signal ended, counts as failed.
export function start(program, args, options = {}) {
  const child = spawn(program, args, { stdio: 'inherit', ...options });
  const exit = new Promise((resolve) => {
    child.on('error', (error) => {
      console.error(`${program}: ${error.message}`);
      resolve(1);
    });
    child.on('close', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
  return { child, exit };
}

export const run = (program, args, options) => start(program, args, options).exit;

// Ends a started program with everything it started. Windows has no signals
// to pass on: ending only the program would leave its own children running,
// so the whole process tree is ended there.
export function end(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill(signal);
}

// The exit code that reports each signal, 128 plus its number.
export const signals = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };

// Handles the interrupts instead of exiting on them, so the script can remove
// what it started; `stop` gets the signal and the exit code that reports it.
export function onInterrupt(stop) {
  for (const [signal, code] of Object.entries(signals))
    process.on(signal, () => stop(signal, code));
}
