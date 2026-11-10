import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { accountArt } from './account-art';

// The parents' entrance at an address under /family, as the app routes it,
// with a fresh query client unless the test brings its own.
export function renderFamilyPage(path = '/family', client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/family/*" element={<FamilyPage art={accountArt} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
