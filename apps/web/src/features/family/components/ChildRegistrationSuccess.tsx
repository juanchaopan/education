import type { ChildRegistrationReceipt } from '@education/contracts';
import { Card } from '../../../shared/ui/Card';
import { Notice } from '../../../shared/ui/Notice';

export function ChildRegistrationSuccess({ receipt }: { receipt: ChildRegistrationReceipt }) {
  return (
    <Card aria-labelledby="child-success-title">
      <h2 id="child-success-title">你已加入家庭！</h2>
      <p>{receipt.nickname}，这一步完成啦。</p>
      <p>这是你的家庭码，家长空间里也随时能找到：</p>
      <p>
        <strong aria-label="我的家庭码">{receipt.familyCode}</strong>
      </p>
      <p>你的昵称：{receipt.nickname}</p>
      <p>记住自己刚才设置的六位 PIN，不要发给别人。</p>
      <Notice live={false}>
        接下来用家庭码、昵称和 PIN 登录。登录后通常不用再次输入，也不需要再用 KEY 注册。
      </Notice>
    </Card>
  );
}
