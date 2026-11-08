import { Schema, model, Document, Model, Types } from 'mongoose';

export type InventoryEventType =
  | 'COMPONENT_TRACKED'
  | 'RECEIVED'
  | 'DELIVERED'
  | 'REVERSED_COMPONENT'
  | 'REVERSED_RECEIVE'
  | 'REVERSED_DELIVERY';

export interface IInventoryTransaction extends Document {
  productBarcode: string; // e.g. "2440701AK2057"
  productId?: Types.ObjectId; // Reference to Product master
  productModel: string; // Immutable snapshot, e.g. "Refrigerator"
  eventType: InventoryEventType;
  componentBarcode?: string; // e.g. "94A600321852"
  componentId?: Types.ObjectId; // Reference to Component master
  componentName?: string; // Immutable snapshot, e.g. "Compressor"
  pointId?: Types.ObjectId; // Reference to ReceivePoint or DeliveryPoint
  pointName: string; // Immutable snapshot, e.g. "Refrigerator Receive Point 1"
  performedBy: Types.ObjectId; // User ObjectId
  userCode: string; // Immutable snapshot, e.g. "66798", "58877", "54671"
  userName: string; // Immutable snapshot, e.g. "Mohammad Ali"
  reason?: string; // Mandatory for reversal events (min 10 chars)
  reversedTransactionId?: Types.ObjectId; // Reference to the target transaction being reversed
  metadata?: Record<string, any>; // Optional client IP, device, batch info
  createdAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    productBarcode: {
      type: String,
      required: [true, 'Product barcode is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    productModel: {
      type: String,
      required: [true, 'Product model snapshot is required'],
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: [
          'COMPONENT_TRACKED',
          'RECEIVED',
          'DELIVERED',
          'REVERSED_COMPONENT',
          'REVERSED_RECEIVE',
          'REVERSED_DELIVERY',
        ],
        message: '{VALUE} is not a valid inventory event type',
      },
      index: true,
    },
    componentBarcode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    componentId: {
      type: Schema.Types.ObjectId,
      ref: 'Component',
    },
    componentName: {
      type: String,
      trim: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    pointName: {
      type: String,
      required: [true, 'Point name snapshot is required'],
      trim: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Operator user reference is required'],
      index: true,
    },
    userCode: {
      type: String,
      required: [true, 'Operator userCode snapshot is required'],
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'Operator userName snapshot is required'],
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    reversedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true, // Native Mongoose immutability guard
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // No updatedAt on immutable ledger
    collection: 'inventory_transactions',
  }
);

// High-performance compound indexes for state calculation and reporting
InventoryTransactionSchema.index({ productBarcode: 1, createdAt: 1 });
InventoryTransactionSchema.index({ productBarcode: 1, eventType: 1 });
InventoryTransactionSchema.index({ componentBarcode: 1, eventType: 1 });
InventoryTransactionSchema.index({ eventType: 1, createdAt: -1 });
InventoryTransactionSchema.index({ pointName: 1, eventType: 1, createdAt: -1 });
InventoryTransactionSchema.index({ userCode: 1, createdAt: -1 });

// Reversal business invariant validation via pre-validate hook
InventoryTransactionSchema.pre('validate', function () {
  if (this.eventType && this.eventType.startsWith('REVERSED_')) {
    if (!this.reason || this.reason.trim().length < 10) {
      this.invalidate(
        'reason',
        'Reversals require a mandatory reason with at least 10 characters'
      );
    }
    if (!this.reversedTransactionId) {
      this.invalidate(
        'reversedTransactionId',
        'Reversals must reference the original transaction ID'
      );
    }
  }
});

// STRICT IMMUTABILITY GUARDS (Throw on any update or delete operation)
const blockMutation = function () {
  throw new Error(
    'MUTATION_PROHIBITED: InventoryTransaction is an immutable append-only ledger. Row updates and deletions are strictly forbidden.'
  );
};

InventoryTransactionSchema.pre('updateOne', blockMutation);
InventoryTransactionSchema.pre('updateMany', blockMutation);
InventoryTransactionSchema.pre('findOneAndUpdate', blockMutation);
InventoryTransactionSchema.pre('replaceOne', blockMutation);
InventoryTransactionSchema.pre('findOneAndReplace', blockMutation);
InventoryTransactionSchema.pre('deleteOne', blockMutation);
InventoryTransactionSchema.pre('deleteMany', blockMutation);
InventoryTransactionSchema.pre('findOneAndDelete', blockMutation);

export const InventoryTransaction: Model<IInventoryTransaction> =
  model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
