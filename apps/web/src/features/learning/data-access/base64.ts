const chunkSize = 0x8000;

// Encodes in chunks so a large recording or drawing never overflows the call stack.
export async function toBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let start = 0; start < bytes.length; start += chunkSize)
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  return btoa(binary);
}
