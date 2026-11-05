type Content = {
  title: string;
  introduction: string;
  action: string;
  instructions: string;
  link: string;
};
export function accountEmail(content: Content) {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f6f8f5;color:#24372d;font-family:Arial,sans-serif;line-height:1.7">
<main style="max-width:520px;margin:auto;padding:24px;background:#fff;border-radius:16px">
<h1 style="font-size:24px">${content.title}</h1>
<p>${content.introduction}</p>
<p style="margin:28px 0"><a href="${content.link}" style="display:inline-block;padding:12px 24px;background:#2f6b4f;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">${content.action}</a></p>
<p>${content.instructions}如果按钮无法点击，请使用下方链接：</p>
<p style="overflow-wrap:anywhere"><a href="${content.link}">${content.link}</a></p>
<p style="font-size:14px">如果您没有申请，请忽略这封邮件。邮件中不包含儿童信息。</p>
</main>
</body>
</html>`;
}
export function accountLink(origin: string, path: string, token: string) {
  const url = new URL(path, origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.href;
}
