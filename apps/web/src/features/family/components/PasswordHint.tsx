import { Icon } from '../../../shared/ui/Icon';

const shortest = 15;
const longest = 128;

// The hint under a new password: that a sentence works, and how far the
// password is from the 15 to 128 characters it needs, counted as the server
// counts them. Other rules are checked when the form is sent.
export function PasswordHint({ password }: { password: string }) {
  const length = Array.from(password).length;
  if (length < shortest) return <>可以是一句话 · 还差 {shortest - length} 个字符</>;
  if (length > longest) return <>可以是一句话 · 多了 {length - longest} 个字符</>;
  return (
    <>
      可以是一句话 · {length} 个字符 <Icon name="check" />
    </>
  );
}
