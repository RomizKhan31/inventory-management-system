# 02. Component Tracking Flow Diagram
## Responsible Role: `COMPONENT_TRACKER` or `ADMIN`

### 1. Operational Overview
Component tracking binds serialized physical sub-assemblies (e.g., Compressor `94A600321852`) to the finished good product chassis (e.g., Refrigerator `2440701AK2057`):
1. Operator navigates to Component Tracking station.
2. Operator scans/enters the Product Barcode and selects the active Product Model.
3. System verifies product barcode validity and ensures product has not already been received into warehouse stock.
4. Operator scans the serialized Component Barcode and selects the Component Type and Track Point.
5. System executes an exclusivity check against `inventory_transactions`:
   - If the component barcode has an active `COMPONENT_TRACKED` event without a compensating `REVERSED_COMPONENT`, it is rejected with a `409 Conflict`.
6. Operator can scan multiple components (1-to-N relationship).
7. Operator clicks "Save Tracking Record".
8. System executes a MongoDB ACID transaction appending `COMPONENT_TRACKED` event(s) to `inventory_transactions`.
9. High-pitch audio feedback sounds, input fields reset, and product enters `TRACKED` state.

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

    U_ScanP["User Action: Scan Product Barcode & Select Model"]:::userAction
    V_FormatP{"System Validation: Is Product Barcode format valid?"}:::validation
    E_FormatP["Failed TX: 400 Bad Request (Invalid barcode syntax)"]:::failedTx

    DB_CheckRec["Database Op: Query ledger for prior RECEIVED events on this barcode"]:::dbOp
    V_NotRec{"System Validation: Has this product already been received into stock?"}:::validation
    E_Rec["Failed TX: 422 Unprocessable (Cannot track after stock admission)"]:::failedTx

    U_ScanC["User Action: Scan Component Barcode & Select Component Type"]:::userAction
    V_FormatC{"System Validation: Is Component Barcode format valid?"}:::validation
    E_FormatC["Failed TX: 400 Bad Request (Invalid component barcode)"]:::failedTx

    DB_CheckComp["Database Op: Query active bindings for this component barcode"]:::dbOp
    V_CompFree{"System Validation: Is Component Barcode free / unassigned?"}:::validation
    E_CompInUse["Failed TX: 409 Conflict (Component already attached to another unit!)"]:::failedTx

    U_AddMore{"User Action: Scan Additional Components for this Chassis?"}:::userAction

    U_Submit["User Action: Click 'Save Tracking Record'"]:::userAction
    DB_TxSession["Database Op: Open MongoDB Session & Start ACID Transaction"]:::dbOp
    DB_Append["Database Op: Append 'COMPONENT_TRACKED' Event(s) to ledger"]:::dbOp
    DB_Commit["Database Op: Commit Transaction Session"]:::dbOp

    S_Succ["Success TX: 201 Created (Unit dynamically transitions to TRACKED state)"]:::successTx
    U_Audio["User Action / Feedback: High-pitch success beep & clear scanner queue"]:::userAction

    %% Flow Connections
    U_ScanP --> V_FormatP
    V_FormatP -- "Malformed" --> E_FormatP
    V_FormatP -- "Valid" --> DB_CheckRec
    DB_CheckRec --> V_NotRec
    V_NotRec -- "Already received" --> E_Rec
    V_NotRec -- "Unreceived" --> U_ScanC

    U_ScanC --> V_FormatC
    V_FormatC -- "Malformed" --> E_FormatC
    V_FormatC -- "Valid" --> DB_CheckComp
    DB_CheckComp --> V_CompFree
    V_CompFree -- "Bound" --> E_CompInUse
    V_CompFree -- "Free" --> U_AddMore

    U_AddMore -- "Yes (More components)" --> U_ScanC
    U_AddMore -- "No (Batch complete)" --> U_Submit

    U_Submit --> DB_TxSession
    DB_TxSession --> DB_Append
    DB_Append --> DB_Commit
    DB_Commit --> S_Succ
    S_Succ --> U_Audio
```
