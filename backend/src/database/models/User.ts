import { Schema, model, Document, Model } from 'mongoose';

export type UserRole =
  | 'ADMIN'
  | 'COMPONENT_TRACKER'
  | 'RECEIVE_USER'
  | 'DELIVERY_USER'
  | 'REPORT_VIEWER';

export interface IUser extends Document {
  userCode: string; // Employee ID / Badge number, e.g. "66798", "58877", "54671"
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userCode: {
      type: String,
      required: [true, 'User Code / Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'User Code must be at least 3 characters'],
      maxlength: [20, 'User Code cannot exceed 20 characters'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Don't return password hash in regular queries
    },
    role: {
      type: String,
      required: [true, 'Exactly one role must be assigned'],
      enum: {
        values: [
          'ADMIN',
          'COMPONENT_TRACKER',
          'RECEIVE_USER',
          'DELIVERY_USER',
          'REPORT_VIEWER',
        ],
        message: '{VALUE} is not a valid user role',
      },
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Compound index for active user lookups
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ userCode: 1, isActive: 1 });

export const User: Model<IUser> = model<IUser>('User', UserSchema);
