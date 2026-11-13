import type { CatalogCategory } from '@education/contracts';

export function catalogPath({ grade, subject, category }: CatalogCategory) {
  return `/?${new URLSearchParams({ grade, subject, category })}`;
}
