
const main = document.querySelector('main');
const get = (id) => document.getElementById(id);
const produce = {leaf:['🥬','青菜',9],apple:['🍎','苹果',3],cuke:['🥒','黄瓜',1]};
const palette = [['红','#e94c55'],['橙','#ef872c'],['黄','#edc430'],['绿','#65ae47'],['青','#2eb8bc'],['蓝','#4177da'],['紫','#9659c7']];
const audio = new Audio();
audio.preload = 'auto';
let scene, scales, pencils, pairs, latest, selected, drag, dragEndedAt = 0;
let audioUnlocked = false;
let introPlayed = false;
let lastVoice = '';
let transferOn = false;
let transferMessage = '';
let equation = [];
let equationOn = false;
let feedback = '';
const intro = () => scene === 'garden' ? 'gardenIntro' : 'pencilIntro';
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function play(key) {
  if (!clips[key]) return;
  audio.pause();
  audio.src = 'data:audio/mpeg;base64,' + clips[key];
  lastVoice = key;
  void audio.play().catch(() => {
    if (get('audio')) get('audio').classList.remove('playing');
  });
}
audio.onplay = () => get('audio')?.classList.add('playing');
audio.onpause = audio.onended = () => get('audio')?.classList.remove('playing');
function firstGesture() {
  audioUnlocked = true;
  if (introPlayed) return false;
  introPlayed = true;
  play(intro());
  return true;
}
function tell(text, key) {
  feedback = text;
  get('feedback').textContent = text;
  if (!key || !audioUnlocked || key === lastVoice || (lastVoice === intro() && !audio.paused && !audio.ended)) return;
  play(key);
}
function foodButton(kind, scale, place, supply = false) {
  const [icon,name] = produce[kind];
  return '<button type="button" class="produce'+(supply?' supply':'')+'" data-drag="food" data-kind="'+kind+'" data-scale="'+scale+'" data-place="'+place+'" aria-label="'+(supply?'篮里的':'')+name+'">'+icon+(supply?' <b>黄瓜篮</b>':'')+'</button>';
}
function scaleHTML(i, title, description) {
  const scale = scales[i];
  const weight = (items) => items.reduce((sum,kind)=>sum+produce[kind][2],0);
  const diff = weight(scale[1])-weight(scale[0]);
  const tilt = Math.max(-11,Math.min(11,diff*2.5));
  const contents = (place) => {
    const items=scale[place];
    const buttons=items.map(kind=>foodButton(kind,i,place));
    if (i!==2 || place!==1 || !items.every(kind=>kind==='cuke')) return buttons.join('');
    return buttons.reduce((groups,button,index)=>{
      if (index%3===0) groups.push([]);
      groups.at(-1).push(button);
      return groups;
    },[]).map(group=>'<div class="cuke-group">'+group.join('')+'</div>').join('');
  };
  return '<div class="scale'+(i<2?' clue-pile':'')+'" data-machine="'+i+'"><h2>'+title+'</h2><div class="machine"><div class="pivot"></div><div class="arm" style="--tilt:'+tilt+'deg">'+[0,1].map(side=>'<div class="pan" role="button" tabindex="0" data-drop="food" data-scale="'+i+'" data-pan="'+side+'" data-place="'+side+'" aria-label="'+(side===0?'左秤盘':'右秤盘')+'">'+contents(side)+'</div>').join('')+'</div><div class="pin"></div></div><p class="weigh-status">'+(diff===0?'两边一样重':diff>0?'右边重':'左边重')+'</p><div class="tray" role="button" tabindex="0" data-drop="food" data-scale="'+i+'" data-place="2" aria-label="放回篮子">'+(i===2?foodButton('cuke',2,3,true):'取下的放这里')+contents(2)+'</div><span hidden>'+description+'</span></div>';
}
function pencilShape(index, mini = false) {
  return '<i aria-hidden="true" class="pencil-shape'+(mini?' mini':'')+'" style="--ink:'+palette[index][1]+'"></i>';
}
function pencilButton(index, source) {
  const name = palette[index][0];
  if (source==='desk' && pencils.includes(index)) return '<span class="pencil pencil-spot" aria-hidden="true">'+pencilShape(index)+'<span>'+name+'</span></span>';
  return '<button type="button" class="pencil" data-drag="pencil" data-index="'+index+'" data-place="'+source+'" aria-label="'+name+'色铅笔">'+pencilShape(index)+'<span>'+name+'</span></button>';
}
function pairCard(key) {
  const indexes = key.split(',').map(Number);
  return '<span class="pair'+(latest===key?' latest':'')+'" aria-label="'+indexes.map(i=>palette[i][0]).join('和')+'">'+indexes.map(i=>pencilShape(i,true)).join('')+'</span>';
}
function transferHTML() {
  if (!transferOn) return '';
  const key = scene === 'garden' ? 'gardenTransfer' : 'pencilTransfer';
  const question = scene === 'garden' ? '现在 1 个苹果和 2 根黄瓜一样重。1 棵青菜和几根黄瓜一样重？' : '桌上只剩 5 种颜色，每次仍然选 2 支，有几种不同挑法？';
  return '<aside class="transfer"><p><strong>换个条件</strong> <button type="button" data-voice="'+key+'" aria-label="朗读变化题">🔊</button> '+question+'</p><form class="answer" id="transfer-answer"><label for="transfer-input">我的想法是</label><input id="transfer-input" inputmode="numeric" required pattern="[0-9]+"></form><p role="status" id="transfer-feedback">'+transferMessage+'</p></aside>';
}
function equationHTML() {
  if (!equationOn) return '';
  return '<section class="equation"><p><strong>用积木写出你刚才的换法</strong> · 看着秤盘，选出组数、每组的根数和总数。</p><div class="tile-tray" data-drop="equation" data-place="pool">'+['2','3','3','3','6','9','×','+','+','＝'].map(tile=>'<button type="button" class="tile" data-drag="equation" data-place="pool" data-symbol="'+tile+'">'+tile+'</button>').join('')+'</div><div class="tile-line" data-drop="equation" data-place="line">'+(equation.length ? equation.map((tile,index)=>'<button type="button" class="tile" data-drag="equation" data-place="line" data-index="'+index+'" data-symbol="'+tile+'">'+tile+'</button>').join('') : '<span>把算式积木拖到这里</span>')+'</div><p id="equation-note">'+equationNote()+'</p></section>';
}
function equationNote() {
  const expression=equation.join('');
  if (['3×3＝9','3+3+3＝9'].includes(expression)) return '这条算式和秤上的画面一样。指着黄瓜说说，哪个 3 是组数，哪个 3 是每组的根数？';
  if (!expression) return '';
  if (equation.at(-1)==='＝') return '等号右边写的是右盘一共有多少根黄瓜。';
  if (equation.includes('＝')) return '读一遍你搭的算式，再指一指盘里每一组黄瓜。两边说的是同一个总数吗？';
  return '一共用了几组？每组又有几根？可以用乘法，也可以把每组加起来。';
}
function paint() {
  const garden=scene==='garden';
  const question=garden
    ? '2 棵青菜和 6 个苹果一样重，1 个苹果和 3 根黄瓜一样重。<strong>1 棵青菜和几根黄瓜一样重？</strong>'
    : '有红、橙、黄、绿、青、蓝、紫 7 种颜色的铅笔，每种 1 支。<strong>选出 2 支，一共有多少种不同的挑法？</strong>';
  const body=garden
    ? '<div class="scales">'+scaleHTML(0,'① 两棵青菜和六个苹果','第一条线索')+scaleHTML(1,'② 一个苹果和三根黄瓜','第二条线索')+scaleHTML(2,'③ 一棵青菜和几根黄瓜？','要解的问题')+'</div>'
    : '<div class="desk-layout"><section class="desk"><div class="pencils" data-drop="pencil" data-place="desk" aria-label="彩铅桌">'+palette.map((_,index)=>pencilButton(index,'desk')).join('')+'</div><div class="pair-paper">'+pencils.map((index,slot)=>'<div class="slot" data-drop="pencil" data-place="'+slot+'" role="button" tabindex="0" aria-label="第 '+(slot+1)+' 个配对位置">'+(index===null?'拖到这里':pencilButton(index,slot))+'</div>').join('<b aria-hidden="true">＋</b>')+'</div></section><aside class="album"><h2>找到的搭配</h2><p>一共收了 <strong id="count">'+pairs.size+'</strong> 种</p><div class="pair-list">'+[...pairs].map(pairCard).join('')+'</div><form class="answer" id="pencil-answer"><label for="pencil-input">一共有几种？</label><input id="pencil-input" inputmode="numeric" required pattern="[0-9]+" placeholder="写数字"></form></aside></div>';
  main.innerHTML='<article class="scene '+(garden?'garden':'studio')+'"><button class="audio" id="audio" type="button" aria-label="听完整题目">🔊 听题</button><p class="tag">第 '+(garden?'7':'5')+' 题 · '+(garden?'菜园天平':'彩铅工作室')+'</p><h1>'+(garden?'一棵青菜有多重？':'给彩铅找搭档')+'</h1><p class="question">'+question+'</p><p class="instructions">'+(garden?'按住秤盘试试，也可以直接拖动盘里的食物或篮里的黄瓜。':'把彩铅拖到纸上的两个位置。留一支在纸上，再换它的搭档。')+'</p>'+body+'<p class="feedback" id="feedback" role="status">'+esc(feedback)+'</p>'+equationHTML()+transferHTML()+'</article>';
  if (!audio.paused) get('audio').classList.add('playing');
  if (get('pencil-answer')) get('pencil-answer').onsubmit = event => {
    event.preventDefault();
    if (Number(get('pencil-input').value)===21) {
      transferOn=true;
      paint();
      tell('你数到 21 种了。能说说怎样确认没有漏掉，也没有数重吗？','pencilSolved');
    } else tell('试着固定一支，把它的搭档换一遍。换下一支开头时，看看哪些对已经收过。','pencilPair');
  };
  if (get('transfer-answer')) get('transfer-answer').onsubmit = event => {
    event.preventDefault();
    const correct=Number(get('transfer-input').value)===(garden?6:10);
    transferMessage=correct?'这个数字对了。说一说，你是怎么想的？':'再想一想。看看新条件和原来哪里不一样。';
    get('transfer-feedback').textContent=transferMessage;
    play(correct?'transferCorrect':'transferTry');
  };
}
function putFood(from, target) {
  const i=Number(from.dataset.scale);
  const sameScale=i===Number(target.dataset.scale);
  const dest=Number(target.dataset.place);
  const source=Number(from.dataset.place);
  const kind=from.dataset.kind;
  if (!sameScale || source===dest || dest===3 || (i===2 && source===3 && scales[i][0].length+scales[i][1].length+scales[i][2].length>=16)) return;
  if (source!==3) {
    const index=scales[i][source].indexOf(kind);
    if (index<0) return;
    scales[i][source].splice(index,1);
  }
  if (i===2 && dest===2 && kind==='cuke') {
    // The basket accepts unused cucumbers back into its supply.
  } else scales[i][dest].push(kind);
  const [left,right]=scales[i];
  const leftLeaves=left.filter(item=>item==='leaf').length;
  const rightCukes=right.filter(item=>item==='cuke').length;
  const solved=i===2 && left.length===1 && leftLeaves===1 && right.length===9 && rightCukes===9;
  if (solved) equationOn=transferOn=true;
  paint();
  if (solved) tell('两边平了！把 9 根黄瓜在心里分成几组，说说每组有几根。','gardenSolved');
  else if (i===2 && leftLeaves===1 && left.length===1 && right.length===rightCukes) {
    tell(rightCukes<9?'青菜那边沉下去了。还缺多少？':'黄瓜那边沉下去了。可以把一根拖回篮里。',rightCukes<9?'gardenUnder':'gardenOver');
  } else if (i===0 && left.length===1 && leftLeaves===1) {
    const even=right.length===3 && right.every(item=>item==='apple');
    tell(even?'天平还是平的！一棵青菜和这 3 个苹果一样重。':'左盘剩一棵青菜。把右盘的苹果拖进篮里，看看剩几个时会平。',even?'gardenEven':'gardenHalf');
  } else tell('松手后看看哪边沉下去。把食物放回去，秤盘又会怎么动？','gardenPress');
}
function putPencil(from, target) {
  const index=Number(from.dataset.index);
  const source=from.dataset.place;
  const dest=target.dataset.place;
  if (dest===source) return;
  if (dest==='desk') {
    if (source!=='desk') pencils[Number(source)]=null;
    paint();
    return;
  }
  if (pencils[1-Number(dest)]===index) {
    if (source==='desk') { tell('每种颜色只有一支，换一个不同颜色的搭档。','pencilSame'); return; }
    [pencils[0],pencils[1]]=[pencils[1],pencils[0]];
  } else {
    if (source!=='desk') pencils[Number(source)]=null;
    pencils[Number(dest)]=index;
  }
  if (pencils.includes(null)) {
    paint();
    tell('这一支放好了。再找一个不同颜色的搭档。','pencilFirst');
    return;
  }
  const key=[...pencils].sort((a,b)=>a-b).join(',');
  const duplicate=pairs.has(key);
  pairs.add(key);
  latest=key;
  transferOn ||= pairs.size===21;
  paint();
  if (duplicate) tell('收藏夹里已经有这对。调换先后顺序，还是同一对。','pencilRepeat');
  else if (pairs.size===21) tell('找齐了！你是怎样避免漏掉和数重的？','pencilSolved');
  else tell('这是一种新搭配。留一支不动，换另一支试试看。','pencilPair');
}
function putEquation(from, target) {
  const source=from.dataset.place;
  if (source==='line') equation.splice(Number(from.dataset.index),1);
  if (target.dataset.place==='line') {
    if (equation.length>=9) return;
    const before=target.dataset.index;
    if (before===undefined) equation.push(from.dataset.symbol);
    else equation.splice(Number(before),0,from.dataset.symbol);
  }
  paint();
}
const handlers={food:putFood,pencil:putPencil,equation:putEquation};
function moveItem(from,target) {
  if (!from || !target || target.dataset.drop!==from.dataset.drag) return;
  selected=null;
  handlers[from.dataset.drag](from,target);
}
function targetAt(x,y) {
  const node=document.elementFromPoint(x,y);
  const tile=node?.closest('.tile-line .tile');
  const target=node?.closest('[data-drop]');
  if (tile && target) target.dataset.index=tile.dataset.index;
  else if (target) delete target.dataset.index;
  return target;
}
function actOn(target) {
  if (target.dataset.voice) { firstGesture(); play(target.dataset.voice); return; }
  if (target.id==='audio') {
    const first=firstGesture();
    if (!first) play(intro());
    return;
  }
  firstGesture();
  const source=target.closest('[data-drag]');
  if (source) {
    if (source.dataset.drag==='equation') {
      const dest=source.dataset.place==='pool'?'line':'pool';
      moveItem(source,main.querySelector('[data-drop="equation"][data-place="'+dest+'"]'));
      return;
    }
    selected?.classList.remove('selected');
    selected=source===selected?null:source;
    selected?.classList.add('selected');
    return;
  }
  const place=target.closest('[data-drop]');
  if (place && selected) moveItem(selected,place);
}
main.addEventListener('click',event=>{
  if (event.detail && performance.now()-dragEndedAt<350) return;
  if (event.target.closest('button,[data-drop]')) actOn(event.target.closest('button,[data-drop]'));
});
main.addEventListener('keydown',event=>{
  if (event.target.matches('button,input') || !['Enter',' '].includes(event.key)) return;
  const target=event.target.closest('[data-drop]');
  if (!target) return;
  event.preventDefault();
  actOn(target);
});
main.addEventListener('pointerdown',event=>{
  if (!event.isPrimary || event.button!==0) return;
  const item=event.target.closest('[data-drag]');
  const pan=event.target.closest('[data-pan]');
  if (!item && (!pan || selected)) return;
  firstGesture();
  const arm=!item?pan.closest('.arm'):null;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,item,pan,arm};
  if (arm) {
    arm.classList.add('holding');
    arm.style.transform='rotate('+(pan.dataset.pan==='0'?-10:10)+'deg)';
  }
});
window.addEventListener('pointermove',event=>{
  if (drag?.id!==event.pointerId) return;
  const dy=event.clientY-drag.y;
  if (drag.arm) {
    const direction=drag.pan.dataset.pan==='0'?-1:1;
    drag.arm.style.transform='rotate('+direction*Math.max(-15,Math.min(15,dy*.4))+'deg)';
    return;
  }
  if (!drag.ghost && Math.hypot(event.clientX-drag.x,dy)>6) {
    drag.ghost=drag.item.cloneNode(true);
    drag.ghost.classList.add('ghost');
    drag.ghost.setAttribute('aria-hidden','true');
    drag.ghost.tabIndex=-1;
    document.body.append(drag.ghost);
    drag.item.classList.add('dragged');
  }
  if (!drag.ghost) return;
  drag.ghost.style.left=event.clientX+'px';
  drag.ghost.style.top=event.clientY+'px';
  const next=targetAt(event.clientX,event.clientY);
  drag.over?.classList.remove('drop-over');
  drag.over=next?.dataset.drop===drag.item.dataset.drag?next:null;
  drag.over?.classList.add('drop-over');
});
function end(event) {
  if (drag?.id!==event.pointerId) return;
  const ended=drag;
  drag=null;
  ended.arm?.classList.remove('holding');
  if (ended.arm) {
    ended.arm.style.removeProperty('transform');
    if (event.type==='pointerup') tell('松开手，秤盘回到食物的重量决定的位置。','gardenPress');
  }
  ended.item?.classList.remove('dragged');
  ended.over?.classList.remove('drop-over');
  if (!ended.ghost) return;
  ended.ghost.remove();
  dragEndedAt=performance.now();
  if (event.type==='pointerup') moveItem(ended.item,targetAt(event.clientX,event.clientY));
}
window.addEventListener('pointerup',end);
window.addEventListener('pointercancel',end);
function route() {
  audio.pause();
  scene=location.hash==='#pencils'?'pencils':'garden';
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash===location.hash || (!location.hash && link.hash==='#balance')) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  introPlayed=false;
  lastVoice='';
  selected=null;
  equation=[];
  transferOn=equationOn=false;
  transferMessage='';
  scales=[[['leaf','leaf'],Array(6).fill('apple'),[]],[['apple'],Array(3).fill('cuke'),[]],[['leaf'],[],[]]];
  pencils=[null,null];
  pairs=new Set();
  latest=null;
  feedback=scene==='garden'?'秤盘可以按住试，篮里的食物可以拿起来拖。':'先拖两支不同颜色的铅笔，看看收藏夹有什么变化。';
  paint();
  if (audioUnlocked) firstGesture();
}
window.addEventListener('hashchange',route);
route();

