import type { CatalogCategory, CatalogResponse } from '@education/contracts';

export type CategoryLevel = keyof CatalogCategory;

export function problemPath(id: string, version: number) {
  return `/problems/${encodeURIComponent(id)}/${version}`;
}

export function catalogPath({ grade, subject, category }: CatalogCategory) {
  return `/?${new URLSearchParams({ grade, subject, category })}`;
}

function selectLevel(paths: CatalogCategory[], level: CategoryLevel, query: URLSearchParams) {
  const options = [...new Set(paths.map((path) => path[level]))];
  const requested = query.get(level);
  const value = requested !== null && options.includes(requested) ? requested : (options[0] ?? '');
  return { options, value, paths: paths.filter((path) => path[level] === value) };
}

export function selectCategory(catalog: CatalogResponse, query: URLSearchParams) {
  const grade = selectLevel(catalog.categories ?? catalog.problems, 'grade', query);
  const subject = selectLevel(grade.paths, 'subject', query);
  const category = selectLevel(subject.paths, 'category', query);
  return {
    grade,
    subject,
    category,
    problems: catalog.problems.filter(
      (problem) =>
        problem.grade === grade.value &&
        problem.subject === subject.value &&
        problem.category === category.value,
    ),
  };
}

export function changeCategory(
  selection: ReturnType<typeof selectCategory>,
  level: CategoryLevel,
  value: string,
) {
  const query = new URLSearchParams();
  for (const key of ['grade', 'subject', 'category'] as const) {
    query.set(key, key === level ? value : selection[key].value);
    if (key === level) break;
  }
  return query;
}
