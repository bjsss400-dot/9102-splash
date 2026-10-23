"""Generate Poolside Study, an original 24-second looping demo track.

Created with OpenAI Codex (ChatGPT) for this project, without sampled recordings.
Only Python's standard library is needed. The running artwork loads the WAV;
this optional generation script is not part of the p5 animation.
"""
from pathlib import Path
import array
import math
import random
import sys
import wave

RATE = 22050
DURATION = 24
samples = [0.0] * (RATE * DURATION)
rng = random.Random(9103)


def add_note(start, duration, frequency, volume, kind='bell'):
    for j in range(int(duration * RATE)):
        t = j / RATE
        attack = min(1, t / 0.008)
        release = min(1, (duration - t) / 0.04)
        if kind == 'kick':
            phase = 2 * math.pi * (48 * t + 75 * 0.035 * (1 - math.exp(-t / 0.035)))
            value = math.sin(phase) * math.exp(-t / 0.16)
        elif kind == 'hat':
            value = rng.uniform(-1, 1) * math.exp(-t / 0.035)
        else:
            value = (math.sin(2 * math.pi * frequency * t)
                     + 0.24 * math.sin(2 * math.pi * frequency * 2 * t))
            value *= math.exp(-t / 0.22)
        index = (round(start * RATE) + j) % len(samples)
        samples[index] += volume * value * attack * release


# Quiet, continuous harmonic bed. Integer cycle counts make the loop seamless.
for i in range(len(samples)):
    t = i / RATE
    for frequency in (130.8333333333, 164.8333333333, 196):
        samples[i] += 0.031 * math.sin(2 * math.pi * frequency * t)

# 80 BPM. A stronger downbeat every four beats (3 seconds), with lighter notes.
# This schedule exists only in the AUDIO FILE, never in the visual detector.
melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 440, 392]
for beat in range(32):
    start = beat * 0.75
    strength = [0.60, 0.18, 0.30, 0.18][beat % 4]
    add_note(start, 0.65, 55, strength, 'kick')
    add_note(start, 0.65, melody[beat % 8], strength * 0.52)
    add_note(start + 0.375, 0.12, 0, 0.018, 'hat')

peak = max(abs(v) for v in samples)
scale = min(1, 0.92 / peak)
pcm = array.array('h', (int(max(-1, min(1, v * scale)) * 32767) for v in samples))
if sys.byteorder != 'little':
    pcm.byteswap()
output = Path(__file__).resolve().parents[1] / 'assets' / 'poolside-study.wav'
with wave.open(str(output), 'wb') as sound:
    sound.setnchannels(1)
    sound.setsampwidth(2)
    sound.setframerate(RATE)
    sound.writeframes(pcm.tobytes())
print(f'Created {output.name}: {DURATION}s, mono, {RATE} Hz; peak {peak * scale:.3f}')
