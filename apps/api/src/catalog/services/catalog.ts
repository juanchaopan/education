import { problemCatalog } from '@education/problems';

export function getCatalog() {
  return { problems: [...problemCatalog] };
}
