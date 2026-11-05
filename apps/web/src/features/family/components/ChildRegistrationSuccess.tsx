import type { ChildRegistrationReceipt } from '@education/contracts';
import styles from './RegistrationForm.module.css';
export function ChildRegistrationSuccess({ receipt }: { receipt: ChildRegistrationReceipt }) {
  return (
    <section className={styles.card} aria-labelledby="child-success-title">
      <h2 id="child-success-title">你已加入家庭！</h2>
      <p>{receipt.nickname}，这一步完成啦。</p>
      <p>请和家长一起记下家庭码：</p>
      <p>
        <strong aria-label="我的家庭码">{receipt.familyCode}</strong>
      </p>
      <p>你的昵称：{receipt.nickname}</p>
      <p>记住自己刚才设置的六位 PIN，不要发给别人。</p>
      <p className={styles.notice}>
        孩子登录将在下一版本开放。到时用家庭码、昵称和 PIN 登录，不需要再用 KEY 注册。
      </p>
    </section>
  );
}
