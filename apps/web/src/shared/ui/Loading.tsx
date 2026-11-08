// Says what is being opened while it loads, as a status a screen reader
// announces without moving focus.
export function Loading({ label }: { label: string }) {
  return <p role="status">{label}</p>;
}
