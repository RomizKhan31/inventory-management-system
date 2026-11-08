# 06. Reporting, Analytics & Data Export Flow Diagram
## Responsible Role: `REPORT_VIEWER` or `ADMIN`

### 1. Operational Overview
The reporting engine leverages dynamic aggregation pipelines directly over the append-only ledger:
1. User navigates to Reports Portal (`/reports/*`).
2. Express RBAC middleware validates user role. Only `REPORT_VIEWER` and `ADMIN` are authorized. Operational roles are blocked with `403 Forbidden`.
3. User selects the report module:
   - **Stock Details Report:** Shows every unit currently in stock, its physical Receive Point, entry timestamp, days in warehouse, and linked serialized components.
   - **Date-Range Summary & Daily Graph:** Aggregates total units received, delivered, and reversed between two dates; plots interactive trend lines.
   - **Barcode Lifecycle Journey:** Visualizes complete timeline for any specific chassis serial from component tracking through receiving, delivery, and any reversals.
4. User applies search filters (Barcode, Product, Point, Date Range).
5. MongoDB aggregation pipeline executes with compound index acceleration.
6. Frontend renders paginated table and charts.
7. User triggers CSV or Excel export (`.xlsx`), streamed directly as a downloaded attachment.

---

### 2. Mermaid Flowchart

```mermaid
flowchart TD
    %% Styling Definitions
    classDef userAction fill:#E1F5FE,stroke:#0288D1,stroke-width:2px,color:#01579B;
    classDef validation fill:#FFF8E1,stroke:#FFA000,stroke-width:2px,color:#E65100;
    classDef dbOp fill:#EDE7F6,stroke:#7E57C2,stroke-width:2px,color:#4A148C;
    classDef successTx fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#1B5E20;
    classDef failedTx fill:#FFEBEE,stroke:#D32F2F,stroke-width:2px,color:#B71C1C;

    U_Nav["User Action: Open Reports & Analytics Portal"]:::userAction
    V_Role{"System Validation: Is Role == REPORT_VIEWER or ADMIN?"}:::validation
    E_Role["Failed TX: 403 Forbidden (Operational roles blocked from reports)"]:::failedTx

    U_Type["User Action: Select Report Type (Stock Details, Summary, Barcode History)"]:::userAction
    U_Filter["User Action: Configure Filters (Date Range, Point, Product Model, Search)"]:::userAction

    DB_Pipeline["Database Op: Execute MongoDB Aggregation Pipeline over ledger"]:::dbOp
    S_Render["Success TX: Render Paginated Data Grid & Interactive Trend Charts"]:::successTx

    U_Export{"User Action: Click 'Export to CSV' or 'Export to Excel'?"}:::userAction
    DB_Stream["Database Op / Service: Transform Aggregation Stream to CSV / XLSX Buffer"]:::dbOp
    S_Download["Success TX: 200 OK (Stream File Attachment Download)"]:::successTx

    %% Flow Connections
    U_Nav --> V_Role
    V_Role -- "Unauthorized" --> E_Role
    V_Role -- "Authorized" --> U_Type

    U_Type --> U_Filter
    U_Filter --> DB_Pipeline
    DB_Pipeline --> S_Render
    S_Render --> U_Export

    U_Export -- "Yes" --> DB_Stream
    DB_Stream --> S_Download
```
