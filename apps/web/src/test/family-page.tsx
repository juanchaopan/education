import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { SignInPage } from '../features/family/pages/SignInPage';
import { SignUpPage } from '../features/family/pages/SignUpPage';
import { accountArt } from './account-art';
import { Address } from './Address';

// The address the pages are at.
export const address = () => screen.getByRole('status', { name: '地址' });

// The parents' pages as the app routes them, opened at an address, with the
// sign-in and sign-up they send a parent to and the address shown, and a
// fresh query client unless the test brings its own.
export function renderFamilyPage(path = '/family', client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/family/*" element={<FamilyPage art={accountArt} />} />
          <Route path="/login/child" element={<SignInPage art={accountArt} tab="child" />} />
          <Route path="/login/parent" element={<SignInPage art={accountArt} tab="parent" />} />
          <Route path="/signup" element={<SignUpPage art={accountArt} />} />
        </Routes>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
