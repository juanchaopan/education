// 探针 #173 的可点原型：在真实的菜园舞台上演两段作者写好的讲解。
// 模型只决定播哪一段（讲解 id），动画本身是按幕写好的固定内容。
// 打开 ?demo=glow 或 ?demo=replay；不带参数时列出两段。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../apps/web/src/styles/tokens.css';
import '../../../apps/web/src/styles/global.css';
import { GardenScene } from '../../../apps/web/src/features/learning/components/garden-balance/garden-scenes';
import { BoardText } from '../../../apps/web/src/features/learning/components/lesson-stage/BoardText';
import { LessonStage } from '../../../apps/web/src/features/learning/components/lesson-stage/LessonStage';
import { StoryFrame } from '../../../apps/web/src/features/learning/components/lesson-stage/StoryFrame';
import { gardenLesson } from '../../../apps/web/src/features/learning/lessons/garden-balance/definition';
import { arrive, type GardenState } from '../../../apps/web/src/features/learning/lessons/garden-balance/garden-story';
import { lines } from '../../../apps/web/src/features/learning/lessons/garden-balance/script';
import { stageLook } from '../../../apps/web/src/features/learning/lessons/lesson-definition';

const look = stageLook(gardenLesson);

// The right pan hangs at (817, 321) while the beam is level; each cucumber
// group is a 52×64 box centred 58 apart on it.
const groupBoxes = [-58, 0, 58].map((dx) => ({ x: 817 + dx - 30, y: 321 - 67, width: 60, height: 72 }));

const glowStyle = `
@keyframes spike-glow { 0% { opacity: 0; stroke-width: 2; } 35% { opacity: 1; stroke-width: 7; } 100% { opacity: .85; stroke-width: 5; } }
.spike-glow { fill: #fff6c440; stroke: #ffd84a; filter: drop-shadow(0 0 10px #ffe680) drop-shadow(0 0 4px #fff3b0); animation: spike-glow .55s ease-out both; }
.spike-badge { animation: spike-glow .4s ease-out both; }
`;

type Beat = { at: number; run: () => void };

// Plays a list of timed beats once, cancelling any still pending when it is
// played again or the page goes away.
function useBeats() {
  const timers = useRef<number[]>([]);
  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };
  useEffect(() => clear, []);
  return (beats: Beat[]) => {
    clear();
    timers.current = beats.map(({ at, run }) => window.setTimeout(run, at));
  };
}

type DemoProps = { question: string; reply: string; demoId: string; label: string };

type ShellProps = Omit<DemoProps, 'reply'> & {
  shot: string;
  state: GardenState;
  caption: string;
  overlay: ReactNode;
  onPlay: () => void;
  playing: boolean;
};

function Shell({ question, demoId, label, shot, state, caption, overlay, onPlay, playing }: ShellProps) {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>{glowStyle}</style>
      <div style={{ fontSize: 18 }}>
        孩子问：<b>「{question}」</b>　→ 模型挑中讲解 <code>{demoId}</code>
      </div>
      <StoryFrame>
        <LessonStage
          look={look}
          shot={shot}
          caption={caption}
          speaking={playing}
          entryLabel="开始短片"
          defs={gardenLesson.defs}
          ambience={gardenLesson.ambience}
          onReplay={() => {}}
          onActivate={() => {}}
        >
          <GardenScene state={state} handling={{}} />
          {overlay}
        </LessonStage>
      </StoryFrame>
      <button
        type="button"
        data-testid="play-demo"
        onClick={onPlay}
        style={{ justifySelf: 'start', fontSize: 18, padding: '8px 18px', borderRadius: 12 }}
      >
        ▶ 播放讲解：{label}
      </button>
    </div>
  );
}

// 作答那一幕的「依次圈出每一组黄瓜，只圈不数」：一组一组亮起来，不报总数。
function GlowGroups({ question, reply, demoId, label }: DemoProps) {
  const state = arrive('answer').state;
  const [lit, setLit] = useState<number[]>([]);
  const [caption, setCaption] = useState<string>(lines.bridgeDone.text);
  const [playing, setPlaying] = useState(false);
  const play = useBeats();
  const start = () =>
    play([
      { at: 0, run: () => (setPlaying(true), setCaption(reply), setLit([])) },
      { at: 900, run: () => setLit([0]) },
      { at: 1800, run: () => setLit([0, 1]) },
      { at: 2700, run: () => setLit([0, 1, 2]) },
      { at: 4600, run: () => (setLit([]), setPlaying(false)) },
    ]);
  const overlay = groupBoxes.map((box, i) =>
    lit.includes(i) ? <rect key={box.x} className="spike-glow" rx={14} {...box} /> : null,
  );
  return (
    <Shell {...{ question, demoId, label, playing, caption, overlay, state }} shot="answer" onPlay={start} />
  );
}

// 桥接那一幕的「重播一个苹果和三根黄瓜一样重的那次称量」：天平暂时回到那次称量，
// 先只放一个苹果（歪），再出现三根黄瓜（平），然后回到当前这一幕。
function ReplayWeighing({ question, reply, demoId, label }: DemoProps) {
  const current = arrive('bridge').state;
  const weighing = arrive('exchange').state;
  const [state, setState] = useState<GardenState>(current);
  const [caption, setCaption] = useState<string>(lines.bridge.text);
  const [playing, setPlaying] = useState(false);
  const play = useBeats();
  const start = () =>
    play([
      { at: 0, run: () => (setPlaying(true), setCaption(reply), setState(weighing)) },
      { at: 1500, run: () => setState({ ...weighing, revealed: true }) },
      { at: 2300, run: () => setCaption(lines.three.text) },
      { at: 4800, run: () => (setState(current), setCaption(reply), setPlaying(false)) },
    ]);
  const overlay = state.shot === 'exchange' && (
    <g className="spike-badge">
      <rect x={580} y={118} width={140} height={44} rx={16} fill="#fff8de" stroke="#95572f" strokeWidth={2} />
      <BoardText x={650} y={147} size={22}>
        再称一次
      </BoardText>
    </g>
  );
  return (
    <Shell {...{ question, demoId, label, playing, caption, overlay, state }} shot="bridge" onPlay={start} />
  );
}

// The questions, replies and demo ids are what the model returned in the run
// (questions 22 and 13).
const glow: DemoProps = {
  question: '太多了我数不清',
  reply: '先圈出右盘的每一组黄瓜，再数一数有几组。',
  demoId: 'glow-groups',
  label: '依次圈出每一组黄瓜',
};
const replay: DemoProps = {
  question: '我忘了一个苹果换几根黄瓜了',
  reply: '你忘了每个苹果换几根黄瓜；请看重播后告诉我。',
  demoId: 'replay-apple-cucumbers',
  label: '再称一次一个苹果',
};

function App() {
  const demo = new URLSearchParams(location.search).get('demo');
  if (demo === 'glow') return <GlowGroups {...glow} />;
  if (demo === 'replay') return <ReplayWeighing {...replay} />;
  return (
    <>
      <GlowGroups {...glow} />
      <ReplayWeighing {...replay} />
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
