export function childIdentity(input: { key: string; nickname: string; pin: string }) {
  const key = input.key.trim().replaceAll('-', '').toUpperCase();
  const nickname = input.nickname.normalize('NFKC').trim();
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(key))
    throw new Error('请检查家长给你的注册 KEY，再试一次。');
  if (!/^[\p{L}\p{N}]{1,12}$/u.test(nickname))
    throw new Error('昵称请用 1–12 个汉字、字母或数字，不需要填写真实姓名。');
  if (!/^[0-9]{6}$/.test(input.pin)) throw new Error('请设置六位数字 PIN，可以以 0 开头。');
  if (
    /^(.)\1{5}$/.test(input.pin) ||
    '0123456789'.includes(input.pin) ||
    '9876543210'.includes(input.pin)
  )
    throw new Error('试试不全相同、也不连续的六位数字，会更安全。');
  return { key, nickname, canonical: nickname.toLowerCase(), pin: input.pin };
}
