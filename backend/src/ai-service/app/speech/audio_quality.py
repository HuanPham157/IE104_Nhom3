from pathlib import Path

import numpy as np
from faster_whisper.audio import decode_audio


def analyze_audio_quality(audio_path: Path) -> dict:
    # Phép đo từ AudioMonitor._is_voice của exam-cheating-detection-main.
    sample_rate = 16000
    frame_size = 512
    samples = decode_audio(str(audio_path), sampling_rate=sample_rate)

    total_frames = len(samples) // frame_size
    voice_frames = 0

    for index in range(total_frames):
        start = index * frame_size
        frame = samples[start:start + frame_size]

        energy = np.mean(frame ** 2)
        zero_crossing = np.mean(np.abs(np.diff(np.sign(frame))))

        if energy >= 0.001 and zero_crossing <= 0.35:
            voice_frames += 1

    return {
        "duration_seconds": len(samples) / sample_rate,
        "total_frames": total_frames,
        "voice_frames": voice_frames,
    }