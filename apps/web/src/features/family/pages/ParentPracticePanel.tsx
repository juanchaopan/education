import { useState } from 'react';
import { useCatalog } from '../../../shared/lib/useCatalog';
import { problemPath } from '../../../shared/lib/problem-path';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Loading } from '../../../shared/ui/Loading';
import { SelectField } from '../../../shared/ui/SelectField';
import { Panel } from '../components/Panel';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useAssignPractice } from '../data-access/usePractice';
import { PracticePages } from './PracticePages';
import styles from '../components/Practice.module.css';

export function ParentPracticePanel({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const [selection, select] = useState('');
  const childId = family.data?.children.find(({ id }) => id === selection)?.id;
  return (
    <Panel titleId="parent-practice-title" title="安排练习">
      {family.isPending && <Loading label="正在加载孩子列表…" />}
      {family.isError && <p role="alert">暂时无法加载孩子列表，请刷新页面。</p>}
      {family.isSuccess &&
        (family.data.children.length ? (
          <div className={styles.fields}>
            <SelectField
              id="practice-child"
              label="为哪位孩子安排"
              value={childId ?? ''}
              onChange={(event) => select(event.target.value)}
            >
              <option value="">请选择孩子</option>
              {family.data.children.map(({ id, nickname }) => (
                <option key={id} value={id}>
                  {nickname}
                </option>
              ))}
            </SelectField>
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
    </Panel>
  );
}

function AssignmentForm({ csrf, childId }: { csrf: string; childId: string }) {
  const catalog = useCatalog();
  const assign = useAssignPractice(csrf);
  const [choice, choose] = useState('');
  if (catalog.isPending) return <Loading label="正在加载题目…" />;
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
  const submit = () => {
    if (!selected || assign.isPending) return;
    assign.mutate({ childId, problem: { id: selected.id, version: selected.version } });
  };
  return (
    <Form className={styles.assignment} onSubmit={submit}>
      <SelectField
        id="practice-problem"
        label="选择已发布的题目"
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
      </SelectField>
      <Actions>
        <Button disabled={!selected || assign.isPending} type="submit">
          {assign.isPending ? '正在安排…' : '加入练习'}
        </Button>
      </Actions>
      {assign.isError && <p role="alert">{assign.error.message}</p>}
      {assign.isSuccess && <p role="status">已加入这位孩子的练习。</p>}
    </Form>
  );
}
