import { accountEmail, accountLink } from './account-email.js';
export function recoveryEmail(origin: string, token: string) {
  const link = accountLink(origin, '/family/reset', token);
  const instructions =
    '链接 30 分钟有效，只能使用一次。提交新密码后，家庭的旧登录状态和未使用注册 KEY 将失效。';
  return {
    subject: '小小探索家：重设家长密码',
    text: `请打开以下链接，在网页中设置新密码。${instructions}\n\n${link}\n\n如果您没有申请，请忽略这封邮件；打开链接不会修改密码。邮件中不包含儿童信息。`,
    html: accountEmail({
      title: '重设您的家长密码',
      introduction: '请点击下面的按钮，在网页中设置新密码。打开链接本身不会修改账号。',
      action: '重设家长密码',
      instructions,
      link,
    }),
  };
}
