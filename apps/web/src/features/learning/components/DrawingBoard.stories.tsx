import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { exportInk } from '../drawing/export-ink';
import type { Drawing } from '../drawing/ink';
import { DrawingBoard } from './DrawingBoard';

type Props = ComponentProps<typeof DrawingBoard>;

function DrawingFixture({ drawing: initialDrawing, feedback, ...props }: Props) {
  const [drawing, setDrawing] = useState(initialDrawing);
  const [exportStatus, setExportStatus] = useState('');
  return (
    <div style={{ maxInlineSize: '36rem', marginInline: 'auto' }}>
      <DrawingBoard
        {...props}
        drawing={drawing}
        onDrawingChange={setDrawing}
        feedback={feedback && { drawing: initialDrawing, result: feedback.result }}
      />
      <p>
        <button
          type="button"
          disabled={!drawing.length}
          onClick={async () => {
            const blob = await exportInk(drawing);
            if (!blob) {
              setExportStatus('没有可导出的画图。');
              return;
            }
            const image = await createImageBitmap(blob);
            setExportStatus(`${image.width} × ${image.height} · ${blob.size} bytes`);
            image.close();
          }}
        >
          检查导出
        </button>
        <output>{exportStatus}</output>
      </p>
    </div>
  );
}

const stepId = 'trace-leaf-veins';
const drawing: Drawing = [
  [
    { x: 0.28, y: 0.68 },
    { x: 0.44, y: 0.56 },
    { x: 0.58, y: 0.42 },
    { x: 0.72, y: 0.25 },
  ],
  [
    { x: 0.44, y: 0.56 },
    { x: 0.37, y: 0.33 },
  ],
  [
    { x: 0.58, y: 0.42 },
    { x: 0.74, y: 0.49 },
  ],
];
const result = {
  stepId,
  status: 'needs-work',
  instruction: '这条短线从哪一条长线上分出来？',
  highlight: { x: 0.34, y: 0.29, width: 0.14, height: 0.31 },
} as const;

const meta = {
  title: 'Learning/Drawing board',
  component: DrawingBoard,
  render: (args) => <DrawingFixture key={args.feedback?.result.status} {...args} />,
  args: { stepId, label: '叶脉观察画板', drawing: [], onDrawingChange: () => {} },
} satisfies Meta<typeof DrawingBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Blank: Story = {};
export const WithRegion: Story = { args: { drawing, feedback: { drawing, result } } };
export const Uncertain: Story = {
  args: { drawing, feedback: { drawing, result: { ...result, status: 'uncertain' } } },
};
