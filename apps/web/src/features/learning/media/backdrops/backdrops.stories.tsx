import type { Meta, StoryObj } from '@storybook/react-vite';
import { BackdropSheet } from '../../components/lesson-stage/LibrarySheet';
import { backdrops } from './backdrops';

// Every backdrop in the library with its clearing outlined, for a person to
// check that the outline lies where the picture is clear. Each new backdrop
// gets a story here, and with it a visual baseline.
const meta = {
  title: 'Learning/Backdrops',
  component: BackdropSheet,
  args: { backdrop: backdrops['garden-morning'], showClearing: true },
} satisfies Meta<typeof BackdropSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GardenMorning: Story = {};
export const ArtStudioEvening: Story = { args: { backdrop: backdrops['art-studio-evening'] } };
export const RailwayWorkshopDusk: Story = {
  args: { backdrop: backdrops['railway-workshop-dusk'] },
};
