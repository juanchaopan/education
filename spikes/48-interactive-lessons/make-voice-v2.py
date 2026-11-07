import base64
import json
from pathlib import Path
import subprocess
import wave
from piper import PiperVoice, SynthesisConfig

root = Path(__file__).resolve().parent
model = root / 'voice-model' / 'zh_CN-huayan-medium.onnx'
voice = PiperVoice.load(model)
lines = json.loads((root/'narration-v2.json').read_text(encoding='utf-8-sig'))
lines.update({
 'lineIntro':'两条线段都向右走。黄线段每秒走两格，蓝线段每秒走一格。试着拖动时间，找一找哪两个时刻，中点相距四格。',
 'lineBuild':'现在用积木写条件。先看开始相距几格，再想每秒追回几格。算出有方向的差以后，用两根距离积木把它夹起来。'
})
out = root/'clips-v2'
out.mkdir(exist_ok=True)
encoded = {}
for key,text in lines.items():
    wav = out/(key+'.wav')
    mp3 = out/(key+'.mp3')
    with wave.open(str(wav),'wb') as stream:
        voice.synthesize_wav(text, stream, syn_config=SynthesisConfig(length_scale=1.12))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-b:a','48k',str(mp3)],check=True)
    wav.unlink()
    encoded[key] = base64.b64encode(mp3.read_bytes()).decode('ascii')
    print(key,mp3.stat().st_size,flush=True)
(root/'clips-v2.json').write_text(json.dumps(encoded,separators=(',',':')),encoding='utf-8')

