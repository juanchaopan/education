export function problemPath(id: string, version: number) {
  return `/problems/${encodeURIComponent(id)}/${version}`;
}
