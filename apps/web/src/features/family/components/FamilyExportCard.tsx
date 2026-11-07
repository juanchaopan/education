import { familyExportScope } from '@education/contracts';
import { ParentPasswordForm } from './ParentPasswordForm';
import card from './RegistrationForm.module.css';
import panel from './RegistrationKeyCard.module.css';

type Props = {
  pending: boolean;
  preparing: boolean;
  saved?: string;
  error?: string;
  password: string;
  onPassword: (password: string) => void;
  onExport: () => void;
};

// The password field and its button are named for the export, so they stay
// distinct from the other password confirmations on the parent page.
export function FamilyExportCard(props: Props) {
  return (
    <section className={`${card.card} ${panel.panel}`} aria-labelledby="family-export-title">
      <h2 id="family-export-title">导出家庭数据</h2>
      <p>
        把本家庭的数据保存成一个 JSON
        文件，可以用文本编辑器打开。文件在下载时生成，服务器不保留副本。
      </p>
      <h3>文件包含</h3>
      <ul>
        {familyExportScope.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3>文件不包含</h3>
      <ul>
        {familyExportScope.excludes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {props.preparing && <p role="status">正在准备导出文件…</p>}
      {props.saved && (
        <p role="status">
          已下载 {props.saved}。文件里有孩子的学习记录，请妥善保管，不要随意转发。
        </p>
      )}
      {props.error && (
        <p role="alert" className={card.notice}>
          {props.error}
        </p>
      )}
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
    </section>
  );
}
