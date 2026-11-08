import { Button } from '../../../shared/ui/Button';
import { Hint } from '../../../shared/ui/Hint';
import { Loading } from '../../../shared/ui/Loading';
import { Panel } from './Panel';

export type FamilyCodeCardProps = {
  code?: string;
  loading?: boolean;
  failed?: boolean;
  notice?: string;
  onCopy: () => void;
};

export function FamilyCodeCard({ code, loading, failed, notice, onCopy }: FamilyCodeCardProps) {
  return (
    <Panel titleId="family-code-title" title="我的家庭码">
      <p>家庭码固定不变，可以随时回来查看或复制，不需要背下来。</p>
      {loading ? (
        <Loading label="正在读取家庭码…" />
      ) : failed ? (
        <p role="status">暂时无法读取，请刷新页面再试。</p>
      ) : code ? (
        <>
          <p>
            <output aria-label="家庭码">{code}</output>
          </p>
          <Button onClick={onCopy}>复制家庭码</Button>
          {notice && <p role="status">{notice}</p>}
        </>
      ) : (
        <p>孩子首次成功注册后，家庭码会显示在这里。</p>
      )}
      <Hint>
        家庭码用于孩子登录；一次性注册 KEY 只用来加入家庭。重置 PIN 后仍使用同一个家庭码。
      </Hint>
    </Panel>
  );
}
