import { Schema, model, Document, Model } from 'mongoose';

export interface IDeliveryPoint extends Document {
  pointCode: string; // e.g. "DP-REF-01"
  name: string; // e.g. "Refrigerator Delivery Point 1"
  location?: string;
  isActive: boolean;
  isDeleted: boolean; // Soft-delete flag
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPointSchema = new Schema<IDeliveryPoint>(
  {
    pointCode: {
      type: String,
      required: [true, 'Point code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Delivery point name is required'],
      trim: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'delivery_points',
  }
);

DeliveryPointSchema.index({ name: 1, isActive: 1, isDeleted: 1 });

export const DeliveryPoint: Model<IDeliveryPoint> = model<IDeliveryPoint>(
  'DeliveryPoint',
  DeliveryPointSchema
);
