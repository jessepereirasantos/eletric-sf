from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    errors = []
    console_msgs = []

    page.on("console", lambda msg: console_msgs.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda err: errors.append(str(err)))

    page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Screenshot full page
    page.screenshot(path="C:\\Users\\Silvana Barbosa\\Desktop\\eletric-sf\\screenshot.png", full_page=True)

    # Check DOM structure
    def describe(el, depth=0):
        if not el or depth > 4:
            return None
        tag = el.evaluate("n => n.tagName ? n.tagName.toLowerCase() : 'text'")
        text = el.evaluate("n => (n.textContent || '').trim().substring(0, 80)") if tag != "text" else ""
        children = el.evaluate("n => Array.from(n.children).length") if tag != "text" else 0
        visible = el.is_visible() if tag != "text" else False
        rect = el.bounding_box() if tag != "text" else None
        return {"tag": tag, "text": text, "children": children, "visible": visible, "rect": rect}

    # Check root app
    root = page.query_selector("#root")
    root_info = describe(root)

    # Check for Header
    header = page.query_selector("[class*='header-bar']")
    header_info = describe(header) if header else "NOT FOUND"

    # Check for Toolbar
    toolbar = page.query_selector("[class*='toolbar-bar']")
    toolbar_info = describe(toolbar) if toolbar else "NOT FOUND"

    # Check for canvas
    canvas = page.query_selector("canvas")
    canvas_info = describe(canvas) if canvas else "NOT FOUND"

    # Check for PropertiesPanel
    props_panel = page.query_selector("[class*='properties']")
    props_info = describe(props_panel) if props_panel else "NOT FOUND"

    # Check buttons
    buttons = page.locator("button").all()
    btn_info = []
    for b in buttons:
        if b.is_visible():
            txt = b.inner_text().strip()[:40] if b.inner_text() else ""
            cls = (b.get_attribute("class") or "")[:40]
            btn_info.append({"text": txt, "class": cls})

    # Check text inputs
    inputs = page.locator("input").all()
    input_info = []
    for inp in inputs:
        if inp.is_visible():
            ph = (inp.get_attribute("placeholder") or "")[:30]
            val = (inp.input_value() or "")[:30]
            input_info.append({"placeholder": ph, "value": val})

    # Count all visible elements
    visible_count = page.locator("body *").evaluate_all("els => els.filter(e => {const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0}).length")

    result = {
        "errors": errors,
        "console_errors": [m for m in console_msgs if m["type"] == "error"],
        "console_warnings": [m for m in console_msgs if m["type"] == "warning"],
        "console_log_count": len(console_msgs),
        "root": root_info,
        "header": header_info,
        "toolbar": toolbar_info,
        "canvas": canvas_info,
        "properties_panel": props_info,
        "visible_buttons": btn_info,
        "visible_inputs": input_info,
        "visible_element_count": visible_count,
    }

    print(json.dumps(result, indent=2, ensure_ascii=True))

    browser.close()
