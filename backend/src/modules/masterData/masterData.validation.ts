import { z } from 'zod';

export const createProductSchema = z.object({
  productCode: z
    .string()
    .trim()
    .min(2, 'Product Code must be at least 2 characters')
    .max(50, 'Product Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  barcode: z
    .string()
    .trim()
    .min(2, 'Barcode must be at least 2 characters')
    .max(100, 'Barcode cannot exceed 100 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Product Name must be at least 2 characters')
    .max(100, 'Product Name cannot exceed 100 characters'),
  modelNumber: z.string().trim().optional(),
  category: z.string().trim().min(1, 'Category is required').default('Appliances'),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createComponentSchema = z.object({
  componentCode: z
    .string()
    .trim()
    .min(2, 'Component Code must be at least 2 characters')
    .max(50, 'Component Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  barcode: z
    .string()
    .trim()
    .min(2, 'Barcode must be at least 2 characters')
    .max(100, 'Barcode cannot exceed 100 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Component Name must be at least 2 characters')
    .max(100, 'Component Name cannot exceed 100 characters'),
  category: z.string().trim().min(1, 'Category is required').default('Mechanical'),
  specifications: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateComponentSchema = createComponentSchema.partial();

export const createReceivePointSchema = z.object({
  pointCode: z
    .string()
    .trim()
    .min(2, 'Point Code must be at least 2 characters')
    .max(50, 'Point Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, 'Point Name must be at least 2 characters')
    .max(100, 'Point Name cannot exceed 100 characters'),
  location: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateReceivePointSchema = createReceivePointSchema.partial();

export const createDeliveryPointSchema = z.object({
  pointCode: z
    .string()
    .trim()
    .min(2, 'Point Code must be at least 2 characters')
    .max(50, 'Point Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, 'Point Name must be at least 2 characters')
    .max(100, 'Point Name cannot exceed 100 characters'),
  location: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateDeliveryPointSchema = createDeliveryPointSchema.partial();
