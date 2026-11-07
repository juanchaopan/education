
const world=document.getElementById('world');
const film=document.getElementById('film');
const caption=document.getElementById('caption');
const replay=document.getElementById('replay');
const entry=document.getElementById('entry');
const names=['红','橙','黄','绿','青','蓝','紫'];
const inks=['#dc4655','#ef8a42','#e5af3c','#5eae63','#31b4af','#547cda','#9b65d5'];
const intros=['red','orangeStart','yellowStart','greenStart','cyanStart','blueStart'];
const player=new Audio();
let phase='opening', row=0, cursor=1, work=[], completed=[];
let chosen=null, drag=null, cooldown=0, sound, stamp=0, lastMove=false;
const counted=new Set();
let automatic=false;
let voiceQueue=Promise.resolve();
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shade=i=>i===2?'#65410f':'#fff7e7';
const media=matchMedia('(max-width: 620px)');
function zoom(){world.setAttribute('viewBox',media.matches?'150 0 900 675':'0 0 1200 675');}
zoom();media.addEventListener('change',zoom);
function step(next){phase=next;film.dataset.shot=next;render();}
function speak(key,onStart){
  const clip=voiceQueue.then(()=>new Promise(resolve=>{
    caption.hidden=false;caption.textContent=lines[key];
    let began=false;
    const start=()=>{
      if(began)return;
      began=true;onStart?.();
    };
    const finish=()=>{start();replay.classList.remove('playing');resolve();};
    player.onplaying=()=>{replay.classList.add('playing');start();};
    player.onended=finish;
    player.onerror=finish;
    player.src='data:audio/mpeg;base64,'+clips[key];
    void player.play().catch(()=>setTimeout(finish,850));
  }));
  voiceQueue=clip;
  return clip;
}
function show(text){caption.hidden=false;caption.textContent=text;}
function plink(index){
  try {
    sound ??= new AudioContext();
    void sound.resume();
    const start=sound.currentTime;
    const tone=sound.createOscillator(), gain=sound.createGain();
    tone.frequency.setValueAtTime(410+index*46,start);
    tone.frequency.exponentialRampToValueAtTime(310+index*40,start+.14);
    gain.gain.setValueAtTime(.057,start);
    gain.gain.exponentialRampToValueAtTime(.001,start+.2);
    tone.connect(gain).connect(sound.destination);tone.start(start);tone.stop(start+.21);
  } catch {}
}
const definitions='<defs>'+
  inks.map((ink,i)=>'<linearGradient id="ink'+i+'" x1="0" y1="0" x2="1" y2="0"><stop stop-color="'+ink+'"/><stop offset=".28" stop-color="'+ink+'"/><stop offset=".39" stop-color="#fff" stop-opacity=".52"/><stop offset=".47" stop-color="'+ink+'"/><stop offset=".8" stop-color="'+ink+'"/><stop offset="1" stop-color="#312241"/></linearGradient>').join('')+
  '<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff7e6"/><stop offset="1" stop-color="#eacda9"/></linearGradient>'+
  '<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffc47c"/><stop offset="1" stop-color="#a76245"/></linearGradient>'+
  '<linearGradient id="velvet" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#614979"/><stop offset="1" stop-color="#30253e"/></linearGradient>'+
  '<filter id="shadow" x="-32%" y="-32%" width="164%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#372143" flood-opacity=".31"/></filter>'+
  '</defs>';
function text(x,y,value,style=''){
  return '<text x="'+x+'" y="'+y+'" text-anchor="middle" class="svg-label '+style+'">'+value+'</text>';
}
function pencilShape(i,x,y,scale=1,rotate=0){
  return '<g transform="translate('+x+' '+y+') rotate('+rotate+') scale('+scale+')">'+
    '<path d="M-16-40L0-71L16-40V57Q16 66 8 68H-8Q-16 66-16 57Z" fill="url(#ink'+i+')" stroke="'+inks[i]+'" stroke-width="1.1"/>'+
    '<path d="M-16-39L0-71L16-39Q9-45 4-39Q0-44-4-39Q-10-43-16-39" fill="#e9bc91"/><path d="M-5-61L0-71L5-61Q0-57-5-61Z" fill="'+inks[i]+'"/>'+
    '<path d="M-11-31V54" stroke="#fff8ed" stroke-width="2.2" opacity=".55"/><path d="M-14 50H14" stroke="#fff8ed" stroke-width="2" opacity=".45"/></g>';
}
function rackPart(i,active){
  const x=260+113*i, y=211;
  const older=i<row;
  return '<g transform="translate('+x+' '+y+')" class="'+(active?'part pencil-active':'')+(older?' pencil-past':'')+'" '+(active?'data-pencil="'+i+'" role="button" tabindex="0" aria-label="'+names[i]+'色铅笔"':'')+'>'+
    (active?'<ellipse class="halo" rx="42" ry="80"/><rect x="-42" y="-79" width="84" height="163" fill="transparent"/>':'')+
    '<ellipse cy="70" rx="31" ry="7" fill="#583858" opacity=".3"/>'+
    pencilShape(i,0,0,.89,active?-6:(i%2?3:-2))+text(0,95,names[i],active?'rack-name active-name':'rack-name')+
    (older?'<circle cx="26" cy="-53" r="15" fill="#537e68" stroke="#c1efab" stroke-width="2"/><path d="m19-53 4 5 8-10" fill="none" stroke="#f5ffd5" stroke-width="3" stroke-linecap="round"/>':'')+'</g>';
}
function pairCard(anchor,partner,x,y,scale=1,land=false){
  return '<g transform="translate('+x+' '+y+') scale('+scale+')"><g class="'+(land?'pair-land':'')+'">'+
    '<rect x="-32" y="-29" width="64" height="58" rx="12" fill="url(#paper)" stroke="#e5a877" stroke-width="2" filter="url(#shadow)"/>'+
    pencilShape(anchor,-10,0,.32,-10)+pencilShape(partner,10,0,.32,10)+
    '</g></g>';
}
function pulseArrow(x,y){
  return '<g class="cartoon-pointer" transform="translate('+x+' '+y+')"><path d="M-7-15H7V-2H18L0 16L-18-2H-7Z" fill="#fff4ab" stroke="#78455a" stroke-width="3" stroke-linejoin="round" filter="url(#shadow)"/></g>';
}
function archiveMini(){
  if (!completed.length)return '';
  return '<g class="archive"><rect x="901" y="310" width="162" height="226" rx="25" fill="url(#velvet)" stroke="#f7c893" stroke-width="3" filter="url(#shadow)"/>'+text(982,341,'收好的组合','archive-title')+
    completed.map((items,i)=>{
      const y=362+i*27;
      return '<g class="'+(i===completed.length-1?'archive-in':'')+'"><rect x="914" y="'+(y-11)+'" width="135" height="22" rx="11" fill="'+inks[i]+'" opacity=".84"/>'+
        items.map((partner,n)=>pairCard(i,partner,926+n*16,y,.245)).join('')+text(1035,y+5,String(items.length),i===2?'archive-row dark':'archive-row')+'</g>';
    }).join('')+'</g>';
}
function linkPair(anchor,partner,inMotion){
  if(partner===null)return '';
  const rackX=260+113*partner;
  const path='M474 382 Q556 344 643 382';
  const flight='M474 382 Q556 321 '+rackX+' 235';
  return '<g class="pair-link" data-link="'+anchor+','+partner+'"><path d="'+path+'" stroke="'+inks[partner]+'">'+
    (inMotion?'<animate attributeName="d" from="'+flight+'" to="'+path+'" dur=".54s" fill="freeze"/>':'')+
    '</path><circle cx="474" cy="382" r="6" fill="'+inks[anchor]+'"/>'+
    '<circle cx="643" cy="382" r="6" fill="'+inks[partner]+'">'+
    (inMotion?'<animate attributeName="cx" from="'+rackX+'" to="643" dur=".54s" fill="freeze"/><animate attributeName="cy" from="235" to="382" dur=".54s" fill="freeze"/>':'')+
    '</circle></g>';
}
function studio(){
  const active=phase==='chooseAnchor'?row:phase==='pair'?cursor:-1;
  const pairScene=!['chooseAnchor','introHold'].includes(phase);
  const partner=lastMove?work.at(-1):null;
  const setup='<g class="rack"><rect x="209" y="137" width="786" height="153" rx="31" fill="url(#velvet)" stroke="#edb88a" stroke-width="4" filter="url(#shadow)"/><path d="M231 268H970" stroke="#e4ae85" stroke-opacity=".48" stroke-width="3"/></g>'+
    names.map((_,i)=>rackPart(i,i===active)).join('')+(active>=0?pulseArrow(260+113*active,114):'');
  const paper='<g transform="rotate(-1 566 421)"><rect x="244" y="319" width="629" height="208" rx="26" fill="url(#paper)" stroke="#ffeed1" stroke-width="4" filter="url(#shadow)"/><path d="M266 458H848" stroke="#dfb28c" stroke-width="2" opacity=".6"/></g>';
  const left='<g class="target" data-slot="anchor" role="button" aria-label="放开头的铅笔" tabindex="0">'+
    '<rect x="363" y="334" width="117" height="113" rx="16" fill="#ffead3" stroke="'+inks[row]+'" stroke-width="3" stroke-dasharray="'+(pairScene?'0':'7 5')+'"/>'+
    (pairScene?pencilShape(row,422,389,.68,-13)+text(420,441,'留在这里','card-label'):text(423,397,'把红笔放这里','card-label'))+'</g>';
  const right='<g class="target" data-slot="partner" role="button" aria-label="放搭档铅笔" tabindex="0">'+
    '<rect x="633" y="334" width="117" height="113" rx="16" fill="#ffead3" stroke="#c298ab" stroke-width="3" stroke-dasharray="7 5"/>'+
    (partner===null?text(692,397,'搭档放这里','card-label'):
      automatic?'<g class="pencil-flight" style="--from-x:'+(260+113*partner-692)+'px">'+pencilShape(partner,692,388,.68,12)+'</g>':
      pencilShape(partner,692,388,.68,12))+'</g>';
  const rowCards=work.map((i,n)=>pairCard(row,i,307+83*n,491,.92,n===work.length-1&&lastMove)).join('');
  const duplicate=pairScene&&row===1&&work.length===0
    ? '<g class="already">'+pairCard(0,1,377,489,.68)+text(475,497,'红橙已经收过','card-label')+'</g>' : '';
  return setup+paper+left+right+linkPair(row,partner,automatic)+(partner===null?text(554,403,'＋','pair-plus'):
    text(554,440,names[row]+names[partner]+' · 第 '+work.length+' 对','card-label'))+
    '<g class="'+(automatic?'auto-pair-row':'')+'">'+rowCards+'</g>'+archiveMini()+duplicate;
}
function tally(){
  const final=phase==='end';
  const next=completed.findIndex((_,i)=>!counted.has(i));
  const sum=[...counted].sort((a,b)=>a-b).map(i=>completed[i].length).join(' ＋ ');
  const tallyCaption=final?'一共 21 种不同挑法':sum||'点亮每一排，把对数合起来';
  return '<g class="tally-in"><rect x="235" y="84" width="731" height="483" rx="33" fill="url(#velvet)" stroke="#f4bd93" stroke-width="5" filter="url(#shadow)"/>'+
    text(600,134,'每一种搭配，只出现一次','tally-title')+
    completed.map((items,i)=>{
      const y=175+i*55, done=counted.has(i), current=i===next;
      return '<g class="tally-row '+(current?'current':'')+'" '+(!final?'data-tally="'+i+'" role="button" aria-label="'+names[i]+'笔这一排，'+items.length+' 对" aria-pressed="'+done+'" tabindex="0"':'')+'>'+
        '<rect x="263" y="'+(y-24)+'" width="679" height="49" rx="16" fill="'+(done?'#a789a2':'#746084')+'" stroke="'+(current?'#ffe39e':'#b095aa')+'" stroke-width="'+(current?3:1)+'"/>'+
        '<circle cx="295" cy="'+y+'" r="17" fill="'+inks[i]+'"/><text x="295" y="'+(y+6)+'" text-anchor="middle" fill="'+shade(i)+'" font-size="16" font-weight="900">'+names[i]+'</text>'+
        items.map((partner,n)=>pairCard(i,partner,351+n*76,y,.72)).join('')+
        '<rect x="844" y="'+(y-18)+'" width="69" height="36" rx="12" fill="'+(done?'#f5dc9f':'#4c3c63')+'"/>'+
        '<text x="878" y="'+(y+7)+'" text-anchor="middle" fill="'+(done?'#583f39':'#fff1d7')+'" font-size="20" font-weight="900">'+items.length+' 对</text>'+
        (current?'<rect class="tally-guide" x="266" y="'+(y-22)+'" width="673" height="45" rx="14" fill="none" stroke="#ffe5a3" stroke-width="3" stroke-dasharray="7 5"/>':'')+
        (!final?'<rect x="263" y="'+(y-24)+'" width="679" height="49" rx="16" fill="transparent" pointer-events="all"/>':'')+
        '</g>';
    }).join('')+text(600,536,tallyCaption,'tally-sum')+'</g>';
}
function render(){
  world.innerHTML=definitions+(phase==='opening'?'':phase==='tally'||phase==='end'?tally():studio());
}
async function nextRow(){
  automatic=false;
  completed.push([...work]);
  work=[];
  lastMove=false;
  render();
  if(row===0) await speak('redCount');
  else if(row===1) await speak('orangeCount');
  else {show(names[row]+'笔这一排，有 '+(6-row)+' 对。');await wait(900);}
  if(row===5) {step('tally');void speak('last');return;}
  row++;
  cursor=row+1;
  step('pairHold');
  void speak(intros[row],()=>step('pair'));
}
async function animateRemaining(){
  step('rolling');
  for(;cursor<7;cursor++){
    await wait(1400);
    automatic=true;
    work.push(cursor);lastMove=true;render();plink(work.length);
    show(names[row]+names[cursor]+'，第 '+work.length+' 对。'+names[row]+'笔还留在原位。');
  }
  await wait(1450);
  await nextRow();
}
function place(index,slot){
  chosen=null;
  if(phase==='chooseAnchor'&&index===0&&slot==='anchor'){
    step('pairHold');plink(0);void speak('orange',()=>step('pair'));return;
  }
  if(phase!=='pair'||index!==cursor||slot!=='partner')return;
  automatic=false;
  work.push(index);cursor++;lastMove=true;plink(work.length);
  if(row===0&&work.length===1){
    step('pairHold');
    void speak('redOrange').then(()=>speak('yellowNext',()=>step('pair')));
    return;
  }
  step('rolling');
  const turn=++stamp;
  const continuePairs=()=>{
    if(stamp!==turn)return;
    if(cursor>=7)void nextRow();
    else void animateRemaining();
  };
  if(row===0)void speak('redRest',continuePairs);
  else void voiceQueue.then(continuePairs);
}
function activate(target){
  const source=target.closest('[data-pencil]');
  const slot=target.closest('[data-slot]');
  const tallyRow=target.closest('[data-tally]');
  if(source){
    const index=Number(source.dataset.pencil);
    if(chosen===index){chosen=null;source.classList.remove('selected');}
    else{chosen=index;source.classList.add('selected');}
    return;
  }
  if(slot&&chosen!==null){place(chosen,slot.dataset.slot);return;}
  if(phase==='tally'&&tallyRow){
    const i=Number(tallyRow.dataset.tally);
    if(counted.has(i))return;
    counted.add(i);plink(counted.size);render();
    if(counted.size===6){void voiceQueue.then(()=>{step('end');void speak('finish');});}
  }
}
function coords(event){
  const p=world.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
  return p.matrixTransform(world.getScreenCTM().inverse());
}
world.addEventListener('pointerdown',event=>{
  const src=event.target.closest('[data-pencil]');
  if(!src||!event.isPrimary||event.button!==0)return;
  drag={src,index:Number(src.dataset.pencil),id:event.pointerId,x:event.clientX,y:event.clientY};
});
window.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6){
    const group=document.createElementNS('http://www.w3.org/2000/svg','g');
    group.setAttribute('class','ghost');group.innerHTML=pencilShape(drag.index,0,0,.9,-16);
    world.append(group);drag.ghost=group;drag.src.classList.add('lifted');
  }
  if(!drag.ghost)return;
  const p=coords(event);drag.ghost.setAttribute('transform','translate('+p.x+' '+p.y+')');
  drag.slot?.classList.remove('over');
  drag.slot=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]');
  drag.slot?.classList.add('over');
});
function release(event){
  if(drag?.id!==event.pointerId)return;
  const state=drag;drag=null;
  if(!state.ghost)return;
  state.ghost.remove();state.src.classList.remove('lifted');state.slot?.classList.remove('over');
  cooldown=performance.now()+320;
  if(event.type==='pointerup'&&state.slot)place(state.index,state.slot.dataset.slot);
}
window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
world.addEventListener('click',event=>{if(performance.now()>cooldown)activate(event.target);});
world.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();activate(event.target);}});
film.addEventListener('click',()=>{
  if(film.dataset.shot!=='opening')return;
  entry.hidden=true;replay.hidden=false;
  step('introHold');plink(2);
  void speak('start').then(()=>speak('red',()=>step('chooseAnchor')));
});
replay.addEventListener('click',()=>{if(player.src){player.currentTime=0;void player.play().catch(()=>{});}});
render();

