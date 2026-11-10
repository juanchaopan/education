import type { IconName } from '../../../shared/ui/icons';
import type { DraftStatus } from '../data-access/useLessonDraft';
import { NoticeButton, StageNotice } from './lesson-stage/StageNotice';

const copy: Record<DraftStatus, string> = {
  loading: '正在找上次的草稿…',
  'load-failed': '暂时打不开草稿。',
  clean: '',
  saved: '草稿已保存。',
  unsynced: '还没同步。你这次的编辑还在这里。',
  saving: '正在保存草稿…',
  conflict: '另一台设备上的草稿有变化。你想接着哪一份？',
};

const icons: Record<DraftStatus, IconName> = {
  loading: 'clock',
  'load-failed': 'wifiOff',
  clean: 'check',
  saved: 'check',
  unsynced: 'wifiOff',
  saving: 'clock',
  conflict: 'alert',
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

function statusCopy(status: DraftStatus, hasRemote?: boolean) {
  return status === 'conflict' && !hasRemote
    ? '之前的草稿已不在了。要保留这次编辑吗？'
    : copy[status];
}

function Actions({ status, hasDraft, hasRemote, ...on }: Omit<Props, 'message'>) {
  return (
    <>
      {status === 'load-failed' && (
        <NoticeButton quiet onClick={on.onReload}>
          再找一次
        </NoticeButton>
      )}
      {status === 'unsynced' && (
        <NoticeButton quiet onClick={on.onSave}>
          保存这份草稿
        </NoticeButton>
      )}
      {hasDraft && (status === 'saved' || status === 'unsynced') && (
        <NoticeButton quiet onClick={on.onDiscard}>
          放弃这份草稿
        </NoticeButton>
      )}
      {status === 'conflict' && (
        <>
          <NoticeButton onClick={() => on.onChoose('keep')}>保留这次编辑</NoticeButton>
          <NoticeButton quiet onClick={() => on.onChoose('remote')}>
            {hasRemote ? '继续已保存的草稿' : '从头开始'}
          </NoticeButton>
        </>
      )}
    </>
  );
}

// Where the child's saved work stands, as a notice on the stage, with the
// choice it needs when there is one: a draft that did not load or sync, or
// two drafts from two devices.
export function DraftNotice(props: Props) {
  const { status, hasRemote, message } = props;
  if (status === 'clean') return null;
  return (
    <StageNotice
      icon={icons[status]}
      label="学习草稿"
      text={message ?? statusCopy(status, hasRemote)}
    >
      <Actions {...props} />
    </StageNotice>
  );
}
