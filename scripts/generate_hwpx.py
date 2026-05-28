#!/usr/bin/env python3
"""
HWPX 생성 스크립트
stdin으로 JSON 데이터를 받아 템플릿 HWPX를 수정한 후 stdout으로 출력한다.
ElementTree 파서를 사용해 XML 구조를 보존한다 (regex 미사용).
"""
import sys
import json
import zipfile
import io
import os
from xml.etree import ElementTree as ET

# ---------------------------------------------------------------------------
# 네임스페이스 등록 (직렬화 시 prefix 보존)
# ---------------------------------------------------------------------------
NAMESPACES = {
    "hs": "http://www.hancom.co.kr/hwpml/2011/section",
    "ha": "http://www.hancom.co.kr/hwpml/2011/app",
    "hp": "http://www.hancom.co.kr/hwpml/2011/paragraph",
    "hp10": "http://www.hancom.co.kr/hwpml/2016/paragraph",
    "hc": "http://www.hancom.co.kr/hwpml/2011/core",
    "hh": "http://www.hancom.co.kr/hwpml/2011/head",
    "hhs": "http://www.hancom.co.kr/hwpml/2011/history",
    "hm": "http://www.hancom.co.kr/hwpml/2011/master-page",
    "hpf": "http://www.hancom.co.kr/schema/2011/hpf",
    "dc": "http://purl.org/dc/elements/1.1/",
    "opf": "http://www.idpf.org/2007/opf/",
    "ooxmlchart": "http://www.hancom.co.kr/hwpml/2016/ooxmlchart",
    "hwpunitchar": "http://www.hancom.co.kr/hwpml/2016/HwpUnitChar",
    "epub": "http://www.idpf.org/2007/ops",
    "config": "urn:oasis:names:tc:opendocument:xmlns:config:1.0",
}
for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)

HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"


# ---------------------------------------------------------------------------
# 헬퍼: 셀 텍스트 업데이트 (첫 번째 <hp:p>만 유지, 나머지 제거)
# ---------------------------------------------------------------------------
def set_cell_text(cell: ET.Element, text: str) -> None:
    sub = cell.find(f"{HP}subList")
    if sub is None:
        return
    paragraphs = sub.findall(f"{HP}p")
    if not paragraphs:
        return

    # 여분 단락 제거 (첫 번째만 유지)
    for extra in paragraphs[1:]:
        sub.remove(extra)

    # 첫 번째 단락의 텍스트 노드 업데이트
    first_p = paragraphs[0]
    t_elems = first_p.findall(f".//{HP}t")
    if t_elems:
        t_elems[0].text = str(text) if text else ""
        for extra_t in t_elems[1:]:
            extra_t.text = ""


def get_cell(row: ET.Element, col_addr: int):
    for cell in row.findall(f"{HP}tc"):
        addr = cell.find(f"{HP}cellAddr")
        if addr is not None and addr.get("colAddr") == str(col_addr):
            return cell
    return None


# ---------------------------------------------------------------------------
# 수행 Project 테이블 업데이트
# 템플릿 구조: row0=헤더, rows1-5=개찰(rs=5), rows6-10=진행중(rs=5)
# ---------------------------------------------------------------------------
def update_project_table(table: ET.Element, projects: list) -> None:
    rows = table.findall(f"{HP}tr")
    bid = [p for p in projects if p.get("category") == "개찰"]
    ongoing = [p for p in projects if p.get("category") == "진행중"]

    def fill_section(start_row: int, data: list) -> None:
        for i in range(5):
            row_idx = start_row + i
            if row_idx >= len(rows):
                break
            row = rows[row_idx]
            if i < len(data):
                p = data[i]
                cost_val = p.get("cost")
                cells_data = [
                    (1, str(p.get("orderNum", ""))),
                    (2, p.get("name") or ""),
                    (3, p.get("leader") or ""),
                    (4, p.get("submitDate") or ""),
                    (5, p.get("presentDate") or ""),
                    (6, p.get("openDate") or ""),
                    (7, str(cost_val) if cost_val is not None else ""),
                    (8, p.get("notes") or ""),
                ]
                for col, val in cells_data:
                    cell = get_cell(row, col)
                    if cell:
                        set_cell_text(cell, val)
            else:
                # 빈 행 처리
                for col in range(1, 9):
                    cell = get_cell(row, col)
                    if cell:
                        set_cell_text(cell, "")

    fill_section(1, bid)
    fill_section(6, ongoing)


# ---------------------------------------------------------------------------
# 발주예상 Project 테이블 업데이트
# 템플릿 구조: row0=헤더, rows1-2=데이터
# ---------------------------------------------------------------------------
def update_expected_table(table: ET.Element, expected: list) -> None:
    rows = table.findall(f"{HP}tr")
    for i in range(1, len(rows)):
        row = rows[i]
        if i - 1 < len(expected):
            p = expected[i - 1]
            budget_val = p.get("budget")
            cost_val = p.get("serviceCost")
            cells_data = [
                (0, str(p.get("orderNum", i))),
                (1, p.get("name") or ""),
                (2, p.get("client") or ""),
                (3, p.get("leader") or ""),
                (4, str(budget_val) if budget_val is not None else ""),
                (5, p.get("planMonth") or ""),
                (6, str(cost_val) if cost_val is not None else ""),
                (7, p.get("notes") or ""),
            ]
            for col, val in cells_data:
                cell = get_cell(row, col)
                if cell:
                    set_cell_text(cell, val)
        else:
            for col in range(8):
                cell = get_cell(row, col)
                if cell:
                    set_cell_text(cell, "")


# ---------------------------------------------------------------------------
# 문서 상단 주차 날짜 텍스트 업데이트
# ---------------------------------------------------------------------------
def update_week_display(root: ET.Element, week_label: str) -> None:
    for p in list(root.findall(f".//{HP}p"))[:10]:
        for t in p.findall(f".//{HP}t"):
            if t.text and "~" in t.text and "." in t.text:
                t.text = f"({week_label})"
                return


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main():
    data = json.loads(sys.stdin.read())
    projects = data.get("projects", [])
    expected = data.get("expectedProjects", [])
    week_label = data.get("weekLabel", "")

    # 템플릿 경로: Next.js 프로젝트 루트 기준
    template_path = os.path.join(os.path.dirname(__file__), "..", "public", "templates", "template.hwpx")
    template_path = os.path.normpath(template_path)

    with open(template_path, "rb") as f:
        template_bytes = f.read()

    with zipfile.ZipFile(io.BytesIO(template_bytes)) as z:
        infos = {info.filename: info for info in z.infolist()}
        files = {name: z.read(name) for name in z.namelist()}

    xml_bytes = files["Contents/section0.xml"]
    root = ET.fromstring(xml_bytes.decode("utf-8"))

    if week_label:
        update_week_display(root, week_label)

    tables = root.findall(f".//{HP}tbl")
    if len(tables) >= 1:
        update_project_table(tables[0], projects)
    if len(tables) >= 2:
        update_expected_table(tables[1], expected)

    new_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + ET.tostring(root, encoding="unicode")
    files["Contents/section0.xml"] = new_xml.encode("utf-8")

    out_buf = io.BytesIO()
    with zipfile.ZipFile(out_buf, "w") as out_zip:
        for name, content in files.items():
            orig = infos[name]
            info = zipfile.ZipInfo(name)
            info.compress_type = orig.compress_type
            info.external_attr = orig.external_attr
            out_zip.writestr(info, content)

    sys.stdout.buffer.write(out_buf.getvalue())


if __name__ == "__main__":
    main()
