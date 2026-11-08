import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { Panel } from '../components/Panel';
import { PracticePages } from './PracticePages';

export function ChildPracticePanel({ csrf }: { csrf: string }) {
  return (
    <Panel titleId="child-practice-title" title="我的练习">
      <p>想先做哪一道都可以。做过的题也可以再练一遍。</p>
      <PracticePages csrf={csrf} />
      <StandaloneLink to="/">去题库自由复习</StandaloneLink>
    </Panel>
  );
}
