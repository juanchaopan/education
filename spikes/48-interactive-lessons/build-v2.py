
import json
from pathlib import Path

root=Path(__file__).resolve().parent
read=lambda file: (root/file).read_text(encoding='utf-8-sig')
clips=json.loads(read('clips-v2.json'))
garden=read('template-v2.html').replace('__CSS__',read('scene-v2.css')).replace('__JS__',read('scene-v2.js')).replace('__CLIPS__',json.dumps({k:v for k,v in clips.items() if not k.startswith('line')}))
(root/'preview-v2.html').write_text(garden,encoding='utf-8')

line=read('numberline.html')
line=line.replace('<h1>追上以后，距离还会是 4 吗？</h1>','<button id="audio" aria-label="听完整题目">🔊 听题</button><h1>追上以后，距离还会是 4 吗？</h1>')
line=line.replace('<button id="play">播放</button><button id="measure" aria-pressed="false">打开距离尺</button><button id="mark" class="primary">标记这个时刻</button>','<span class="muted">找到距离 4 时，直接点图上的距离尺。</span>')
line=line.replace('<div class="controls"><button id="switch" hidden>试一道变化题</button><button id="prompt">看看孩子可以怎么问</button></div>','<div id="formula" hidden></div><div class="controls"><button id="switch" hidden>试一道变化题</button></div>')
line=line.replace('</style>', '''
#audio{float:right}.ruler{cursor:pointer;outline-offset:3px}.ruler:focus-visible{outline:2px solid #f5cb86}
.ruler-box{fill:#22485a;stroke:#bce5a1}.ruler text{pointer-events:none}
#formula{margin:12px 0;padding:12px;border:1px solid #7499ac;border-radius:13px;background:#112a40}
#formula p{margin:6px 0}.line-bank,.line-expression{display:flex;gap:6px;align-items:center;flex-wrap:wrap;min-height:48px;padding:6px}
.line-expression{border:2px dashed #92c5c0;border-radius:12px;color:#cae6ed}
.line-tile{color:#203b32;background:#c5eea9;border:0;min-width:39px;cursor:grab;touch-action:none;padding:7px}
.line-tile.ghost{position:fixed;pointer-events:none;z-index:10;transform:translate(-50%,-50%)}
.line-expression.over,.line-bank.over{outline:3px solid #f8bd63}
</style>''')
line=line.replace('let ruler = false;','let ruler = true;')
line=line.replace('let clock = null;','')
line=line.replace('  const measures = ruler ?', '  const labelX=(x(m)+x(n))/2;\n  const measures = ruler ?')
a=line.index("+' V 113")
b=line.index(" : '';",a)
line=line[:a]+'''+' V 113" stroke="#c4ed9e" stroke-width="2" fill="none" stroke-dasharray="4 4"/><g class="ruler" tabindex="0" role="button" aria-label="标记这个距离：'+fmt(gap())+'"><rect class="ruler-box" x="'+(labelX-48)+'" y="127" width="96" height="25" rx="8"/><text x="'+labelX+'" y="145" fill="#d6f3be" text-anchor="middle" font-size="17">距离 '+fmt(gap())+'</text></g>' '''+line[b:]
line=line.replace("role=\"img\" aria-label=\"两条线段沿数轴同时移动\"","role=\"group\" aria-label=\"两条线段沿数轴同时移动\"")
a=line.index('function stop()')
b=line.index('function reset()',a)
line=line[:a]+'''function move(value) {
  time = value;
  $('time').value = value;
  draw();
}
$('time').oninput = () => move(Number($('time').value));
'''+line[b:]
line=line.replace("  stop();\n  stamps = new Set();\n  ruler = false;\n  $('measure').setAttribute('aria-pressed','false');\n  $('measure').textContent = '打开距离尺';","  stamps = new Set();\n  formula=[];\n  $('formula').hidden=true;\n  $('formula').innerHTML='';")
line=line.replace("$('mark').onclick = () => {\n  stop();","function mark() {")
a=line.index("  if (stamps.size === 2) $('switch').hidden = false;")
b=line.index("reset();\n</script>",a)
line=line[:a]+'''  if (stamps.size === 2 && $('formula').hidden) {
    $('formula').hidden=false;
    renderFormula();
    if (speed===2 && voice.paused) speak('lineBuild');
  }
}
$('track').addEventListener('click',event=>{if(event.target.closest('.ruler')) mark();});
$('track').addEventListener('keydown',event=>{
  if (event.target.closest('.ruler') && ['Enter',' '].includes(event.key)) {event.preventDefault();mark();}
});
$('switch').onclick = () => {speed = speed===2?3:2;reset();$('time').focus();};
const lineClips = __LINE_CLIPS__;
const voice = new Audio();
let heard = false;
function speak(key) {
  voice.pause();
  voice.src='data:audio/mpeg;base64,'+lineClips[key];
  void voice.play().catch(()=>{});
}
function startVoice() {if (!heard) {heard=true;speak('lineIntro');}}
$('audio').onclick = () => {heard=true;speak('lineIntro');};
$('time').addEventListener('pointerdown',startVoice,{once:true});
$('time').addEventListener('keydown',startVoice,{once:true});
let formula = [];
const tile = (symbol,index) => '<button type="button" class="line-tile" data-symbol="'+symbol+'"'+(index===undefined?'':' data-index="'+index+'"')+'>'+symbol+'</button>';
function renderFormula() {
  const built=formula.join('');
  const motion=speed===2?'t':'2×t';
  const valid=['|10−'+motion+'|＝4','|'+motion+'−10|＝4'].includes(built);
  const meanings={'10':'这块 10 来自 0 秒时两点的距离。','t':speed===2?'t 是经过的时间。每秒追回一格时，t 秒追回 t 格。':'t 是经过的时间。每秒追回两格，t 秒追回 2×t 格。','2':'变化题里，两点每秒的差是两格。','−':'用开始的间隔减去追回的格数；追上以后，这个差会变成负数。','|':'两根竖线要把整个差夹起来，表示只看距离。','4':'4 是题目要找的距离，放在等号的另一边。'};
  const note=valid?'这条方程说的是：两点位置相减再取绝对值，得到的距离等于题目要求的 4。指着图解释每一块。'
    : !built?'先找一块表示开始的间隔。再想 t 秒后，领先的距离改变了多少。'
    : built.includes('＝')?'等号右边来自题目。回头看看左边，换成另一点在前，写出的距离还是正的吗？'
    : (meanings[formula.at(-1)] || '比较开始的间隔与后来追回的格数。');
  $('formula').innerHTML='<p><strong>把图搭成方程</strong> · <span class="muted">拖积木到虚线里。拖回上面可以取走。</span></p><p>起点：看图上的 0 秒。变化：比较两个中点每秒各走了几格。目标：找相距 4 的时刻。</p><div class="line-bank">'+['10','2','t','−','×','|','|','＝','4'].map(symbol=>tile(symbol)).join('')+'</div><div class="line-expression">'+(formula.map(tile).join('')||'把积木拖到这里')+'</div><p role="status">'+note+'</p>';
  if (valid) $('switch').hidden=false;
}
function placeTile(button, to) {
  if (!to) return;
  if (button.dataset.index!==undefined) formula.splice(Number(button.dataset.index),1);
  if (to.classList.contains('line-expression') && formula.length<10) formula.push(button.dataset.symbol);
  renderFormula();
}
let grab, lastDrop=0;
$('formula').addEventListener('pointerdown',event=>{
  const button=event.target.closest('.line-tile');
  if (button && event.isPrimary && event.button===0) grab={button,id:event.pointerId,x:event.clientX,y:event.clientY};
});
window.addEventListener('pointermove',event=>{
  if (grab?.id!==event.pointerId) return;
  if (!grab.ghost && Math.hypot(event.clientX-grab.x,event.clientY-grab.y)>6) {
    grab.ghost=grab.button.cloneNode(true);
    grab.ghost.classList.add('ghost');
    document.body.append(grab.ghost);
  }
  if (!grab.ghost) return;
  grab.ghost.style.left=event.clientX+'px';grab.ghost.style.top=event.clientY+'px';
  grab.over?.classList.remove('over');
  grab.over=document.elementFromPoint(event.clientX,event.clientY)?.closest('.line-bank,.line-expression');
  grab.over?.classList.add('over');
});
function dropTile(event) {
  if (grab?.id!==event.pointerId) return;
  const current=grab;grab=null;
  if (!current.ghost) return;
  current.ghost.remove();current.over?.classList.remove('over');lastDrop=performance.now();
  if (event.type==='pointerup') placeTile(current.button,current.over);
}
window.addEventListener('pointerup',dropTile);
window.addEventListener('pointercancel',dropTile);
$('formula').addEventListener('click',event=>{
  const button=event.target.closest('.line-tile');
  if (!button || (event.detail && performance.now()-lastDrop<300)) return;
  placeTile(button,$('formula').querySelector(button.dataset.index===undefined?'.line-expression':'.line-bank'));
});
'''+line[b:]
line=line.replace('__LINE_CLIPS__',json.dumps({k:v for k,v in clips.items() if k.startswith('line')}))
(root/'numberline-v2.html').write_text(line,encoding='utf-8')

