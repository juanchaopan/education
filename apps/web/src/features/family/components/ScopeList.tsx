// A titled list of what an action covers, such as what an export holds or a
// deletion removes. The items come from the shared contracts.
export function ScopeList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}
