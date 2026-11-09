import type { Meta, StoryObj } from '@storybook/react-vite';
import { TeacherSheet } from '../../components/lesson-stage/LibrarySheet';
import { teachers } from './teachers';

// Every teacher in the library, with its name, school years and manner. Each
// new teacher gets a story here, and with it a visual baseline.
const meta = {
  title: 'Learning/Teachers',
  component: TeacherSheet,
  args: { teacher: teachers.rabbit },
} satisfies Meta<typeof TeacherSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Rabbit: Story = {};
