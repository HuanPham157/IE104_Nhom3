from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_model() -> WhisperModel:
    return WhisperModel(
        "small",
        device="cpu",
        compute_type="int8",
    )


def transcribe_audio_file(audio_path: str) -> dict:
    model = get_model()

    segments_iterator, info = model.transcribe(
        audio_path,
        language="vi",
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
    )

    segments = list(segments_iterator)
    text = "".join(segment.text for segment in segments).strip()

    segment_results = []
    word_results = []

    for segment in segments:
        segment_results.append({
            "start_seconds": round(segment.start, 3),
            "end_seconds": round(segment.end, 3),
            "text": segment.text.strip(),
        })

        for word in segment.words or []:
            word_results.append({
                "text": word.word.strip(),
                "start_seconds": round(word.start, 3),
                "end_seconds": round(word.end, 3),
                "probability": round(word.probability, 4),
            })

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 4),
        "text": text,
        "segments": segment_results,
        "words": word_results,
    }