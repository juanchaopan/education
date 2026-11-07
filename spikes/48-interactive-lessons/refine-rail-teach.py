
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-story.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("let serial=0,endLine,sound,holdUntil=0,drive=0,lessonLocked=false;","let serial=0,endLine,sound,holdUntil=0,drive=0,lessonLocked=false,voiceQueue=Promise.resolve();")
a=s.index('async function speak(');b=s.index('function go(',a)
s=s[:a]+'''function speak(...ids){
  serial++;
  const clips=voiceQueue.then(async()=>{
    for(const id of ids){await say(id);if(ids.length>1)await wait(350);}
  });
  voiceQueue=clips;
  return clips;
}
'''+s[b:]
s=s.replace("go('teach');void prompt();","go('teach');void prompt();")
s=s.replace("function prompt(){\n  const config=stages[stage];\n  return speak(config.voice);\n}","""function prompt(){
  lessonLocked=true;drawLesson();
  return speak(stages[stage].voice).then(()=>{lessonLocked=false;drawLesson();});
}""")
s=s.replace("if(stage===2)return '<div class=\"length-split\"><b>还领先的部分</b><em>已追回 t 格</em></div><span>起点一共领先 10 格</span>';","if(stage===2)return '<div class=\"length-split\"><b>剩 4 格</b><em>已追回 6 格</em></div><span>看 6 秒这一刻。换成 t 秒时，追回的就是 t 格。</span>';")
s=s.replace("class=\"lesson-object\" aria-label=\"'+config.title+'\"","class=\"lesson-object\" aria-disabled=\"'+lessonLocked+'\" aria-label=\"'+config.title+'\"")
s=s.replace("+(stage===6?", "+(stage===6?") if False else s
s=s.replace("    (stage===6?'<p class=\"worked-line\">","    (!done&&lessonLocked?'<p class=\"waiting\">听完这句，亮起的对象就可以点了。</p>':'')+\n    (stage===6?'<p class=\"worked-line\">")
s=s.replace("  lessonLocked=true;\n  stage++;\n  drawLesson();\n  void prompt().then(()=>{lessonLocked=false;});","  stage++;\n  void prompt();")
p.write_text(s,encoding='utf-8')

