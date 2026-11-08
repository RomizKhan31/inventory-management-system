#!/usr/bin/env python3
"""
Generate professional, standalone SVG flowcharts for the Inventory Management System.
Generates all 8 required process flows:
1. Overall System Flow
2. Authentication Flow
3. Component Tracking Flow
4. Product Receiving Flow
5. Product Delivery Flow
6. Reversal & Correction Flow
7. Reporting Flow
8. Exception Handling Flow
"""

import os

BASE_DIR = "/home/romiz/WALTON/inventory-management-system/docs/process_flows"
SVG_DIR = os.path.join(BASE_DIR, "svg")
os.makedirs(SVG_DIR, exist_ok=True)

# Colors
CLR_USER_BG = "#E1F5FE"
CLR_USER_BORDER = "#0288D1"
CLR_USER_TEXT = "#01579B"

CLR_VAL_BG = "#FFF8E1"
CLR_VAL_BORDER = "#FFA000"
CLR_VAL_TEXT = "#E65100"

CLR_DB_BG = "#EDE7F6"
CLR_DB_BORDER = "#7E57C2"
CLR_DB_TEXT = "#4A148C"

CLR_SUCC_BG = "#E8F5E9"
CLR_SUCC_BORDER = "#388E3C"
CLR_SUCC_TEXT = "#1B5E20"

CLR_ERR_BG = "#FFEBEE"
CLR_ERR_BORDER = "#D32F2F"
CLR_ERR_TEXT = "#B71C1C"

FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

def svg_header(width, height, title, role):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12" flood-color="#000000"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B"/>
    </marker>
    <marker id="arrow-err" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#D32F2F"/>
    </marker>
    <marker id="arrow-succ" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2E7D32"/>
    </marker>
  </defs>

  <rect width="100%" height="100%" fill="#F8FAFC"/>
  <rect x="0" y="0" width="{width}" height="64" fill="#0F172A"/>
  <text x="24" y="30" font-family="{FONT_FAMILY}" font-size="18" font-weight="700" fill="#FFFFFF">{title}</text>
  <text x="24" y="50" font-family="{FONT_FAMILY}" font-size="12" font-weight="500" fill="#94A3B8">Actor / Role: <tspan fill="#38BDF8" font-weight="700">{role}</tspan> | Industrial Manufacturing Inventory Management System</text>

  <g transform="translate({width - 640}, 20)">
    <rect x="0" y="0" width="12" height="12" rx="3" fill="{CLR_USER_BORDER}"/>
    <text x="18" y="10" font-family="{FONT_FAMILY}" font-size="11" fill="#E2E8F0">User Action</text>

    <rect x="95" y="0" width="12" height="12" rx="3" fill="{CLR_VAL_BORDER}"/>
    <text x="113" y="10" font-family="{FONT_FAMILY}" font-size="11" fill="#E2E8F0">Validation</text>

    <rect x="185" y="0" width="12" height="12" rx="3" fill="{CLR_DB_BORDER}"/>
    <text x="203" y="10" font-family="{FONT_FAMILY}" font-size="11" fill="#E2E8F0">Database Op</text>

    <rect x="290" y="0" width="12" height="12" rx="3" fill="{CLR_SUCC_BORDER}"/>
    <text x="308" y="10" font-family="{FONT_FAMILY}" font-size="11" fill="#E2E8F0">Success TX</text>

    <rect x="385" y="0" width="12" height="12" rx="3" fill="{CLR_ERR_BORDER}"/>
    <text x="403" y="10" font-family="{FONT_FAMILY}" font-size="11" fill="#E2E8F0">Reject / Error</text>
  </g>
"""

def node_box(x, y, w, h, cat, title, subtitle="", badge=""):
    cm = {
        "user": (CLR_USER_BG, CLR_USER_BORDER, CLR_USER_TEXT, "USER ACTION"),
        "val": (CLR_VAL_BG, CLR_VAL_BORDER, CLR_VAL_TEXT, "SYSTEM VALIDATION"),
        "db": (CLR_DB_BG, CLR_DB_BORDER, CLR_DB_TEXT, "DATABASE OPERATION"),
        "succ": (CLR_SUCC_BG, CLR_SUCC_BORDER, CLR_SUCC_TEXT, "SUCCESS TRANSACTION"),
        "err": (CLR_ERR_BG, CLR_ERR_BORDER, CLR_ERR_TEXT, "REJECT / EXCEPTION")
    }
    bg, border, text_clr, default_badge = cm.get(cat, (CLR_USER_BG, CLR_USER_BORDER, CLR_USER_TEXT, ""))
    b_txt = badge if badge else default_badge
    b_w = len(b_txt) * 5.8 + 12
    
    sub = f'<text x="{x + 12}" y="{y + 44}" font-family="{FONT_FAMILY}" font-size="11" fill="#475569">{subtitle}</text>' if subtitle else ""
    return f"""
  <g filter="url(#shadow)">
    <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{bg}" stroke="{border}" stroke-width="1.8"/>
    <rect x="{x + 8}" y="{y + 6}" width="{b_w}" height="14" rx="3" fill="{border}"/>
    <text x="{x + 12}" y="{y + 16}" font-family="{FONT_FAMILY}" font-size="8.5" font-weight="700" fill="#FFFFFF">{b_txt}</text>
    <text x="{x + 12}" y="{y + 34 if not subtitle else y + 32}" font-family="{FONT_FAMILY}" font-size="12" font-weight="700" fill="{text_clr}">{title}</text>
    {sub}
  </g>"""

def conn_line(x1, y1, x2, y2, label="", color="#64748B", marker="arrow"):
    mid_x = (x1 + x2) / 2
    mid_y = (y1 + y2) / 2
    lbl = f'<text x="{mid_x + 6}" y="{mid_y - 4}" font-family="{FONT_FAMILY}" font-size="10.5" font-weight="600" fill="{color}">{label}</text>' if label else ""
    return f"""
  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8" marker-end="url(#{marker})"/>
  {lbl}"""

def conn_path(d, label="", lx=0, ly=0, color="#64748B", marker="arrow"):
    lbl = f'<text x="{lx}" y="{ly}" font-family="{FONT_FAMILY}" font-size="10.5" font-weight="600" fill="{color}">{label}</text>' if label else ""
    return f"""
  <path d="{d}" fill="none" stroke="{color}" stroke-width="1.8" marker-end="url(#{marker})"/>
  {lbl}"""

# -------------------------------------------------------------
# 1. OVERALL SYSTEM FLOW SVG
# -------------------------------------------------------------
def gen_overall_flow():
    w, h = 1200, 750
    out = [svg_header(w, h, "1. Overall System Architecture & Operational Lifecycle Flow", "Multi-Role (ADMIN, TRACKER, RECEIVE, DELIVERY, REPORT)")]
    
    # 5 Lifecycle Column headers
    cols = [
        (40, "STAGE 1: MASTER DATA", "ADMIN"),
        (270, "STAGE 2: COMPONENT TRACKING", "COMPONENT_TRACKER"),
        (500, "STAGE 3: PRODUCT RECEIVING", "RECEIVE_USER"),
        (730, "STAGE 4: PRODUCT DELIVERY", "DELIVERY_USER"),
        (960, "STAGE 5: LEDGER & REPORTS", "REPORT_VIEWER")
    ]
    for x, title, role in cols:
        out.append(f"""
  <rect x="{x}" y="85" width="200" height="30" rx="4" fill="#E2E8F0"/>
  <text x="{x + 10}" y="105" font-family="{FONT_FAMILY}" font-size="10" font-weight="700" fill="#334155">{title}</text>
  <rect x="{x}" y="115" width="200" height="570" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-dasharray="3 3"/>""")

    # Stage 1 Nodes
    out.append(node_box(50, 130, 180, 56, "user", "Setup Master Data", "Products, Points, Roles"))
    out.append(node_box(50, 220, 180, 56, "db", "Save Master Catalogs", "Soft-delete protected"))
    out.append(conn_line(140, 186, 140, 220, "Configure"))

    # Stage 2 Nodes
    out.append(node_box(280, 130, 180, 56, "user", "Scan Product Barcode", "Chassis Serial Barcode"))
    out.append(node_box(280, 220, 180, 56, "user", "Scan Component Barcode", "e.g., Compressor Serial"))
    out.append(node_box(280, 310, 180, 56, "val", "Check 1:1 Exclusivity", "Component free?"))
    out.append(node_box(280, 400, 180, 56, "succ", "Append COMPONENT_TRACKED", "State becomes TRACKED"))
    out.append(node_box(280, 490, 180, 56, "err", "Reject Duplicate Binding", "409 Component in use"))
    
    out.append(conn_line(230, 248, 280, 158, "Link Product"))
    out.append(conn_line(370, 186, 370, 220, "Scan Components"))
    out.append(conn_line(370, 276, 370, 310, "Validate"))
    out.append(conn_line(370, 366, 370, 400, "Valid 1:1", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(370, 366, 370, 490, "Duplicate", color="#D32F2F", marker="arrow-err"))

    # Stage 3 Nodes
    out.append(node_box(510, 130, 180, 56, "user", "Scan Product at Bay", "Select Receive Point"))
    out.append(node_box(510, 220, 180, 56, "val", "Verify Prior Tracking", "Is state == TRACKED?"))
    out.append(node_box(510, 310, 180, 56, "val", "Check Double Receive", "Not IN_STOCK / DELIVERED?"))
    out.append(node_box(510, 400, 180, 56, "succ", "Append RECEIVED Event", "Stock increments at Point"))
    out.append(node_box(510, 490, 180, 56, "err", "Reject Invalid Receive", "Untracked / In Stock"))

    out.append(conn_line(460, 428, 510, 158, "Chassis to WH", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(600, 186, 600, 220, "Verify"))
    out.append(conn_line(600, 276, 600, 310, "Tracked", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(600, 366, 600, 400, "Verified", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_path("M 690 248 L 705 248 L 705 518 L 690 518", "Untracked", 710, 380, color="#D32F2F", marker="arrow-err"))

    # Stage 4 Nodes
    out.append(node_box(740, 130, 180, 56, "user", "Scan Product at Dock", "Select Delivery Point"))
    out.append(node_box(740, 220, 180, 56, "val", "Check Stock Availability", "Is state == IN_STOCK?"))
    out.append(node_box(740, 310, 180, 56, "succ", "Append DELIVERED Event", "Stock leaves count"))
    out.append(node_box(740, 400, 180, 56, "err", "Reject Dispatch", "Not in stock / Already delivered"))

    out.append(conn_line(690, 428, 740, 158, "Fulfill Order", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(830, 186, 830, 220, "Check Stock"))
    out.append(conn_line(830, 276, 830, 310, "In Stock", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(830, 276, 830, 400, "Not in Stock", color="#D32F2F", marker="arrow-err"))

    # Stage 5 Nodes
    out.append(node_box(970, 130, 180, 56, "db", "Append-Only Ledger", "inventory_transactions"))
    out.append(node_box(970, 220, 180, 56, "val", "Aggregation Engine", "Dynamically calculate stock"))
    out.append(node_box(970, 310, 180, 56, "succ", "Live Reports & KPIs", "Stock details, Daily charts"))
    out.append(node_box(970, 400, 180, 56, "user", "Export CSV / Excel", "Stream report datasets"))

    # Reversal connection on Admin
    out.append(node_box(50, 400, 180, 56, "user", "Admin Reversal Portal", "Mandatory justification"))
    out.append(node_box(50, 490, 180, 56, "succ", "Append REVERSED_*", "Reverts state in ledger"))
    out.append(conn_line(140, 456, 140, 490, "Authorize Reversal"))
    out.append(conn_path("M 230 518 L 960 518 L 960 158 L 970 158", "Append Compensating Event", 450, 532, color="#7E57C2"))

    out.append(conn_line(1060, 186, 1060, 220, "Stream Logs"))
    out.append(conn_line(1060, 276, 1060, 310, "Project State"))
    out.append(conn_line(1060, 366, 1060, 400, "Download"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 2. AUTHENTICATION FLOW SVG
# -------------------------------------------------------------
def gen_auth_flow():
    w, h = 900, 700
    out = [svg_header(w, h, "2. Authentication, Authorization & Session Management Flow", "All Users & Admin")]

    out.append(node_box(60, 90, 240, 56, "user", "Enter Login Credentials", "User Code / Email + Password"))
    out.append(node_box(60, 180, 240, 56, "val", "Validate Request Schema", "Zod: Non-empty & format checks"))
    out.append(node_box(420, 180, 220, 56, "err", "422 Validation Error", "Invalid input format"))

    out.append(node_box(60, 270, 240, 56, "db", "Find User in MongoDB", "Query by userCode or email"))
    out.append(node_box(420, 270, 220, 56, "err", "401 User Not Found", "Invalid credentials"))

    out.append(node_box(60, 360, 240, 56, "val", "Check Account Status", "Is user.isActive == true?"))
    out.append(node_box(420, 360, 220, 56, "err", "403 Account Deactivated", "Forced logout & session reject"))

    out.append(node_box(60, 450, 240, 56, "val", "Verify bcrypt Password Hash", "Compare hash (cost factor 12)"))
    out.append(node_box(420, 450, 220, 56, "err", "401 Bad Password", "Password mismatch"))

    out.append(node_box(60, 540, 240, 56, "succ", "Generate Signed JWT Token", "Payload: id, userCode, role"))
    out.append(node_box(60, 625, 240, 56, "db", "Append Audit Log", "Record successful login event"))

    out.append(node_box(420, 540, 220, 56, "user", "Client Receives Token", "Redirect to Role Dashboard"))
    out.append(node_box(680, 540, 180, 56, "val", "RBAC Middleware", "Enforce 1 role per user"))

    # Connectors
    out.append(conn_line(180, 146, 180, 180, "Submit"))
    out.append(conn_line(300, 208, 420, 208, "Invalid", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 236, 180, 270, "Valid format"))
    out.append(conn_line(300, 298, 420, 298, "Not found", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 326, 180, 360, "Found"))
    out.append(conn_line(300, 388, 420, 388, "Deactivated", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 416, 180, 450, "Active"))
    out.append(conn_line(300, 478, 420, 478, "Mismatch", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 506, 180, 540, "Verified", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 596, 180, 625, "Log event"))
    out.append(conn_line(300, 568, 420, 568, "Return 200 OK", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(640, 568, 680, 568, "Access Gate"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 3. COMPONENT TRACKING FLOW SVG
# -------------------------------------------------------------
def gen_tracking_flow():
    w, h = 950, 720
    out = [svg_header(w, h, "3. Component Tracking Operational Process Flow", "COMPONENT_TRACKER or ADMIN")]

    out.append(node_box(50, 90, 260, 56, "user", "Scan Product Barcode", "e.g., 2440701AK2057"))
    out.append(node_box(50, 180, 260, 56, "val", "Validate Product & Status", "Is product registered & unreceived?"))
    out.append(node_box(430, 180, 250, 56, "err", "Reject: Already Received / Invalid", "Cannot track after receiving"))

    out.append(node_box(50, 270, 260, 56, "user", "Scan Component Barcode", "e.g., Compressor 94A600321852"))
    out.append(node_box(50, 360, 260, 56, "val", "Check Component Uniqueness", "Check active binding in ledger"))
    out.append(node_box(430, 360, 250, 56, "err", "409 Duplicate Component", "Component barcode already attached!"))

    out.append(node_box(50, 450, 260, 56, "user", "Select Component Track Point", "e.g., Refrigerator Track Point 1"))
    out.append(node_box(50, 540, 260, 56, "db", "MongoDB ACID Transaction", "Insert COMPONENT_TRACKED event"))
    out.append(node_box(50, 630, 260, 56, "succ", "Success: Status = TRACKED", "Trigger audio beep & clear inputs"))
    out.append(node_box(430, 540, 250, 56, "user", "Add More Components (1:N)", "Scan next component for this unit"))

    # Connectors
    out.append(conn_line(180, 146, 180, 180, "Scan In"))
    out.append(conn_line(310, 208, 430, 208, "Failed Check", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 236, 180, 270, "Valid Product", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 326, 180, 360, "Check DB"))
    out.append(conn_line(310, 388, 430, 388, "Already Bound", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 416, 180, 450, "Available", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 506, 180, 540, "Submit Batch"))
    out.append(conn_line(180, 596, 180, 630, "Committed", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_path("M 555 540 L 555 298 L 310 298", "Attach another component", 560, 400, color="#0288D1", marker="arrow"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 4. RECEIVING FLOW SVG
# -------------------------------------------------------------
def gen_receiving_flow():
    w, h = 950, 700
    out = [svg_header(w, h, "4. Product Receiving Operational Process Flow", "RECEIVE_USER or ADMIN")]

    out.append(node_box(50, 90, 260, 56, "user", "Select Receive Point", "e.g., Refrigerator Receive Point 1"))
    out.append(node_box(50, 180, 260, 56, "user", "Scan Product Barcode", "Chassis Serial Barcode"))

    out.append(node_box(50, 270, 260, 56, "db", "Calculate Current State", "Aggregate ledger for barcode"))
    out.append(node_box(50, 360, 260, 56, "val", "Check Pre-Condition: TRACKED?", "Has component tracking occurred?"))
    out.append(node_box(430, 360, 250, 56, "err", "422 Untracked Product", "Must track components before receiving"))

    out.append(node_box(50, 450, 260, 56, "val", "Check Double Receive", "Is unit already IN_STOCK / DELIVERED?"))
    out.append(node_box(430, 450, 250, 56, "err", "409 Duplicate Receive Warning", "Product is already in warehouse stock!"))

    out.append(node_box(50, 540, 260, 56, "db", "Append 'RECEIVED' Event", "Save point, user 58877, timestamp"))
    out.append(node_box(50, 625, 260, 56, "succ", "Unit Enters Stock at Point", "Increment stock count, audio beep"))

    # Connectors
    out.append(conn_line(180, 146, 180, 180, "Select Point"))
    out.append(conn_line(180, 236, 180, 270, "Scan Barcode"))
    out.append(conn_line(180, 326, 180, 360, "Evaluate"))
    out.append(conn_line(310, 388, 430, 388, "Untracked", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 416, 180, 450, "Tracked", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(310, 478, 430, 478, "Already in stock", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 506, 180, 540, "Valid for stock", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 596, 180, 625, "Committed", color="#2E7D32", marker="arrow-succ"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 5. DELIVERY FLOW SVG
# -------------------------------------------------------------
def gen_delivery_flow():
    w, h = 950, 700
    out = [svg_header(w, h, "5. Product Delivery Operational Process Flow", "DELIVERY_USER or ADMIN")]

    out.append(node_box(50, 90, 260, 56, "user", "Select Delivery Point", "e.g., Refrigerator Delivery Point 1"))
    out.append(node_box(50, 180, 260, 56, "user", "Scan Product Barcode", "Chassis Serial Barcode"))

    out.append(node_box(50, 270, 260, 56, "db", "Compute Stock Availability", "Aggregate latest event from ledger"))
    out.append(node_box(50, 360, 260, 56, "val", "Check State == IN_STOCK?", "Is product currently in warehouse stock?"))
    out.append(node_box(430, 360, 250, 56, "err", "400 Not in Stock", "Unit is UNTRACKED or TRACKED only"))

    out.append(node_box(50, 450, 260, 56, "val", "Check Already Delivered?", "Prevent double dispatch"))
    out.append(node_box(430, 450, 250, 56, "err", "409 Duplicate Delivery Warning", "Product was already delivered!"))

    out.append(node_box(50, 540, 260, 56, "db", "Append 'DELIVERED' Event", "Record delivery point, user 54671"))
    out.append(node_box(50, 625, 260, 56, "succ", "Product Status = DELIVERED", "Stock decrements from warehouse count"))

    # Connectors
    out.append(conn_line(180, 146, 180, 180, "Select Point"))
    out.append(conn_line(180, 236, 180, 270, "Scan Barcode"))
    out.append(conn_line(180, 326, 180, 360, "Evaluate"))
    out.append(conn_line(310, 388, 430, 388, "Not In Stock", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 416, 180, 450, "In Stock", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(310, 478, 430, 478, "Already Delivered", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 506, 180, 540, "Verified Available", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 596, 180, 625, "Committed", color="#2E7D32", marker="arrow-succ"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 6. REVERSAL FLOW SVG
# -------------------------------------------------------------
def gen_reversal_flow():
    w, h = 1000, 750
    out = [svg_header(w, h, "6. Administrative Reversal & Correction Operational Flow", "ADMIN ONLY")]

    out.append(node_box(50, 90, 250, 56, "user", "Admin Opens Reversal Portal", "Enter Product Barcode"))
    out.append(node_box(50, 180, 250, 56, "db", "Fetch Full Event Journey", "Query all events for barcode"))
    out.append(node_box(50, 270, 250, 56, "val", "Select Reversal Target", "Receive, Delivery, or Component"))

    # Branch 1: Reverse Delivery
    out.append(node_box(350, 270, 220, 56, "val", "Reverse Delivery Check", "Is current state == DELIVERED?"))
    out.append(node_box(630, 270, 220, 56, "err", "Reject: Not Delivered", "Cannot reverse delivery"))
    out.append(node_box(350, 360, 220, 56, "user", "Enter Mandatory Reason", "Min 10 characters"))
    out.append(node_box(350, 450, 220, 56, "succ", "Append REVERSED_DELIVERY", "Restores unit to original Receive Point"))

    # Branch 2: Reverse Receive
    out.append(node_box(350, 540, 220, 56, "val", "Reverse Receive Check", "Is state == IN_STOCK (not delivered)?"))
    out.append(node_box(630, 540, 220, 56, "err", "Reject: Already Delivered!", "Must reverse delivery first"))
    out.append(node_box(350, 630, 220, 56, "succ", "Append REVERSED_RECEIVE", "Unit reverts to TRACKED (leaves stock)"))

    # Connectors
    out.append(conn_line(175, 146, 175, 180, "Search Barcode"))
    out.append(conn_line(175, 236, 175, 270, "Display Timeline"))
    out.append(conn_line(300, 298, 350, 298, "Reverse Delivery"))
    out.append(conn_line(570, 298, 630, 298, "Invalid State", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(460, 326, 460, 360, "Eligible", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(460, 416, 460, 450, "Reason Valid", color="#2E7D32", marker="arrow-succ"))

    out.append(conn_path("M 175 326 L 175 568 L 350 568", "Reverse Receive", 185, 450))
    out.append(conn_line(570, 568, 630, 568, "Unit Delivered", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(460, 596, 460, 630, "Eligible & Reason OK", color="#2E7D32", marker="arrow-succ"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 7. REPORTING FLOW SVG
# -------------------------------------------------------------
def gen_reporting_flow():
    w, h = 950, 700
    out = [svg_header(w, h, "7. Reporting, Analytics & Data Export Flow", "REPORT_VIEWER or ADMIN")]

    out.append(node_box(50, 90, 260, 56, "user", "Access Reports Module", "Select Report Screen"))
    out.append(node_box(50, 180, 260, 56, "val", "Validate User Role", "Check REPORT_VIEWER or ADMIN"))
    out.append(node_box(430, 180, 250, 56, "err", "403 Forbidden", "Operational roles blocked"))

    out.append(node_box(50, 270, 260, 56, "user", "Choose Report Type & Filters", "Stock Details / Summary / History"))
    out.append(node_box(50, 360, 260, 56, "db", "Execute Aggregation Pipeline", "Calculate metrics from ledger"))

    out.append(node_box(50, 450, 260, 56, "succ", "Render Paginated Results", "Display grid and trend charts"))
    out.append(node_box(50, 540, 260, 56, "user", "Click Export Button", "Choose CSV or Excel format"))
    out.append(node_box(50, 625, 260, 56, "succ", "Stream File Download", "Fast attachment stream response"))

    # Connectors
    out.append(conn_line(180, 146, 180, 180, "Navigate"))
    out.append(conn_line(310, 208, 430, 208, "Unauthorized", color="#D32F2F", marker="arrow-err"))
    out.append(conn_line(180, 236, 180, 270, "Authorized", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 326, 180, 360, "Apply Filters"))
    out.append(conn_line(180, 416, 180, 450, "Computed Data", color="#2E7D32", marker="arrow-succ"))
    out.append(conn_line(180, 506, 180, 540, "Request Export"))
    out.append(conn_line(180, 596, 180, 625, "Generate File", color="#2E7D32", marker="arrow-succ"))

    out.append("</svg>")
    return "\n".join(out)

# -------------------------------------------------------------
# 8. EXCEPTION HANDLING FLOW SVG
# -------------------------------------------------------------
def gen_exception_flow():
    w, h = 1100, 780
    out = [svg_header(w, h, "8. Comprehensive Exception Handling & Error Resolution Matrix Flow", "System-Wide Guardrails")]

    out.append(node_box(40, 90, 260, 56, "val", "1. Barcode Format Validation", "Product or Component barcode format"))
    out.append(node_box(350, 90, 280, 56, "err", "Invalid Barcode Exception", "400 Bad Request: Malformed string"))

    out.append(node_box(40, 180, 260, 56, "val", "2. Component Exclusivity Check", "Is component already attached to a chassis?"))
    out.append(node_box(350, 180, 280, 56, "err", "Duplicate Component Exception", "409 Conflict: Serial active on another unit"))

    out.append(node_box(40, 270, 260, 56, "val", "3. Receiving Sequence Check", "Has unit been tracked with components?"))
    out.append(node_box(350, 270, 280, 56, "err", "Untracked Product Exception", "422 Unprocessable: Must track components first"))

    out.append(node_box(40, 360, 260, 56, "val", "4. Double Receive Check", "Is unit already IN_STOCK at warehouse?"))
    out.append(node_box(350, 360, 280, 56, "err", "Duplicate Receive Exception", "409 Conflict: Unit already in stock"))

    out.append(node_box(40, 450, 260, 56, "val", "5. Delivery Availability Check", "Is unit currently IN_STOCK?"))
    out.append(node_box(350, 450, 280, 56, "err", "Illegal Dispatch Exception", "400 Bad Request: Unit not in available stock"))

    out.append(node_box(40, 540, 260, 56, "val", "6. Reversal Eligibility Check", "Receive reversal: unit already delivered?"))
    out.append(node_box(350, 540, 280, 56, "err", "Invalid Reversal Exception", "400 Bad Request: Downstream delivery exists"))

    out.append(node_box(40, 630, 260, 56, "val", "7. Reversal Justification Check", "Mandatory reason non-empty (min 10 chars)"))
    out.append(node_box(350, 630, 280, 56, "err", "Missing Reason Exception", "422 Unprocessable: Reversal reason required"))

    # Global handler column
    out.append(node_box(700, 270, 340, 120, "err", "Centralized Express Error Handler", "Logs error to console & security audit log\nEmits structured JSON with error code & message\nTriggers client-side audio error buzzer"))

    for y in [118, 208, 298, 388, 478, 568, 658]:
        out.append(conn_line(300, y, 350, y, "Fail", color="#D32F2F", marker="arrow-err"))
        out.append(conn_path(f"M 630 {y} L 670 {y} L 670 330 L 700 330", "", color="#D32F2F", marker="arrow-err"))

    out.append("</svg>")
    return "\n".join(out)

# Write all SVGs
flows = [
    ("overall_system_flow.svg", gen_overall_flow()),
    ("authentication_flow.svg", gen_auth_flow()),
    ("component_tracking_flow.svg", gen_tracking_flow()),
    ("receiving_flow.svg", gen_receiving_flow()),
    ("delivery_flow.svg", gen_delivery_flow()),
    ("reversal_flow.svg", gen_reversal_flow()),
    ("reporting_flow.svg", gen_reporting_flow()),
    ("exception_handling_flow.svg", gen_exception_flow()),
]

for filename, content in flows:
    path = os.path.join(SVG_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated: {path}")

print("All 8 SVG flowcharts generated successfully!")
