"""Read Olympiad book photos with Tesseract and add the questions to data/questions.json.

Example (Windows):
    python tools\\ocr_questions.py --class "Class 3" --chapter 1 --title "Me and My Surroundings" ^
        --pages photos\\ch1_p1.jpg photos\\ch1_p2.jpg --answers photos\\answers_ch1.jpg

Then check the warnings, fix data/questions.json if needed, and run: node build.js
The raw OCR text of every photo is saved in ocr_output/ so you can compare.
"""
import argparse
import json
import re
import sys
from pathlib import Path

import pytesseract
from PIL import Image, ImageOps

# On Windows, point to tesseract.exe if it is not on PATH.
WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if sys.platform == "win32" and WINDOWS_TESSERACT.exists():
    pytesseract.pytesseract.tesseract_cmd = str(WINDOWS_TESSERACT)

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "questions.json"
OCR_DIR = ROOT / "ocr_output"

# "(A)" and the usual OCR mistakes for it: {A), [A], (0) for (D), etc.
OPTION_MARK = re.compile(r"[\(\{\[]\s*([A-Da-d0O8])\s*[\)\}\]]")
# "5. Which ..." or "5 Which ..." (OCR often drops the full stop).
QUESTION_START = re.compile(r"^\s*(\d{1,3})\s*[.,)]?\s+(?=[A-Z])(.*)")
# Answer key entries: "1. (d)", "1-d", "1) D", "1 (D)", "1.d"
ANSWER_ENTRY = re.compile(r"\b(\d{1,3})\s*[.\-):]?\s*[\(\{\[]?\s*([A-Da-d])\s*[\)\}\]]?(?![A-Za-z])")


def ocr(path: Path) -> str:
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)  # phone photos may be rotated
    img = ImageOps.grayscale(img)
    # Tesseract works best when text is about 30 px high; enlarge small photos.
    if img.width < 2000:
        scale = 2000 / img.width
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    img = ImageOps.autocontrast(img)
    # psm 6 reads a page as one block, row by row, so options in columns stay on one line.
    text = pytesseract.image_to_string(img, config="--psm 6")
    OCR_DIR.mkdir(exist_ok=True)
    (OCR_DIR / f"{path.stem}.txt").write_text(text, encoding="utf-8")
    return text


def letter(mark: str) -> str:
    return {"0": "D", "O": "D", "o": "D", "8": "B"}.get(mark, mark.upper())


def parse_questions(text: str) -> list[dict]:
    """Group lines into numbered questions, then split each into text and options."""
    blocks, current = [], None
    for line in text.splitlines():
        m = QUESTION_START.match(line)
        if m:
            current = {"num": int(m.group(1)), "text": m.group(2)}
            blocks.append(current)
        elif current is not None and line.strip():
            current["text"] += " " + line.strip()

    questions = []
    for b in blocks:
        marks = list(OPTION_MARK.finditer(b["text"]))
        if not marks:
            continue  # not a question (e.g. a heading that starts with a number)
        q_text = b["text"][: marks[0].start()].strip()
        options = {}
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(b["text"])
            options[letter(m.group(1))] = b["text"][m.end():end].strip(" .;|")
        questions.append({
            "num": b["num"],
            "q": re.sub(r"\s+", " ", q_text),
            "options": [options.get(k, "") for k in "ABCD"],
        })
    return questions


def parse_answers(text: str) -> dict[int, str]:
    return {int(n): a.upper() for n, a in ANSWER_ENTRY.findall(text)}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--class", dest="cls", required=True, help='e.g. "Class 3"')
    p.add_argument("--chapter", type=int, required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--pages", nargs="+", type=Path, required=True, help="question photos, in page order")
    p.add_argument("--answers", nargs="*", type=Path, default=[], help="answer key photo(s) for this chapter")
    p.add_argument("--dry-run", action="store_true", help="print the result, do not change questions.json")
    args = p.parse_args()

    questions = []
    for page in args.pages:
        questions += parse_questions(ocr(page))
    answers = {}
    for page in args.answers:
        answers.update(parse_answers(ocr(page)))

    warnings = []
    expected = 1
    for q in questions:
        if q["num"] != expected:
            warnings.append(f"Q{q['num']}: expected question {expected}; a question may be missing")
        expected = q["num"] + 1
        missing = [k for k, o in zip("ABCD", q["options"]) if not o]
        if missing:
            warnings.append(f"Q{q['num']}: option(s) {', '.join(missing)} not found (picture options?)")
        q["answer"] = answers.get(q["num"], "")
        if not q["answer"]:
            warnings.append(f"Q{q['num']}: no answer found")

    chapter = {
        "class": args.cls,
        "chapter": args.chapter,
        "title": args.title,
        "questions": [{"q": q["q"], "options": q["options"], "answer": q["answer"]} for q in questions],
    }

    print(f"Found {len(questions)} questions, {sum(1 for q in questions if q['answer'])} answers.")
    for w in warnings:
        print("WARNING:", w)

    if args.dry_run:
        print(json.dumps(chapter, indent=2, ensure_ascii=False))
        return

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    data["chapters"] = [c for c in data["chapters"]
                        if not (c["class"] == args.cls and c["chapter"] == args.chapter)]
    data["chapters"].append(chapter)
    data["chapters"].sort(key=lambda c: (c["class"], c["chapter"]))
    DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Saved to {DATA_FILE}. Fix the warnings there, then run: node build.js")


if __name__ == "__main__":
    main()
