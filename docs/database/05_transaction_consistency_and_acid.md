# 05. Transaction Consistency & Multi-Document ACID Strategy
## Concurrency Control, Race Condition Prevention & Atlas Deployment Requirements

### 1. MongoDB Multi-Document ACID Transactions
In discrete industrial operations, multiple barcode scanning guns operate simultaneously across different bay doors and tracking stations. To prevent split-brain stock counts, duplicate admissions, and double deliveries, critical operations use **MongoDB Multi-Document ACID Transactions**.

#### ACID Properties in This Architecture:
* **Atomicity:** When component tracking binds 3 sub-assemblies, either all 3 `COMPONENT_TRACKED` events and their `component_bindings` are written, or none are.
* **Consistency:** Document-level JSON schema constraints and Mongoose validators are enforced before committing.
* **Isolation:** Reads and writes within a session run under `readConcern: "majority"` and `writeConcern: "majority"`. Uncommitted transactions are invisible to other sessions.
* **Durability:** Committed transactions are guaranteed to be journaled across a majority of replica set nodes before acknowledgment.

---

### 2. MongoDB Atlas & Replica Set Deployment Requirements

To execute multi-document transactions in MongoDB (`session.startTransaction()`), the deployment **must be a Replica Set**:

1. **MongoDB Atlas (Cloud Production / Free M0 Tier):**
   * All MongoDB Atlas clusters (including the free M0 Sandbox and dedicated M10+ tiers) are deployed as a 3-node Replica Set (`primary-secondary-secondary`) out-of-the-box.
   * Native multi-document transactions are fully supported with zero configuration required.

2. **Local Development (Standalone MongoDB):**
   * A standalone `mongod` without replica set configuration does NOT support multi-document transactions.
   * For local testing without Atlas, initialize a single-node replica set using:
     ```bash
     mongod --replSet rs0 --bind_ip localhost
     # In mongosh:
     rs.initiate()
     ```
   * Alternatively, use MongoDB Atlas with the provided connection string in `.env`.

---

### 3. Concurrency Protection & Race Condition Prevention

| Operational Hazard | Concurrency Scenario | Architectural Prevention Mechanism |
| :--- | :--- | :--- |
| **Simultaneous Delivery Scan** | Two operators scan the same product barcode `2440701AK2057` at Dock 1 and Dock 2 within 10 milliseconds of each other. | Both operations open a MongoDB Client Session with `readPreference: 'primary'`. The first session commits the `DELIVERED` event. The second session's write lock or state verification detects an active downstream delivery event and throws `409 Conflict: Unit already delivered`. |
| **Duplicate Component Attachment** | Two assembly lines scan the same compressor barcode `94A600321852` onto two different chassis. | Enforced by the `component_bindings` collection with a **Compound Unique Index** (`{ componentBarcode: 1 }, { unique: true }`). The second transaction immediately fails with MongoDB `E11000 Duplicate Key Error` and automatically rolls back. |
| **Race Condition on Receive Reversal** | Admin initiates Receive Reversal while a delivery driver is concurrently scanning the same unit at dispatch. | The Reversal operation wraps the state check and compensating event inside a transaction. If delivery commits first, the reversal state invariant check fails (`Unit already delivered`) and aborts. |

---

### 4. Canonical Transaction Wrapper Pattern (TypeScript)

```typescript
import mongoose, { ClientSession } from 'mongoose';

/**
 * Executes an operation inside an atomic MongoDB Client Session
 * with automatic rollback on failure and exponential backoff retry for transient write conflicts.
 */
export async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction({
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority' },
    });

    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```
