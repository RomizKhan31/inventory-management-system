# 04. Product Delivery Flow Diagram
## Responsible Role: `DELIVERY_USER` or `ADMIN`

### 1. Operational Overview
Product delivery dispatches stock from warehouse inventory to shipping docks:
1. Operator navigates to Delivery Station (`/operations/delivery`).
2. Operator selects an active Delivery Point (e.g., `Refrigerator Delivery Point 1`).
3. Operator scans the Product Barcode (e.g., `2440701AK2057`).
4. System calculates the product's current stock state dynamically:
   - Evaluates whether unit is currently `IN_STOCK` (Rule BR-06).
   - If unit is `UNREGISTERED` or `TRACKED`, delivery is blocked (`400 Bad Request`).
   - If unit is already `DELIVERED`, double dispatch is blocked (`409 Conflict`).
5. System opens a MongoDB ACID session with concurrency write lock.
6. System appends an immutable `DELIVERED` event document into `inventory_transactions` (recording Delivery Point, user ID `54671`, and timestamp).
7. Stock count decrements from available warehouse inventory.
8. Status dynamically updates to `DELIVERED`, and visual/audio confirmation is presented.

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

    U_Point["User Action: Select Active Delivery Point (e.g., Delivery Point 1)"]:::userAction
    V_Point{"System Validation: Is Delivery Point Active & Valid?"}:::validation
    E_Point["Failed TX: 400 Bad Request (Invalid / deactivated delivery point)"]:::failedTx

    U_Scan["User Action: Scan Product Barcode (e.g., 2440701AK2057)"]:::userAction
    V_Format{"System Validation: Validate Barcode String Format"}:::validation
    E_Format["Failed TX: 400 Bad Request (Invalid barcode syntax)"]:::failedTx

    DB_Calc["Database Op: Aggregate Transaction History to Calculate State"]:::dbOp
    V_Avail{"System Validation: Is Unit State == IN_STOCK?"}:::validation
    E_NotStock["Failed TX: 400 Bad Request (Unit not received into warehouse stock!)"]:::failedTx
    E_Delivered["Failed TX: 409 Conflict (Duplicate Delivery: Unit already delivered!)"]:::failedTx

    DB_TxSession["Database Op: Open MongoDB ACID Session & Concurrency Lock"]:::dbOp
    DB_Append["Database Op: Append 'DELIVERED' Event (Delivery Point, User 54671, UTC Time)"]:::dbOp
    DB_Commit["Database Op: Commit Transaction Session"]:::dbOp

    S_Succ["Success TX: 200 OK (Unit status transitions to DELIVERED; leaves stock)"]:::successTx
    U_Feedback["User Action / UI: Dispatch confirmed, play audio tone, update grid"]:::userAction

    %% Flow Connections
    U_Point --> V_Point
    V_Point -- "Inactive" --> E_Point
    V_Point -- "Active" --> U_Scan

    U_Scan --> V_Format
    V_Format -- "Malformed" --> E_Format
    V_Format -- "Valid" --> DB_Calc

    DB_Calc --> V_Avail
    V_Avail -- "TRACKED / UNREGISTERED" --> E_NotStock
    V_Avail -- "Already DELIVERED" --> E_Delivered
    V_Avail -- "IN_STOCK" --> DB_TxSession

    DB_TxSession --> DB_Append
    DB_Append --> DB_Commit
    DB_Commit --> S_Succ
    S_Succ --> U_Feedback
```
