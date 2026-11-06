import {
  parseProblemVersion,
  type CatalogCategory,
  type CatalogResponse,
} from '@education/contracts';
import { problemRegistry } from '@education/problems/server';

const labels = new Intl.Collator('zh-CN', { numeric: true });

function compareLabel(a: string, b: string) {
  return labels.compare(a, b) || (a < b ? -1 : Number(a > b));
}

function compareCategory(a: CatalogCategory, b: CatalogCategory) {
  return (
    compareLabel(a.grade, b.grade) ||
    compareLabel(a.subject, b.subject) ||
    compareLabel(a.category, b.category)
  );
}

export function createCatalog(registry = problemRegistry) {
  const problems = registry.current.toSorted(
    (a, b) => compareCategory(a, b) || a.sequence - b.sequence || compareLabel(a.id, b.id),
  );
  const paths = new Map<string, CatalogCategory>();
  for (const { grade, subject, category } of [...registry.categories, ...problems]) {
    paths.set(JSON.stringify([grade, subject, category]), { grade, subject, category });
  }
  const categories = [...paths.values()].sort(compareCategory);
  const listing: CatalogResponse = categories.length ? { problems, categories } : { problems };

  return {
    list: () => listing,
    detail: (id: string, rawVersion: string) => {
      const version = parseProblemVersion(rawVersion);
      return version === undefined ? undefined : registry.find(id, version)?.summary;
    },
  };
}
