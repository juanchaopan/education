import { clearingNames, type LibraryBackdrop } from '../../media/backdrops/backdrops';
import { ageNames, type Age } from '../../media/library';
import type { LibraryTeacher } from '../../media/teachers/teachers';
import { ClearingOutline } from './ClearingOutline';
import { world } from './stage-look';
import styles from './LibrarySheet.module.css';

const years = (ages: readonly Age[]) => ages.map((age) => ageNames[age]).join('、');

function Tags({ tags }: { tags: readonly (readonly [string, string])[] }) {
  return (
    <dl className={styles.tags}>
      {tags.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// A library backdrop laid over the whole world, as the clearing is measured,
// with its clearing outlined when asked, and its tags beneath.
export function BackdropSheet({
  backdrop,
  showClearing,
}: {
  backdrop: LibraryBackdrop;
  showClearing: boolean;
}) {
  const { x, y, width, height } = backdrop.clearZone;
  return (
    <figure className={styles.sheet}>
      <div
        className={styles.frame}
        style={{
          backgroundImage: `url("${backdrop.image}")`,
          backgroundPosition: backdrop.focus,
        }}
      >
        <svg viewBox={`${world.x} ${world.y} ${world.width} ${world.height}`} aria-hidden="true">
          {showClearing && <ClearingOutline box={backdrop.clearZone} kind="clearing" />}
        </svg>
      </div>
      <figcaption>
        <Tags
          tags={[
            ['绘景', backdrop.id],
            ['场景', backdrop.setting],
            ['时间和色调', backdrop.light],
            ['年级', years(backdrop.ages)],
            [
              '空地',
              `${clearingNames[backdrop.clearing]}：x ${x}、y ${y}、宽 ${width}、高 ${height}`,
            ],
            ['适合', backdrop.fits.join('、')],
          ]}
        />
      </figcaption>
    </figure>
  );
}

// A library teacher on its own, with its name, school years and manner.
export function TeacherSheet({ teacher }: { teacher: LibraryTeacher }) {
  return (
    <figure className={styles.sheet}>
      <img className={styles.portrait} src={teacher.image} alt={teacher.name} />
      <figcaption>
        <Tags
          tags={[
            ['角色', teacher.id],
            ['名字', teacher.name],
            ['年级', years(teacher.ages)],
            ['性格', teacher.personality],
          ]}
        />
      </figcaption>
    </figure>
  );
}
