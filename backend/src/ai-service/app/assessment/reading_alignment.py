import unicodedata

from jiwer import process_words


def normalize_text(text):
    text = unicodedata.normalize("NFC", text).lower()
    text = "".join(
        " " if unicodedata.category(char).startswith("P") else char
        for char in text
    )
    return " ".join(text.split())


def compare_reading(reference, transcript):
    reference = normalize_text(reference)
    transcript = normalize_text(transcript)
    return process_words(reference, transcript)


if __name__ == "__main__":
    reference = "Hôm nay chúng ta sẽ tìm hiểu về trí tuệ nhân tạo và ứng dụng trong giáo dục."
    transcript = "Hôm nay chúng ta tìm hiểu về trí tuệ nhân tạo và ứng dụng trong giáo dục."

    result = compare_reading(reference, transcript)

    print("Số tiếng khớp:", result.hits)
    print("Số tiếng thiếu:", result.deletions)
    print("Số tiếng thêm:", result.insertions)
    print("Số tiếng thay thế:", result.substitutions)
    print(f"Tỷ lệ sai khác: {result.wer:.2%}")

    for chunk in result.alignments[0]:
        if chunk.type == "delete":
            words = result.references[0][chunk.ref_start_idx:chunk.ref_end_idx]
            position = chunk.ref_start_idx + 1
            print(f'Thiếu "{" ".join(words)}" ở vị trí {position}')