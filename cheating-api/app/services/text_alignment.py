import re
import unicodedata
from array import array


MAX_ALIGNMENT_TOKENS = 3000


def tokenize(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFC", text).casefold()
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    return normalized.split()


def align_text(reference: str, hypothesis: str) -> dict:
    reference_tokens = tokenize(reference)
    hypothesis_tokens = tokenize(hypothesis)

    if not reference_tokens:
        raise ValueError("Reference transcript cannot be empty")

    if len(reference_tokens) > MAX_ALIGNMENT_TOKENS:
        raise ValueError("Reference transcript has too many tokens")

    if len(hypothesis_tokens) > MAX_ALIGNMENT_TOKENS:
        raise ValueError("Recognized transcript has too many tokens")

    rows = len(reference_tokens) + 1
    columns = len(hypothesis_tokens) + 1
    costs = [array("I", [0]) * columns for _ in range(rows)]

    for i in range(rows):
        costs[i][0] = i

    for j in range(columns):
        costs[0][j] = j

    for i in range(1, rows):
        for j in range(1, columns):
            substitution_cost = (
                0 if reference_tokens[i - 1] == hypothesis_tokens[j - 1] else 1
            )
            costs[i][j] = min(
                costs[i - 1][j] + 1,
                costs[i][j - 1] + 1,
                costs[i - 1][j - 1] + substitution_cost,
            )

    reversed_errors = []
    i = len(reference_tokens)
    j = len(hypothesis_tokens)

    while i > 0 or j > 0:
        if (
            i > 0
            and j > 0
            and reference_tokens[i - 1] == hypothesis_tokens[j - 1]
            and costs[i][j] == costs[i - 1][j - 1]
        ):
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and costs[i][j] == costs[i - 1][j - 1] + 1:
            reversed_errors.append({
                "type": "substitution",
                "reference_token": reference_tokens[i - 1],
                "recognized_token": hypothesis_tokens[j - 1],
                "position": i,
            })
            i -= 1
            j -= 1
        elif i > 0 and costs[i][j] == costs[i - 1][j] + 1:
            reversed_errors.append({
                "type": "deletion",
                "reference_token": reference_tokens[i - 1],
                "recognized_token": None,
                "position": i,
            })
            i -= 1
        else:
            reversed_errors.append({
                "type": "insertion",
                "reference_token": None,
                "recognized_token": hypothesis_tokens[j - 1],
                "position": i + 1,
            })
            j -= 1

    errors = list(reversed(reversed_errors))
    substitutions = sum(error["type"] == "substitution" for error in errors)
    deletions = sum(error["type"] == "deletion" for error in errors)
    insertions = sum(error["type"] == "insertion" for error in errors)

    wer = (
        substitutions + deletions + insertions
    ) / len(reference_tokens)

    return {
        "wer": wer,
        "counts": {
            "substitutions": substitutions,
            "deletions": deletions,
            "insertions": insertions,
            "reference_tokens": len(reference_tokens),
        },
        "errors": errors,
    }