#!/usr/bin/env python3
"""Generate an Excalidraw diagram of the generic DPP data model."""
import json

elements = []
_id = [0]


def nid(prefix="el"):
    _id[0] += 1
    return f"{prefix}-{_id[0]}"


def base(extra):
    el = {
        "angle": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": None,
        "seed": 1000 + _id[0] * 7,
        "version": 1,
        "versionNonce": 2000 + _id[0] * 13,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1,
        "link": None,
        "locked": False,
    }
    el.update(extra)
    return el


LINE_H = 1.25


def text(x, y, w, h, content, size=16, color="#1e1e1e", align="center",
         valign="middle", container=None):
    tid = nid("text")
    el = base({
        "id": tid,
        "type": "text",
        "x": x, "y": y, "width": w, "height": h,
        "strokeColor": color,
        "text": content,
        "originalText": content,
        "fontSize": size,
        "fontFamily": 1,
        "textAlign": align,
        "verticalAlign": valign,
        "containerId": container,
        "lineHeight": LINE_H,
        "baseline": int(size * 0.9),
    })
    elements.append(el)
    return tid


def box(x, y, w, h, content, stroke, bg="#ffffff", size=16):
    bid = nid("box")
    nlines = content.count("\n") + 1
    th = nlines * size * LINE_H
    tid = text(x + 8, y + (h - th) / 2, w - 16, th, content,
               size=size, container=bid)
    rect = base({
        "id": bid,
        "type": "rectangle",
        "x": x, "y": y, "width": w, "height": h,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "roundness": {"type": 3},
        "boundElements": [{"type": "text", "id": tid}],
    })
    elements.append(rect)
    return bid


def band(x, y, w, h, stroke, bg):
    rid = nid("band")
    rect = base({
        "id": rid,
        "type": "rectangle",
        "x": x, "y": y, "width": w, "height": h,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "fillStyle": "solid",
        "roundness": {"type": 3},
    })
    elements.append(rect)
    return rid


def arrow(x1, y1, x2, y2, start=None, end=None, color="#1e1e1e", label=None):
    aid = nid("arrow")
    el = base({
        "id": aid,
        "type": "arrow",
        "x": x1, "y": y1,
        "width": abs(x2 - x1), "height": abs(y2 - y1),
        "strokeColor": color,
        "points": [[0, 0], [x2 - x1, y2 - y1]],
        "lastCommittedPoint": None,
        "startBinding": None if start is None else {"elementId": start, "focus": 0, "gap": 4},
        "endBinding": None if end is None else {"elementId": end, "focus": 0, "gap": 4},
        "startArrowhead": None,
        "endArrowhead": "arrow",
    })
    elements.append(el)
    for box_id in (start, end):
        if box_id:
            for e in elements:
                if e["id"] == box_id:
                    e["boundElements"] = e.get("boundElements", []) + [{"id": aid, "type": "arrow"}]
    return aid


GREEN, GREEN_BG = "#2f9e44", "#ebfbee"
BLUE, BLUE_BG = "#1971c2", "#e7f5ff"
ORANGE, ORANGE_BG = "#e8590c", "#fff9db"
GREY = "#495057"

# Title
text(80, 30, 880, 36, "Generic data model for products and vocabularies",
     size=26, align="left")
text(80, 74, 880, 22, "Separate meaning from content: new products and vocabularies use the same data model.",
     size=15, color=GREY, align="left")

# --- Band 1: Definition layer ---
band(80, 120, 880, 150, GREEN, GREEN_BG)
text(96, 132, 600, 22, "1 · DEFINITIONS: data dictionary and vocabulary",
     size=17, color=GREEN, align="left")
b_repo = box(110, 175, 300, 80,
             "Data Dictionary Repository\n(Namespace · Version · Publisher)", GREEN)
b_entry = box(490, 165, 450, 100,
              "Dictionary Entries\nField name · Type · Unit · Required\nVisibility · Validation · Standard reference", GREEN)
arrow(412, 215, 488, 215, start=b_repo, end=b_entry, color=GREEN)

# --- Band 2: Content layer ---
band(80, 340, 880, 200, BLUE, BLUE_BG)
text(96, 352, 700, 22, "2 · CONTENT: DPP snapshots contain generic data elements",
     size=17, color=BLUE, align="left")
bx = box(110, 400, 180, 80, "Single value\n(single)", BLUE)
box(310, 400, 180, 80, "Multiple values\n(multi)", BLUE)
box(510, 400, 180, 80, "Document\n(document)", BLUE)
box(710, 400, 230, 80, "Collection\n(collection)", BLUE)
text(110, 495, 700, 20, "Each element has a dictionaryReference; snapshots are versioned in dpp_versions.",
     size=14, color=GREY, align="left")

# Vertical link arrow between content and definition
arrow(250, 338, 250, 272, color="#e8590c")
text(268, 286, 480, 20, "references / validates against",
     size=14, color="#e8590c", align="left")

# --- Band 3: Context / graph layer ---
band(80, 600, 880, 170, ORANGE, ORANGE_BG)
text(96, 612, 700, 22, "3 · CONTEXT: relationships around the DPP",
     size=17, color=ORANGE, align="left")
b_prod = box(110, 660, 180, 70, "Product(s)", ORANGE)
b_dpp = box(410, 655, 150, 80, "DPP", ORANGE, size=18)
b_op = box(680, 660, 200, 70, "Economic\noperator", ORANGE)
arrow(292, 695, 408, 695, start=b_prod, end=b_dpp, color=ORANGE)
arrow(562, 695, 678, 695, start=b_dpp, end=b_op, color=ORANGE)
text(380, 740, 480, 18, "+ Other DPPs: contains · isComponentOf · hasSparePart",
     size=13, color=GREY, align="left")

# Footer note
text(80, 790, 880, 20,
     "Organization-scoped content; changes are recorded in audit_events.",
     size=14, color=GREY, align="left")

doc = {
    "type": "excalidraw",
    "version": 2,
    "source": "dpp-data-model",
    "elements": elements,
    "appState": {"gridSize": None, "viewBackgroundColor": "#ffffff"},
    "files": {},
}

with open("docs/data-model.excalidraw", "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)
print(f"wrote {len(elements)} elements")
