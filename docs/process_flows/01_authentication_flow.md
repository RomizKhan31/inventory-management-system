# 01. Authentication & Authorization Flow Diagram
## Roles Involved: All Users (Public, ADMIN, TRACKER, RECEIVE, DELIVERY, REPORT)

### 1. Operational Overview
Authentication enforces zero-trust security:
1. Operator submits credentials (User Code / Email + Password).
2. Input payload validated against strict Zod schema.
3. System fetches user record from MongoDB `users` collection.
4. If user is deactivated (`isActive: false`), the login is rejected and session blocked.
5. Password verified against stored hash using `bcrypt.compare()` (cost factor 12).
6. Upon verification, system generates a signed JWT containing identity and exactly one assigned role.
7. Event is written to `audit_logs` (recording timestamp, user ID, client IP, outcome).
8. Express RBAC middleware validates token on subsequent API requests.
9. Forced logout triggered immediately if an active session belongs to a deactivated user.

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

    U_Login["User Action: Enter User Code / Email & Password"]:::userAction
    V_Schema{"System Validation: Validate Input Schema (Zod)"}:::validation
    E_Schema["Failed TX: 422 Unprocessable Entity (Invalid format)"]:::failedTx

    DB_Find["Database Op: Query 'users' Collection by Code / Email"]:::dbOp
    V_Exist{"System Validation: Does User Account Exist?"}:::validation
    E_NotFound["Failed TX: 401 Unauthorized (Invalid credentials)"]:::failedTx

    V_Active{"System Validation: Is User Active (isActive == true)?"}:::validation
    E_Deact["Failed TX: 403 Forbidden (Account deactivated / forced logout)"]:::failedTx

    V_Pass{"System Validation: Verify Password Hash (bcrypt.compare)"}:::validation
    E_Pass["Failed TX: 401 Unauthorized (Invalid password)"]:::failedTx

    S_JWT["Success TX: Issue Signed JWT (Payload: id, userCode, role)"]:::successTx
    DB_Audit["Database Op: Append Success / Failure to 'audit_logs'"]:::dbOp
    U_Nav["User Action: Client stores token & navigates to role view"]:::userAction

    subgraph RBACMiddleware["Subsequent Requests: Server-Side RBAC Guard"]
        V_Token{"System Validation: Verify JWT Signature & Expiration"}:::validation
        DB_CheckUser["Database Op: Quick cache check: user.isActive"]:::dbOp
        V_RoleMatch{"System Validation: Does Token Role match required endpoint role?"}:::validation
        E_RBAC["Failed TX: 403 Forbidden (Role mismatch)"]:::failedTx
        S_Allow["Success TX: Request Proceed to Route Controller"]:::successTx
    end

    U_Logout["User Action: Click Logout Button"]:::userAction
    S_Logout["Success TX: Purge Client Token & Record Logout in Audit Log"]:::successTx

    %% Flow Connections
    U_Login --> V_Schema
    V_Schema -- "Invalid" --> E_Schema
    V_Schema -- "Valid" --> DB_Find
    DB_Find --> V_Exist
    V_Exist -- "No" --> E_NotFound
    V_Exist -- "Yes" --> V_Active
    V_Active -- "No" --> E_Deact
    V_Active -- "Yes" --> V_Pass
    V_Pass -- "Mismatch" --> E_Pass
    V_Pass -- "Match" --> S_JWT
    S_JWT --> DB_Audit
    S_JWT --> U_Nav

    U_Nav --> V_Token
    V_Token --> DB_CheckUser
    DB_CheckUser --> V_RoleMatch
    V_RoleMatch -- "Unauthorized" --> E_RBAC
    V_RoleMatch -- "Authorized" --> S_Allow

    E_Schema -.-> DB_Audit
    E_NotFound -.-> DB_Audit
    E_Deact -.-> DB_Audit
    E_Pass -.-> DB_Audit

    U_Logout --> S_Logout
```
