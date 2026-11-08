# Process Flow Documentation & Architectural Workflows
## Barcode-Based Inventory Management System (IMS)

This directory contains the operational process flowcharts, decision trees, sequence models, and exception handling specifications for the Inventory Management System.

### Process Flow Index & Deliverables

| # | Workflow Diagram | Markdown Spec | Exportable Standalone Vector | Responsible Actor / Role |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Overall System Flow** | [00_overall_system_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/00_overall_system_flow.md) | [overall_system_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/overall_system_flow.svg) | Multi-Role (`ADMIN`, `TRACKER`, `RECEIVE`, `DELIVERY`, `REPORT`) |
| **2** | **Authentication Flow** | [01_authentication_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/01_authentication_flow.md) | [authentication_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/authentication_flow.svg) | All Users & `ADMIN` |
| **3** | **Component Tracking Flow** | [02_component_tracking_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/02_component_tracking_flow.md) | [component_tracking_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/component_tracking_flow.svg) | `COMPONENT_TRACKER` & `ADMIN` |
| **4** | **Product Receiving Flow** | [03_receiving_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/03_receiving_flow.md) | [receiving_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/receiving_flow.svg) | `RECEIVE_USER` & `ADMIN` |
| **5** | **Product Delivery Flow** | [04_delivery_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/04_delivery_flow.md) | [delivery_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/delivery_flow.svg) | `DELIVERY_USER` & `ADMIN` |
| **6** | **Reversal & Correction Flow** | [05_reversal_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/05_reversal_flow.md) | [reversal_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/reversal_flow.svg) | `ADMIN` Exclusively |
| **7** | **Reporting & Analytics Flow** | [06_reporting_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/06_reporting_flow.md) | [reporting_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/reporting_flow.svg) | `REPORT_VIEWER` & `ADMIN` |
| **8** | **Exception Handling Matrix** | [07_exception_handling_flow.md](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/07_exception_handling_flow.md) | [exception_handling_flow.svg](file:///home/romiz/WALTON/inventory-management-system/docs/process_flows/svg/exception_handling_flow.svg) | System-Wide Error Handling |

---

### Visual Classification Standards

Every diagram strictly adheres to a 5-element color-coded visual taxonomy:

1. **User Action (Blue):** Physical operations performed by the human operator (barcode scan, dropdown selection, button click).
2. **System Validation (Amber):** Deterministic business rule verification (schema validation, sequence checks, role inspection).
3. **Database Operation (Purple):** Queries, aggregation pipelines, or ACID session writes into MongoDB collections (`inventory_transactions`, `audit_logs`).
4. **Successful Transaction (Green):** Successfully committed state transition (e.g., unit admitted to stock, stock decremented, reversal appended).
5. **Failed Transaction / Exception (Red):** Rejected operation with explicit HTTP status code, toast warning, and error sound.
