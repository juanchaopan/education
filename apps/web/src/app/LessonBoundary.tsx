import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  // Shown in place of a lesson that could not go on.
  fallback: ReactNode;
  // Hears that the lesson could not go on, once.
  onFailure: () => void;
};

// Keeps a lesson that cannot go on, such as one whose files a new release has
// replaced, from taking the whole page down with it.
export class LessonBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
