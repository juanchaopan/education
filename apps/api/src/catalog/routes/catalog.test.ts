import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createProblemRegistry, type Book, type ProblemEntry } from '@education/problems/server';
import type { ProblemSummary } from '@education/contracts';
import { registerCatalog } from './catalog.js';
import { createCatalog } from '../services/catalog.js';

const rules = () => ({
  status: 'correct' as const,
  instruction: 'private-answer-rule-sentinel',
  stepId: 'start',
});

const shapes: Book = { id: 'shapes', grade: '二年级', subject: '数学', category: '图形' };
const reading: Book = { id: 'reading', grade: '一年级', subject: '语文', category: '阅读' };
const quantities: Book = { id: 'quantities', grade: '二年级', subject: '数学', category: '数量' };
const shelf = [shapes, reading, quantities];

function plugin(id: string, fields: Partial<ProblemEntry> = {}) {
  return {
    summary: { id, title: id, version: 1, book: shapes.id, sequence: 1, ...fields },
    checkStep: rules,
  };
}

describe('versioned catalog', () => {
  it('lists current versions in stable order and includes the categories of empty books', async () => {
    const registry = createProblemRegistry(
      [
        plugin('shape-b'),
        plugin('shape-a', { version: 2 }),
        plugin('shape-a', { title: '旧版本' }),
        plugin('reading', { book: reading.id }),
        plugin('first-shape', { sequence: 0 }),
      ],
      shelf,
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
        grade: '二年级',
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
    const registry = createProblemRegistry([plugin('shape-a', { version: 2 }), previous], shelf);
    const app = Fastify();
    registerCatalog(app, createCatalog(registry));
    try {
      const response = await app.inject('/api/v1/problems/shape-a/1');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: 'shape-a',
        version: 1,
        title: '旧版本',
        sequence: 1,
        grade: shapes.grade,
        subject: shapes.subject,
        category: shapes.category,
      });
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

  it('tells the opening of a problem that exists, with the session, and of no other, uncached', async () => {
    const registry = createProblemRegistry([plugin('shape-a')], shelf);
    const open = vi.fn(async () => {});
    const app = Fastify();
    registerCatalog(app, createCatalog(registry), open);
    try {
      const headers = { cookie: '__Host-education_session=synthetic', 'x-csrf-token': 'csrf' };
      const opened = await app.inject({ url: '/api/v1/problems/shape-a/1', headers });
      expect(opened.statusCode).toBe(200);
      expect(opened.headers['cache-control']).toBe('no-store');
      expect(opened.headers.vary).toBe('Cookie');
      expect(open).toHaveBeenCalledExactlyOnceWith(
        { token: 'synthetic', csrf: 'csrf' },
        { id: 'shape-a', version: 1 },
      );
      expect((await app.inject('/api/v1/problems/shape-a/2')).statusCode).toBe(404);
      expect(open).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it('rejects duplicate version keys', () => {
    expect(() => createProblemRegistry([plugin('shape-a'), plugin('shape-a')], shelf)).toThrow(
      'Duplicate problem version: shape-a/1',
    );
  });
});
