import { Icon } from '../../../shared/ui/Icon';
import styles from './Library.module.css';

export function WelcomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="welcome">
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>每一个「为什么」，都值得探索</p>
        <h1 id="welcome">
          小小的思考，
          <br />
          大大的<span>发现。</span>
        </h1>
        <p className={styles.intro}>
          说一说，画一画，动手试试看。
          <br />
          不用着急，我们陪你一步一步想明白。
        </p>
        <div className={styles.note}>
          <Icon name="replay" /> 不怕再试一次，也可以再听一遍
        </div>
      </div>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.orbit} />
        <Icon name="sparkle" className={styles.sun} />
        <div className={styles.card}>
          <span className={styles.cardLabel}>今天，也有新发现</span>
          <div className={styles.blocks}>
            <i />
            <i />
            <i />
          </div>
          <span className={styles.drawnLine}>﹏﹏﹏</span>
          <span className={styles.cardCaption}>想法没有固定的形状</span>
        </div>
        <Icon name="star" className={styles.spark} />
        <span className={styles.dot} />
      </div>
    </section>
  );
}

export function LearningPrinciples() {
  return (
    <section className={styles.principles} aria-label="学习方式">
      <article>
        <span aria-hidden="true">01</span>
        <h3>把想法说出来</h3>
        <p>慢慢说，我们认真听。</p>
      </article>
      <article>
        <span aria-hidden="true">02</span>
        <h3>用画笔试试看</h3>
        <p>一个圆、一条线，都可以是思路。</p>
      </article>
      <article>
        <span aria-hidden="true">03</span>
        <h3>按自己的节奏来</h3>
        <p>可以重听，也可以重新试一次。</p>
      </article>
    </section>
  );
}
