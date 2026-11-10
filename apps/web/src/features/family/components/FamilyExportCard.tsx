import { familyExportScope } from '@education/contracts';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ParentCard } from './ParentCard';
import { ParentPasswordForm } from './ParentPasswordForm';
import { ScopeList } from './ScopeList';

type Props = {
  pending: boolean;
  preparing: boolean;
  saved?: string;
  error?: string;
  password: string;
  onPassword: (password: string) => void;
  onExport: () => void;
};

// What the file holds and leaves out is said before the password is asked
// for. The password field and its button are named for the export, so they
// stay distinct from the other password confirmations on the same page.
export function FamilyExportCard(props: Props) {
  return (
    <ParentCard titleId="family-export-title" icon="download" title="导出家庭数据">
      <p>
        把本家庭的数据保存成一个 JSON
        文件，可以用文本编辑器打开。文件在下载时生成，服务器不保留副本。
      </p>
      <ScopeList title="文件包含" items={familyExportScope.includes} />
      <ScopeList title="文件不包含" items={familyExportScope.excludes} />
      {props.preparing && <Loading label="正在准备导出文件…" />}
      {props.saved && (
        <Notice tone="success">
          已下载 {props.saved}。文件里有孩子的学习记录，请妥善保管，不要随意转发。
        </Notice>
      )}
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <ParentPasswordForm
        id="export-parent-password"
        label="导出前输入家长密码"
        purpose="导出家庭数据"
        submitLabel="确认并下载"
        password={props.password}
        pending={props.pending}
        onChange={props.onPassword}
        onSubmit={props.onExport}
      />
    </ParentCard>
  );
}
