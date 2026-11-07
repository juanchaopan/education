
from pathlib import Path
p=Path(__file__).resolve().parent/'pencil-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('row=0, cursor=1, countRows=0, work=[], completed=[]','row=0, cursor=1, work=[], completed=[]')
s=s.replace('let chosen=null, drag=null, cooldown=0, settleVoice, sound, stamp=0, lastMove=false;','let chosen=null, drag=null, cooldown=0, sound, stamp=0, lastMove=false;\nconst counted=new Set();\nlet voiceQueue=Promise.resolve();')
a=s.index('function speak(key)')
b=s.index('function show',a)
s=s[:a]+'''function speak(key){
  const clip=voiceQueue.then(()=>new Promise(resolve=>{
    caption.hidden=false;caption.textContent=lines[key];
    const finish=()=>{replay.classList.remove('playing');resolve();};
    player.onplay=()=>replay.classList.add('playing');
    player.onended=finish;
    player.onerror=finish;
    player.src='data:audio/mpeg;base64,'+clips[key];
    void player.play().catch(()=>setTimeout(finish,850));
  }));
  voiceQueue=clip;
  return clip;
}
'''+s[b:]
a=s.index("function tally()")
b=s.index("function render()",a)
s=s[:a]+'''function tally(){
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
'''+s[b:]
s=s.replace("  if(row===0) void speak('redRest');\n  const spoken=wait(row===0?1150:500);","  const spoken=row===0?speak('redRest'):voiceQueue;")
# Source still uses the parallel pre-build form from an earlier probe.
s=s.replace("  const spoken=row===0?speak('redRest'):wait(500);","  const spoken=row===0?speak('redRest'):voiceQueue;")
s=s.replace("""    countRows++;plink(countRows);render();
    if(countRows===6){step('end');void speak('finish');}""","""    const i=Number(tallyRow.dataset.tally);
    if(counted.has(i))return;
    counted.add(i);plink(counted.size);render();
    if(counted.size===6){void voiceQueue.then(()=>{step('end');void speak('finish');});}""")
p.write_text(s,encoding='utf-8')
p=p.with_name('build-pencil-story.py')
s=p.read_text(encoding='utf-8-sig')
a=s.index('js=js.replace("  const spoken')
b=s.index('\nhtml=',a)
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8')

