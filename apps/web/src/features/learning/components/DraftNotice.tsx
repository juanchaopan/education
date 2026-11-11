import type { IconName } from '../../../shared/ui/icons';
import type { DraftStatus } from '../data-access/useLessonDraft';
import { NoticeButton, StageNotice } from './lesson-stage/StageNotice';

// The states of a draft the child has to see to: it did not load, it is not
// on the server yet, or two devices hold different drafts.
type Problem = Extract<DraftStatus, 'load-failed' | 'unsynced' | 'conflict'>;

const problemIcons: Record<Problem, IconName> = {
  'load-failed': 'wifiOff',
  unsynced: 'wifiOff',
  conflict: 'alert',
};

const isProblem = (status: DraftStatus): status is Problem => status in problemIcons;

function problemText(status: Problem, hasRemote?: boolean) {
  if (status === 'load-failed') return '暂时打不开草稿。';
  if (status === 'unsynced') return '还没同步。你这次的编辑还在这里。';
  return hasRemote
    ? '另一台设备上的草稿有变化。你想接着哪一份？'
    : '之前的草稿已不在了。要保留这次编辑吗？';
}

type Props = {
  status: DraftStatus;
  // What just happened that is worth a moment on screen while nothing needs
  // the child: the lesson picked up where it was left, or a save landed.
  moment?: 'resumed' | 'saved';
  hasDraft?: boolean;
  hasRemote?: boolean;
  message?: string;
  onSave: () => void;
  onReload: () => void;
  onDiscard: () => void;
  onChoose: (choice: 'keep' | 'remote') => void;
  // Leaves the place picked up and plays the lesson from its first scene.
  onRestart: () => void;
};

// The step that puts the draft right is gold; giving it up is the quiet one.
function ProblemActions({
  status,
  hasDraft,
  hasRemote,
  ...on
}: Omit<Props, 'status' | 'moment' | 'message' | 'onRestart'> & { status: Problem }) {
  if (status === 'load-failed') return <NoticeButton onClick={on.onReload}>再找一次</NoticeButton>;
  if (status === 'unsynced')
    return (
      <>
        <NoticeButton onClick={on.onSave}>保存这份草稿</NoticeButton>
        {hasDraft && (
          <NoticeButton quiet onClick={on.onDiscard}>
            放弃这份草稿
          </NoticeButton>
        )}
      </>
    );
  return (
    <>
      <NoticeButton onClick={() => on.onChoose('keep')}>保留这次编辑</NoticeButton>
      <NoticeButton quiet onClick={() => on.onChoose('remote')}>
        {hasRemote ? '继续已保存的草稿' : '从头开始'}
      </NoticeButton>
    </>
  );
}

// The child's saved work, as a notice on the stage only when there is
// something to see: a draft that did not load or sync, or two drafts from two
// devices, stays until the child chooses; picking up where the lesson was
// left, with a way to start over, and a save that just landed show for a
// moment, as the page decides.
export function DraftNotice({ status, moment, message, onRestart, ...problem }: Props) {
  if (isProblem(status))
    return (
      <StageNotice
        icon={problemIcons[status]}
        label="学习草稿"
        text={message ?? problemText(status, problem.hasRemote)}
      >
        <ProblemActions status={status} {...problem} />
      </StageNotice>
    );
  if (moment === 'resumed')
    return (
      <StageNotice icon="play" label="学习草稿" text="从上次的地方继续">
        <NoticeButton quiet onClick={onRestart}>
          从头做
        </NoticeButton>
      </StageNotice>
    );
  if (moment === 'saved') return <StageNotice icon="check" label="学习草稿" text="已保存" />;
  return null;
}
