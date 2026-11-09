// jsdom has no fullscreen. A test puts the page in or out of it, and gives
// the page the browser's requests it needs; `forgetFullscreen` takes them all
// away again.
export function inFullscreen(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: element });
}

export function forgetFullscreen() {
  inFullscreen(null);
  delete (document.documentElement as Partial<Element>).requestFullscreen;
  delete (document as Partial<Document>).exitFullscreen;
}
