"""Import questions, direct yellow highlights, and slide notes from the study Word file."""
import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
EXPECTED_COUNT = 110


def paragraph_text(paragraph):
    text_parts = {f"{W}tab": "\t", f"{W}br": "\n"}
    return "".join(
        node.text or "" if node.tag == f"{W}t" else text_parts.get(node.tag, "")
        for node in paragraph.iter()
    ).strip()


def parse(path):
    with ZipFile(path) as archive:
        xml = ET.fromstring(archive.read("word/document.xml"))
    questions = []
    current = None
    for paragraph in xml.find(f"{W}body").iter(f"{W}p"):
        style = paragraph.find(f"{W}pPr/{W}pStyle")
        name = style.get(f"{W}val") if style is not None else None
        text = paragraph_text(paragraph)
        if name == "Cauhoi":
            number, stem = re.fullmatch(r"Câu\s+(\d+)\.\s*(.+)", text, re.S).groups()
            current = {"id": int(number), "text": stem, "options": [], "correct": []}
            questions.append(current)
        elif name == "Luachon":
            option, content = re.fullmatch(r"([A-D])\.\s*(.+)", text, re.S).groups()
            current["options"].append({"id": option, "text": content})
            if any(element.get(f"{W}val") == "yellow" for element in paragraph.iter(f"{W}highlight")):
                current["correct"].append(option)
        elif name == "Doichieu":
            current["explanation"] = text
    return questions


def prepare(questions):
    if [q["id"] for q in questions] != list(range(1, EXPECTED_COUNT + 1)):
        raise ValueError("Tài liệu phải có đủ 110 câu theo thứ tự.")
    for question in questions:
        number = question["id"]
        options = question["options"]
        if [option["id"] for option in options] != list("ABCD") or not question.get("explanation"):
            raise ValueError(f"Câu {number} thiếu phương án hoặc dòng đối chiếu.")
        keys = question["correct"]
        notes = []
        if not keys:
            notes.append("Tài liệu chưa tô vàng đáp án nào.")
        if len(keys) > 1:
            notes.append("Tài liệu tô vàng nhiều phương án: " + ", ".join(keys) + ".")
        if number == 105:
            # Labels in the response text refer to fixed statements in the question.
            question["fixedOrder"] = True
        if number == 106:
            for option in options[2:]:
                option["fixedPosition"] = True
            notes.append("Overlay là kiến thức từ mini game. C1 và C2 chỉ có phần đối chiếu về swapping ở C2 trang 33.")
        if number == 107:
            options[3]["fixedPosition"] = True
        if number == 108:
            options[3]["fixedPosition"] = True
            question["references"] = {"D": ["A", "C"]}
            notes.append("Bản Word đã chỉnh câu mini game để đáp án nêu đủ hai mục dùng chung. Chọn phương án tổng hợp.")
        if notes:
            question["review"] = notes
    return questions


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("docx", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    data = prepare(parse(args.docx))
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(data)} câu, {sum(len(q['options']) for q in data)} phương án, "
          f"{sum(len(q['correct']) for q in data)} đáp án tô vàng.")

