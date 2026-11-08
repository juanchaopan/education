// Joins the class names that apply, so a component can add its variants and a
// caller's placement class without leaving stray spaces or "false".
export function classNames(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ');
}
