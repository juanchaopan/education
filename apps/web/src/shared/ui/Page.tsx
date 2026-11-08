import type { ReactNode } from 'react';

type Props = {
  // The id of the page title, which also names the page region.
  titleId: string;
  title: ReactNode;
  // Places the page in the app shell, such as its padding.
  className?: string;
  children?: ReactNode;
};

// A page under the site header: one main title, then its content.
export function Page({ titleId, title, className, children }: Props) {
  return (
    <section aria-labelledby={titleId} className={className}>
      <h1 id={titleId}>{title}</h1>
      {children}
    </section>
  );
}
