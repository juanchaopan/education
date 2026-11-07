
from pathlib import Path
root=Path(__file__).resolve().parent
scene=root/'scene-v2.js'
s=scene.read_text(encoding='utf-8-sig')
s=s.replace("  const contents = (place) => scale[place].map(kind=>foodButton(kind,i,place)).join('');","""  const contents = (place) => {
    const items=scale[place];
    const buttons=items.map(kind=>foodButton(kind,i,place));
    if (i!==2 || place!==1 || !items.every(kind=>kind==='cuke')) return buttons.join('');
    return buttons.reduce((groups,button,index)=>{
      if (index%3===0) groups.push([]);
      groups.at(-1).push(button);
      return groups;
    },[]).map(group=>'<div class="cuke-group">'+group.join('')+'</div>').join('');
  };""")
s=s.replace("  return '<button type=\"button\" class=\"pencil\" data-drag=", """  if (source==='desk' && pencils.includes(index)) return '<span class="pencil pencil-spot" aria-hidden="true">'+pencilShape(index)+'<span>'+name+'</span></span>';
  return '<button type="button" class="pencil" data-drag=""")
scene.write_text(s,encoding='utf-8')
css=root/'scene-v2.css'
with css.open('a',encoding='utf-8') as stream:
    stream.write('\n.cuke-group{display:grid;justify-items:center;border-radius:7px;background:#d9edd099;margin:1px;min-width:23px}.cuke-group .produce{min-width:23px;min-height:22px;font-size:19px;padding:1px}.pencil-spot{opacity:.28;cursor:default}\n')
builder=root/'build-v2.py'
s=builder.read_text(encoding='utf-8-sig')
s=s.replace('const note=valid?',"""const meanings={'10':'这块 10 来自 0 秒时两点的距离。','t':'t 是经过的时间。每秒追回一格时，t 秒追回 t 格。','2':'变化题里，两点每秒的差是两格。','−':'用开始的间隔减去追回的格数；追上以后，这个差会变成负数。','|':'两根竖线要把整个差夹起来，表示只看距离。','4':'4 是题目要找的距离，放在等号的另一边。'};
  const note=valid?""")
s=s.replace('两点位置相减，不管谁在前，距离都是 4。指着图解释里面的每一块。','两点位置相减再取绝对值，得到的距离等于题目要求的 4。指着图解释每一块。')
s=s.replace(": '两点重合后，有方向的差会变号。两根竖线夹住的是整个差，表示只取距离。';",": (meanings[formula.at(-1)] || '比较开始的间隔与后来追回的格数。');")
s=s.replace("const meanings={'10':","const meanings={'10':")
s=s.replace("'t':'t 是经过的时间。每秒追回一格时，t 秒追回 t 格。'","'t':speed===2?'t 是经过的时间。每秒追回一格时，t 秒追回 t 格。':'t 是经过的时间。每秒追回两格，t 秒追回 2×t 格。'")
builder.write_text(s,encoding='utf-8')

