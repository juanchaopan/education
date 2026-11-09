import { useEffect } from 'react';
import { Value } from '@sinclair/typebox/value';
import { VerificationToken } from '@education/contracts';

// The one-time token a mail link carries in the address fragment, which never
// reaches the server's logs. Verification and recovery links carry tokens of
// the same form; anything else counts as no token.
export function readLinkToken() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  return Value.Check(VerificationToken, { token }) ? token : '';
}

// Removes the token from the address bar once the page has read it, so it is
// not kept in the history, bookmarked or shared by accident.
export function useForgetLinkToken() {
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
}
