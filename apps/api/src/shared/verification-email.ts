import { accountEmail, accountLink } from './account-email.js';
export function verificationEmail(origin: string, token: string) {
  const link = accountLink(origin, '/family/verify', token);
  return {
    subject: '小小探索家：请验证您的家长邮箱',
    text: `请打开以下链接，再点击页面中的“确认验证邮箱”。链接 24 小时有效，只能使用一次。\n\n${link}\n\n如果您没有申请，请忽略这封邮件。邮件中不包含儿童信息。`,
    html: accountEmail({
      title: '验证您的家长邮箱',
      introduction: '欢迎来到小小探索家。请点击下面的按钮，打开页面后再点击“确认验证邮箱”。',
      action: '验证家长邮箱',
      instructions: '链接 24 小时有效，只能使用一次。',
      link,
    }),
  };
}
