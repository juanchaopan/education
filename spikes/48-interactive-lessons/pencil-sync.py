
from pathlib import Path
p=Path(__file__).resolve().parent/'pencil-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("function speak(key){","function speak(key,onStart){")
s=s.replace("""    const finish=()=>{replay.classList.remove('playing');resolve();};
    player.onplay=()=>replay.classList.add('playing');""","""    let began=false;
    const start=()=>{
      if(began)return;
      began=true;onStart?.();
    };
    const finish=()=>{start();replay.classList.remove('playing');resolve();};
    player.onplaying=()=>{replay.classList.add('playing');start();};""")
s=s.replace("  step('pair');\n  void speak(intros[row]);","  step('pairHold');\n  void speak(intros[row],()=>step('pair'));")
s=s.replace("    step('pair');plink(0);void speak('orange');return;","    step('pairHold');plink(0);void speak('orange',()=>step('pair'));return;")
s=s.replace("  work.push(index);cursor++;lastMove=true;plink(work.length);render();\n  if(row===0&&work.length===1){void speak('yellow');return;}\n  step('rolling');","""  work.push(index);cursor++;lastMove=true;plink(work.length);
  if(row===0&&work.length===1){
    step('pairHold');
    void speak('redOrange').then(()=>speak('yellowNext',()=>step('pair')));
    return;
  }
  step('rolling');""")
s=s.replace("  step('chooseAnchor');plink(2);\n  void speak('start').then(()=>{if(phase==='chooseAnchor')void speak('red');});","  step('introHold');plink(2);\n  void speak('start').then(()=>speak('red',()=>step('chooseAnchor')));")
s=s.replace("const pairScene=phase!=='chooseAnchor';","const pairScene=!['chooseAnchor','introHold'].includes(phase);")
s=s.replace("phase!=='chooseAnchor'&&row===1","pairScene&&row===1")
p.write_text(s,encoding='utf-8')

