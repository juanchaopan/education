export function verificationEmail(origin: string, token: string) {
  const url = new URL('/family/verify', origin);
  url.hash = new URLSearchParams({ token }).toString();
  const link = url.href;
  return {
    subject: '小小探索家：请验证您的家长邮箱',
    text: `请打开以下链接，再点击页面中的“确认验证邮箱”。链接 24 小时有效，只能使用一次。\n\n${link}\n\n如果您没有申请，请忽略这封邮件。邮件中不包含儿童信息。`,
    html: `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f6f8f5;color:#24372d;font-family:Arial,sans-serif;line-height:1.7">
<main style="max-width:520px;margin:auto;padding:24px;background:#fff;border-radius:16px">
<h1 style="font-size:24px">验证您的家长邮箱</h1>
<p>欢迎来到小小探索家。请点击下面的按钮，打开页面后再点击“确认验证邮箱”。</p>
<p style="margin:28px 0"><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2f6b4f;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">验证家长邮箱</a></p>
<p>链接 24 小时有效，只能使用一次。如果按钮无法点击，请使用下方链接：</p>
<p style="overflow-wrap:anywhere"><a href="${link}">${link}</a></p>
<p style="font-size:14px">如果您没有申请，请忽略这封邮件。邮件中不包含儿童信息。</p>
</main>
</body>
</html>`,
  };
}
