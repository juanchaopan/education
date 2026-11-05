export function ParentPasswordForm({
  password,
  pending,
  onChange,
  onSubmit,
}: {
  password: string;
  pending?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p>为保护家庭，请先确认家长密码；确认后 5 分钟内可管理 KEY。</p>
      <label htmlFor="key-parent-password">确认家长密码</label>
      <input
        id="key-parent-password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        required
        value={password}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
      />
      <button disabled={pending || !password} type="submit">
        {pending ? '正在确认…' : '确认密码'}
      </button>
    </form>
  );
}
