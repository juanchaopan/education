import { fork } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism, cpus, platform, release } from 'node:os';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import argon2 from 'argon2';

const candidates = [
  { memoryCost: 19456, timeCost: 2 },
  { memoryCost: 32768, timeCost: 3 },
  { memoryCost: 65536, timeCost: 3 },
];
const modes = [
  { name: 'serial', requests: 1, slots: 1 },
  { name: 'three-unbounded', requests: 3, slots: 3 },
  { name: 'three-two-slots', requests: 3, slots: 2 },
];
const percentile = (values, fraction) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
const round = (value) => Math.round(value * 100) / 100;

function summarize(rows) {
  return Object.fromEntries(
    ['hash', 'verify'].map((operation) => {
      const values = rows.filter((row) => row.operation === operation).map((row) => row.elapsedMs);
      return [
        operation,
        {
          samples: values.length,
          p50Ms: percentile(values, 0.5),
          p95Ms: percentile(values, 0.95),
          maxMs: Math.max(...values),
        },
      ];
    }),
  );
}

function runWorker(candidate, mode) {
  return new Promise((resolve, reject) => {
    const child = fork(
      new URL(import.meta.url),
      ['worker', JSON.stringify(candidate), JSON.stringify(mode)],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] },
    );
    let data;
    child.on('message', (value) => {
      data = value;
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 && data ? resolve(data) : reject(new Error(`Worker exit ${code}`)),
    );
  });
}

function planRuns(confirmation) {
  const selected = confirmation ? candidates.slice(0, 2) : candidates;
  const selectedModes = confirmation ? modes.filter((mode) => mode.slots < 3) : modes;
  return Array.from({ length: confirmation ? 2 : 1 }, (_, roundIndex) =>
    selected.flatMap((candidate) => selectedModes.map((mode) => ({ roundIndex, candidate, mode }))),
  ).flat();
}

async function measure(candidate, mode) {
  const options = {
    ...candidate,
    type: argon2.argon2id,
    parallelism: 1,
    hashLength: 32,
    version: 0x13,
  };
  const pepper = randomBytes(32);
  const input = createHmac('sha256', pepper)
    .update(JSON.stringify(['spike-only-family', 'spike-only-child', '428716']))
    .digest();
  const encoded = await argon2.hash(input, options);
  const warmupCount = 6;
  for (let index = 0; index < warmupCount; index++) await argon2.verify(encoded, input);
  const delay = monitorEventLoopDelay({ resolution: 10 });
  delay.enable();
  const rows = [];
  const startRss = process.memoryUsage().rss;
  for (const operation of ['hash', 'verify']) {
    for (let completed = 0; completed < 30; completed += mode.requests) {
      let active = 0;
      const waiting = [];
      async function task() {
        const begin = performance.now();
        if (active >= mode.slots) await new Promise((resolve) => waiting.push(resolve));
        active++;
        const admitted = performance.now();
        if (operation === 'hash') await argon2.hash(input, options);
        else if (!(await argon2.verify(encoded, input))) throw new Error('Verification failed');
        const end = performance.now();
        active--;
        waiting.shift()?.();
        rows.push({
          operation,
          elapsedMs: round(end - begin),
          queueMs: round(admitted - begin),
        });
      }
      await Promise.all(Array.from({ length: mode.requests }, task));
    }
  }
  delay.disable();
  return {
    candidate,
    parallelism: 1,
    saltBytes: 16,
    tagBytes: 32,
    mode,
    warmupCount,
    summaries: summarize(rows),
    startRssMiB: round(startRss / 1048576),
    peakRssMiB: round(process.resourceUsage().maxRSS / 1024),
    eventLoopP95Ms: round(delay.percentile(95) / 1e6),
    rows,
  };
}

if (process.argv[2] === 'worker') {
  const result = await measure(JSON.parse(process.argv[3]), JSON.parse(process.argv[4]));
  process.send(result);
} else {
  const confirmation = process.argv.includes('--confirm');
  const runs = [];
  for (const { roundIndex, candidate, mode } of planRuns(confirmation)) {
    const result = await runWorker(candidate, mode);
    runs.push({ round: roundIndex + 1, ...result });
    console.log(
      JSON.stringify({
        candidate,
        mode: mode.name,
        summaries: result.summaries,
        peakRssMiB: result.peakRssMiB,
      }),
    );
  }
  const result = {
    measuredAt: new Date().toISOString(),
    environment: {
      node: process.version,
      argon2: '0.45.2',
      platform: platform(),
      arch: process.arch,
      kernel: release(),
      cpu: cpus()[0].model,
      visibleCpus: cpus().length,
      availableParallelism: availableParallelism(),
      cgroupCpuMax: (await readFile('/sys/fs/cgroup/cpu.max', 'utf8')).trim(),
      cgroupMemoryMax: (await readFile('/sys/fs/cgroup/memory.max', 'utf8')).trim(),
      uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE ?? 'default (4)',
      scope:
        'Local cloud worker only; no HTTP, database, network, cold starts, Vercel or mainland measurements.',
    },
    methodology:
      'Fresh subprocess per candidate/mode; 6 warmups, 30 hashes + 30 verifies; batches of 1 or 3; nearest-rank quantiles; queue included; peak RSS is OS high-water mark including warmup/native allocator.',
    runs,
  };
  await mkdir(new URL('./results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL(
      confirmation ? './results/argon2-confirmation.json' : './results/argon2.json',
      import.meta.url,
    ),
    JSON.stringify(result, null, 2) + '\n',
  );
}
