import { useLocation } from 'react-router-dom';

// The address the pages are at, read as a status named 「地址」.
export function Address() {
  const { pathname, search, hash } = useLocation();
  return <output aria-label="地址">{pathname + search + hash}</output>;
}
