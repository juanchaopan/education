
from pathlib import Path
p=Path(__file__).resolve().parent/'pencil-story.js'
s=p.read_text(encoding='utf-8-sig')
a=s.index("    completed.map((items,i)=>")
b=s.index("+'</g>';",a)
s=s[:a]+'''    completed.map((items,i)=>{
      const y=362+i*27;
      return '<g class="'+(i===completed.length-1?'archive-in':'')+'"><rect x="914" y="'+(y-11)+'" width="135" height="22" rx="11" fill="'+inks[i]+'" opacity=".84"/>'+
        items.map((partner,n)=>pairCard(i,partner,926+n*16,y,.245)).join('')+text(1035,y+5,String(items.length),i===2?'archive-row dark':'archive-row')+'</g>';
    }).join('')'''+s[b:]
a=s.index("  const duplicate=phase!==")
b=s.index("\n  return setup",a)
s=s[:a]+'''  const duplicate=phase!=='chooseAnchor'&&row===1&&work.length===0
    ? '<g class="already">'+pairCard(0,1,377,489,.68)+text(475,497,'红橙已经收过','card-label')+'</g>' : '';'''+s[b:]
p.write_text(s,encoding='utf-8')

