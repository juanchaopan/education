
from pathlib import Path
import subprocess,sys,io
import numpy as np
root=Path(sys.argv[1])
p=root/'pencil-video-final'/'review-synced.mp4'
fs=8000
def pcm(path,start=None,length=None):
    args=['ffmpeg','-loglevel','error','-i',str(path)]
    if start is not None:args+=['-ss',str(start),'-t',str(length)]
    return np.frombuffer(subprocess.check_output(args+['-vn','-f','f32le','-ac','1','-ar',str(fs),'-']),dtype=np.float32)
sample=pcm(root/'pencil-redRest.mp3')
lo=22
audio=pcm(p,lo,22)
sample=sample[:min(len(sample),4*fs)]
size=1<<(len(audio)+len(sample)-1).bit_length()
corr=np.fft.irfft(np.fft.rfft(audio,size)*np.conjugate(np.fft.rfft(sample,size)),size)
prefix=np.cumsum(np.concatenate(([0],audio**2)))
energy=prefix[len(sample):]-prefix[:-len(sample)]
score=corr[:len(energy)]/np.sqrt((sample@sample)*energy+1e-6)
i=int(np.argmax(score))
print('RedRest audible start on exported file',round(lo+i/fs,2),'waveform match',round(float(score[i]),2))

