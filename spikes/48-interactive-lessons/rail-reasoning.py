
from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("const found=new Set();","const checkpoints=[1,2,6,11,14];\nlet milestone=0,subtraction=false,absolute=false,complete=false,finished=false;\nfunction waiting(){return stopAt===2&&!subtraction?'subtract':stopAt===11&&!absolute?'distance':'';}\nfunction canDrive(){return ready&&!locked&&!waiting()&&!complete&&!finished;}")
a=s.index("    '<path d=\"M '+x(-1)+' 395")
b=s.index("    '<g id=\"trails\"",a)
s=s[:a]+'''    '<g id="startCells" aria-hidden="true"></g>'+text('originLabel',(x(-1)+x(9))/2,440,'起点的十格','origin-label')+
    '<g id="subtractTarget" class="reason-object" data-reason="subtract" role="button" aria-label="看原来十格里还没追回的一段"><rect y="391" height="40" rx="7"/></g></g>'+
    '<g id="stepCompare" class="step-compare" visibility="hidden">'+
    text('compareTitle',919,188,'同样走一秒','compare-title')+
    text('compareM',839,221,'黄车','compare-yellow')+text('compareN',839,257,'蓝车','compare-blue')+
    '<rect x="873" y="200" width="31" height="25" rx="5" class="example-yellow"/><rect x="909" y="200" width="31" height="25" rx="5" class="example-yellow"/>'+
    '<rect x="873" y="236" width="31" height="25" rx="5" class="example-blue"/><rect x="909" y="236" width="31" height="25" rx="5" class="extra"/>'+
    text('compareExtra',1000,220,'多走一格','compare-title')+'</g>'+
'''+s[b:]
needle="    '<path id=\"projection\" class=\"projection\"/><g id=\"gapCells\" aria-hidden=\"true\"></g><path id=\"rulerBar\" class=\"ruler-bar\"/>'+"
s=s.replace(needle,needle+"""
    '<g id="direction" visibility="hidden"><path id="directionLine" class="direction-line"/>'+text('directionLabel',0,331,'从 M 向左到 N','direction-label')+'</g>'+
    '<g id="distanceTarget" class="reason-object" data-reason="distance" role="button" aria-label="看两点之间这一段的长度"><rect y="331" height="43" rx="9"/></g>'+""")
s=s.replace("  for(const id of ['carM','carN','pushArrow','reset']){\n    $(id).setAttribute('tabindex',ready?'0':'-1');\n    $(id).setAttribute('aria-disabled',String(!ready||locked));\n  }","""  for(const id of ['carM','carN','pushArrow','reset']){
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
  rail.dataset.finished=String(finished);""")
s=s.replace("!ready||locked||time>=16","!canDrive()||time>=14")
a=s.index("  $('gapCells').classList.toggle('reversed'")
b=s.index("  const introPrompt",a)
s=s[:a]+'''  const recovered=Math.min(10,Math.floor(time));
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
'''+s[b:]
a=s.index("  if(stopAt!==null){")
b=s.index("  $('guidance').textContent",a)
s=s[:a]+'''  if(stopAt!==null){
    const prompts={1:'比一比，同一秒内谁多走了一格？',2:'再走一秒，看看原来的空隙少了多少',6:'第一次相距四格，蓝车还在前面',11:'前后换了，距离怎么写？',14:'第二次相距四格，黄车在前面'};
    heading=prompts[stopAt];
    if(!locked&&waiting())heading=waiting()==='subtract'?'点起点条上还没追回的那一段':'点亮两车中间的这一段';
    else if(!locked&&!complete)heading=drag?.blocked?'松手，再推黄车继续':heading;
  }
  if(complete)heading=finished?'本题结束':'两个时刻都找到了';
'''+s[b:]
s=s.replace("  }else if(stopAt===6){","""  }else if(stopAt===1){
    formula='用同一秒，黄车走两格，蓝车走一格';
    thought='把两段对齐。黄车多走的这一格，就是追回的一格。';
  }else if(stopAt===2&&!subtraction){
    formula='每过一秒，追回一格';
    thought='走两秒就追回两格。把总共走了几秒叫 t，追回的就是 t 格。';
  }else if(stopAt===2){
    formula='还差 ＝ 起初相隔 − 已经追回 ＝ 10 − t';
    thought='看原来的十格，去掉金色的已追回部分，剩下的就是现在还差的。';
  }else if(stopAt===6){""")
s=s.replace("  }else if(stopAt===14){","""  }else if(stopAt===11){
    formula=absolute?'距离 ＝ |10 − t|':'蓝车的位置 − 黄车的位置是负的';
    thought=absolute?'两车之间这一段长度没变。绝对值去掉方向，只留长度。':'从黄车中点看，蓝车中点在左边。方向是负的，但空隙仍有一格。';
  }else if(stopAt===14){""")
s=s.replace("  }else if(signed<0){","  }else if(signed<0&&absolute){")
s=s.replace("  }else if(level>=2){","  }else if(subtraction&&signed>=0){")
s=s.replace("    formula='路程 ＝ 速度 × 时间';\n    thought='用同样的时间，黄线比蓝线长。';","    formula='看中间的空隙怎么变';\n    thought='同样的时间里，黄车比蓝车走得更远。';")
s=s.replace("  $('observations').textContent=found.size===2?'两次都相距四格：第六秒和第十四秒。':'';\n  $('observations').hidden=found.size!==2||locked;","  $('observations').textContent=complete?'两次都相距四格：第六秒和第十四秒。':'';\n  $('observations').hidden=!complete||finished;")
a=s.index('function move(value)')
b=s.index('function point(',a)
s=s[:a]+'''function move(value){
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
'''+s[b:]
s=s.replace("function sweep(target,rewind=false){\n  if(locked)return;","function sweep(target,rewind=false){\n  if(!rewind&&!canDrive())return;")
s=s.replace("  runs++;\n  sweep(0,true);","  runs++;milestone=0;subtraction=absolute=complete=finished=false;level=0;\n  stopAt=null;update(0);")
s=s.replace("if(!ready||locked||!event.isPrimary","if(!canDrive()||!event.isPrimary")
s=s.replace("drag.blocked||locked","drag.blocked||!canDrive()")
s=s.replace("  if(event.target.closest('[data-reset]'))reset();\n  if(event.target.closest('[data-push]'))","  const object=event.target.closest('[data-reason]');\n  if(object){connect(object.dataset.reason);return;}\n  if(event.target.closest('[data-reset]'))reset();\n  if(event.target.closest('[data-push]'))")
s=s.replace("  if(event.target.closest('[data-reset]')&&['Enter',' '].includes(event.key))","  const object=event.target.closest('[data-reason]');\n  if(object&&['Enter',' '].includes(event.key)){event.preventDefault();connect(object.dataset.reason);return;}\n  if(event.target.closest('[data-reset]')&&['Enter',' '].includes(event.key))")
s=s.replace("$('replay').addEventListener('click',()=>{","$('finish').addEventListener('click',()=>{if(complete){finished=true;update(time);}});\n$('replay').addEventListener('click',()=>{")
p.write_text(s,encoding='utf-8')
p=root/'rail-template.html'
s=p.read_text(encoding='utf-8-sig').replace('<p id="observations" hidden></p>','<p id="observations" hidden></p><button id="finish" type="button" hidden>结束本题</button>')
p.write_text(s,encoding='utf-8')

