import type { AiConsentView } from '@education/contracts';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import { consentBadge, type ConsentBadge } from './consent-badge';
import { StatusBadge } from './StatusBadge';
import styles from './SettingsList.module.css';

type Setting = {
  to: string;
  icon: IconName;
  label: string;
  // What the page holds, in small type at the row's end.
  note?: string;
  badge?: ConsentBadge;
  danger?: boolean;
};

// The family's settings as rows on one card, each leading to the card or the
// page where it is changed. Deleting the family is drawn in the danger colour,
// apart from the others. The AI row carries its consent badge once the
// consent has been read.
export function SettingsList({ consent }: { consent?: AiConsentView }) {
  const settings: Setting[] = [
    {
      to: '/family/privacy#ai-consent-title',
      icon: 'sparkle',
      label: 'AI 老师',
      badge: consent && consentBadge(consent),
    },
    { to: '/family/profile', icon: 'users', label: '家庭', note: '孩子、家庭码、时区' },
    { to: '/family/privacy#family-export-title', icon: 'download', label: '导出家庭数据' },
    {
      to: '/family/privacy#family-deletion-title',
      icon: 'trash',
      label: '删除家庭',
      danger: true,
    },
  ];
  return (
    <Card className={styles.settings}>
      <nav aria-label="家庭设置">
        <ul className={styles.list}>
          {settings.map(({ to, icon, label, note, badge, danger }) => (
            <li key={to}>
              <Link to={to} className={styles.row} data-danger={danger}>
                <Icon name={icon} className={styles.icon} />
                <span className={styles.label}>{label}</span>
                {note && <span className={styles.note}>{note}</span>}
                {badge && <StatusBadge tone={badge.tone}>{badge.text}</StatusBadge>}
                <Icon name="chevron" className={styles.chevron} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Card>
  );
}
