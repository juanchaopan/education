
const $=id=>document.getElementById(id);
const rail=$('rail'),diagram=$('tracks'),voice=new Audio();
const phone=matchMedia('(max-width:650px)');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const px=17.5,x=n=>225+(n+2)*px;
const checkpoints=[1,2,6,11,14];
let milestone=0,subtraction=false,absolute=false,complete=false,finished=false;
function waiting(){return stopAt===2&&!subtraction?'subtract':stopAt===11&&!absolute?'distance':'';}
function canDrive(){return ready&&!locked&&!waiting()&&!complete&&!finished;}
let time=0,level=0,runs=0,stopAt=null,locked=false,pending=null,playing=false,drag=null,animation=0,started=false,ready=false;
let introPhase='cars';
const limit=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const pointM=t=>-1+2*t,pointN=t=>9+t;
const line=(id,a,b,c,d)=>$(id).setAttribute('d','M '+a+' '+b+' L '+c+' '+d);
function audio(key,after){
  pending={key,after};
  if(playing)return;
  const next=()=>{
    if(!pending){playing=false;$('caption').hidden=true;$('replay').classList.remove('playing');return;}
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
    ready=true;introPhase='push';update(0);return;
  }
  [introPhase]=intro[index];
  update(0);
  audio(intro[index][1],()=>explain(index+1));
}
function text(id,a,b,value,kind=''){
  return '<text id="'+id+'" x="'+a+'" y="'+b+'" text-anchor="middle" class="'+kind+'">'+value+'</text>';
}
function car(id,label,width,kind){
  return '<g id="'+id+'" class="car '+kind+'" data-car="'+id+'" role="button" tabindex="0" aria-label="'+label+'">'+
    '<rect class="car-hit" x="-17" y="-50" width="'+Math.max(76,width+34)+'" height="90" rx="16"/>'+
    '<rect class="car-focus" x="-13" y="-37" width="'+Math.max(68,width+26)+'" height="66" rx="14"/>'+
    '<rect class="body" x="0" y="-14" width="'+width+'" height="30" rx="8"/>'+
    '<path class="shine" d="M5 -7 H'+(width-5)+'"/>'+
    '<circle class="wheel" cx="7" cy="17" r="6"/><circle class="wheel" cx="'+(width-7)+'" cy="17" r="6"/>'+
    '<circle class="mid" cx="'+width/2+'" cy="0" r="7"/>'+
    '<text x="'+width/2+'" y="-24">'+(id==='carM'?'M':'N')+'</text></g>';
}
function diagramMarkup(){
  return '<defs><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#ffe1a1"/><stop offset="1" stop-color="#bb7b48"/></linearGradient><linearGradient id="teal" x2="0" y2="1"><stop stop-color="#b9f2ed"/><stop offset="1" stop-color="#5a9eaf"/></linearGradient></defs>'+
    '<rect class="board" x="132" y="62" width="982" height="467" rx="30"/>'+
    text('problemQuestion',623,101,'题目：M 和 N 什么时候相距 4 格？','headline')+
    text('guidance',594,141,'','guide-line')+
    '<path class="track" d="M162 196H1082 M162 286H1082"/>'+
    '<g id="origin"><path d="M '+x(-1)+' 199 V 397 M '+x(9)+' 286 V 397" class="ghost-lines"/>'+
    '<circle cx="'+x(-1)+'" cy="196" r="6" class="start-m"/><circle cx="'+x(9)+'" cy="286" r="6" class="start-n"/>'+
    '<g id="startCells" aria-hidden="true"></g>'+text('originLabel',(x(-1)+x(9))/2,440,'起点的十格','origin-label')+
    '<g id="subtractTarget" class="reason-object" data-reason="subtract" role="button" aria-label="看原来十格里还没追回的一段"><rect y="391" height="40" rx="7"/></g></g>'+
    '<g id="stepCompare" class="step-compare" visibility="hidden">'+
    text('compareTitle',919,188,'同样走一秒','compare-title')+
    text('compareM',839,221,'黄车','compare-yellow')+text('compareN',839,257,'蓝车','compare-blue')+
    '<rect x="873" y="200" width="31" height="25" rx="5" class="example-yellow"/><rect x="909" y="200" width="31" height="25" rx="5" class="example-yellow"/>'+
    '<rect x="873" y="236" width="31" height="25" rx="5" class="example-blue"/><rect x="909" y="236" width="31" height="25" rx="5" class="extra"/>'+
    text('compareExtra',1000,220,'多走一格','compare-title')+'</g>'+
    '<g id="trails" visibility="hidden"><path id="trailM" class="trail trail-m"/><path id="trailN" class="trail trail-n"/></g>'+
    '<path id="projection" class="projection"/><g id="gapCells" aria-hidden="true"></g><path id="rulerBar" class="ruler-bar"/>'+
    '<g id="direction" visibility="hidden"><path id="directionLine" class="direction-line"/>'+text('directionLabel',0,331,'从 M 向左到 N','direction-label')+'</g>'+
    '<g id="distanceTarget" class="reason-object" data-reason="distance" role="button" aria-label="看两点之间这一段的长度"><rect y="331" height="43" rx="9"/></g>'+
    '<circle id="meet" cx="0" cy="352" r="10" class="meeting" visibility="hidden"/>'+
    '<g id="ruler" class="ruler"><rect x="-70" y="-17" width="140" height="32" rx="11"/>'+text('rulerText',0,6,'四格','ruler-text')+'</g>'+
    car('carM','推黄车，按右方向键或点一下走一秒',2*px,'gold-car')+car('carN','推蓝车，两车同时移动',6*px,'teal-car')+
    '<g id="pushArrow" data-push role="button" aria-label="点一下，车向右走一秒" tabindex="0"><rect x="-16" y="-29" width="98" height="57" rx="13" fill="transparent"/><path d="M0-11H29V-20L51 0L29 20V11H0Z"/></g>'+
    '<g id="reset" data-reset role="button" tabindex="0" aria-label="回到起点重看"><rect x="155" y="469" width="155" height="40" rx="13"/>'+text('resetLabel',232,494,'↶ 回到起点','reset-text')+'</g>'+
    '<g id="formula"><rect x="325" y="459" width="762" height="60" rx="15" class="formula-plate"/>'+
    text('formulaMain',705,484,'路程＝速度 × 时间','formula-main')+
    text('formulaExplain',705,507,'先推动车，再看路程怎样跟着变。','formula-small')+'</g>';
}
function view(){
  diagram.setAttribute('viewBox',phone.matches?'126 46 1000 501':'100 45 1050 500');
}
phone.addEventListener('change',view);
function update(value){
  time=Math.round(limit(value,0,16)*10)/10;
  if(time>0)level=Math.max(1,level);
  if(time>=1)level=Math.max(2,level);
  if(time>=10)level=Math.max(3,level);
  rail.dataset.level=level;
  rail.dataset.intro=introPhase;
  rail.dataset.stopped=String(stopAt!==null);
  rail.dataset.locked=String(locked);
  for(const id of ['carM','carN','pushArrow','reset']){
    const allowed=id==='reset'?ready&&!locked:canDrive();
    $(id).setAttribute('tabindex',allowed?'0':'-1');
    $(id).setAttribute('aria-disabled',String(!allowed));
  }
  for(const [id,kind] of [['subtractTarget','subtract'],['distanceTarget','distance']]){
    const available=!locked&&waiting()===kind;
    $(id).classList.toggle('active',available);
    $(id).setAttribute('tabindex',available?'0':'-1');
    $(id).setAttribute('aria-disabled',String(!available));
  }
  $('finish').hidden=!complete||finished;
  rail.dataset.finished=String(finished);
  $('carM').setAttribute('transform','translate('+x(pointM(time)-1)+' 193)');
  $('carN').setAttribute('transform','translate('+x(pointN(time)-3)+' 283)');
  $('pushArrow').setAttribute('transform','translate('+(x(pointM(time)+1)+16)+' 193)');
  $('pushArrow').style.visibility=!canDrive()||time>=14?'hidden':'visible';
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
  const recovered=Math.min(10,Math.floor(time));
  $('startCells').innerHTML=Array.from({length:10},(_,i)=>
    '<rect x="'+(m0+i*px)+'" y="402" width="'+(px-2)+'" height="17" rx="3" class="'+(i<recovered?'recovered':'unrecovered')+'"/>').join('');
  const rest=$('subtractTarget').querySelector('rect');
  rest.setAttribute('x',m0+recovered*px-4);rest.setAttribute('width',Math.max(1,(10-recovered)*px+7));
  const strip=$('distanceTarget').querySelector('rect');
  strip.setAttribute('x',left-21);strip.setAttribute('width',Math.max(61,distance*px+42));
  $('stepCompare').setAttribute('visibility',stopAt===1||stopAt===2?'visible':'hidden');
  $('gapCells').classList.toggle('reversed',signed<0);
  $('gapCells').classList.toggle('matched',stopAt===6||stopAt===14);
  $('meet').setAttribute('cx',m);
  $('meet').setAttribute('visibility',time===10?'visible':'hidden');
  $('direction').setAttribute('visibility',stopAt===11&&!absolute?'visible':'hidden');
  $('directionLabel').setAttribute('x',(m+n)/2);
  $('directionLine').setAttribute('d','M '+m+' 335 H '+n+' l 6 -5 m -6 5 l 6 5');
  $('ruler').setAttribute('transform','translate('+((m+n)/2)+' 388)');
  $('ruler').style.visibility=stopAt===6||stopAt===14||time===10?'visible':'hidden';
  $('rulerText').textContent=time===10?'并排了':'相距四格';
  $('ruler').classList.toggle('at-goal',stopAt===6||stopAt===14);
  $('reset').classList.toggle('suggested',complete&&!finished);
  const introPrompt={cars:'认识两辆车：同时向右，速度不同',question:'我们只看两辆车的中点 M 和 N',origin:'第一步，先看出发时两点隔多远'};
  let heading=!ready?introPrompt[introPhase]:time===0?(runs?'再推一次，留意中间的空隙':'推黄车往右，两辆车会一起走'):
    time===10?'两车的中点重合了':signed>0?'看，黄车正在追近蓝车':'现在黄车跑到前面，间隔又拉开了';
  if(stopAt!==null){
    const prompts={1:'比一比，同一秒内谁多走了一格？',2:'再走一秒，看看原来的空隙少了多少',6:'第一次相距四格，蓝车还在前面',11:'前后换了，距离怎么写？',14:'第二次相距四格，黄车在前面'};
    heading=prompts[stopAt];
    if(!locked&&waiting())heading=waiting()==='subtract'?'点起点条上还没追回的那一段':'点亮两车中间的这一段';
    else if(!locked&&!complete)heading=drag?.blocked?'松手，再推黄车继续':heading;
  }
  if(complete)heading=finished?'本题结束':'两个时刻都找到了';
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
  }else if(stopAt===1){
    formula='用同一秒，黄车走两格，蓝车走一格';
    thought='把两段对齐。黄车多走的这一格，就是追回的一格。';
  }else if(stopAt===2&&!subtraction){
    formula='每过一秒，追回一格';
    thought='走两秒就追回两格。把总共走了几秒叫 t，追回的就是 t 格。';
  }else if(stopAt===2){
    formula='还差 ＝ 起初相隔 − 已经追回 ＝ 10 − t';
    thought='在起点那段十格里，去掉金色的已追回部分。';
  }else if(stopAt===6){
    formula='10 − t ＝ 4';
    thought='蓝车还在前面。黄车追回了六格，所以是第六秒。';
  }else if(stopAt===11){
    formula=absolute?'距离 ＝ |10 − t|':'蓝车的位置 − 黄车的位置是负的';
    thought=absolute?'两车之间这一段长度没变。绝对值去掉方向，只留长度。':'从黄车中点看，蓝车中点在左边。方向是负的，但空隙仍有一格。';
  }else if(stopAt===14){
    formula='|10 − t| ＝ 4';
    thought='黄车在前，差是负四，距离仍是四格。所以第十四秒也符合。';
  }else if(time===10){
    formula='两点重合，距离为零';
    thought='再往前一点，猜猜谁会领先。';
  }else if(signed<0&&absolute){
    formula='距离 ＝ |10 − t|';
    thought='前后换了，量尺仍量中间这一段长度。';
  }else if(subtraction&&signed>=0){
    formula='还差 ＝ 10 − t';
    thought='黄车每秒追回一格。走了 t 秒，起点的间隔就少了 t 格。';
  }else{
    formula='看中间的空隙怎么变';
    thought='同样的时间里，黄车比蓝车走得更远。';
  }
  $('formulaMain').textContent=formula;$('formulaExplain').textContent=thought;
  $('mobileFormula').textContent=formula;$('mobileExplain').textContent=thought;
  $('mobileMath').hidden=false;
  $('observations').textContent=complete?'两次都相距四格：第六秒和第十四秒。':'';
  $('observations').hidden=!complete||finished;
}
function move(value){
  const goal=Math.max(time,Math.round(limit(value,0,14)*10)/10);
  const gate=checkpoints[milestone];
  if(gate===undefined||goal<gate){
    if(goal!==time)stopAt=null;
    update(goal);return false;
  }
  stopAt=gate;milestone++;locked=true;
  if(drag)drag.blocked=true;
  animation++;
  update(gate);
  const lines={1:'deriveOne',2:'deriveTwo',6:'pauseBefore',11:'deriveCross',14:'deriveFinish'};
  audio(lines[gate],()=>{locked=false;complete=gate===14;update(time);});
  return true;
}
function connect(kind){
  if(locked||waiting()!==kind)return;
  locked=true;
  if(kind==='subtract')subtraction=true;else absolute=true;
  update(time);
  audio(kind==='subtract'?'deriveSubtract':'deriveAbs',()=>{locked=false;update(time);});
}
function point(event){
  const p=diagram.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
  return p.matrixTransform(diagram.getScreenCTM().inverse());
}
function sweep(target){
  if(!canDrive())return;
  const start=time,begin=performance.now(),token=++animation;
  if(reduced.matches){move(target);return;}
  const duration=950;
  function frame(now){
    if(token!==animation)return;
    const progress=limit((now-begin)/duration,0,1);
    const stopped=move(start+(target-start)*progress);
    if(!stopped&&progress<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function reset(){
  if(locked)return;
  animation++;runs++;milestone=0;subtraction=absolute=complete=finished=false;level=0;
  stopAt=null;update(0);
}
diagram.addEventListener('pointerdown',event=>{
  if(!canDrive()||!event.isPrimary||event.button!==0)return;
  const carNode=event.target.closest('[data-car]');
  if(!carNode)return;
  animation++;
  drag={id:event.pointerId,x:point(event).x,time,speed:carNode.id==='carM'?2:1,active:false};
  diagram.setPointerCapture(event.pointerId);
  rail.classList.add('driving');
});
diagram.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId||drag.blocked||!canDrive())return;
  const delta=point(event).x-drag.x;
  drag.active ||= Math.abs(delta)>3;
  if(drag.active)move(drag.time+delta/(px*drag.speed));
});
function endDrag(event){
  if(drag?.id!==event.pointerId)return;
  const action=drag;drag=null;rail.classList.remove('driving');
  if(event.type==='pointerup'&&!action.active)sweep(Math.min(16,Math.floor(time+1.00001)));
  else update(time);
}
diagram.addEventListener('pointerup',endDrag);diagram.addEventListener('pointercancel',endDrag);
diagram.addEventListener('click',event=>{
  if(!ready||locked)return;
  const object=event.target.closest('[data-reason]');
  if(object){connect(object.dataset.reason);return;}
  if(event.target.closest('[data-reset]'))reset();
  if(event.target.closest('[data-push]'))sweep(Math.min(16,Math.floor(time+1.00001)));
});
diagram.addEventListener('keydown',event=>{
  if(!ready||locked)return;
  const object=event.target.closest('[data-reason]');
  if(object&&['Enter',' '].includes(event.key)){event.preventDefault();connect(object.dataset.reason);return;}
  if(event.target.closest('[data-reset]')&&['Enter',' '].includes(event.key)){event.preventDefault();reset();return;}
  if(!event.target.closest('[data-car],[data-push]'))return;
  if(['ArrowRight','Enter',' '].includes(event.key)){
    event.preventDefault();sweep(limit(Math.round(time)+1,0,14));
  }
});
rail.addEventListener('click',()=>{
  if(started)return;
  started=true;rail.dataset.scene='drive';
  diagram.innerHTML=diagramMarkup();diagram.removeAttribute('hidden');
  $('replay').hidden=false;view();explain();
});
$('finish').addEventListener('click',()=>{if(complete){finished=true;update(time);}});
$('replay').addEventListener('click',()=>{
  if(voice.src){$('caption').hidden=false;voice.currentTime=0;void voice.play().catch(()=>{});}
});


