import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ChildRegistrationSuccess } from './ChildRegistrationSuccess';
const meta = {
  title: '家庭/孩子注册成功',
  component: ChildRegistrationSuccess,
  args: { receipt: { status: 'registered', familyCode: 'ABCD-EFGH-JKMN', nickname: '小探索家' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ChildRegistrationSuccess>;
export default meta;
export const Complete: StoryObj<typeof meta> = {};
