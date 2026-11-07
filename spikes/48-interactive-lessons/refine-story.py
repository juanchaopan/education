
from pathlib import Path
p=Path(__file__).resolve().parent/'story.js'
s=p.read_text(encoding='utf-8-sig')
a=s.index('function stopVoice()')
b=s.index('async function speak',a)
s=s[:a]+'''let settleVoice;
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
'''+s[b:]
s=s.replace("const right=applePile(apples,shot==='apples',shot==='leaves');","const right=applePile(apples,shot==='apples'&&apples>3,shot==='leaves');")
s=s.replace("content=scale({left,right,tilt})+basket(984,416,'basket');","content=scale({left,right,tilt})+basket(984,416,'basket',apples>3);")
s=s.replace("content+=shot==='leaves'?spark(438,274,938,408):spark(823,271,938,397);","if (apples>3) content+=shot==='leaves'?spark(438,274,938,408):spark(823,271,938,397);")
s=s.replace("if (shot==='apples'&&source.dataset.part","if (shot==='apples'&&apples>3&&source.dataset.part")
s=s.replace("if (shot==='trial'&&source.dataset.part","if (shot==='trial'&&bundles<3&&source.dataset.part")
s=s.replace("replay.addEventListener('click',()=>{if(lastLine)void say(lastLine);});","replay.addEventListener('click',()=>{if(lastLine){player.currentTime=0;void player.play().catch(()=>{});}});")
p.write_text(s,encoding='utf-8')

