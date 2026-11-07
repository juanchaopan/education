import { Type, type Static } from '@sinclair/typebox';
import { AiConsentChange } from './ai-consent.js';
import { ChildAccess } from './child-access.js';
import { SavedDraft } from './draft.js';
import { ProblemLearningSummary } from './learning-summary.js';
import { PracticeItem } from './practice.js';

const closed = { additionalProperties: false };

// What a family export holds and leaves out. The file carries the same lists
// so it explains itself after it leaves the parent space.
export const familyExportScope = {
  includes: [
    '家长邮箱和邮箱验证状态',
    '孩子的昵称',
    '每道题的学习摘要：独立完成、提示后完成、未答对和不确定的次数，提示次数和复习建议',
    '家长安排的练习',
    '尚未过期的当前草稿，包括做到的步骤和绘图笔迹',
    '外部 AI 授权的用途、政策版本、是否授权和修改时间',
  ],
  excludes: [
    '密码和 PIN 的哈希',
    '孩子注册 KEY 和家庭码',
    '登录会话和会话密钥',
    '原始录音（应用不保存录音）',
    '逐次作答的内部记录（已汇总在学习摘要中）',
    'AI 用量和费用记录',
    '已过期的草稿',
  ],
} as const;

const { expiresAt, content } = SavedDraft.properties;

export const FamilyExportRequest = Type.Object({}, closed);
export const FamilyExport = Type.Object(
  {
    format: Type.Object(
      {
        name: Type.Literal('education-family-export'),
        version: Type.Literal(1),
        generatedAt: Type.String(),
        includes: Type.Array(Type.String()),
        excludes: Type.Array(Type.String()),
      },
      closed,
    ),
    parent: Type.Object({ email: Type.String(), emailVerified: Type.Boolean() }, closed),
    aiConsents: Type.Array(
      Type.Object(
        {
          scope: AiConsentChange.properties.scope,
          policyVersion: AiConsentChange.properties.policyVersion,
          granted: Type.Boolean(),
          changedAt: Type.String(),
        },
        closed,
      ),
    ),
    children: Type.Array(
      Type.Object(
        {
          nickname: ChildAccess.properties.nickname,
          learning: Type.Array(ProblemLearningSummary),
          practice: Type.Array(PracticeItem),
          drafts: Type.Array(
            Type.Object({ ...PracticeItem.properties, expiresAt, content }, closed),
          ),
        },
        closed,
      ),
    ),
  },
  closed,
);

export type FamilyExportRequest = Static<typeof FamilyExportRequest>;
export type FamilyExport = Static<typeof FamilyExport>;
export type ChildExport = FamilyExport['children'][number];
