import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../shared/ui/Avatar';
import { Icon } from '../../../shared/ui/Icon';
import { RaisedButton } from '../../../shared/ui/RaisedButton';
import styles from './ChildTopBar.module.css';

type Props = {
  nickname: string;
  leaving: boolean;
  onLogout: () => void;
};

// The signed-in child's top bar, laid over the picture in smoked glass: the
// brand, which goes back to the top of the home page, and the child's avatar
// and nickname, which open a menu with one item, 退出登录. The menu closes on
// Escape or a press anywhere else.
export function ChildTopBar({ nickname, leaving, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.brand} aria-label="小小探索家首页">
        <span className={styles.mark}>
          <Icon name="sprout" />
        </span>
        <span className={styles.name}>小小探索家</span>
      </Link>
      <div
        ref={holder}
        className={styles.holder}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <button
          type="button"
          className={styles.me}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="child-menu"
          onClick={() => setOpen(!open)}
        >
          <Avatar name={nickname} size="small" />
          {nickname}
          <Icon name="expand" />
        </button>
        {open && (
          <div id="child-menu" role="menu" aria-label={nickname} className={styles.menu}>
            <RaisedButton
              role="menuitem"
              shape="block"
              className={styles.item}
              disabled={leaving}
              onClick={onLogout}
            >
              <Icon name="logout" />
              {leaving ? '正在退出…' : '退出登录'}
            </RaisedButton>
          </div>
        )}
      </div>
    </header>
  );
}
