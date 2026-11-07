
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-template.html'
s=p.read_text(encoding='utf-8-sig')
a=s.index('<div id="timeline"')
b=s.index('<p id="caption"',a)
s=s[:a]+'''<div id="mobileMath" hidden><strong id="mobileFormula"></strong><span id="mobileExplain"></span></div>
<p id="observations" hidden></p>
'''+s[b:]
p.write_text(s,encoding='utf-8')
p=p.with_name('rail-story.js')
s=p.read_text(encoding='utf-8-sig')
needle="  $('observations').textContent=found.size?"
s=s.replace(needle,"  $('mobileFormula').textContent=$('formulaMain').textContent;\n  $('mobileExplain').textContent=$('formulaExplain').textContent;\n  $('mobileMath').hidden=false;\n"+needle)
p.write_text(s,encoding='utf-8')

