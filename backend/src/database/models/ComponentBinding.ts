import { Schema, model, Document, Model, Types } from 'mongoose';

/**
 * ComponentBinding guarantees strict 1-to-1 component-to-product exclusivity
 * with O(1) duplicate key conflict enforcement at the database engine level.
 * 
 * When COMPONENT_TRACKED occurs, a binding document is created inside the ACID transaction.
 * When REVERSED_COMPONENT occurs, the binding document is deleted, liberating the component barcode.
 * The append-only source of truth remains 100% preserved in InventoryTransaction.
 */
export interface IComponentBinding extends Document {
  componentBarcode: string; // e.g. "94A600321852" (Globally unique active component)
  productBarcode: string; // e.g. "2440701AK2057"
  componentName: string; // e.g. "Compressor"
  attachedAt: Date;
  attachedBy: Types.ObjectId; // User reference
  transactionId: Types.ObjectId; // Reference to the COMPONENT_TRACKED event
}

const ComponentBindingSchema = new Schema<IComponentBinding>(
  {
    componentBarcode: {
      type: String,
      required: [true, 'Component barcode is required'],
      unique: true, // HARD DATABASE CONSTRAINT: Cannot be bound to >1 active product
      trim: true,
      uppercase: true,
      index: true,
    },
    productBarcode: {
      type: String,
      required: [true, 'Product barcode is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    componentName: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
    },
    attachedAt: {
      type: Date,
      default: Date.now,
    },
    attachedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'component_bindings',
  }
);

ComponentBindingSchema.index({ productBarcode: 1, componentBarcode: 1 });

export const ComponentBinding: Model<IComponentBinding> =
  model<IComponentBinding>('ComponentBinding', ComponentBindingSchema);
