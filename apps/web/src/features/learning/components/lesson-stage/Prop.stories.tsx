import type { Meta, StoryObj } from '@storybook/react-vite';
import { DragGhost, Prop, PropPlace } from './Prop';
import { StoryStage } from './StoryStage';

// Plain drawings stand in for a lesson's own: a ball and a crate.
function Ball({ size }: { size: number }) {
  return <circle r={size / 2} fill="#e5b950" stroke="#8a5f3c" strokeWidth="3" />;
}

function Crate({ highlight, over }: { highlight: boolean; over: boolean }) {
  return (
    <PropPlace
      place="crate"
      label="木箱"
      x={900}
      y={420}
      highlight={highlight}
      over={over}
      halo={{ rx: 86, ry: 52, cy: -8 }}
      ground={<ellipse rx="84" ry="18" cy="44" fill="#0d1820" opacity=".3" />}
    >
      <rect x="-74" y="-50" width="148" height="96" rx="14" fill="#9a6a45" stroke="#5e3b24" />
    </PropPlace>
  );
}

const meta = { title: 'Learning/Lesson stage/Prop' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Resting: Story = {
  render: () => (
    <StoryStage>
      <Prop x={520} y={380} size={70}>
        <Ball size={70} />
      </Prop>
      <Prop x={680} y={380} size={70} part="ball" id="ball-0" label="小球">
        <Ball size={70} />
      </Prop>
      <Crate highlight={false} over={false} />
    </StoryStage>
  ),
};

export const NextToMove: Story = {
  render: () => (
    <StoryStage>
      <Prop x={600} y={380} size={70} part="ball" id="ball-0" label="小球" highlight>
        <Ball size={70} />
      </Prop>
      <Crate highlight over={false} />
    </StoryStage>
  ),
};

export const Chosen: Story = {
  render: () => (
    <StoryStage>
      <Prop x={600} y={380} size={70} part="ball" id="ball-0" label="小球" highlight selected>
        <Ball size={70} />
      </Prop>
      <Crate highlight over={false} />
    </StoryStage>
  ),
};

export const DraggedOverThePlace: Story = {
  render: () => (
    <StoryStage>
      <Prop x={600} y={380} size={70} part="ball" id="ball-0" label="小球" highlight lifted>
        <Ball size={70} />
      </Prop>
      <Crate highlight over />
      <DragGhost x={880} y={380}>
        <Ball size={70} />
      </DragGhost>
    </StoryStage>
  ),
};
