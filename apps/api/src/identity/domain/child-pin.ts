export function validateChildPin(pin: string) {
  if (!/^[0-9]{6}$/.test(pin)) throw new Error('请设置六位数字 PIN，可以以 0 开头。');
  if (/^(.)\1{5}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin))
    throw new Error('试试不全相同、也不连续的六位数字，会更安全。');
}
