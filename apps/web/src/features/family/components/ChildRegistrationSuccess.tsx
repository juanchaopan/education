import type { ChildRegistrationReceipt } from '@education/contracts';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import styles from './ChildRegistrationSuccess.module.css';

type Props = {
  receipt: ChildRegistrationReceipt;
  // Where the child signs in; the way there carries the family code and the
  // nickname, so the child types only the PIN.
  signIn: string;
};

// What a child who just joined keeps: the family code to sign in with, the
// reminder that the PIN stays secret, and the one way on.
export function ChildRegistrationSuccess({ receipt, signIn }: Props) {
  return (
    <>
      <p className={styles.code}>
        <span className={styles.label}>
          <Icon name="home" />
          我的家庭码
        </span>
        <output aria-label="我的家庭码" className={styles.value}>
          {receipt.familyCode}
        </output>
      </p>
      <p>记住自己刚才设置的六位 PIN，不要发给别人。</p>
      <LinkButton
        to={signIn}
        state={{ familyCode: receipt.familyCode, nickname: receipt.nickname }}
      >
        去登录
      </LinkButton>
    </>
  );
}
