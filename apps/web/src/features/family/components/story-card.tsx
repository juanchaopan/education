import type { Decorator } from '@storybook/react-vite';
import { Card } from '../../../shared/ui/Card';

// Shows a form that lives inside a page's card on a card of its own, as the
// page shows it.
export const inCard: Decorator = (Story) => (
  <Card>
    <Story />
  </Card>
);
