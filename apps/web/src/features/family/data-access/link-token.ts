import { useEffect } from 'react';

// The one-time token a mail link carries in the address fragment, which never
// reaches the server's logs. Anything that is not a well-formed token counts
// as no token.
export function readLinkToken() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
}

// Removes the token from the address bar once the page has read it, so it is
// not kept in the history, bookmarked or shared by accident.
export function useForgetLinkToken() {
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
}
