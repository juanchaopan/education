import { afterEach, describe, expect, it } from 'vitest';
import { createReloadGuard } from './reload-guard';

const first = 'a'.repeat(40);
const second = 'b'.repeat(40);

afterEach(() => sessionStorage.clear());

describe('createReloadGuard', () => {
  it('remembers the release the tab reloaded for across the reload', () => {
    expect(createReloadGuard().read()).toEqual({ reloadedFor: null, recordable: true });
    createReloadGuard().mark(first);
    expect(createReloadGuard().read()).toEqual({ reloadedFor: first, recordable: true });
    createReloadGuard().mark(second);
    expect(createReloadGuard().read().reloadedFor).toBe(second);
  });

  it('tells a tab that cannot keep the record that it cannot reload on its own', () => {
    const broken = () => {
      throw new DOMException('', 'SecurityError');
    };
    const blocked = createReloadGuard(() => ({ getItem: broken, setItem: broken }));
    expect(blocked.read()).toEqual({ reloadedFor: null, recordable: false });
    expect(() => blocked.mark(first)).not.toThrow();
    const full = createReloadGuard(() => ({ getItem: () => first, setItem: broken }));
    expect(full.read().recordable).toBe(false);
  });
});
