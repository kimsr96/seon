#!/usr/bin/env python3
"""
HWPX 주간업무 생성기
- 입력: JSON (stdin) – projects 배열 + participants 배열
- 출력: HWPX 바이너리 (stdout)
"""

import sys
import json
import copy
import math
import zipfile
import io
import re
import xml.etree.ElementTree as ET
from pathlib import Path

# ──────────────────────────────────────────────
# 네임스페이스 등록
# ──────────────────────────────────────────────
NS_MAP = {
    "ha":          "http://www.hancom.co.kr/hwpml/2011/app",
    "hp":          "http://www.hancom.co.kr/hwpml/2011/paragraph",
    "hp10":        "http://www.hancom.co.kr/hwpml/2016/paragraph",
    "hs":          "http://www.hancom.co.kr/hwpml/2011/section",
    "hc":          "http://www.hancom.co.kr/hwpml/2011/core",
    "hh":          "http://www.hancom.co.kr/hwpml/2011/head",
    "hhs":         "http://www.hancom.co.kr/hwpml/2011/history",
    "hm":          "http://www.hancom.co.kr/hwpml/2011/master-page",
    "hpf":         "http://www.hancom.co.kr/schema/2011/hpf",
    "dc":          "http://purl.org/dc/elements/1.1/",
    "opf":         "http://www.idpf.org/2007/opf/",
    "ooxmlchart":  "http://www.hancom.co.kr/hwpml/2016/ooxmlchart",
    "hwpunitchar": "http://www.hancom.co.kr/hwpml/2016/HwpUnitChar",
    "epub":        "http://www.idpf.org/2007/ops",
    "config":      "urn:oasis:names:tc:opendocument:xmlns:config:1.0",
}
for prefix, uri in NS_MAP.items():
    ET.register_namespace(prefix, uri)

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HS = "http://www.hancom.co.kr/hwpml/2011/section"

CELL_H = 2955    # 기본 셀 높이 (HWPUNIT)


# ──────────────────────────────────────────────
# 동적 셀 높이 계산
# ──────────────────────────────────────────────

def calc_cell_height(notes: str) -> int:
    """비고 텍스트 길이/줄수에 따라 적절한 셀 높이를 반환한다."""
    if not notes:
        return CELL_H

    lines = notes.split("\n")
    # 각 줄의 길이를 기준으로 렌더링될 실제 줄 수를 추정 (셀 너비 약 20자 기준)
    visual_lines = sum(max(1, math.ceil(len(line) / 20)) for line in lines)

    if visual_lines <= 1:
        return 2955
    elif visual_lines == 2:
        return 3960
    elif visual_lines == 3:
        return 5520
    else:
        return 5520 + (visual_lines - 3) * 1500


# ──────────────────────────────────────────────
# 헬퍼: 셀에서 텍스트 읽기 / 쓰기
# ──────────────────────────────────────────────

def tc_get_text(tc: ET.Element) -> str:
    return "".join(t.text or "" for t in tc.findall(f".//{{{HP}}}t"))


def tc_set_text(tc: ET.Element, text: str) -> None:
    """셀의 모든 hp:t를 찾아 첫 번째에 text를 쓰고 나머지는 비운다."""
    t_nodes = tc.findall(f".//{{{HP}}}t")
    if not t_nodes:
        return
    t_nodes[0].text = text
    for t in t_nodes[1:]:
        t.text = ""


def tc_set_multiline_text(tc: ET.Element, text: str) -> None:
    """셀에 텍스트를 쓴다. \\n은 새 hp:p 단락으로 변환하여 줄바꿈을 표현한다.
    \\n 없는 단일 텍스트는 hp:p를 하나만 남기고 나머지를 제거한다."""
    lines = (text or "").split("\n")

    # subList 안의 p 목록 찾기
    sublist = tc.find(f".//{{{HP}}}subList")
    if sublist is None:
        tc_set_text(tc, text)
        return

    p_nodes = sublist.findall(f"{{{HP}}}p")
    if not p_nodes:
        tc_set_text(tc, text)
        return

    # 첫 번째 p를 스타일 템플릿으로 저장
    template_p = copy.deepcopy(p_nodes[0])

    # 기존 p 노드 모두 제거
    for p in p_nodes:
        sublist.remove(p)

    # 각 라인마다 새 hp:p 생성 (단일 라인도 동일하게 처리 → 여분 hp:p 없음)
    for line in lines:
        new_p = copy.deepcopy(template_p)
        t_nodes = new_p.findall(f".//{{{HP}}}t")
        if t_nodes:
            t_nodes[0].text = line
            for t in t_nodes[1:]:
                t.text = ""
        sublist.append(new_p)


# ──────────────────────────────────────────────
# 헬퍼: 행(tr)에서 colAddr 기준으로 셀 찾기
# ──────────────────────────────────────────────

def find_tc_by_col(tr: ET.Element, col_addr: int):
    for tc in tr.findall(f"{{{HP}}}tc"):
        addr = tc.find(f"{{{HP}}}cellAddr")
        if addr is not None and addr.get("colAddr") == str(col_addr):
            return tc
    return None


# ──────────────────────────────────────────────
# 데이터 행 생성 (일반 행 – 카테고리 셀 없음)
# ──────────────────────────────────────────────

def make_data_row(template_tr: ET.Element, row_addr: int, proj: dict, seq_num: int) -> ET.Element:
    """template_tr(행2 등 일반 행)을 deep-copy하여 프로젝트 데이터로 채운다."""
    new_tr = copy.deepcopy(template_tr)

    notes = proj.get("notes", "") or ""
    cell_h = calc_cell_height(notes)

    # rowAddr 업데이트
    for tc in new_tr.findall(f"{{{HP}}}tc"):
        addr = tc.find(f"{{{HP}}}cellAddr")
        if addr is not None:
            addr.set("rowAddr", str(row_addr))
        sz = tc.find(f"{{{HP}}}cellSz")
        if sz is not None:
            sz.set("height", str(cell_h))

    col_data = {
        1: str(seq_num),
        2: proj.get("name", "") or "",
        3: proj.get("leader", "") or "",
        4: proj.get("submitDate", "") or "",
        5: proj.get("presentDate", "") or "",
        6: proj.get("openDate", "") or "",
        7: str(proj.get("cost", "") or ""),
        8: notes,
    }
    for col, text in col_data.items():
        tc = find_tc_by_col(new_tr, col)
        if tc is not None:
            tc_set_multiline_text(tc, text)

    return new_tr


# ──────────────────────────────────────────────
# 카테고리 리더 행 생성 (첫 번째 행 – 병합셀 포함)
# ──────────────────────────────────────────────

def make_leader_row(template_leader: ET.Element, row_addr: int,
                    proj: dict, row_span: int, seq_num: int) -> ET.Element:
    """개찰/진행중 섹션의 첫 번째 행을 생성한다."""
    new_tr = copy.deepcopy(template_leader)

    notes = proj.get("notes", "") or ""
    data_cell_h = calc_cell_height(notes)
    merged_h = row_span * CELL_H

    for tc in new_tr.findall(f"{{{HP}}}tc"):
        addr = tc.find(f"{{{HP}}}cellAddr")
        span = tc.find(f"{{{HP}}}cellSpan")
        sz   = tc.find(f"{{{HP}}}cellSz")

        ca = addr.get("colAddr") if addr is not None else None

        if addr is not None:
            addr.set("rowAddr", str(row_addr))

        if ca == "0":  # 카테고리 병합 셀
            if span is not None:
                span.set("rowSpan", str(row_span))
            if sz is not None:
                sz.set("height", str(merged_h))
            tc_set_multiline_text(tc, proj.get("category", ""))
        else:
            if sz is not None:
                sz.set("height", str(data_cell_h))
            col = int(ca) if ca and ca.isdigit() else -1
            col_data = {
                1: str(seq_num),
                2: proj.get("name", "") or "",
                3: proj.get("leader", "") or "",
                4: proj.get("submitDate", "") or "",
                5: proj.get("presentDate", "") or "",
                6: proj.get("openDate", "") or "",
                7: str(proj.get("cost", "") or ""),
            }
            col_data[8] = notes
            if col in col_data:
                tc_set_multiline_text(tc, col_data[col])

    return new_tr


# ──────────────────────────────────────────────
# 빈 행 생성 (섹션 마지막 여백 행)
# ──────────────────────────────────────────────

def make_empty_row(template_normal: ET.Element, row_addr: int) -> ET.Element:
    empty_proj = {"orderNum": "", "name": "", "leader": "", "submitDate": "",
                  "presentDate": "", "openDate": "", "cost": "", "notes": ""}
    row = make_data_row(template_normal, row_addr, empty_proj, seq_num=0)
    # 빈 행은 순번 셀도 비워야 함
    tc = find_tc_by_col(row, 1)
    if tc is not None:
        tc_set_text(tc, "")
    return row


# ──────────────────────────────────────────────
# 테이블 재구성
# ──────────────────────────────────────────────

def rebuild_project_table(tbl: ET.Element, gae: list, jin: list) -> None:
    """수행 프로젝트 테이블을 DB 데이터로 재구성한다."""
    rows = tbl.findall(f"{{{HP}}}tr")

    # 템플릿 행 추출
    header_row      = rows[0]   # 헤더 (건드리지 않음)
    leader_gae      = rows[1]   # 개찰 리더 행 템플릿
    normal_gae_row  = rows[2]   # 개찰 일반 데이터 행 템플릿 (bfid=18, #E5E5E5)
    leader_jin      = rows[5]   # 진행중 리더 행 템플릿
    normal_jin_row  = rows[6]   # 진행중 일반 데이터 행 템플릿 (bfid=6, #BBBBBB)

    # 기존 데이터 행 모두 제거 (헤더만 남김)
    for tr in rows[1:]:
        tbl.remove(tr)

    new_rows: list[ET.Element] = []
    row_addr = 1

    # ── 개찰 섹션 ──
    gae_span = max(len(gae), 1) + 1  # 데이터 + 빈행 1개
    for i, proj in enumerate(gae):
        seq = i + 1
        if i == 0:
            new_rows.append(make_leader_row(leader_gae, row_addr, proj, gae_span, seq))
        else:
            new_rows.append(make_data_row(normal_gae_row, row_addr, proj, seq))
        row_addr += 1
    # 빈 행
    new_rows.append(make_empty_row(normal_gae_row, row_addr))
    row_addr += 1

    # ── 진행중 섹션 ──
    jin_span = max(len(jin), 1) + 1
    for i, proj in enumerate(jin):
        seq = i + 1
        if i == 0:
            new_rows.append(make_leader_row(leader_jin, row_addr, proj, jin_span, seq))
        else:
            new_rows.append(make_data_row(normal_jin_row, row_addr, proj, seq))
        row_addr += 1
    # 빈 행
    new_rows.append(make_empty_row(normal_jin_row, row_addr))
    row_addr += 1

    total_rows = 1 + len(new_rows)  # 헤더 포함

    # 새 행 삽입
    for tr in new_rows:
        tbl.append(tr)

    # tbl 메타 업데이트
    tbl.set("rowCnt", str(total_rows))

    # cellzoneList 업데이트
    czl = tbl.find(f"{{{HP}}}cellzoneList")
    if czl is not None:
        for zone in czl.findall(f"{{{HP}}}cellzone"):
            zone.set("endRowAddr", str(total_rows - 1))


# ──────────────────────────────────────────────
# 교육 참가자 단락 업데이트
# ──────────────────────────────────────────────

def update_participant_paragraphs(root: ET.Element, participants: list) -> None:
    """p[10]~p[14] 교육 참가자 단락 텍스트를 갱신한다."""
    paragraphs = root.findall(f"{{{HP}}}p")

    # 카테고리별 분류
    cats = {role: [] for role in ["책임기술자", "건축", "토목", "안전", "기계"]}
    for p in participants:
        role = p.get("role", "")
        name = p.get("name", "")
        company = p.get("company") or ""
        label = f"{name}({company})" if company else name
        if role in cats:
            cats[role].append(label)

    # 책임기술자 줄
    resp = cats["책임기술자"]
    resp_text = "   - 책  임 기술자 : " + ", ".join(resp) + f" - {len(resp)}명" if resp else "   - 책  임 기술자 : "

    # 분야별 줄들
    lines = []
    indent = "   - 분야별 기술자 : "
    sub_indent = "                     "

    field_order = [("건축", "건축"), ("토목", "토목"), ("안전", "안전"), ("기계", "기계")]
    first = True
    for role_key, role_label in field_order:
        members = cats[role_key]
        if not members:
            continue
        suffix = f" – {role_label} {len(members)}명"
        line = (indent if first else sub_indent) + ", ".join(members) + suffix
        lines.append(line)
        first = False

    # 단락 인덱스
    # p[10] = 책임기술자, p[11~14] = 분야별(4줄)
    if len(paragraphs) > 10:
        t_nodes = paragraphs[10].findall(f".//{{{HP}}}t")
        if t_nodes:
            t_nodes[0].text = resp_text
            for t in t_nodes[1:]:
                t.text = ""

    for j, line_text in enumerate(lines[:4]):
        idx = 11 + j
        if idx < len(paragraphs):
            t_nodes = paragraphs[idx].findall(f".//{{{HP}}}t")
            if t_nodes:
                t_nodes[0].text = line_text
                for t in t_nodes[1:]:
                    t.text = ""

    # 남은 분야별 단락 비우기
    for j in range(len(lines), 4):
        idx = 11 + j
        if idx < len(paragraphs):
            t_nodes = paragraphs[idx].findall(f".//{{{HP}}}t")
            if t_nodes:
                t_nodes[0].text = ""
                for t in t_nodes[1:]:
                    t.text = ""


# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────

def main():
    data = json.load(sys.stdin)
    projects     = data.get("projects", [])
    participants = data.get("participants", [])

    gae = [p for p in projects if p.get("category") == "개찰"]
    jin = [p for p in projects if p.get("category") == "진행중"]

    template_path = Path(__file__).parent.parent / "prisma" / "template.hwpx"
    if not template_path.exists():
        print(f"ERROR: 템플릿 파일 없음: {template_path}", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(template_path, "r") as z:
        section_xml = z.read("Contents/section0.xml").decode("utf-8")
        zip_infos = {info.filename: info for info in z.infolist()}
        zip_contents = {info.filename: z.read(info.filename) for info in z.infolist()}

    # ── XML 파싱 ──
    root = ET.fromstring(section_xml)
    ns_hp = f"{{{HP}}}"

    tables = root.findall(f".//{ns_hp}tbl")
    if not tables:
        print("ERROR: 테이블을 찾을 수 없습니다", file=sys.stderr)
        sys.exit(1)

    # 수행 프로젝트 테이블 재구성
    rebuild_project_table(tables[0], gae, jin)

    # 교육 참가자 업데이트
    update_participant_paragraphs(root, participants)

    # ── linesegarray 제거 (HWP이 파일 열 때 레이아웃 재계산하도록) ──
    for p in root.findall(f".//{{{HP}}}p"):
        la = p.find(f"{{{HP}}}linesegarray")
        if la is not None:
            p.remove(la)

    # ── XML 직렬화 ──
    new_xml = ET.tostring(root, encoding="unicode", xml_declaration=False)
    new_xml_bytes = ('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + new_xml).encode("utf-8")

    # ── HWPX 재패킹 ──
    out_buf = io.BytesIO()
    with zipfile.ZipFile(out_buf, "w") as zout:
        for fname, info in zip_infos.items():
            if fname == "Contents/section0.xml":
                zi = zipfile.ZipInfo(fname)
                zi.compress_type = info.compress_type
                zi.external_attr = info.external_attr
                zout.writestr(zi, new_xml_bytes)
            else:
                zi = zipfile.ZipInfo(fname)
                zi.compress_type = info.compress_type
                zi.external_attr = info.external_attr
                zout.writestr(zi, zip_contents[fname])

    sys.stdout.buffer.write(out_buf.getvalue())


if __name__ == "__main__":
    main()
