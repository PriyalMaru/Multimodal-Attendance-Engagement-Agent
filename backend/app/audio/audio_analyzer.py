import os
import numpy as np
from typing import Tuple, Optional

class AggregateAudioAnalyzer:
    """
    Analyzes aggregate audio volume, energy, and voice activity.
    Complies with strict privacy standards:
    - NO individual speaker identification.
    - NO speech transcription or persistent raw audio saving.
    - Computes aggregate speech-active vs silent window percentages only.
    """
    def __init__(self, energy_threshold: float = 0.02):
        self.energy_threshold = energy_threshold

    def analyze_audio_segment(self, audio_data: np.ndarray, sample_rate: int = 16000) -> Tuple[bool, float, float]:
        """
        Calculates aggregate speech active ratio and RMS energy for an audio slice.
        Returns: (is_available, speech_active_ratio, avg_energy)
        """
        if audio_data is None or len(audio_data) == 0:
            return False, 0.0, 0.0

        try:
            # Flatten to mono float32 [-1.0, 1.0]
            if audio_data.dtype != np.float32:
                if np.issubdtype(audio_data.dtype, np.integer):
                    max_val = np.iinfo(audio_data.dtype).max
                    audio_mono = audio_data.astype(np.float32) / max_val
                else:
                    audio_mono = audio_data.astype(np.float32)
            else:
                audio_mono = audio_data

            if len(audio_mono.shape) > 1:
                audio_mono = np.mean(audio_mono, axis=1)

            # Frame size: 30ms (0.03 * sample_rate)
            frame_len = max(1, int(0.03 * sample_rate))
            hop_len = max(1, int(0.015 * sample_rate))
            
            num_frames = (len(audio_mono) - frame_len) // hop_len
            if num_frames <= 0:
                return True, 0.0, float(np.sqrt(np.mean(audio_mono ** 2)))

            speech_frames = 0
            energies = []

            for i in range(num_frames):
                start = i * hop_len
                frame = audio_mono[start:start + frame_len]
                rms = np.sqrt(np.mean(frame ** 2))
                energies.append(rms)
                if rms >= self.energy_threshold:
                    speech_frames += 1

            speech_ratio = float(speech_frames / num_frames)
            avg_energy = float(np.mean(energies)) if energies else 0.0
            return True, min(1.0, speech_ratio), min(1.0, avg_energy)
        except Exception as e:
            print(f"[AudioAnalyzer] Error analyzing audio slice: {e}")
            return False, 0.0, 0.0

    def extract_from_video_and_analyze_windows(
        self,
        video_filepath: str,
        total_duration_sec: float,
        window_size_sec: float = 30.0
    ) -> list[dict]:
        """
        Attempts to read audio from video container. If no audio stream is present,
        gracefully returns unavailable records for all windows.
        """
        num_windows = max(1, int(np.ceil(total_duration_sec / window_size_sec)))
        results = []

        # Attempt to load using moviepy/scipy/librosa if installed, else fallback
        audio_loaded = False
        y = None
        sr = 16000

        try:
            import subprocess
            import tempfile
            import wave

            # Extract audio to temp mono wav using ffmpeg if available
            temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_wav.close()

            # Attempt ffmpeg extract
            cmd = [
                "ffmpeg", "-y", "-i", video_filepath,
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                temp_wav.name
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
            if res.returncode == 0 and os.path.exists(temp_wav.name) and os.path.getsize(temp_wav.name) > 100:
                with wave.open(temp_wav.name, 'rb') as wf:
                    sr = wf.getframerate()
                    frames = wf.readframes(wf.getnframes())
                    y = np.frombuffer(frames, dtype=np.int16)
                    audio_loaded = True
            
            # Clean up temp audio file
            if os.path.exists(temp_wav.name):
                os.remove(temp_wav.name)
        except Exception:
            audio_loaded = False

        for w_idx in range(num_windows):
            w_start = w_idx * window_size_sec
            w_end = min(total_duration_sec, (w_idx + 1) * window_size_sec)

            if audio_loaded and y is not None:
                start_sample = int(w_start * sr)
                end_sample = min(len(y), int(w_end * sr))
                if start_sample < len(y):
                    segment = y[start_sample:end_sample]
                    avail, ratio, energy = self.analyze_audio_segment(segment, sr)
                    results.append({
                        "window_index": w_idx,
                        "start_seconds": w_start,
                        "end_seconds": w_end,
                        "is_audio_available": True,
                        "speech_active_ratio": round(ratio, 2),
                        "avg_energy": round(energy, 3)
                    })
                    continue

            # Fallback if audio track absent or unsupported
            results.append({
                "window_index": w_idx,
                "start_seconds": w_start,
                "end_seconds": w_end,
                "is_audio_available": False,
                "speech_active_ratio": 0.0,
                "avg_energy": 0.0
            })

        return results
