import { NavLink, Route, Routes } from 'react-router-dom';
import { LibraryPage } from '../features/library/pages/LibraryPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        跳到主要内容
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand} aria-label="小小探索家首页">
          <span aria-hidden="true">✳</span> 小小探索家
        </NavLink>
        <nav aria-label="主导航">
          <NavLink to="/" end>
            探索题目
          </NavLink>
          <NavLink to="/family">家长空间</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route
            path="*"
            element={
              <section className={styles.missing}>
                <h1>这条小路还没找到</h1>
                <NavLink to="/">回到探索首页</NavLink>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className={styles.footer}>
        <span>慢慢想，每一步都算数。</span>
        <span>为好奇心，留一点空间。</span>
      </footer>
    </div>
  );
}
