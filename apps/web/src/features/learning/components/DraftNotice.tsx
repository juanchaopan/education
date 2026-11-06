import type { DraftStatus } from '../data-access/useLessonDraft';
import styles from './DraftNotice.module.css';
import action from './LessonAction.module.css';

const copy: Record<DraftStatus, string> = {
  loading: '正在找上次的草稿…',
  'load-failed': '暂时打不开草稿。',
  clean: '',
  saved: '草稿已保存。',
  unsynced: '还没同步。你这次的编辑还在这里。',
  saving: '正在保存草稿…',
  conflict: '另一台设备上的草稿有变化。你想接着哪一份？',
};

type Props = {
  status: DraftStatus;
  hasDraft?: boolean;
  hasRemote?: boolean;
  message?: string;
  onSave: () => void;
  onReload: () => void;
  onDiscard: () => void;
  onChoose: (choice: 'keep' | 'remote') => void;
};

export function DraftNotice({
  status,
  hasDraft,
  hasRemote,
  message,
  onSave,
  onReload,
  onDiscard,
  onChoose,
}: Props) {
  if (status === 'clean') return null;
  return (
    <aside className={styles.notice} aria-label="学习草稿">
      <p role="status">{message ?? statusCopy(status, hasRemote)}</p>
      <div className={styles.actions}>
        {status === 'load-failed' && (
          <button type="button" className={action.button} onClick={onReload}>
            再找一次
          </button>
        )}
        {status === 'unsynced' && (
          <button type="button" className={action.button} onClick={onSave}>
            保存这份草稿
          </button>
        )}
        {hasDraft && (status === 'saved' || status === 'unsynced') && (
          <button type="button" className={action.button} onClick={onDiscard}>
            放弃这份草稿
          </button>
        )}
        {status === 'conflict' && (
          <>
            <button type="button" className={action.button} onClick={() => onChoose('keep')}>
              保留这次编辑
            </button>
            <button type="button" className={action.button} onClick={() => onChoose('remote')}>
              {hasRemote ? '继续已保存的草稿' : '从头开始'}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function statusCopy(status: DraftStatus, hasRemote?: boolean) {
  return status === 'conflict' && !hasRemote
    ? '之前的草稿已不在了。要保留这次编辑吗？'
    : copy[status];
}
