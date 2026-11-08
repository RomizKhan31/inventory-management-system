# 03. Product Receiving Flow Diagram
## Responsible Role: `RECEIVE_USER` or `ADMIN`

### 1. Operational Overview
Product receiving admits finished chassis into warehouse stock at designated intake points:
1. Operator navigates to Receiving Station (`/operations/receive`).
2. Operator selects an active Receive Point (e.g., `Refrigerator Receive Point 1`).
3. Operator scans the Product Barcode (e.g., `2440701AK2057`).
4. System executes a dynamic ledger calculation:
   - Verifies unit has a valid prior `COMPONENT_TRACKED` event (Rule BR-04, BR-06). If missing, scan is rejected with `422 Unprocessable Entity`.
   - Verifies unit is not already in stock (`IN_STOCK`) or already delivered (`DELIVERED`) (Rule BR-17). If already in stock, rejected with `409 Conflict` (Duplicate Scan Warning).
5. System opens a MongoDB ACID transaction session with write lock.
6. System appends an immutable `RECEIVED` event document into `inventory_transactions`.
7. Stock balance at the designated Receive Point dynamically increments.
8. System emits a success audio beep, updates the scan queue grid, and clears the input.

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

    U_Point["User Action: Select Active Receive Point (e.g., Receive Point 1)"]:::userAction
    V_Point{"System Validation: Is Receive Point Active & Valid?"}:::validation
    E_Point["Failed TX: 400 Bad Request (Invalid / deactivated receive point)"]:::failedTx

    U_Scan["User Action: Scan Product Barcode (e.g., 2440701AK2057)"]:::userAction
    V_Format{"System Validation: Validate Barcode String Format"}:::validation
    E_Format["Failed TX: 400 Bad Request (Invalid barcode syntax)"]:::failedTx

    DB_Calc["Database Op: Aggregate Transaction History for Barcode"]:::dbOp
    V_Tracked{"System Validation: Is Unit State == TRACKED?"}:::validation
    E_Untracked["Failed TX: 422 Unprocessable (Product not yet tracked with components!)"]:::failedTx

    V_InStock{"System Validation: Is Unit Already IN_STOCK or DELIVERED?"}:::validation
    E_Double["Failed TX: 409 Conflict (Duplicate Receive: Unit already in stock!)"]:::failedTx
    E_Delivered["Failed TX: 400 Bad Request (Unit was already delivered!)"]:::failedTx

    DB_TxSession["Database Op: Open MongoDB ACID Session & Concurrency Lock"]:::dbOp
    DB_Append["Database Op: Append 'RECEIVED' Event (Point, User Code 58877, UTC Time)"]:::dbOp
    DB_Commit["Database Op: Commit Transaction Session"]:::dbOp

    S_Succ["Success TX: 201 Created (Unit enters IN_STOCK at Receive Point 1)"]:::successTx
    U_Feedback["User Action / UI: Play high-pitch success tone, update table, clear input"]:::userAction

    %% Flow Connections
    U_Point --> V_Point
    V_Point -- "Inactive" --> E_Point
    V_Point -- "Active" --> U_Scan

    U_Scan --> V_Format
    V_Format -- "Malformed" --> E_Format
    V_Format -- "Valid" --> DB_Calc

    DB_Calc --> V_Tracked
    V_Tracked -- "No (UNREGISTERED)" --> E_Untracked
    V_Tracked -- "Yes" --> V_InStock

    V_InStock -- "Already IN_STOCK" --> E_Double
    V_InStock -- "Already DELIVERED" --> E_Delivered
    V_InStock -- "Eligible for stock" --> DB_TxSession

    DB_TxSession --> DB_Append
    DB_Append --> DB_Commit
    DB_Commit --> S_Succ
    S_Succ --> U_Feedback
```
