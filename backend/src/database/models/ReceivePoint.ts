import { Schema, model, Document, Model } from 'mongoose';

export interface IReceivePoint extends Document {
  pointCode: string; // e.g. "RP-REF-01"
  name: string; // e.g. "Refrigerator Receive Point 1"
  location?: string;
  isActive: boolean;
  isDeleted: boolean; // Soft-delete flag
  createdAt: Date;
  updatedAt: Date;
}

const ReceivePointSchema = new Schema<IReceivePoint>(
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
      required: [true, 'Receive point name is required'],
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
    collection: 'receive_points',
  }
);

ReceivePointSchema.index({ name: 1, isActive: 1, isDeleted: 1 });

export const ReceivePoint: Model<IReceivePoint> = model<IReceivePoint>(
  'ReceivePoint',
  ReceivePointSchema
);
