# Database Design Documentation (Phase 3)
## MongoDB Atlas & Mongoose ODM Architecture

This directory contains the database design specifications, Entity-Relationship (ER) diagrams, Mongoose schema definitions, indexing strategies, current stock calculation aggregation pipelines, ACID transaction controls, and seed documentation for the Barcode-Based Inventory Management System.

### Index of Database Documentation Deliverables

| # | Document Title | Description | Link |
| :-: | :--- | :--- | :--- |
| **A** | **Database Architecture** | Topological overview, event-sourcing ledger principles, and collection classification. | [00_database_architecture.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/00_database_architecture.md) |
| **B** | **Entity-Relationship Diagram** | Complete Mermaid `erDiagram` with primary keys, foreign references, and constraints. | [01_entity_relationship_diagram.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/01_entity_relationship_diagram.md) |
| **C** | **Mongoose Schema Files** | Production TypeScript Mongoose models in `backend/src/database/models/`. | [backend/src/database/models/](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/) |
| **D** | **Indexing & Performance Strategy** | Sub-50ms B-Tree compound indexing matrix and performance justifications. | [03_indexing_and_performance.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/03_indexing_and_performance.md) |
| **E** | **Current Stock Aggregation Engine** | Deterministic derivation of stock status from append-only history. | [04_current_stock_calculation_aggregation.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/04_current_stock_calculation_aggregation.md) |
| **F** | **Transaction Consistency & ACID** | MongoDB Client Sessions, race condition prevention, and Atlas replica set requirements. | [05_transaction_consistency_and_acid.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/05_transaction_consistency_and_acid.md) |
| **G** | **Seed Data & Setup Guide** | Official assignment test record (`Product 2440701AK2057`, Users `66798`, `58877`, `54671`). | [06_seed_data_and_setup_guide.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/06_seed_data_and_setup_guide.md) |
| **H** | **SQL vs MongoDB Atlas Memorandum** | Academic justification comparing SQL scripts with MongoDB Atlas implementation. | [07_sql_vs_mongodb_comparison.md](file:///home/romiz/WALTON/inventory-management-system/docs/database/07_sql_vs_mongodb_comparison.md) |

---

### Executable Database Code in Backend
* **Mongoose Models:** [`User.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/User.ts), [`Product.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/Product.ts), [`Component.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/Component.ts), [`ReceivePoint.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/ReceivePoint.ts), [`DeliveryPoint.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/DeliveryPoint.ts), [`InventoryTransaction.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/InventoryTransaction.ts), [`ComponentBinding.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/ComponentBinding.ts), [`AuditLog.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/models/AuditLog.ts)
* **Connection Manager:** [`connection.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/connection.ts)
* **Official Seed Script:** [`seed.ts`](file:///home/romiz/WALTON/inventory-management-system/backend/src/database/seed.ts)
