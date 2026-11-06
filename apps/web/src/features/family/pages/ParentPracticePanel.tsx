import { useState, type FormEvent } from 'react';
import { useCatalog } from '../../../shared/lib/useCatalog';
import { problemPath } from '../../../shared/lib/problem-path';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useAssignPractice } from '../data-access/usePractice';
import { PracticePages } from './PracticePages';
import card from '../components/RegistrationForm.module.css';
import panel from '../components/RegistrationKeyCard.module.css';
import styles from '../components/Practice.module.css';

export function ParentPracticePanel({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const [selection, select] = useState('');
  const childId = family.data?.children.find(({ id }) => id === selection)?.id;
  return (
    <section className={`${card.card} ${panel.panel}`} aria-labelledby="parent-practice-title">
      <h2 id="parent-practice-title">安排练习</h2>
      {family.isPending && <p role="status">正在加载孩子列表…</p>}
      {family.isError && <p role="alert">暂时无法加载孩子列表，请刷新页面。</p>}
      {family.isSuccess &&
        (family.data.children.length ? (
          <div className={styles.fields}>
            <label htmlFor="practice-child">为哪位孩子安排</label>
            <select
              id="practice-child"
              value={childId ?? ''}
              onChange={(event) => select(event.target.value)}
            >
              <option value="">请选择孩子</option>
              {family.data.children.map(({ id, nickname }) => (
                <option key={id} value={id}>
                  {nickname}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p>关联孩子账号后，就可以为孩子安排练习。</p>
        ))}
      {childId && (
        <div key={childId}>
          <AssignmentForm csrf={csrf} childId={childId} />
          <PracticePages csrf={csrf} childId={childId} />
        </div>
      )}
    </section>
  );
}

function AssignmentForm({ csrf, childId }: { csrf: string; childId: string }) {
  const catalog = useCatalog();
  const assign = useAssignPractice(csrf, childId);
  const [choice, choose] = useState('');
  if (catalog.isPending) return <p role="status">正在加载题目…</p>;
  if (catalog.isError) return <p role="alert">暂时无法加载题库，请刷新页面。</p>;
  const { problems } = catalog.data;
  if (!problems.length)
    return (
      <>
        <p>题库还没有已发布的题目。</p>
        {assign.isError && <p role="alert">{assign.error.message}</p>}
      </>
    );
  const selected = problems.find(({ id, version }) => problemPath(id, version) === choice);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || assign.isPending) return;
    assign.mutate({ id: selected.id, version: selected.version });
  };
  return (
    <form className={styles.fields} onSubmit={submit}>
      <label htmlFor="practice-problem">选择已发布的题目</label>
      <select
        id="practice-problem"
        disabled={assign.isPending}
        value={selected ? choice : ''}
        onChange={(event) => {
          assign.reset();
          choose(event.target.value);
        }}
      >
        <option value="">请选择题目</option>
        {problems.map(({ id, version, grade, subject, title }) => {
          const value = problemPath(id, version);
          return (
            <option key={value} value={value}>
              {grade} · {subject} · {title}
            </option>
          );
        })}
      </select>
      <div className={panel.actions}>
        <button disabled={!selected || assign.isPending} type="submit">
          {assign.isPending ? '正在安排…' : '加入练习'}
        </button>
      </div>
      {assign.isError && <p role="alert">{assign.error.message}</p>}
      {assign.isSuccess && <p role="status">已加入这位孩子的练习。</p>}
    </form>
  );
}
