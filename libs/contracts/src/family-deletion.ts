import { Type, type Static } from '@sinclair/typebox';

const closed = { additionalProperties: false };

// The parent types this phrase, after confirming the password, to delete the family.
export const familyDeletionPhrase = '删除家庭';

// What a family deletion removes, and what stays outside the family's reach.
// The parent space shows both lists before anything is confirmed.
export const familyDeletionScope = {
  deletes: [
    '家长账号：邮箱、密码和邮箱验证记录',
    '孩子的昵称和 PIN',
    '所有设备上的家长和孩子登录',
    '学习摘要、逐次作答和提示记录、家长安排的练习',
    '草稿和绘图笔迹',
    '孩子注册 KEY、家庭码和外部 AI 授权',
  ],
  remains: [
    'AI 用量和费用记录会保留，用于核算月度预算，但不再关联任何家庭或孩子',
    '删除清单只保存内部家庭编号和删除时间，用来保证从数据库备份恢复时这个家庭不会重新出现',
    '已经发出的邮件、已经下载的导出文件，以及孩子设备上记住的家庭码和昵称，不在网站的删除范围内',
    '已经发给外部 AI 服务的请求，由该服务按自己的政策处理',
  ],
} as const;

export const FamilyDeletionRequest = Type.Object(
  { confirmation: Type.String({ maxLength: 32 }) },
  closed,
);
// deleted: the family is gone and every session is revoked. pending: the
// deletion is recorded in the ledger but the online data is not cleared yet;
// maintenance finishes it.
export const FamilyDeletionResult = Type.Object(
  { status: Type.Union([Type.Literal('deleted'), Type.Literal('pending')]) },
  closed,
);

export type FamilyDeletionRequest = Static<typeof FamilyDeletionRequest>;
export type FamilyDeletionResult = Static<typeof FamilyDeletionResult>;
