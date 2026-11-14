import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { BookshelfService } from '../services/bookshelf.js';

const origin = 'https://education.example';
const credentials = { token: 'synthetic-session', csrf: 'synthetic-csrf' };
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': credentials.csrf,
  cookie: `__Host-education_session=${credentials.token}`,
};
const childId = '11111111-1111-4111-8111-111111111111';
const emptyPage = { total: 0, grades: [], subjects: [], books: [], hasMore: false };
const noBooks = {
  counts: { all: 0, learning: 0, finished: 0, unavailable: 0, fresh: 0 },
  books: [],
  hasMore: false,
};
const assignmentUrl = (bookId = 'g1-math-xueersi') =>
  `/api/v1/parents/children/${childId}/assignments/${bookId}`;

function setup() {
  const service = {
    familyShelf: vi.fn(async () => emptyPage),
    childShelf: vi.fn(async () => emptyPage),
    childBooks: vi.fn(async () => noBooks),
    assign: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
  } satisfies BookshelfService;
  return { service, app: buildApp({ origin, bookshelf: service }) };
}

describe('shelves', () => {
  it('passes the session and the filter to the service, uncached', async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      url: '/api/v1/parents/books?shelf=library&grade=%E4%B8%80%E5%B9%B4%E7%BA%A7&offset=24',
      headers,
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers.vary).toBe('Cookie');
    expect(service.familyShelf).toHaveBeenCalledExactlyOnceWith(credentials, {
      shelf: 'library',
      grade: '一年级',
      offset: '24',
    });
    await app.close();
  });

  it("reads one child's shelf with its state filter", async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      url: `/api/v1/parents/children/${childId}/books?state=assigned`,
      headers,
    });
    expect(reply.statusCode).toBe(200);
    expect(service.childShelf).toHaveBeenCalledExactlyOnceWith(credentials, childId, {
      state: 'assigned',
    });
    await app.close();
  });

  it.each([
    ['no shelf', '/api/v1/parents/books'],
    ['an unknown shelf', '/api/v1/parents/books?shelf=everything'],
    ['a negative offset', '/api/v1/parents/books?shelf=family&offset=-1'],
    ['an unknown filter', '/api/v1/parents/books?shelf=family&title=abc'],
    ['an unknown state', `/api/v1/parents/children/${childId}/books?state=finished`],
    ['a malformed child', '/api/v1/parents/children/not-a-child/books'],
  ])('rejects %s without calling the service', async (_name, url) => {
    const { app, service } = setup();
    expect((await app.inject({ url, headers })).statusCode).toBe(400);
    expect(service.familyShelf).not.toHaveBeenCalled();
    expect(service.childShelf).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("the child's books", () => {
  it('reads one filter from an offset, uncached', async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      url: '/api/v1/children/assignments?books=finished&offset=6',
      headers,
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.json()).toEqual(noBooks);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(service.childBooks).toHaveBeenCalledExactlyOnceWith(credentials, {
      books: 'finished',
      offset: '6',
    });
    await app.close();
  });

  it('reads every book without a filter', async () => {
    const { app, service } = setup();
    expect((await app.inject({ url: '/api/v1/children/assignments', headers })).statusCode).toBe(
      200,
    );
    expect(service.childBooks).toHaveBeenCalledExactlyOnceWith(credentials, {});
    await app.close();
  });

  it.each([
    ['an unknown filter', '/api/v1/children/assignments?books=new'],
    ['a negative offset', '/api/v1/children/assignments?offset=-6'],
    ['an unknown parameter', '/api/v1/children/assignments?grade=%E4%B8%80'],
  ])('rejects %s without calling the service', async (_name, url) => {
    const { app, service } = setup();
    expect((await app.inject({ url, headers })).statusCode).toBe(400);
    expect(service.childBooks).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('giving and taking back a book', () => {
  it('gives and takes back with an empty body and answers no content', async () => {
    const { app, service } = setup();
    for (const method of ['PUT', 'DELETE'] as const) {
      const reply = await app.inject({ method, url: assignmentUrl(), headers, payload: {} });
      expect(reply.statusCode).toBe(204);
      expect(reply.headers['cache-control']).toBe('no-store');
    }
    expect(service.assign).toHaveBeenCalledExactlyOnceWith(credentials, childId, 'g1-math-xueersi');
    expect(service.cancel).toHaveBeenCalledExactlyOnceWith(credentials, childId, 'g1-math-xueersi');
    await app.close();
  });

  it.each([
    ['another origin', { origin: 'https://other.example' }, {}],
    ['a request not made by the site', { 'x-education-request': 'form' }, {}],
  ])('refuses %s', async (_name, extra, payload) => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'PUT',
      url: assignmentUrl(),
      headers: { ...headers, ...extra },
      payload,
    });
    expect(reply.statusCode).toBe(403);
    expect(service.assign).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([
    ['a malformed book', assignmentUrl('Not A Book'), {}],
    ['a body with fields', assignmentUrl(), { dueOn: '2026-11-20' }],
  ])('rejects %s', async (_name, url, payload) => {
    const { app, service } = setup();
    expect((await app.inject({ method: 'PUT', url, headers, payload })).statusCode).toBe(400);
    expect(service.assign).not.toHaveBeenCalled();
    await app.close();
  });

  it('answers that shelves are unavailable when no service is configured', async () => {
    const app = buildApp({ origin });
    expect(
      (await app.inject({ url: '/api/v1/parents/books?shelf=family', headers })).statusCode,
    ).toBe(503);
    await app.close();
  });
});
