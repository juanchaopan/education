import type { TeachingFeedback } from '@education/contracts';
import { useEffectEvent, useId, useLayoutEffect, useRef } from 'react';
import { bindInk } from '../drawing/bind-ink';
import { drawingFeedback } from '../drawing/drawing-feedback';
import type { Drawing } from '../drawing/ink';
import styles from './DrawingBoard.module.css';

type Props = {
  stepId: string;
  label: string;
  drawing: Drawing;
  onDrawingChange: (drawing: Drawing) => void;
  feedback?: { drawing: Drawing; result: TeachingFeedback };
};

export function DrawingBoard({ stepId, label, drawing, onDrawingChange, feedback }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const feedbackId = useId();
  const message = drawingFeedback(
    stepId,
    feedback?.drawing === drawing ? feedback.result : undefined,
  );
  const region = message?.highlight;
  const commit = useEffectEvent((stroke: Drawing[number]) => onDrawingChange([...drawing, stroke]));

  useLayoutEffect(() => {
    if (canvas.current) return bindInk(canvas.current, drawing, (stroke) => commit(stroke));
  }, [drawing, stepId]);

  return (
    <div className={styles.board}>
      <div className={styles.sheet}>
        <canvas
          ref={canvas}
          className={styles.ink}
          role="img"
          aria-label={label}
          aria-describedby={message ? feedbackId : undefined}
        >
          这个浏览器暂时不能在这里画图。
        </canvas>
        {region && (
          <div
            aria-hidden="true"
            className={styles.region}
            style={{
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.width * 100}%`,
              height: `${region.height * 100}%`,
            }}
          />
        )}
      </div>
      <div id={feedbackId} className={styles.feedback} role="status">
        {region && <strong>看看虚线框里的地方。 </strong>}
        {message?.instruction}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          disabled={!drawing.length}
          onClick={() => onDrawingChange(drawing.slice(0, -1))}
        >
          撤销一笔
        </button>
        <button type="button" disabled={!drawing.length} onClick={() => onDrawingChange([])}>
          清空画板
        </button>
      </div>
    </div>
  );
}
