import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { createProblemRegistry } from '@education/problems/server';
import type { ProblemSummary } from '@education/contracts';
import { registerCatalog } from './catalog.js';
import { createCatalog } from '../services/catalog.js';

const rules = () => ({
  status: 'correct' as const,
  instruction: 'private-answer-rule-sentinel',
  stepId: 'start',
});

const step = {
  id: 'observe',
  instruction: '看看左边的图形。',
  retryInstruction: '从左上角开始看。',
  hint: '找找有没有尖角。',
  demonstration: '先沿着边走一圈，再数角。',
};

function plugin(id: string, fields: Partial<ProblemSummary> = {}) {
  return {
    summary: {
      id,
      title: id,
      version: 1,
      grade: '1年级',
      subject: '数学',
      category: '图形',
      sequence: 1,
      ...fields,
    },
    checkStep: rules,
  };
}

describe('versioned catalog', () => {
  it('lists current versions in stable order and includes configured empty categories', async () => {
    const registry = createProblemRegistry(
      [
        plugin('shape-b'),
        plugin('shape-a', { version: 2 }),
        plugin('shape-a', { title: '旧版本' }),
        plugin('reading', { grade: '2年级', subject: '语文', category: '阅读' }),
        plugin('first-shape', { sequence: 0 }),
      ],
      [{ grade: '1年级', subject: '数学', category: '数量' }],
    );
    const app = Fastify();
    registerCatalog(app, createCatalog(registry));
    try {
      const response = await app.inject('/api/v1/problems');
      expect(response.statusCode).toBe(200);
      const catalog = response.json();
      expect(catalog.problems.map(({ id, version }: ProblemSummary) => [id, version])).toEqual([
        ['first-shape', 1],
        ['shape-a', 2],
        ['shape-b', 1],
        ['reading', 1],
      ]);
      expect(catalog.categories).toContainEqual({
        grade: '1年级',
        subject: '数学',
        category: '数量',
      });
      expect(response.body).not.toContain('private-answer-rule-sentinel');
      expect(response.body).not.toContain('checkStep');
    } finally {
      await app.close();
    }
  });

  it('resolves an exact historical version and rejects unknown or unsafe versions', async () => {
    const previous = plugin('shape-a', { title: '旧版本' });
    const registry = createProblemRegistry([plugin('shape-a', { version: 2 }), previous]);
    const app = Fastify();
    registerCatalog(app, createCatalog(registry));
    try {
      const response = await app.inject('/api/v1/problems/shape-a/1');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(previous.summary);
      expect(registry.find('shape-a', 1)?.checkStep).toBe(rules);
      for (const path of ['shape-a/3', 'unknown/1', 'shape-a/01', 'shape-a/9007199254740993']) {
        const missing = await app.inject(`/api/v1/problems/${path}`);
        expect(missing.statusCode).toBe(404);
        expect(missing.json()).toEqual({ message: '这道题或这个版本暂时不可用。' });
      }
    } finally {
      await app.close();
    }
  });

  it('rejects duplicate version keys', () => {
    expect(() => createProblemRegistry([plugin('shape-a'), plugin('shape-a')])).toThrow(
      'Duplicate problem version: shape-a/1',
    );
  });

  it('publishes only the teaching definition for the requested version', async () => {
    const teaching = { steps: [{ ...step, privateRule: 'private-answer-rule-sentinel' }] };
    const previous = { ...plugin('shape-a'), teaching };
    const current = plugin('shape-a', { version: 2 });
    const app = Fastify();
    registerCatalog(app, createCatalog(createProblemRegistry([previous, current])));
    try {
      const [listing, oldDetail, newDetail] = await Promise.all([
        app.inject('/api/v1/problems'),
        app.inject('/api/v1/problems/shape-a/1'),
        app.inject('/api/v1/problems/shape-a/2'),
      ]);
      expect(oldDetail.statusCode).toBe(200);
      expect(oldDetail.json().teaching).toEqual({ steps: [step] });
      expect(oldDetail.body).not.toMatch(/private-answer-rule-sentinel|checkStep/);
      expect(newDetail.json()).toEqual(current.summary);
      expect(listing.body).not.toContain('teaching');
    } finally {
      await app.close();
    }
  });

  it.each([
    { reason: 'no steps', steps: [] },
    { reason: 'a blank step ID', steps: [{ ...step, id: ' ' }] },
    { reason: 'duplicate step IDs', steps: [step, step] },
  ])('rejects a teaching definition with $reason', ({ steps }) => {
    expect(() => createProblemRegistry([{ ...plugin('shape-a'), teaching: { steps } }])).toThrow(
      'Teaching steps require unique, nonempty IDs: shape-a/1',
    );
  });
});
