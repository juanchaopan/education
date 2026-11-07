
from pathlib import Path
p=Path(__file__).resolve().parent/'rail-template.html'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('<section id="forge" hidden aria-label="从图上列方程"></section>','''<section id="ledger" hidden aria-label="同一张数轴上推导方程">
  <div id="facts"><span id="factOrigin" hidden></span><span id="factSpeed" hidden></span></div>
  <div id="derivation"><span id="factDifference" hidden></span><span id="factDistance" hidden></span><span id="finalEquation" hidden></span></div>
  <div id="reviewTimes" hidden><button type="button" data-time="6">看 6 秒</button><button type="button" data-time="14">看 14 秒</button><span id="proof" hidden></span></div>
</section>''')
p.write_text(s,encoding='utf-8')

