
from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("const clipByLevel=['driveIntro','driveTravel','driveGap','driveCross','driveFour'];\n","")
s=s.replace('runs=0,spoken=0,pending','runs=0,stopAt=null,locked=false,pending')
a=s.index('function speakLatest()')
b=s.index('function text(',a)
s=s[:a]+s[b:]
a=s.index('  const ticks=',s.index('function diagramMarkup'))
b=s.index("  return '<defs>",a)
s=s[:a]+s[b:]
s=s.replace("""    '<rect class="clock-plate" x="939" y="122" width="135" height="39" rx="13"/>'+text('clock',1006,148,'0 秒','clock')+
    '<path class="track" d="M162 196H1082 M162 286H1082 M162 415H1082"/>'+ticks+
    text('speedM',996,182,'黄车每秒走 2 格','lane-key amber-text')+
    text('speedN',996,272,'蓝车每秒走 1 格','lane-key azure-text')+""","""    '<path class="track" d="M162 196H1082 M162 286H1082"/>'+""")
a=s.index("    '<g id=\"trails\"")
b=s.index("    car('carM'",a)
s=s[:a]+'''    '<g id="trails" visibility="hidden"><path id="trailM" class="trail trail-m"/><path id="trailN" class="trail trail-n"/></g>'+
    '<path id="projection" class="projection"/><g id="gapCells" aria-hidden="true"></g><path id="rulerBar" class="ruler-bar"/>'+
    '<circle id="meet" cx="0" cy="352" r="10" class="meeting" visibility="hidden"/>'+
    '<g id="ruler" class="ruler"><rect x="-70" y="-17" width="140" height="32" rx="11"/>'+text('rulerText',0,6,'四格','ruler-text')+'</g>'+
'''+s[b:]
a=s.index('function tag(')
b=s.index('function point(',a)
s=s[:a]+'''function update(value){
  time=Math.round(limit(value,0,16)*10)/10;
  if(time>0)level=Math.max(1,level);
  if(time>=1)level=Math.max(2,level);
  if(time>=10)level=Math.max(3,level);
  rail.dataset.level=level;
  rail.dataset.intro=introPhase;
  rail.dataset.stopped=String(stopAt!==null);
  rail.dataset.locked=String(locked);
  for(const id of ['carM','carN','pushArrow','reset']){
    $(id).setAttribute('tabindex',ready?'0':'-1');
    $(id).setAttribute('aria-disabled',String(!ready||locked));
  }
  $('carM').setAttribute('transform','translate('+x(pointM(time)-1)+' 193)');
  $('carN').setAttribute('transform','translate('+x(pointN(time)-3)+' 283)');
  $('pushArrow').setAttribute('transform','translate('+(x(pointM(time)+1)+16)+' 193)');
  $('pushArrow').style.visibility=!ready||locked||time>=16?'hidden':'visible';
  $('trails').setAttribute('visibility',level>=1?'visible':'hidden');
  const m=x(pointM(time)),n=x(pointN(time)),m0=x(-1),n0=x(9);
  line('trailM',m0,218,m,218);line('trailN',n0,308,n,308);
  $('projection').setAttribute('d','M '+m+' 194 V 352 M '+n+' 284 V 352');
  const signed=10-time,distance=Math.abs(signed),left=Math.min(m,n);
  line('rulerBar',m,352,n,352);
  $('gapCells').innerHTML=Array.from({length:Math.ceil(distance)},(_,i)=>{
    const w=px*Math.min(1,distance-i);
    return '<rect x="'+(left+i*px)+'" y="340" width="'+Math.max(0,w-2)+'" height="24" rx="4"/>';
  }).join('');
  $('gapCells').classList.toggle('reversed',signed<0);
  $('gapCells').classList.toggle('matched',stopAt!==null);
  $('meet').setAttribute('cx',m);
  $('meet').setAttribute('visibility',time===10?'visible':'hidden');
  $('ruler').setAttribute('transform','translate('+((m+n)/2)+' 388)');
  $('ruler').style.visibility=stopAt!==null||time===10?'visible':'hidden';
  $('rulerText').textContent=time===10?'并排了':'相距四格';
  $('ruler').classList.toggle('at-goal',stopAt!==null);
  $('reset').classList.toggle('suggested',time>=16);
  const introPrompt={cars:'认识两辆车：同时向右，速度不同',question:'我们只看两辆车的中点 M 和 N',origin:'第一步，先看出发时两点隔多远'};
  let heading=!ready?introPrompt[introPhase]:time===0?(runs?'再推一次，留意中间的空隙':'推黄车往右，两辆车会一起走'):
    time===10?'两车的中点重合了':signed>0?'看，黄车正在追近蓝车':'现在黄车跑到前面，间隔又拉开了';
  if(stopAt!==null){
    if(locked)heading='停在这里，看看中间这段距离';
    else if(drag?.blocked)heading='松手，再推黄车继续';
    else heading=stopAt===6?'再推黄车，看看追过后会怎样':'再看一次，或继续推远一点';
  }
  $('guidance').textContent=heading;
  let formula='',thought='';
  if(level===0){
    const first={
      cars:['两辆车同时出发','看看谁走得更快。'],
      question:['什么时候相距四格？','看车子中间的两个点。'],
      origin:['看两个起点之间的那一段','出发时，它们相隔十格。'],
      push:['想一想，黄车追近时会发生什么？','先推车，观察两条轨迹和中间的空隙。'],
    }[introPhase];
    [formula,thought]=first;
  }else if(stopAt===6){
    formula='10 − t ＝ 4';
    thought='蓝车还在前面。黄车追回了六格，所以是第六秒。';
  }else if(stopAt===14){
    formula='|10 − t| ＝ 4';
    thought='黄车在前，差是负四，距离仍是四格。所以第十四秒也符合。';
  }else if(time===10){
    formula='两点重合，距离为零';
    thought='再往前一点，猜猜谁会领先。';
  }else if(signed<0){
    formula='距离 ＝ |10 − t|';
    thought='前后换了，量尺仍量中间这一段长度。';
  }else if(level>=2){
    formula='还差 ＝ 10 − t';
    thought='黄车每秒追回一格。走了 t 秒，起点的间隔就少了 t 格。';
  }else{
    formula='路程 ＝ 速度 × 时间';
    thought='用同样的时间，黄线比蓝线长。';
  }
  $('formulaMain').textContent=formula;$('formulaExplain').textContent=thought;
  $('mobileFormula').textContent=formula;$('mobileExplain').textContent=thought;
  $('mobileMath').hidden=false;
  $('observations').textContent=found.size===2?'两次都相距四格：第六秒和第十四秒。':'';
  $('observations').hidden=found.size!==2;
}
function move(value){
  const goal=Math.round(limit(value,0,16)*10)/10;
  const gates=[6,14].filter(at=>goal>time?time<at&&at<=goal:goal<=at&&at<time);
  if(goal<time)gates.reverse();
  if(!gates.length){
    if(goal!==time)stopAt=null;
    update(goal);return false;
  }
  stopAt=gates[0];locked=true;found.add(stopAt);
  if(drag)drag.blocked=true;
  animation++;
  update(stopAt);
  audio(stopAt===6?'pauseBefore':'pauseAfter',()=>{locked=false;update(time);});
  return true;
}
'''+s[b:]
a=s.index('function sweep(')
b=s.index("diagram.addEventListener('pointerdown'",a)
s=s[:a]+'''function sweep(target,rewind=false){
  if(locked)return;
  const start=time,begin=performance.now(),token=++animation;
  const apply=rewind?value=>{stopAt=null;update(value);return false;}:move;
  if(reduced.matches){apply(target);return;}
  const duration=rewind?520:950;
  function frame(now){
    if(token!==animation)return;
    const progress=limit((now-begin)/duration,0,1);
    const stopped=apply(start+(target-start)*progress);
    if(!stopped&&progress<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function reset(){
  if(locked)return;
  runs++;
  sweep(0,true);
}
'''+s[b:]
s=s.replace("if(!ready||!event.isPrimary","if(!ready||locked||!event.isPrimary")
s=s.replace("  if(drag?.id!==event.pointerId)return;\n  const delta=","  if(drag?.id!==event.pointerId||drag.blocked||locked)return;\n  const delta=")
s=s.replace("if(drag.active)update(drag.time+delta/(px*drag.speed));","if(drag.active)move(drag.time+delta/(px*drag.speed));")
s=s.replace("  if(event.type==='pointerup'&&!action.active)sweep(Math.min(16,Math.floor(time+1.00001)));\n  else speakLatest();","  if(event.type==='pointerup'&&!action.active)sweep(Math.min(16,Math.floor(time+1.00001)));\n  else update(time);")
s=s.replace("  if(!ready)return;\n  if(event.target","  if(!ready||locked)return;\n  if(event.target")
s=s.replace("    if(!pending){playing=false;$('replay').classList.remove('playing');return;}","    if(!pending){playing=false;$('caption').hidden=true;$('replay').classList.remove('playing');return;}")
s=s.replace("$('replay').addEventListener('click',()=>{if(voice.src){voice.currentTime=0;void voice.play().catch(()=>{});}});","""$('replay').addEventListener('click',()=>{
  if(voice.src){$('caption').hidden=false;voice.currentTime=0;void voice.play().catch(()=>{});}
});""")
p.write_text(s,encoding='utf-8')
p=root/'rail-template.html'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('两辆车同时向右。黄车每秒走 2 格，蓝车每秒走 1 格。<br>题目要找的是两辆车的中点 M、N 相距 4 格的时刻。','两辆车同时向右，黄车走得更快。<br>题目要找的是两个中点相距四格的时刻。')
p.write_text(s,encoding='utf-8')

