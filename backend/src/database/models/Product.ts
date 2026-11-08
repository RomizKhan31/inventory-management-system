import { Schema, model, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  productCode: string; // e.g. "REF-WDN-2B6", "AC-INV-1.5T"
  name: string; // e.g. "Refrigerator", "Air Conditioner"
  modelNumber?: string;
  category: string; // e.g. "Appliances", "HVAC"
  description?: string;
  isActive: boolean;
  isDeleted: boolean; // Soft-delete flag for entities referenced in history
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    productCode: {
      type: String,
      required: [true, 'Product code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    modelNumber: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      default: 'Appliances',
    },
    description: {
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
    collection: 'products',
  }
);

ProductSchema.index({ name: 1, isActive: 1, isDeleted: 1 });

export const Product: Model<IProduct> = model<IProduct>('Product', ProductSchema);
