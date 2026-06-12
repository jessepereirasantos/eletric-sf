from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--force-device-scale-factor=1"])
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    errors = []
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append({"type": msg.type, "text": msg.text[:200]}))
    page.on("pageerror", lambda err: errors.append(str(err)))

    page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    issues = []

    # 1. Check header styles
    header = page.query_selector("[class*='header-bar']")
    if header:
        hstyle = page.evaluate("""el => {
            const s = getComputedStyle(el);
            return {
                display: s.display, height: s.height, background: s.background,
                borderBottom: s.borderBottom, alignItems: s.alignItems,
                padding: s.padding, justifyContent: s.justifyContent
            };
        }""", header)
        if hstyle.get("height") != "44px":
            issues.append(f"Header height is {hstyle.get('height')}, expected 44px")
        if "white" not in hstyle.get("background","").lower() and "#fff" not in hstyle.get("background","").lower():
            issues.append(f"Header background may not be white: {hstyle.get('background')}")
    else:
        issues.append("HEADER NOT FOUND")

    # 2. Check toolbar styles
    tbar = page.query_selector("[class*='toolbar-bar']")
    if tbar:
        tstyle = page.evaluate("""el => {
            const s = getComputedStyle(el);
            return {
                display: s.display, height: s.height, background: s.background,
                borderBottom: s.borderBottom, alignItems: s.alignItems
            };
        }""", tbar)
        if tstyle.get("height") != "40px":
            issues.append(f"Toolbar height is {tstyle.get('height')}, expected 40px")
    else:
        issues.append("TOOLBAR NOT FOUND")

    # 3. Check canvas container
    canvas_area = page.query_selector("[class*='cad-canvas']") or page.query_selector(".canvas-container")
    canvas = page.query_selector("canvas")
    if canvas:
        crect = canvas.bounding_box()
        if crect:
            if crect["width"] < 1000:
                issues.append(f"Canvas too narrow: {crect['width']}px")
            if crect["height"] < 500:
                issues.append(f"Canvas too short: {crect['height']}px")

    # 4. Check PropertiesPanel
    props = page.query_selector("aside")
    if props:
        prect = props.bounding_box()
        if prect and prect["width"] < 200:
            issues.append(f"Properties panel too narrow: {prect['width']}px")
    else:
        issues.append("PROPERTIES PANEL NOT FOUND")

    # 5. Check tab navigation
    tabs = page.query_selector_all(".tab-btn, [class*='tab'], nav button, .app-header button")
    tab_texts = []
    for t in tabs:
        if t.is_visible():
            tab_texts.append(t.inner_text().strip()[:30])

    # 6. Click toolbar dropdowns and check if they open
    toolbar_btns = page.query_selector_all("[class*='toolbar-btn']")
    dropdown_failures = []
    for btn in toolbar_btns:
        if btn.is_visible():
            btn.click()
            page.wait_for_timeout(300)
            # Check if any dropdown appeared
            dd = page.query_selector("[class*='dropdown']")
            if dd and dd.is_visible():
                pass  # dropdown opened
            else:
                dropdown_failures.append(btn.inner_text().strip()[:20])
            # Close by clicking elsewhere
            page.mouse.click(10, 10)
            page.wait_for_timeout(200)

    if dropdown_failures:
        issues.append(f"Dropdowns failed to open for: {', '.join(dropdown_failures)}")

    # 7. Check button spacing in header
    header_btns = page.query_selector_all("[class*='header-btn']")
    btn_positions = []
    for b in header_btns:
        if b.is_visible():
            r = b.bounding_box()
            if r:
                btn_positions.append({"text": b.inner_text().strip()[:10], "x": r["x"], "y": r["y"]})

    # 8. Test adding a wall (click on canvas)
    canvas_el = page.query_selector("canvas")
    if canvas_el:
        crect = canvas_el.bounding_box()
        if crect:
            # Click Arquitetura button first to open wall tools
            arq_btn = page.query_selector("button:has-text('Arquitetura')")
            if arq_btn and arq_btn.is_visible():
                arq_btn.click()
                page.wait_for_timeout(300)
                # Check if dropdown items appeared
                dd_items = page.query_selector_all("[class*='dropdown-item']")
                if dd_items:
                    # Click first item (Paredes)
                    dd_items[0].click()
                    page.wait_for_timeout(300)

    # 9. Check overall layout - no overlapping
    body_els = page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        const rects = [];
        for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.width < 1920 && r.height < 1080) {
                rects.push({tag: el.tagName, x: r.x, y: r.y, w: r.width, h: r.height});
            }
        }
        return rects.slice(0, 200);
    }""")

    # Check for overlapping fixed elements
    overlaps = []
    for i, a in enumerate(body_els):
        for b in body_els[i+1:]:
            if a["tag"] == "CANVAS" or b["tag"] == "CANVAS":
                continue
            if (a["x"] < b["x"] + b["w"] and a["x"] + a["w"] > b["x"] and
                a["y"] < b["y"] + b["h"] and a["y"] + a["h"] > b["y"]):
                # They overlap
                if a["w"] * a["h"] > 100 and b["w"] * b["h"] > 100:
                    overlaps.append(f"{a['tag']}({a['x']},{a['y']},{a['w']}x{a['h']}) <-> {b['tag']}({b['x']},{b['y']},{b['w']}x{b['h']})")

    result = {
        "errors": errors,
        "console_errors": [m for m in console_msgs if m["type"] == "error"],
        "console_warnings": [m for m in console_msgs if m["type"] == "warning"],
        "issues": issues,
        "dropdown_failures": dropdown_failures,
        "tab_texts": tab_texts,
        "header_button_positions": btn_positions,
        "overlaps": overlaps[:10],
        "body_element_count": len(body_els),
    }

    print(json.dumps(result, indent=2, ensure_ascii=True))

    page.screenshot(path="C:\\Users\\SILVAN~1\\AppData\\Local\\Temp\\screenshot_full.png", full_page=True)
    print("Screenshot saved")

    browser.close()
