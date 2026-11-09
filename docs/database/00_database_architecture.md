# 00. Database Architecture Specification
## Append-Only Event Sourcing, Data Governance & Master Data Design

### 1. Architectural Foundation
The database architecture for the Walton Inventory Management System (IMS) is engineered around three non-negotiable principles:
1. **Append-Only Immutability:** Historical transaction records (`inventory_transactions`) are write-once, read-many ($WORM$). No application controller, user, or administrative script performs SQL/NoSQL `UPDATE` or `DELETE` on transaction rows.
2. **Derived State Consistency:** Inventory levels and unit availability are derived dynamically from transaction history. There is no mutable `status` column on a products table that can drift out of sync.
3. **Hard Structural Constraints:** Critical business invariants (e.g., 1 component barcode can belong to only 1 product chassis) are enforced by database unique indexes, not solely application-level code.

---

### 2. Collection Classification & Topology

The database comprises 8 collections partitioned into 4 functional domains:

```
+-----------------------------------------------------------------------------------------+
|                                    DATABASE TOPOLOGY                                    |
+-----------------------------------------------------------------------------------------+
|  1. IDENTITY & ACCESS MANAGEMENT (IAM)                                                  |
|     - users: User credentials, bcrypt hash, single role, active/deactivation flags      |
+-----------------------------------------------------------------------------------------+
|  2. MASTER DATA CATALOGS (ADMIN CONTROLLED)                                             |
|     - products: Catalog of product models (Refrigerator, AC)                           |
|     - components: Catalog of serialized modular parts (Compressor, Condenser, PCB)     |
|     - receive_points: Designated warehouse stock intake bays                            |
|     - delivery_points: Designated outbound dispatch dock gates                          |
+-----------------------------------------------------------------------------------------+
|  3. THE CORE TRANSACTION LEDGER & LOCKING                                               |
|     - inventory_transactions: Immutable event ledger (TRACKED, RECEIVED, DELIVERED, REV)|
|     - component_bindings: Active 1:1 component-chassis locking collection              |
+-----------------------------------------------------------------------------------------+
|  4. SYSTEM AUDIT & GOVERNANCE                                                           |
|     - audit_logs: Master data mutations, logins, role adjustments, previous/new values  |
+-----------------------------------------------------------------------------------------+
```

| Section | Main Responsibility |
|---|---|
| IAM | Who can access the system? |
| Master Data | What information does the system manage? |
| Transaction Ledger | What happens to the inventory? |
| Audit & Governance | Who changed what and when? |
