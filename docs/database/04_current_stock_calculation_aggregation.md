# 04. Current Stock Calculation & Ledger Aggregation Engine
## Deterministic Derivation of Inventory State from Append-Only History

### 1. Architectural Philosophy
In accordance with **Core Business Rule 11**:
> *"Current inventory status must be calculated from transaction history rather than maintained as a separately editable status."*

Traditional inventory systems introduce an editable status column (e.g. `status = 'IN_STOCK'`), which invariably desynchronizes with history due to unlogged updates, concurrency races, or administrative tampering.

In this architecture, the **current state of any product unit** is a pure mathematical function of its ordered event stream:

$$\text{CurrentState}(B) = \mathcal{F}\Big(\big[e_1, e_2, \dots, e_n\big]\Big)$$

where events $\{e_i\}$ for product barcode $B$ are ordered chronologically by `createdAt ASC`.

---

### 2. State Evaluation Rules & Invariants

| State | Derivation Logic from Transaction Ledger |
| :--- | :--- |
| **`UNREGISTERED`** | No `COMPONENT_TRACKED` event exists, OR all component bindings were detached via `REVERSED_COMPONENT`. |
| **`TRACKED`** | Has at least one valid `COMPONENT_TRACKED` event, and no active `RECEIVED` event (or its previous receive was reversed via `REVERSED_RECEIVE`). |
| **`IN_STOCK`** | Has a valid `RECEIVED` event without a compensating `REVERSED_RECEIVE`, and either no `DELIVERED` event OR its delivery was subsequently reversed via `REVERSED_DELIVERY`. |
| **`DELIVERED`** | Has a valid `DELIVERED` event without a compensating `REVERSED_DELIVERY`. |

---

### 3. Answers to Specific Evaluation Queries

#### A. Whether a product has been tracked?
* **Query Condition:** Scan ledger for `productBarcode == B` and `eventType == 'COMPONENT_TRACKED'`.
* **Evaluation:** If at least one such record exists and has not been invalidated by a matching `REVERSED_COMPONENT` that detached all components, `hasBeenTracked = true`.

#### B. Whether it is currently in stock?
* **Query Condition:** Evaluate the latest active state transition.
* **Evaluation:** If the latest non-reversed event is `RECEIVED` (or if `REVERSED_DELIVERY` occurred after `DELIVERED`), the unit is **`IN_STOCK`**.

#### C. Its current receive point?
* **Query Condition:** Find the latest active `RECEIVED` event in the barcode's history.
* **Evaluation:** If a delivery was reversed via `REVERSED_DELIVERY`, Rule BR-15 mandates restoring to the **original Receive Point**. The system extracts `pointName` and `pointId` from the prior active `RECEIVED` event document!

#### D. Whether it has been delivered?
* **Query Condition:** Scan for `eventType == 'DELIVERED'` on barcode $B$.
* **Evaluation:** If a `DELIVERED` event exists and is NOT followed by a `REVERSED_DELIVERY` event referencing that delivery ID, the unit is **delivered** (`status: 'DELIVERED'`).

#### E. Whether its receive transaction was reversed?
* **Query Condition:** Scan for `eventType == 'REVERSED_RECEIVE'` on barcode $B$.
* **Evaluation:** If `REVERSED_RECEIVE` exists, the receive transaction was annulled. The product dynamically drops from warehouse stock and reverts to `TRACKED` state.

#### F. Whether its delivery was reversed?
* **Query Condition:** Scan for `eventType == 'REVERSED_DELIVERY'` on barcode $B$.
* **Evaluation:** If `REVERSED_DELIVERY` exists, the dispatch was annulled. The product dynamically returns to `IN_STOCK` status at its original receive point.

#### G. Whether a component remains attached?
* **Query Condition:** For component barcode $C$, match all `COMPONENT_TRACKED` and `REVERSED_COMPONENT` events.
* **Evaluation:** Count $N_{\text{tracked}} - N_{\text{reversed}}$. If $> 0$, the component is currently attached to product $B$. (Also verified in $O(1)$ via `component_bindings`).

---

### 4. Production MongoDB Aggregation Pipelines

#### 4.1 Single Barcode Lifecycle Aggregation Pipeline (`getBarcodeState`)

```typescript
export const getBarcodeStatePipeline = (productBarcode: string) => [
  {
    $match: {
      productBarcode: productBarcode.toUpperCase().trim(),
    },
  },
  {
    $sort: {
      createdAt: 1, // Strict chronological order
    },
  },
  {
    $group: {
      _id: '$productBarcode',
      events: { $push: '$$ROOT' },
      productModel: { $last: '$productModel' },
      totalEvents: { $sum: 1 },
    },
  },
  {
    $project: {
      productBarcode: '$_id',
      productModel: 1,
      totalEvents: 1,
      events: 1,
      // Dynamic computation of active components
      attachedComponents: {
        $filter: {
          input: '$events',
          as: 'e',
          cond: {
            $and: [
              { $eq: ['$$e.eventType', 'COMPONENT_TRACKED'] },
              {
                $not: {
                  $in: [
                    '$$e._id',
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: '$events',
                            as: 'rev',
                            cond: { $eq: ['$$rev.eventType', 'REVERSED_COMPONENT'] },
                          },
                        },
                        as: 'r',
                        in: '$$r.reversedTransactionId',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      // Check if active receive exists
      activeReceive: {
        $last: {
          $filter: {
            input: '$events',
            as: 'e',
            cond: {
              $and: [
                { $eq: ['$$e.eventType', 'RECEIVED'] },
                {
                  $not: {
                    $in: [
                      '$$e._id',
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$events',
                              as: 'rev',
                              cond: { $eq: ['$$rev.eventType', 'REVERSED_RECEIVE'] },
                            },
                          },
                          as: 'r',
                          in: '$$r.reversedTransactionId',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      // Check if active delivery exists
      activeDelivery: {
        $last: {
          $filter: {
            input: '$events',
            as: 'e',
            cond: {
              $and: [
                { $eq: ['$$e.eventType', 'DELIVERED'] },
                {
                  $not: {
                    $in: [
                      '$$e._id',
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$events',
                              as: 'rev',
                              cond: { $eq: ['$$rev.eventType', 'REVERSED_DELIVERY'] },
                            },
                          },
                          as: 'r',
                          in: '$$r.reversedTransactionId',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  {
    $addFields: {
      status: {
        $cond: {
          if: { $gt: [{ $size: '$events' }, 0] },
          then: {
            $cond: {
              if: { $ne: ['$activeDelivery', null] },
              then: 'DELIVERED',
              else: {
                $cond: {
                  if: { $ne: ['$activeReceive', null] },
                  then: 'IN_STOCK',
                  else: {
                    $cond: {
                      if: { $gt: [{ $size: '$attachedComponents' }, 0] },
                      then: 'TRACKED',
                      else: 'UNREGISTERED',
                    },
                  },
                },
              },
            },
          },
          else: 'UNREGISTERED',
        },
      },
      currentReceivePoint: '$activeReceive.pointName',
      currentDeliveryPoint: '$activeDelivery.pointName',
      receivedAt: '$activeReceive.createdAt',
      deliveredAt: '$activeDelivery.createdAt',
    },
  },
];
```

---

#### 4.2 Warehouse Stock Details Aggregation Pipeline (`getStockDetails`)

This pipeline computes all items currently `IN_STOCK` across all Receive Points without scanning any mutable product table:

```typescript
export const getStockDetailsPipeline = (filters: {
  pointName?: string;
  productModel?: string;
  skip?: number;
  limit?: number;
}) => [
  {
    $sort: { productBarcode: 1, createdAt: 1 },
  },
  {
    $group: {
      _id: '$productBarcode',
      events: { $push: '$$ROOT' },
      productModel: { $last: '$productModel' },
    },
  },
  // Apply state derivation (same logic as 4.1)
  {
    $project: {
      productBarcode: '$_id',
      productModel: 1,
      activeReceive: {
        $last: {
          $filter: {
            input: '$events',
            as: 'e',
            cond: {
              $and: [
                { $eq: ['$$e.eventType', 'RECEIVED'] },
                {
                  $not: {
                    $in: [
                      '$$e._id',
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$events',
                              as: 'rev',
                              cond: { $eq: ['$$rev.eventType', 'REVERSED_RECEIVE'] },
                            },
                          },
                          as: 'r',
                          in: '$$r.reversedTransactionId',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      activeDelivery: {
        $last: {
          $filter: {
            input: '$events',
            as: 'e',
            cond: {
              $and: [
                { $eq: ['$$e.eventType', 'DELIVERED'] },
                {
                  $not: {
                    $in: [
                      '$$e._id',
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$events',
                              as: 'rev',
                              cond: { $eq: ['$$rev.eventType', 'REVERSED_DELIVERY'] },
                            },
                          },
                          as: 'r',
                          in: '$$r.reversedTransactionId',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  // Filter ONLY items where activeReceive exists AND activeDelivery is NULL
  {
    $match: {
      activeReceive: { $ne: null },
      activeDelivery: null,
      ...(filters.pointName ? { 'activeReceive.pointName': filters.pointName } : {}),
      ...(filters.productModel ? { productModel: filters.productModel } : {}),
    },
  },
  {
    $addFields: {
      receivePoint: '$activeReceive.pointName',
      entryDate: '$activeReceive.createdAt',
      daysInStock: {
        $divide: [
          { $subtract: [new Date(), '$activeReceive.createdAt'] },
          1000 * 60 * 60 * 24,
        ],
      },
    },
  },
  { $sort: { entryDate: 1 } }, // Oldest stock first (Aging stock query)
  ...(filters.skip ? [{ $skip: filters.skip }] : []),
  ...(filters.limit ? [{ $limit: filters.limit }] : [{ $limit: 50 }]),
];
```
