# 05. Reversal & Correction Flow Diagram
## Responsible Role: `ADMIN` Exclusively

### 1. Operational Overview
The reversal engine provides audit-compliant operational remediation:
1. Admin logs into Reversals Portal (`/operations/reversals`).
2. Admin enters/scans the target Product Barcode.
3. System loads the complete chronological event stream from `inventory_transactions`.
4. Admin chooses which operation to reverse:
   - **Reverse Delivery:** Allowed only if current state is `DELIVERED`. Unit dynamically returns to `IN_STOCK` at its **original Receive Point**.
   - **Reverse Receive:** Allowed only if current state is `IN_STOCK`. Blocked if downstream `DELIVERED` event exists (Rule BR-14). Unit reverts to `TRACKED` state.
   - **Reverse Component Tracking:** Allowed only if product has not yet been received. Detaches component barcode, liberating it for reuse (Rule BR-16).
5. Admin submits a **mandatory textual reason** (min 10 characters). If omitted, transaction is blocked.
6. System appends a compensating event (`REVERSED_*`) without deleting or updating past events.
7. System logs the administrative intervention to `audit_logs`.
8. UI updates to reflect recalculated product state and timeline.

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

    U_Login["User Action: Admin Navigates to Reversals Module"]:::userAction
    V_Role{"System Validation: Is User Role == ADMIN?"}:::validation
    E_Role["Failed TX: 403 Forbidden (Only ADMIN can reverse operations)"]:::failedTx

    U_Search["User Action: Search by Product Barcode"]:::userAction
    DB_History["Database Op: Aggregate Full Chronological Event Sequence"]:::dbOp
    U_SelectRev{"User Action: Select Reversal Action to Perform"}:::userAction

    %% Branch 1: Reverse Delivery
    subgraph RevDelivery["Action: Reverse Delivery"]
        V_DelState{"System Validation: Is Current State == DELIVERED?"}:::validation
        E_NotDel["Failed TX: 400 Bad Request (Unit is not currently DELIVERED)"]:::failedTx
        U_Reason1["User Action: Enter Mandatory Reversal Reason (Min 10 chars)"]:::userAction
        V_Reason1{"System Validation: Is Reason >= 10 chars?"}:::validation
        E_Reason1["Failed TX: 422 Unprocessable (Reversal reason required)"]:::failedTx
        DB_RevDel["Database Op: Append 'REVERSED_DELIVERY' Event (Stores Admin ID, Reason)"]:::dbOp
        S_RevDel["Success TX: Unit dynamically returns to IN_STOCK at Original Receive Point"]:::successTx
    end

    %% Branch 2: Reverse Receive
    subgraph RevReceive["Action: Reverse Receive"]
        V_RecState{"System Validation: Is Current State == IN_STOCK (Not Delivered)?"}:::validation
        E_AlreadyDel["Failed TX: 400 Bad Request (Cannot reverse receive: Unit already delivered!)"]:::failedTx
        U_Reason2["User Action: Enter Mandatory Reversal Reason (Min 10 chars)"]:::userAction
        V_Reason2{"System Validation: Is Reason >= 10 chars?"}:::validation
        E_Reason2["Failed TX: 422 Unprocessable (Reversal reason required)"]:::failedTx
        DB_RevRec["Database Op: Append 'REVERSED_RECEIVE' Event (Stores Admin ID, Reason)"]:::dbOp
        S_RevRec["Success TX: Unit dynamically reverts to TRACKED (Leaves Stock)"]:::successTx
    end

    %% Branch 3: Reverse Component Tracking
    subgraph RevComponent["Action: Reverse Component Tracking"]
        V_CompState{"System Validation: Has Unit been Received into Stock?"}:::validation
        E_CompRec["Failed TX: 400 Bad Request (Cannot detach component: Unit already in stock!)"]:::failedTx
        U_Reason3["User Action: Select Component Barcode & Enter Reversal Reason"]:::userAction
        V_Reason3{"System Validation: Is Reason >= 10 chars?"}:::validation
        E_Reason3["Failed TX: 422 Unprocessable (Reversal reason required)"]:::failedTx
        DB_RevComp["Database Op: Append 'REVERSED_COMPONENT' Event (Detaches binding)"]:::dbOp
        S_RevComp["Success TX: Component Barcode liberated and eligible for re-scan"]:::successTx
    end

    DB_Audit["Database Op: Append Reversal Action to 'audit_logs'"]:::dbOp

    %% Flow Connections
    U_Login --> V_Role
    V_Role -- "Non-Admin" --> E_Role
    V_Role -- "Admin" --> U_Search

    U_Search --> DB_History
    DB_History --> U_SelectRev

    U_SelectRev -- "Reverse Delivery" --> V_DelState
    V_DelState -- "State != DELIVERED" --> E_NotDel
    V_DelState -- "State == DELIVERED" --> U_Reason1
    U_Reason1 --> V_Reason1
    V_Reason1 -- "Empty / < 10 chars" --> E_Reason1
    V_Reason1 -- "Valid Reason" --> DB_RevDel
    DB_RevDel --> S_RevDel
    S_RevDel --> DB_Audit

    U_SelectRev -- "Reverse Receive" --> V_RecState
    V_RecState -- "Delivered" --> E_AlreadyDel
    V_RecState -- "IN_STOCK" --> U_Reason2
    U_Reason2 --> V_Reason2
    V_Reason2 -- "Empty / < 10 chars" --> E_Reason2
    V_Reason2 -- "Valid Reason" --> DB_RevRec
    DB_RevRec --> S_RevRec
    S_RevRec --> DB_Audit

    U_SelectRev -- "Reverse Component" --> V_CompState
    V_CompState -- "In Stock / Delivered" --> E_CompRec
    V_CompState -- "TRACKED" --> U_Reason3
    U_Reason3 --> V_Reason3
    V_Reason3 -- "Empty / < 10 chars" --> E_Reason3
    V_Reason3 -- "Valid Reason" --> DB_RevComp
    DB_RevComp --> S_RevComp
    S_RevComp --> DB_Audit
```
