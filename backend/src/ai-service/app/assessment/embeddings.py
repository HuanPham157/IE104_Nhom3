"""Nạp model Sentence Transformers một lần và encode văn bản thành vector đã chuẩn hóa."""

from __future__ import annotations

from functools import lru_cache

import numpy as np

from app.assessment.config import GraderConfig
from app.assessment.text_processing import normalize, segment_words

_MAX_CACHED_TEXTS = 4096


@lru_cache(maxsize=2)
def _load_model(model_name: str, device: str):
    from sentence_transformers import SentenceTransformer  # nạp chậm (PyTorch) — chỉ khi cần chấm

    return SentenceTransformer(model_name, device=device)


class Embedder:
    """Encode có cache theo văn bản: đáp án và tiêu chí lặp lại giữa các bài nộp của cùng một câu hỏi."""

    def __init__(self, config: GraderConfig):
        self._model = _load_model(config.embedding_model, config.device)
        self._segment = config.word_segmentation
        self._cache: dict[str, np.ndarray] = {}

    def _prepare(self, text: str) -> str:
        return segment_words(text) if self._segment else normalize(text)

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self._model.get_sentence_embedding_dimension()), dtype=np.float32)
        missing = [text for text in dict.fromkeys(texts) if text not in self._cache]
        if missing:
            vectors = self._model.encode(
                [self._prepare(text) for text in missing],
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            if len(self._cache) + len(missing) > _MAX_CACHED_TEXTS:
                self._cache.clear()
            self._cache.update(zip(missing, vectors))
        return np.stack([self._cache[text] for text in texts])


@lru_cache(maxsize=2)
def get_embedder(config: GraderConfig) -> Embedder:
    return Embedder(config)
