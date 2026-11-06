import { Link } from 'react-router-dom';
import { PracticePages } from './PracticePages';
import card from '../components/RegistrationForm.module.css';
import panel from '../components/RegistrationKeyCard.module.css';

export function ChildPracticePanel({ csrf }: { csrf: string }) {
  return (
    <section className={`${card.card} ${panel.panel}`} aria-labelledby="child-practice-title">
      <h2 id="child-practice-title">我的练习</h2>
      <p>想先做哪一道都可以。做过的题也可以再练一遍。</p>
      <PracticePages csrf={csrf} />
      <Link to="/">去题库自由复习</Link>
    </section>
  );
}
