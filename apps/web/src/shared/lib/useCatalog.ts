import { useQuery } from '@tanstack/react-query';
import type { CatalogResponse } from '@education/contracts';

async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch('/api/v1/problems', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('暂时没能打开题目列表');
  return response.json() as Promise<CatalogResponse>;
}

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog });
}
