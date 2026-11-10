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
export const ForestPicnicMorning: Story = {
  args: { backdrop: backdrops['forest-picnic-morning'] },
};
export const PastryShopAfternoon: Story = {
  args: { backdrop: backdrops['pastry-shop-afternoon'] },
};
export const ToyClassroomDay: Story = { args: { backdrop: backdrops['toy-classroom-day'] } };
export const SeasideBeachNoon: Story = { args: { backdrop: backdrops['seaside-beach-noon'] } };
export const TownMarketAfternoon: Story = {
  args: { backdrop: backdrops['town-market-afternoon'] },
};
export const WoodshopMorning: Story = { args: { backdrop: backdrops['woodshop-morning'] } };
export const LibraryCornerRainy: Story = {
  args: { backdrop: backdrops['library-corner-rainy'] },
};
export const GreenhouseNoon: Story = { args: { backdrop: backdrops['greenhouse-noon'] } };
export const ObservatoryNight: Story = { args: { backdrop: backdrops['observatory-night'] } };
export const ScienceLabEvening: Story = {
  args: { backdrop: backdrops['science-lab-evening'] },
};
export const CityModelStudioMorning: Story = {
  args: { backdrop: backdrops['city-model-studio-morning'] },
};
export const RiverBridgeDusk: Story = { args: { backdrop: backdrops['river-bridge-dusk'] } };
