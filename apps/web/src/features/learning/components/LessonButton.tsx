import action from './LessonAction.module.css';

type Props = { label: string; onClick: () => void; disabled?: boolean };

export function LessonButton({ label, onClick, disabled }: Props) {
  return (
    <button type="button" className={action.button} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
