
const world = document.getElementById('world');
const film = document.getElementById('film');
const entry = document.getElementById('entry');
const caption = document.getElementById('caption');
const replay = document.getElementById('replay');
const player = new Audio();
player.preload = 'auto';
let shot='opening', leaves=2, apples=6, revealed=false, replaced=0;
let serial=0, lastLine='', drag=null, selected=null, ignoreClick=0, sound;
let priorTilt=0, lastRendered='';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stepIds={leaves:'把一棵青菜拖进篮子',apples:'把苹果拖进篮子',exchange:'碰一碰苹果'};
const zoom=()=>world.setAttribute('viewBox',innerWidth<620?'145 0 910 675':'0 0 1200 675');
window.addEventListener('resize',zoom);zoom();
function effect(notes) {
  try {
    sound ??= new AudioContext();
    void sound.resume();
    notes.forEach((frequency,index)=>{
      const start=sound.currentTime+index*.085;
      const tone=sound.createOscillator();
      const volume=sound.createGain();
      tone.type='sine';
      tone.frequency.value=frequency;
      volume.gain.setValueAtTime(.032,start);
      volume.gain.exponentialRampToValueAtTime(.001,start+.18);
      tone.connect(volume).connect(sound.destination);
      tone.start(start);tone.stop(start+.19);
    });
  } catch {}
}
let settleVoice;
function stopVoice() {
  player.pause();
  replay.classList.remove('playing');
  settleVoice?.();
  settleVoice=null;
}
function say(id) {
  lastLine=id;
  caption.hidden=false;
  caption.textContent=lines[id];
  stopVoice();
  player.src='data:audio/mpeg;base64,'+clips[id];
  const duration=new Promise(resolve=>{settleVoice=resolve;});
  player.onended=()=>{replay.classList.remove('playing');settleVoice?.();settleVoice=null;};
  player.onerror=()=>{settleVoice?.();settleVoice=null;};
  player.onplay=()=>replay.classList.add('playing');
  void player.play().catch(()=>{});
  return Promise.race([duration,pause(11000)]);
}
async function speak(ids) {
  const pass=++serial;
  for (const id of ids) {
    if (serial!==pass) return;
    await say(id);
    if (ids.length>1) await pause(310);
  }
}
function go(next) {
  ++serial;
  stopVoice();
  selected=null;
  shot=next;
  film.dataset.shot=next;
  render();
}
const definitions='<defs>'+
  '<linearGradient id="wood" x2="0" y2="1"><stop stop-color="#f6c185"/><stop offset=".45" stop-color="#b96a31"/><stop offset="1" stop-color="#653319"/></linearGradient>'+
  '<linearGradient id="gold" x2="0" y2="1"><stop stop-color="#ffeb9f"/><stop offset=".46" stop-color="#e0a951"/><stop offset="1" stop-color="#87501d"/></linearGradient>'+
  '<linearGradient id="turq" x2="0" y2="1"><stop stop-color="#78d2bb"/><stop offset=".38" stop-color="#377e70"/><stop offset="1" stop-color="#1a463d"/></linearGradient>'+
  '<radialGradient id="red" cx=".33" cy=".25" r=".77"><stop stop-color="#ffb96d"/><stop offset=".39" stop-color="#ed5233"/><stop offset="1" stop-color="#9f2633"/></radialGradient>'+
  '<linearGradient id="leaf" x1=".1" y1=".1" x2=".8" y2="1"><stop stop-color="#e6f6a5"/><stop offset=".45" stop-color="#7abd50"/><stop offset="1" stop-color="#237a40"/></linearGradient>'+
  '<linearGradient id="cuke" x1="0" y1=".2" x2=".8" y2="1"><stop stop-color="#a1dc72"/><stop offset=".52" stop-color="#579a50"/><stop offset="1" stop-color="#295e43"/></linearGradient>'+
  '<linearGradient id="paper" x2="0" y2="1"><stop stop-color="#ffe9b2"/><stop offset="1" stop-color="#d1a674"/></linearGradient>'+
  '<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#251b14" flood-opacity=".32"/></filter>'+
  '<symbol id="apple" viewBox="-37 -37 74 74"><path d="M0-13Q-12-24-26-15C-42-4-30 30-14 31Q-5 30 0 26Q10 35 23 29C43 15 39-14 22-19Q10-23 0-13Z" fill="url(#red)" stroke="#8a3029" stroke-width="1.7"/><path d="M-1-13Q0-23 6-32" fill="none" stroke="#794829" stroke-width="4" stroke-linecap="round"/><path d="M2-24Q15-40 28-30Q24-19 3-21" fill="url(#leaf)"/><ellipse cx="-19" cy="-4" rx="7" ry="10" fill="#fff5bf" opacity=".37" transform="rotate(24 -19 -4)"/></symbol>'+
  '<symbol id="leaf-sprite" viewBox="-40 -41 80 82"><path d="M-4 35Q-31 26-34 8T-25-17Q-26-39-8-34Q5-48 18-31Q37-33 33-10Q47 8 31 23Q14 39-4 35" fill="url(#leaf)" stroke="#448b3e" stroke-width="2"/><path d="M-6 34Q3 15 4-29M-5 27Q-8 3-24-15M1 29Q15 11 26-2M-3 16Q-16 12-29 4M4 9Q15 6 23-12" fill="none" stroke="#e8f3a3" stroke-width="3" stroke-linecap="round" opacity=".72"/><path d="M-19 32Q-5 29 13 32L9 39H-11Z" fill="#e3edb4"/></symbol>'+
  '<symbol id="cuke-sprite" viewBox="-35 -18 70 36"><path d="M-30-3Q-25-15 14-14Q32-15 34-5Q36 7 13 13Q-12 19-29 11Q-38 6-30-3Z" fill="url(#cuke)" stroke="#365b38" stroke-width="1.8"/><path d="M-22-2Q-9-8 18-7" fill="none" stroke="#d3f5a0" stroke-width="3" opacity=".47" stroke-linecap="round"/><circle cx="-11" cy="8" r="1.7" fill="#386447"/><circle cx="4" cy="5" r="1.4" fill="#386447"/><circle cx="20" cy="1" r="1.4" fill="#386447"/></symbol>'+
  '<symbol id="bundle-sprite" viewBox="-41 -37 82 74"><use href="#cuke-sprite" x="-37" y="-31" width="74" height="36" transform="rotate(-9)"/><use href="#cuke-sprite" x="-37" y="-13" width="74" height="36" transform="rotate(5)"/><use href="#cuke-sprite" x="-37" y="5" width="74" height="36" transform="rotate(-6)"/><path d="M1-23Q-6 4 2 26" stroke="#f5d191" stroke-width="5" fill="none"/><path d="M0-4Q-23-22-13-22Q-7-23 0-4Q12-22 17-15Q22-7 0-4" stroke="#f5d191" stroke-width="2.3" fill="none"/></symbol>'+
  '<symbol id="basket" viewBox="-82 -68 164 136"><path d="M-48 0Q-44-64 1-62Q51-64 53 1" fill="none" stroke="#985d32" stroke-width="13"/><path d="M-48 0Q-44-64 1-62Q51-64 53 1" fill="none" stroke="#f1be75" stroke-width="7"/><ellipse cy="-7" rx="70" ry="19" fill="#532f21" stroke="#c5874f" stroke-width="7"/><path d="M-71-7Q0 16 71-7L59 44Q0 71-59 44Z" fill="url(#wood)" stroke="#8b4b28" stroke-width="2"/><path d="M-66 6Q0 27 66 6M-64 20Q0 40 64 20M-61 33Q0 54 61 33M-42 4L-32 49M-17 8L-13 53M17 9L13 53M42 4L32 49" fill="none" stroke="#f2bb75" stroke-width="3" opacity=".75"/></symbol>'+
  '</defs>';
function part(sprite,x,y,size,id,label,active,highlight=false,extra='') {
  return '<g transform="translate('+x+' '+y+')" class="'+(active?'part ':'')+extra+'" '+(active?'data-part="'+id+'" data-sprite="'+sprite+'" data-size="'+size+'" role="button" tabindex="0" aria-label="'+label+'"':'')+'>'+
    (active?'<circle r="'+Math.max(size/2,30)+'" fill="transparent"/>':'')+
    (highlight?'<circle class="halo" r="'+(size*.52)+'"/>':'')+
    '<use href="#'+sprite+'" x="'+(-size/2)+'" y="'+(-size/2)+'" width="'+size+'" height="'+size+'" filter="url(#shadow)"/></g>';
}
const fireflies=()=>'<g class="petals">'+Array.from({length:18},(_,i)=>'<circle cx="'+(80+(i*73)%1050)+'" cy="'+(105+(i*59)%390)+'" r="'+(1.4+(i%3))+'" fill="#ffeeb7" style="--delay:-'+(i*.57)+'s"/>').join('')+'</g>';
function spark(fromX,fromY,toX,toY) {
  const path='M '+fromX+' '+fromY+' Q '+((fromX+toX)/2)+' '+(Math.min(fromY,toY)-35)+' '+toX+' '+toY;
  return '<g class="hint-spark" style="offset-path:path(\''+path+'\')"><path d="M0-12L9 0L0 12L2 2L-13 3V-3L2-2Z" fill="#fff3bc" stroke="#8b662b" stroke-width="2" filter="url(#shadow)"/></g>';
}
function scale({left,right,tilt,activePan=false,spot=false}) {
  const cx=650, ax=483,bx=817, y=321;
  const ly=y-tilt, ry=y+tilt;
  const pan=(side,x,py,items)=>'<g transform="translate('+x+' '+py+')" '+(activePan&&side==='right'?'class="place" data-place="pan" role="button" tabindex="0" aria-label="空秤盘"':'')+'>'+
    (activePan&&side==='right'?'<ellipse rx="99" ry="67" cy="-18" fill="transparent"/>'+(spot?'<ellipse class="halo" rx="102" ry="47" cy="-10"/>':''):'')+
    '<path d="M-93 6Q-76 45 0 48Q74 46 93 6Z" fill="url(#turq)" stroke="#244b3e" stroke-width="3" filter="url(#shadow)"/>'+
    '<ellipse cy="6" rx="94" ry="17" fill="#417f72" stroke="#dbad64" stroke-width="7"/><ellipse cy="3" rx="83" ry="10" fill="#5b9785" opacity=".67"/>'+
    items+'</g>';
  const physical='<ellipse cx="652" cy="460" rx="144" ry="18" fill="#3c261b" opacity=".25"/><path d="M555 447Q650 426 745 447L740 465H562Z" fill="url(#wood)" stroke="#704221" stroke-width="2" filter="url(#shadow)"/><path d="M601 448Q630 425 632 354L638 314H662L669 354Q670 426 698 448Z" fill="url(#turq)" stroke="#315448" stroke-width="3"/><circle cx="650" cy="411" r="16" fill="#ac853d" stroke="#f6d287" stroke-width="3"/>';
  const animate=lastRendered===shot && priorTilt!==tilt;
  const motion=(sign)=>animate?'<animateTransform attributeName="transform" type="translate" from="0 '+(sign*(priorTilt-tilt))+'" to="0 0" dur=".24s"/>':'';
  const bar='<path d="M'+ax+' '+(ly+20)+' L'+bx+' '+(ry+20)+'" stroke="#704926" stroke-width="21" stroke-linecap="round"/><path d="M'+ax+' '+(ly+16)+' L'+bx+' '+(ry+16)+'" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+(y+17)+'" r="14" fill="#d49e48" stroke="#ffe5a0" stroke-width="3"/>';
  priorTilt=tilt;
  return physical+bar+'<g>'+motion(-1)+pan('left',ax,ly,left)+'</g><g>'+motion(1)+pan('right',bx,ry,right)+'</g>';
}
function basket(x,y,kind,highlight=true) {
  return '<g class="place" data-place="'+kind+'" role="button" tabindex="0" aria-label="旁边的篮子" transform="translate('+x+' '+y+')">'+
    '<ellipse rx="72" ry="20" cy="37" fill="#53341d" opacity=".23"/><rect x="-81" y="-67" width="162" height="133" rx="40" fill="transparent"/>'+
    (highlight?'<ellipse class="halo" rx="69" ry="42" cy="-10"/>':'')+
    '<use href="#basket" x="-78" y="-63" width="156" height="126" filter="url(#shadow)"/></g>';
}
function applePile(n,active,animate) {
  const centers=[[-55,-18],[0,-18],[55,-18],[-44,-62],[12,-62],[59,-62]];
  return Array.from({length:n},(_,i)=>part('apple',centers[i][0],centers[i][1],57,'apple','苹果',active,active&&i===n-1,animate?'intro-prop':'')).join('');
}
function render() {
  const newShot=lastRendered!==shot;
  let content='';
  if (shot==='leaves'||shot==='apples') {
    const left=leaves===2?part('leaf-sprite',-43,-29,76,'leaf','青菜',shot==='leaves',true,'intro-prop')+part('leaf-sprite',39,-29,76,'leaf','青菜',shot==='leaves',false,'intro-prop'):part('leaf-sprite',0,-27,78,'leaf','青菜',false);
    const right=applePile(apples,shot==='apples'&&apples>3,shot==='leaves');
    const tilt=shot==='leaves'?0:Math.max(0,Math.min(33,(apples-3)*11));
    content=scale({left,right,tilt})+basket(984,416,'basket',apples>3);
    if (apples>3) content+=shot==='leaves'?spark(438,274,938,408):spark(823,271,938,397);
  } else if (shot==='exchange') {
    const left=part('apple',0,-32,91,'exchange','苹果',!revealed,!revealed,'intro-prop');
    const right=revealed?[-53,0,53].map((x,i)=>'<g style="--delay:'+(.09*i)+'s">'+part('cuke-sprite',x,-23,74,'','',false,false,'intro-prop')+'</g>').join(''):'';
    content=scale({left,right,tilt:revealed?0:-22});
    if (!revealed) content+=spark(423,223,477,282);
  } else if (shot==='bridge'||shot==='variation'||shot==='end') {
    const perApple=shot==='bridge'?3:2;
    const xs=[-58,0,58];
    const left=part('leaf-sprite',0,-32,87,'','',false);
    const right=xs.map((x,i)=>{
      if(i>=replaced) return part('apple',x,-20,54,'replace','把这个苹果换成黄瓜',i===replaced,i===replaced);
      const group=Array.from({length:perApple},(_,j)=>part('cuke-sprite',x,-45+j*13,47,'','',false)).join('');
      return '<g class="'+(i===replaced-1?'swap-in':'')+'"><rect x="'+(x-26)+'" y="-63" width="52" height="64" rx="11" fill="#a0c47842" stroke="#e4dea0" stroke-width="1.8"/>'+group+'</g>';
    }).join('');
    content=scale({left,right,tilt:0});
    if(replaced<3&&shot!=='end')content+=spark(817+xs[replaced],232,817+xs[replaced],285);
    if(shot!=='bridge')content+='<g transform="translate(978 414)"><use href="#basket" x="-75" y="-58" width="150" height="112"/>'+part('cuke-sprite',-14,-28,54,'','',false)+part('cuke-sprite',15,-33,54,'','',false)+boardText(0,61,'一个苹果换两根',20)+'</g>';
    if(shot==='end')content+='<rect x="505" y="495" width="310" height="48" rx="18" fill="url(#paper)" stroke="#95572f" stroke-width="2"/>'+boardText(660,526,'组数一样，每组的根数变了',22);
  }
  const rabbit=shot==='opening'?'':'<ellipse cx="262" cy="472" rx="75" ry="13" fill="#2a2b19" opacity=".22"/><image class="rabbit" x="174" y="210" width="194" height="271" href="__RABBIT__"/>';
  world.innerHTML=definitions+fireflies()+'<g class="'+(newShot?'scene-art':'')+'">'+rabbit+content+'</g>';
  lastRendered=shot;
}
function boardText(x,y,text,size=21) {
  return '<text x="'+x+'" y="'+y+'" text-anchor="middle" fill="#654024" font-weight="850" font-size="'+size+'">'+text+'</text>';
}
function advance(source,target) {
  if (shot==='leaves'&&source.dataset.part==='leaf'&&target?.dataset.place==='basket') {
    leaves=1;go('apples');effect([290]);void speak(['tip','halve']);return;
  }
  if (shot==='apples'&&apples>3&&source.dataset.part==='apple'&&target?.dataset.place==='basket') {
    apples--;render();
    if (apples===3) {
      effect([415,554,659]);
      const stamp=serial+1;
      void speak(['balanced']).then(()=>{if(shot!=='apples'||serial!==stamp)return;go('exchange');void speak(['one']);});
    } else effect([270+apples*20]);
    return;
  }
}
function tapPart(part) {
  if(shot==='exchange'&&part.dataset.part==='exchange'&&!revealed){
    revealed=true;render();effect([360,440,540]);
    const stamp=serial+1;
    void speak(['three']).then(()=>{if(shot!=='exchange'||serial!==stamp)return;replaced=0;go('bridge');void speak(['bridge']);});
    return;
  }
  if(part.dataset.part==='replace'&&replaced<3){
    replaced++;
    render();
    effect([390+replaced*40,490+replaced*50]);
    if(shot==='bridge'){
      if(replaced===1)void speak(['bridgeOne']);
      if(replaced===2)void speak(['bridgeTwo']);
      if(replaced===3){
        const stamp=serial+1;
        void speak(['bridgeDone']).then(()=>{
          if(shot!=='bridge'||serial!==stamp)return;
          replaced=0;go('variation');void speak(['change']);
        });
      }
    }else if(shot==='variation'&&replaced===3){go('end');void speak(['changeDone']);}
    return;
  }
  selected?.classList.remove('selected');
  selected=selected===part?null:part;
  selected?.classList.add('selected');
}
function coordinates(event) {
  const p=world.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
  return p.matrixTransform(world.getScreenCTM().inverse());
}
world.addEventListener('pointerdown',event=>{
  const part=event.target.closest('[data-part]');
  if (!part||!event.isPrimary||event.button!==0||['exchange','replace'].includes(part.dataset.part)||(shot==='apples'&&apples===3))return;
  drag={part,id:event.pointerId,x:event.clientX,y:event.clientY};
});
window.addEventListener('pointermove',event=>{
  if (drag?.id!==event.pointerId)return;
  if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6){
    drag.ghost=drag.part.cloneNode(true);
    drag.ghost.classList.add('ghost');
    drag.ghost.removeAttribute('role');drag.ghost.removeAttribute('tabindex');drag.ghost.removeAttribute('data-part');
    world.append(drag.ghost);drag.part.classList.add('lifted');
  }
  if(!drag.ghost)return;
  const pos=coordinates(event);
  drag.ghost.setAttribute('transform','translate('+pos.x+' '+pos.y+')');
  drag.target?.classList.remove('over');
  drag.target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-place]');
  drag.target?.classList.add('over');
});
function release(event) {
  if(drag?.id!==event.pointerId)return;
  const state=drag;drag=null;
  if(!state.ghost)return;
  state.ghost.remove();state.part.classList.remove('lifted');state.target?.classList.remove('over');
  ignoreClick=performance.now()+300;
  if(event.type==='pointerup'&&state.target){selected=null;advance(state.part,state.target);}
}
window.addEventListener('pointerup',release);
window.addEventListener('pointercancel',release);
function activate(target) {
  const part=target.closest('[data-part]');
  if(part){tapPart(part);return;}
  const place=target.closest('[data-place]');
  if(place&&selected) {const source=selected;selected=null;source.classList.remove('selected');advance(source,place);}
}
world.addEventListener('click',event=>{if(performance.now()>ignoreClick)activate(event.target);});
world.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();activate(event.target);}});
film.addEventListener('click',()=>{
  if(film.dataset.shot!=='opening')return;
  entry.hidden=true;replay.hidden=false;
  go('leaves');
  effect([392,494,587]);
  void speak(['hello','clue','question']);
});
replay.addEventListener('click',()=>{if(lastLine){player.currentTime=0;void player.play().catch(()=>{});}});
render();

