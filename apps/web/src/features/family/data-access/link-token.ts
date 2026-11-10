import { useEffect } from 'react';
import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// The one-time token a mail link carries in the address fragment, which never
// reaches the server's logs. The token is checked against the form its own
// contract gives it; anything else counts as no token.
export function readLinkToken(form: TSchema) {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  return Value.Check(form, token) ? token : '';
}

// Removes the token from the address bar once the page has read it, so it is
// not kept in the history, bookmarked or shared by accident.
export function useForgetLinkToken() {
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
}
