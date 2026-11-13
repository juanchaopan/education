// The time zone this device's clock is set to, such as Asia/Shanghai, as the
// browser names it; undefined when the browser does not say.
export function deviceTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}
