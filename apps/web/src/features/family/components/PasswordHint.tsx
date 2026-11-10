import { parentPasswordLength, passwordCharacters } from '@education/contracts';
import { Icon } from '../../../shared/ui/Icon';

// The hint under a new password: that a sentence works, and how far the
// password is from the length it needs, counted as the server counts it.
// Other rules are checked when the form is sent.
export function PasswordHint({ password }: { password: string }) {
  const length = passwordCharacters(password);
  const { shortest, longest } = parentPasswordLength;
  if (length < shortest) return <>可以是一句话 · 还差 {shortest - length} 个字符</>;
  if (length > longest) return <>可以是一句话 · 多了 {length - longest} 个字符</>;
  return (
    <>
      可以是一句话 · {length} 个字符 <Icon name="check" />
    </>
  );
}
