export function groupRegistrationCode(value: string) {
  return value.match(/.{4}/g)!.join('-');
}
