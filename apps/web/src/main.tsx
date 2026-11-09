import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { ReloadReadinessProvider } from './shared/lib/ReloadReadinessProvider';
import './styles/tokens.css';
import './styles/global.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <ReloadReadinessProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ReloadReadinessProvider>
    </QueryClientProvider>
  </StrictMode>,
);
