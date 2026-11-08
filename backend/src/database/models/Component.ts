import { Schema, model, Document, Model } from 'mongoose';

export interface IComponent extends Document {
  componentCode: string; // e.g. "COMP-INV-01", "COND-CU-02"
  name: string; // e.g. "Compressor", "Condenser", "Inverter PCB"
  category: string;
  specifications?: string;
  isActive: boolean;
  isDeleted: boolean; // Soft-delete flag
  createdAt: Date;
  updatedAt: Date;
}

const ComponentSchema = new Schema<IComponent>(
  {
    componentCode: {
      type: String,
      required: [true, 'Component code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'Mechanical',
    },
    specifications: {
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
    collection: 'components',
  }
);

ComponentSchema.index({ name: 1, isActive: 1, isDeleted: 1 });

export const Component: Model<IComponent> = model<IComponent>('Component', ComponentSchema);
