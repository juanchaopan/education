
from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("pending='',playing=false,drag=null,animation=0,started=false;","pending=null,playing=false,drag=null,animation=0,started=false,ready=false;\nlet introPhase='cars';")
a=s.index('function audio(')
b=s.index('function speakLatest',a)
s=s[:a]+'''function audio(key,after){
  pending={key,after};
  if(playing)return;
  const next=()=>{
    if(!pending){playing=false;$('replay').classList.remove('playing');return;}
    const cue=pending;pending=null;playing=true;
    $('caption').hidden=false;$('caption').textContent=lines[cue.key];
    voice.src='data:audio/mpeg;base64,'+clips[cue.key];
    $('replay').classList.add('playing');
    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      cue.after?.();next();
    };
    voice.onended=finish;voice.onerror=finish;
    void voice.play().catch(()=>setTimeout(finish,1600));
  };
  next();
}
const intro=[
  ['cars','introCars'],
  ['question','introQuestion'],
  ['origin','introStartGap'],
];
function explain(index=0){
  if(index===intro.length){
    ready=true;introPhase='push';update(0);audio('driveIntro');return;
  }
  [introPhase]=intro[index];
  update(0);
  audio(intro[index][1],()=>explain(index+1));
}
'''+s[b:]
s=s.replace("text('guidance',623,108,'推黄车往右，两辆车会一起走','headline')+", """text('problemQuestion',623,101,'题目：M 和 N 什么时候相距 4 格？','headline')+
    text('guidance',594,141,'','guide-line')+""")
s=s.replace("text('originLabel',(x(-1)+x(9))/2,390,'起点相距 10 格','origin-label')+'</g>'+","""text('originLabel',(x(-1)+x(9))/2,390,'起点相距 10 格','origin-label')+
    text('originM',x(-1)-16,387,'−1','origin-coordinate')+text('originN',x(9)+15,387,'9','origin-coordinate')+'</g>'+""")
s=s.replace("  rail.dataset.level=level;","""  rail.dataset.level=level;
  rail.dataset.intro=introPhase;
  for(const id of ['carM','carN','pushArrow','reset']){
    $(id).setAttribute('tabindex',ready?'0':'-1');
    $(id).setAttribute('aria-disabled',String(!ready));
  }""")
s=s.replace("time>=16?'hidden':'visible'","!ready||time>=16?'hidden':'visible'")
s=s.replace("  $('guidance').textContent=heading;","""  const introPrompt={cars:'认识两辆车：同时向右，速度不同',question:'我们只看两辆车的中点 M 和 N',origin:'第一步，先看出发时两点隔多远'};
  $('guidance').textContent=ready?heading:introPrompt[introPhase];
  if(level===0){
    const first={
      cars:['同一时刻出发，沿数轴向右','黄车每秒 2 格，蓝车每秒 1 格。'],
      question:['什么时候相距 4 格？','量的是两个中点 M、N 之间的距离。'],
      origin:['起点间隔＝9 − (−1)＝10 格','黄车每秒走得更远。想想这 10 格接下来会怎么变。'],
      push:['先看黄车怎样追回起点的 10 格','拖黄车往右，也可以点一下看一秒。'],
    }[introPhase];
    $('formulaMain').textContent=first[0];$('formulaExplain').textContent=first[1];
  }""")
s=s.replace("if(!started||!event.isPrimary","if(!ready||!event.isPrimary")
s=s.replace("diagram.addEventListener('click',event=>{\n  if(event.target", "diagram.addEventListener('click',event=>{\n  if(!ready)return;\n  if(event.target")
s=s.replace("diagram.addEventListener('keydown',event=>{\n  if(event.target", "diagram.addEventListener('keydown',event=>{\n  if(!ready)return;\n  if(event.target")
s=s.replace("$('replay').hidden=false;view();update(0);audio('driveIntro');","$('replay').hidden=false;view();explain();")
p.write_text(s,encoding='utf-8')
p=root/'rail-template.html'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('<h1>追上以后，<br>距离还会是 4 吗？</h1>','''<h1>什么时候相距 4 格？</h1>
<p class="setup">两辆车同时向右。黄车每秒走 2 格，蓝车每秒走 1 格。<br>题目要找的是两辆车的中点 M、N 相距 4 格的时刻。</p>''')
p.write_text(s,encoding='utf-8')

