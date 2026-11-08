# 03. Indexing Strategy & Performance Architecture

## Sub-100ms Query Latency over High-Volume Ledger Streams

### 1. Indexing Philosophy
In an event-sourced inventory management system, write operations are simple append-only inserts. However, read queries execute aggregation pipelines that group events by `productBarcode` or filter by `pointName` and date ranges.

Without proper indexes, operations such as *"Check if unit is in stock before delivery"* would require a full collection scan ($O(N)$), causing severe factory floor scanning delays.

With our compound B-Tree indexes, all scan validations and status calculations execute in **$O(\log N)$ with sub-50ms query times**.

---

### 2. Collection Index Specification Matrix

| Collection | Index Fields | Type | Query Target / Performance Purpose |
| :--- | :--- | :--- | :--- |
| **`users`** | `{ userCode: 1 }` | **Unique B-Tree** | Instant login by badge number / employee ID. |
| **`users`** | `{ email: 1 }` | **Unique B-Tree** | Instant login by email. |
| **`users`** | `{ email: 1, isActive: 1 }` | Compound | Fast session authentication with active account verification. |
| **`products`** | `{ productCode: 1 }` | **Unique B-Tree** | Guarantees product model code uniqueness. |
| **`products`** | `{ name: 1, isActive: 1, isDeleted: 1 }` | Compound | Active master data dropdowns and autocomplete. |
| **`components`** | `{ componentCode: 1 }` | **Unique B-Tree** | Unique component catalog code. |
| **`components`** | `{ name: 1, isActive: 1, isDeleted: 1 }` | Compound | Fast master data catalog lookup. |
| **`receive_points`**| `{ pointCode: 1 }` | **Unique B-Tree** | Unique physical intake bay code. |
| **`delivery_points`**| `{ pointCode: 1 }` | **Unique B-Tree** | Unique outbound dock bay code. |
| **`inventory_transactions`** | `{ productBarcode: 1, createdAt: 1 }` | **Compound Covered** | **Critical:** Powers the dynamic state calculation pipeline (`getBarcodeState`). Chronological sort without memory sorting. |
| **`inventory_transactions`** | `{ productBarcode: 1, eventType: 1 }` | Compound | Fast check for existence of prior `COMPONENT_TRACKED` or `RECEIVED` events. |
| **`inventory_transactions`** | `{ componentBarcode: 1, eventType: 1 }` | Compound | Fast verification of component history and detachment check. |
| **`inventory_transactions`** | `{ eventType: 1, createdAt: -1 }` | Compound | Powers Date-Range Summary report and daily throughput graphs. |
| **`inventory_transactions`** | `{ pointName: 1, eventType: 1, createdAt: -1 }` | Compound | Powers Stock Details report filtered by warehouse intake bay. |
| **`inventory_transactions`** | `{ reversedTransactionId: 1 }` | Sparse B-Tree | Resolves compensating reversal event pairs instantly. |
| **`component_bindings`** | `{ componentBarcode: 1 }` | **Unique B-Tree** | **Hard Database Gate:** Guarantees a component barcode belongs to only one product. $O(1)$ duplicate scan rejection. |
| **`component_bindings`** | `{ productBarcode: 1, componentBarcode: 1 }` | Compound | Lists all components bound to a given chassis. |
| **`audit_logs`** | `{ entity: 1, action: 1, timestamp: -1 }` | Compound | Powers Admin Audit Log viewer with multi-criteria filtering. |
| **`audit_logs`** | `{ timestamp: -1 }` | Single-field | Chronological audit trail streaming. |
