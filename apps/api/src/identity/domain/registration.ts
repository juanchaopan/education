import { passwordIssue } from '@education/contracts';

export function registrationIssue(email: string, password: string): string | undefined {
  const local = email.split('@')[0]!;
  if (
    !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
      email,
    ) ||
    email.length > 254 ||
    local.length > 64 ||
    /^\.|\.$|\.\./.test(local)
  ) {
    return '请输入有效的邮箱地址。';
  }
  return passwordIssue(password);
}
