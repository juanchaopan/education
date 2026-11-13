import { Type, type Static } from '@sinclair/typebox';
import { AiConsentChange } from './ai-consent.js';
import { BookStatus } from './bookshelf.js';
import { ProblemId, ProblemSummary, ProblemVersion } from './catalog.js';
import { ChildAccess } from './child-access.js';
import { SavedDraft } from './draft.js';
import { ProblemLearningSummary } from './learning-summary.js';
import { ProblemVariations } from './variation.js';

const closed = { additionalProperties: false };
const Count = Type.Integer({ minimum: 0 });
// The problem a draft belongs to, with its title, or null for a version the
// catalogue no longer lists.
const draftProblem = {
  id: ProblemId,
  version: ProblemVersion,
  title: Type.Union([ProblemSummary.properties.title, Type.Null()]),
};

export const familyExportVersion = 3;

// What a family export holds and leaves out. The file carries the same lists
// so it explains itself after it leaves the parent space.
export const familyExportScope = {
  includes: [
    '家长邮箱和邮箱验证状态',
    '孩子的昵称',
    '每道题的学习摘要：独立完成、提示后完成、未答对和不确定的次数，提示次数和复习建议',
    '每道题的变化题：猜数和说理由各自做到了哪一步（独立做到、提示后做到、还没做到）、还缺哪些没有独立做到，以及每一次变化题的猜数结果、理由第一次和最后的结果、用过的帮助次数和时间',
    '家长安排的书，以及导出时每本书的状态、已做的题数、题数和是否学完',
    '尚未过期的当前草稿，包括做到的步骤和绘图笔迹',
    '外部 AI 授权的用途、政策版本、是否授权和修改时间',
  ],
  excludes: [
    '密码和 PIN 的哈希',
    '孩子注册 KEY 和家庭码',
    '登录会话和会话密钥',
    '原始录音（应用不保存录音）',
    '孩子说的理由和它的转写文字（应用只保存判定结果）',
    '逐次作答的内部记录（已汇总在学习摘要中）',
    'AI 用量和费用记录',
    '已过期的草稿',
  ],
} as const;

const { expiresAt, content } = SavedDraft.properties;

// A book given to a child: what it is, when it was given, and the child's
// progress in it when the file was made.
export const ExportedBook = Type.Object(
  {
    id: ProblemId,
    grade: Type.String(),
    subject: Type.String(),
    name: Type.String(),
    status: BookStatus,
    assignedAt: Type.String(),
    done: Count,
    total: Count,
    finished: Type.Boolean(),
  },
  closed,
);

export const FamilyExportRequest = Type.Object({}, closed);
export const FamilyExport = Type.Object(
  {
    format: Type.Object(
      {
        name: Type.Literal('education-family-export'),
        version: Type.Literal(familyExportVersion),
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
          variations: Type.Array(ProblemVariations),
          books: Type.Array(ExportedBook),
          drafts: Type.Array(Type.Object({ ...draftProblem, expiresAt, content }, closed)),
        },
        closed,
      ),
    ),
  },
  closed,
);

export type ExportedBook = Static<typeof ExportedBook>;
export type FamilyExportRequest = Static<typeof FamilyExportRequest>;
export type FamilyExport = Static<typeof FamilyExport>;
export type ChildExport = FamilyExport['children'][number];
