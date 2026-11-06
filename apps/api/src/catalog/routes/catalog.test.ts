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
});
