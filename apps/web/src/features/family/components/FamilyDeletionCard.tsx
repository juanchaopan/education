import { familyDeletionPhrase, familyDeletionScope } from '@education/contracts';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { Panel } from './Panel';
import { ParentPasswordForm } from './ParentPasswordForm';
import { ScopeList } from './ScopeList';

type Props = {
  pending: boolean;
  recorded: boolean;
  error?: string;
  phrase: string;
  password: string;
  onPhrase: (phrase: string) => void;
  onPassword: (password: string) => void;
  onDelete: () => void;
};

// Deleting cannot be undone, so the card says what goes and what stays before
// asking for anything, and the button stays disabled until the parent has typed
// the phrase exactly.
export function FamilyDeletionCard(props: Props) {
  return (
    <Panel titleId="family-deletion-title" title="删除家庭">
      <p>
        删除后无法恢复，所有设备上的家长和孩子都会立即退出登录。需要保留学习记录的，请先导出家庭数据。
      </p>
      <ScopeList title="会被删除" items={familyDeletionScope.deletes} />
      <ScopeList title="不在删除范围内" items={familyDeletionScope.remains} />
      {props.recorded && (
        <Notice>
          删除已经受理，但还没有全部完成。系统会自动完成删除，完成后所有登录都会退出。
        </Notice>
      )}
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <ParentPasswordForm
        id="deletion-parent-password"
        label="删除前输入家长密码"
        hint="输入确认短语和家长密码后，家庭会立即被永久删除。"
        submitLabel="永久删除家庭"
        pendingLabel="正在删除…"
        password={props.password}
        pending={props.pending}
        ready={props.phrase === familyDeletionPhrase}
        onChange={props.onPassword}
        onSubmit={props.onDelete}
      >
        <TextField
          id="deletion-phrase"
          label={`输入“${familyDeletionPhrase}”确认`}
          autoComplete="off"
          maxLength={32}
          required
          value={props.phrase}
          onChange={(event) => props.onPhrase(event.target.value)}
          disabled={props.pending}
        />
      </ParentPasswordForm>
    </Panel>
  );
}
