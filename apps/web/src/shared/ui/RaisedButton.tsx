import type { ComponentPropsWithRef } from 'react';
import { classNames } from '../lib/class-names';
import styles from './Raised.module.css';

type Props = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  // The chosen one of a set, such as the filter in use, stands in the main
  // colour.
  chosen?: boolean;
  // A pill stands on its own; a block is a whole row of the card it ends.
  shape?: 'pill' | 'block';
};

// A raised button outside the lessons: a filter, 加载更多, a menu item or the
// row that opens a book. It sinks when pressed and lies flat while it cannot
// be pressed. It never submits a form.
export function RaisedButton({ chosen, shape = 'pill', className, ...button }: Props) {
  return (
    <button
      {...button}
      type="button"
      className={classNames(
        styles.button,
        chosen && styles.chosen,
        shape === 'block' && styles.block,
        className,
      )}
    />
  );
}
