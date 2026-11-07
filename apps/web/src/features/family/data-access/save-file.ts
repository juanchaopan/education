// Some browsers read a blob URL only after the click has returned, so the URL
// stays valid briefly and is then released.
export const releaseDelayMs = 10_000;

export function saveFile(text: string, name: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), releaseDelayMs);
  }
}
