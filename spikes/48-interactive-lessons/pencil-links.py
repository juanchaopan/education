
from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'pencil-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("const counted=new Set();","const counted=new Set();\nlet automatic=false;")
a=s.index('function studio()')
s=s[:a]+'''function linkPair(anchor,partner,inMotion){
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
'''+s[a:]
s=s.replace("(partner===null?text(692,397,'搭档放这里','card-label'):pencilShape(partner,692,388,.68,12))", """(partner===null?text(692,397,'搭档放这里','card-label'):
      automatic?'<g class="pencil-flight" style="--from-x:'+(260+113*partner-692)+'px">'+pencilShape(partner,692,388,.68,12)+'</g>':
      pencilShape(partner,692,388,.68,12))""")
s=s.replace("  return setup+paper+left+text(554,403,'＋','pair-plus')+right+rowCards+archiveMini()+duplicate;","""  return setup+paper+left+right+linkPair(row,partner,automatic)+(partner===null?text(554,403,'＋','pair-plus'):
    text(554,440,names[row]+names[partner]+' · 第 '+work.length+' 对','card-label'))+
    '<g class="'+(automatic?'auto-pair-row':'')+'">'+rowCards+'</g>'+archiveMini()+duplicate;""")
s=s.replace("  completed.push([...work]);","  automatic=false;\n  completed.push([...work]);")
s=s.replace("  for(;cursor<7;cursor++){\n    await wait(720);\n    work.push(cursor);lastMove=true;render();plink(work.length);","  for(;cursor<7;cursor++){\n    await wait(1400);\n    automatic=true;\n    work.push(cursor);lastMove=true;render();plink(work.length);")
s=s.replace("  await wait(960);","  await wait(1450);")
s=s.replace("  work.push(index);cursor++;lastMove=true;plink(work.length);","  automatic=false;\n  work.push(index);cursor++;lastMove=true;plink(work.length);")
p.write_text(s,encoding='utf-8')
p=root/'build-pencil-story.py'
s=p.read_text(encoding='utf-8-sig')
a=s.index("js=js.replace(");b=s.index("js=js.replace(",s.index("js=js.replace(",a+1)+1)
s=s[:a]+s[b:]
p.write_text(s,encoding='utf-8')

