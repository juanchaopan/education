
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
needle="""forge.addEventListener('click',e=>{
  if(lessonLocked||scene!=='teach'||!e.target.closest('.lesson-object'))return;
  chime('ok');
  stage++;
  void prompt();
});"""
replacement="""const discoveries=['起点的差是 10 格','2 格 − 1 格，每秒追回 1 格','剩下的差＝起点的差 − 追回的距离','有方向的差是 −4，距离仍是 4','两边都在说同一段距离','追上前，N−M 是 +4','追上后，N−M 是 −4'];
forge.addEventListener('click',e=>{
  const object=e.target.closest('.lesson-object');
  if(lessonLocked||scene!=='teach'||!object)return;
  lessonLocked=true;
  object.setAttribute('aria-disabled','true');
  object.classList.add('discovering');
  const badge=document.createElement('span');
  badge.className='discovery';
  badge.textContent=discoveries[stage];
  object.append(badge);
  chime('ok');
  void wait(920).then(()=>{stage++;return prompt();});
});"""
assert needle in s
p.write_text(s.replace(needle,replacement),encoding='utf-8')

