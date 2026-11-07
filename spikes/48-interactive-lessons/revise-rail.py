
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("let scene='opening',time=0,stage='difference',parts=[],leftBar=false,rightBar=false,result=[];\nlet proof={before:null,after:null}, serial=0, endLine, sound, drag=null, suppression=0, message='';","let scene='opening',time=0,stage=0;\nlet serial=0,endLine,sound,holdUntil=0,drive=0,lessonLocked=false;")
s=s.replace("tracks.hidden=!['measure','explore'].includes(next);","tracks.toggleAttribute('hidden',!['measure','explore'].includes(next));").replace("if(!tracks.hidden)","if(!tracks.hasAttribute('hidden'))").replace("tracks.hidden=true;","tracks.setAttribute('hidden','');")
s=s.replace("  forge.hidden=!['forge','proof','end'].includes(next);","  forge.hidden=next!=='teach';").replace("if(!forge.hidden)drawForge();","if(!forge.hidden)drawLesson();")
s=s.replace("拖时间轮。看到距离 4 时，点图上的距离尺。","拖时间轮，车会在相距 4 格时停一下。")
s=s.replace("  $('marks').textContent=marks.size?", "  $('guide').hidden=marks.size===2;\n  $('marks').textContent=marks.size?")
a=s.index('function tapRuler()')
b=s.index("rail.addEventListener('click'",a)
s=s[:a]+'''function record(){
  if(scene!=='explore'||gap()!==4||marks.has(time))return;
  marks.add(time);
  holdUntil=performance.now()+850;
  drawTracks();chime('ok');
  if(marks.size===1){void speak('mark');return;}
  const token=serial+1;
  void speak('both').then(()=>{
    if(serial!==token||scene!=='explore')return;
    go('teach');void prompt();
  });
}
function tapRuler(){
  if(scene==='measure'){
    chime('ok');go('explore');void speak('trackHelp');return;
  }
  if(scene==='explore'&&gap()===4)record();
}
function move(requested){
  const previous=time;
  const candidates=[6,14].filter(t=>!marks.has(t)&&t>=Math.min(previous,requested)&&t<=Math.max(previous,requested));
  if(requested<previous)candidates.reverse();
  time=candidates[0]??requested;
  $('time').value=time;
  drawTracks();
  if(candidates.length)record();
  return candidates.length>0;
}
$('time').addEventListener('input',()=>{
  drive++;
  if(performance.now()<holdUntil||marks.size===2){$('time').value=time;return;}
  move(Number($('time').value));
});
$('guide').addEventListener('click',()=>{
  if(scene!=='explore'||marks.size===2)return;
  const target=[6,14].filter(t=>!marks.has(t)).sort((a,b)=>Math.abs(a-time)-Math.abs(b-time))[0];
  const token=++drive,start=time,started=performance.now();
  function frame(now){
    if(drive!==token||scene!=='explore')return;
    const progress=Math.min(1,(now-started)/1350);
    if(move(Math.round((start+(target-start)*progress)*4)/4)||progress===1)return;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
tracks.addEventListener('click',e=>{if(e.target.closest('[data-instrument]'))tapRuler();});
tracks.addEventListener('keydown',e=>{
  if(['Enter',' '].includes(e.key)&&e.target.closest('[data-instrument]')){e.preventDefault();tapRuler();}
});
const stages=[
  {title:'从图上找出方程里的第一项',voice:'origins'},
  {title:'一秒过去，追回了几格？',voice:'relative'},
  {title:'从起点的差里，减去追回的距离',voice:'subtract'},
  {title:'谁在前变了，距离怎么算？',voice:'sign'},
  {title:'把题目问的距离接进来',voice:'target'},
  {title:'同一条方程，追上前是什么样？',voice:'before'},
  {title:'追上后，哪辆车在前？',voice:'after'},
  {title:'同样相距四格，出现两次',voice:'finish'},
];
function prompt(){
  const config=stages[stage];
  return speak(config.voice);
}
function rulerObject(words,extra=''){
  return '<div class="ruler-object '+extra+'"><div class="ruler-ticks" aria-hidden="true"></div><strong>'+words+'</strong></div>';
}
function trains(before){
  return '<div class="mini-lanes"><span class="mini-train '+(before?'yellow':'blue')+'" style="left:15%">'+(before?'M':'N')+'</span><span class="mini-train '+(before?'blue':'yellow')+'" style="left:66%">'+(before?'N':'M')+'</span></div>';
}
function equation(){
  if(stage===0)return '';
  if(stage===1)return '<span>起点的差</span> <strong>10</strong>';
  if(stage===2)return '<strong>10</strong><span>起点的差</span><b>·</b><strong>t</strong><span>t 秒追回的格数</span>';
  if(stage===3)return '<span>有方向的差</span> <strong>10 − t</strong>';
  if(stage===4)return '<span>实际距离</span> <strong>|10 − t|</strong>';
  return '<span>相距四格</span> <strong>|10 − t| ＝ 4</strong>';
}
function actionBody(){
  if(stage===0)return trains(true)+rulerObject('0 秒 · 两个中点相距 10 格');
  if(stage===1)return '<div class="move-row"><span>黄车</span><i class="two">2 格</i></div><div class="move-row"><span>蓝车</span><i class="one">1 格</i></div><span>点亮这两段位移，比较相差多少</span>';
  if(stage===2)return '<div class="length-split"><b>还领先的部分</b><em>已追回 t 格</em></div><span>起点一共领先 10 格</span>';
  if(stage===3)return trains(false)+rulerObject('N−M 为负，点距离尺看实际距离');
  if(stage===4)return rulerObject('题目问的距离 · 4 格','short');
  if(stage===5)return trains(true)+rulerObject('N 在 M 右边 · 点量尺看差的方向','short');
  return trains(false)+rulerObject('M 在 N 右边 · 点量尺看差的方向','short');
}
function drawLesson(){
  const config=stages[stage],done=stage===7;
  const worked='<div class="proof-grid"><div class="proof-card"><b>追上前 · 差是 +4</b>'+trains(true)+'<p>10 − t ＝ 4，得到 t ＝ 6 秒</p></div><div class="proof-card"><b>追上后 · 差是 −4</b>'+trains(false)+'<p>10 − t ＝ −4，得到 t ＝ 14 秒</p></div></div>';
  forge.innerHTML='<h2>'+config.title+'</h2>'+
    (stage>=1?'<div class="equation-line">'+equation()+'</div>':'')+
    (done?worked:'<button type="button" class="lesson-object" aria-label="'+config.title+'">'+actionBody()+'</button>')+
    (stage===6?'<p class="worked-line">追上前：10 − t ＝ 4，得到 t ＝ 6 秒。</p>':'')+
    (done?'<p class="worked-line">再想一想：如果只写 10 − t ＝ 4，会漏掉哪幅图？</p>':'');
}
forge.addEventListener('click',e=>{
  if(lessonLocked||scene!=='teach'||!e.target.closest('.lesson-object'))return;
  chime('ok');
  lessonLocked=true;
  stage++;
  drawLesson();
  void prompt().then(()=>{lessonLocked=false;});
});
'''+s[b:]
p.write_text(s,encoding='utf-8')
p=p.with_name('rail-template.html')
s=p.read_text(encoding='utf-8-sig')
s=s.replace('<p id="marks"></p>','<div class="time-foot"><p id="marks"></p><button type="button" id="guide">沿轨道找下一次 <span aria-hidden="true">➜</span></button></div>')
s=s.replace('方程拼装台','从图上列方程')
p.write_text(s,encoding='utf-8')
p=p.with_name('build-rail.py')
s=p.read_text(encoding='utf-8-sig')
a=s.index('js=js.replace');b=s.index('html=',a)
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8')

