// A build names an asset after its source file with a content hash added,
// for example garden-morning-BxYz12_4.webp for garden-morning.webp.
const hash = String.raw`(-[\w-]{8})?`;

// The address of the built asset made from the source file with this name.
export function builtAddress(name: string, extension: string) {
  return new RegExp(`/${name}${hash}\\.${extension}$`);
}

// The name of a built asset's source file, without its extension.
export function sourceName(address: string) {
  const file = new URL(address).pathname.split('/').pop() ?? address;
  return file.replace(new RegExp(`${hash}\\.\\w+$`), '');
}
