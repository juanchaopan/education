type Locator = { familyCode: string; nickname: string };
const key = 'education-child-locator';
const empty = (): Locator => ({ familyCode: '', nickname: '' });
export function rememberedChild(): Locator {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return empty();
    const { familyCode, nickname } = value as Partial<Locator>;
    return typeof familyCode === 'string' &&
      familyCode.length <= 32 &&
      typeof nickname === 'string' &&
      nickname.length <= 64
      ? { familyCode, nickname }
      : empty();
  } catch {
    return empty();
  }
}
export function rememberChild(locator: Locator, remember: boolean) {
  try {
    if (remember)
      localStorage.setItem(
        key,
        JSON.stringify({ familyCode: locator.familyCode, nickname: locator.nickname }),
      );
    else localStorage.removeItem(key);
  } catch {
    /* Remembering the locator is optional; the session remains in its secure cookie. */
  }
}
