import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../../../shared/lib/useCatalog';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { CatalogNavigation } from '../components/CatalogNavigation';
import { WelcomeHero, LearningPrinciples } from '../components/Welcome';
import { changeCategory, selectCategory } from '../model';
import styles from '../components/Library.module.css';

export function LibraryPage() {
  const catalog = useCatalog();
  const [query, setQuery] = useSearchParams();
  const selection = catalog.data ? selectCategory(catalog.data, query) : null;
  return (
    <>
      <WelcomeHero />
      <section className={styles.library} aria-labelledby="library-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>你的探索地图</p>
            <h2 id="library-title">从一个好问题开始</h2>
          </div>
          <span className={styles.tag}>一步一步，自由探索</span>
        </div>
        <div className={styles.taxonomy} aria-label="题目分类顺序">
          <span>年级</span>
          <b aria-hidden="true">›</b>
          <span>学科</span>
          <b aria-hidden="true">›</b>
          <span>分类</span>
          <b aria-hidden="true">›</b>
          <span>题目顺序</span>
        </div>
        {catalog.isPending && (
          <EmptyState icon="◌" title="正在打开探索地图" description="请稍等一下。" />
        )}
        {catalog.isError && (
          <EmptyState
            icon="☁"
            title="刚才没能打开"
            description="可能是网络休息了一下，我们再试试。"
            actionLabel="再试一次"
            onAction={() => {
              void catalog.refetch();
            }}
          />
        )}
        {catalog.isSuccess && selection?.grade.options.length === 0 && (
          <EmptyState
            icon="✿"
            title="好问题，正在准备中"
            description="这里将放上可以说、可以画、可以动手探索的题目。准备好后，就能从这里出发。"
          />
        )}
        {catalog.isSuccess && selection && selection.grade.options.length > 0 && (
          <CatalogNavigation
            selection={selection}
            problems={selection.problems}
            onChange={(level, value) => setQuery(changeCategory(selection, level, value))}
          />
        )}
      </section>
      <LearningPrinciples />
    </>
  );
}
