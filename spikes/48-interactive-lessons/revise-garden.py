
from pathlib import Path
p=Path(__file__).resolve().parent/'story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("let shot='opening', leaves=2, apples=6, bundles=0, revealed=false, formula=[];","let shot='opening', leaves=2, apples=6, revealed=false, replaced=0;")
a=s.index("  } else if (shot==='trial')")
b=s.index("\n  const rabbit=",a)
s=s[:a]+'''  } else if (shot==='bridge'||shot==='variation'||shot==='end') {
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
  }'''+s[b:]
a=s.index("function tile(");b=s.index("function advance(",a);s=s[:a]+s[b:]
a=s.index("  if (shot==='trial'",s.index('function advance'))
b=s.index("function tapPart(",a)
s=s[:a]+"}\n"+s[b:]
s=s.replace("go('trial');void speak(['try']);","replaced=0;go('bridge');void speak(['bridge']);")
a=s.index("  if (part.dataset.symbol)",s.index("function tapPart"))
b=s.index("  selected?.classList",a)
s=s[:a]+'''  if(part.dataset.part==='replace'&&replaced<3){
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
'''+s[b:]
s=s.replace("part.dataset.part==='exchange'||(shot==='apples'&&apples===3)||(shot==='trial'&&bundles===3)","['exchange','replace'].includes(part.dataset.part)||(shot==='apples'&&apples===3)")
s=s.replace(",trial:'把黄瓜拖到右盘',formula:'把算式积木拖到木板'","")
p.write_text(s,encoding='utf-8')

