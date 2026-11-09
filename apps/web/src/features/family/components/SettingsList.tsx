import type { AiConsentView } from '@education/contracts';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import { consentBadge, type ConsentBadge } from './consent-badge';
import styles from './SettingsList.module.css';

type Setting = {
  to: string;
  icon: IconName;
  label: string;
  badge?: ConsentBadge;
  danger?: boolean;
};

// The family's settings as rows that lead to where each is changed. Deleting
// the family is drawn in the danger colour, apart from the others. The AI
// row carries its consent badge once the consent has been read.
export function SettingsList({ consent }: { consent?: AiConsentView }) {
  const settings: Setting[] = [
    {
      to: '/family/privacy#ai-consent',
      icon: 'sparkle',
      label: 'AI 老师',
      badge: consent && consentBadge(consent),
    },
    { to: '/family/privacy#family-export', icon: 'download', label: '导出家庭数据' },
    { to: '/family/privacy#family-deletion', icon: 'trash', label: '删除家庭', danger: true },
  ];
  return (
    <nav aria-label="家庭设置" className={styles.settings}>
      <ul className={styles.list}>
        {settings.map(({ to, icon, label, badge, danger }) => (
          <li key={to}>
            <Link to={to} className={styles.row} data-danger={danger}>
              <Icon name={icon} className={styles.icon} />
              <span className={styles.label}>{label}</span>
              {badge && (
                <span className={styles.badge} data-tone={badge.tone}>
                  {badge.text}
                </span>
              )}
              <Icon name="chevron" className={styles.chevron} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
