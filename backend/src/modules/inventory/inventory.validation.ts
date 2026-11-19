import { z } from 'zod';

export const trackSingleComponentSchema = z.object({
  productBarcode: z
    .string()
    .trim()
    .min(3, 'Product barcode must be at least 3 characters')
    .max(50, 'Product barcode cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  productId: z.string().optional(),
  productModel: z.string().trim().min(1).optional(),
  componentBarcode: z
    .string()
    .trim()
    .min(3, 'Component barcode must be at least 3 characters')
    .max(50, 'Component barcode cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  componentId: z.string().optional(),
  componentName: z.string().trim().min(1).optional(),
  stationName: z.string().trim().optional(),
});

export const trackBatchComponentsSchema = z.object({
  productBarcode: z
    .string()
    .trim()
    .min(3, 'Product barcode must be at least 3 characters')
    .max(50, 'Product barcode cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  productId: z.string().optional(),
  productModel: z.string().trim().min(1).optional(),
  stationName: z.string().trim().optional(),
  components: z
    .array(
      z.object({
        componentBarcode: z
          .string()
          .trim()
          .min(3, 'Component barcode must be at least 3 characters')
          .transform((val) => val.toUpperCase()),
        componentId: z.string().optional(),
        componentName: z.string().trim().min(1).optional(),
      })
    )
    .min(1, 'At least one component barcode must be provided'),
});

export const reverseComponentSchema = z.object({
  productBarcode: z
    .string()
    .trim()
    .min(3, 'Product barcode is required')
    .transform((val) => val.toUpperCase()),
  componentBarcode: z
    .string()
    .trim()
    .min(3, 'Component barcode is required')
    .transform((val) => val.toUpperCase()),
  reason: z
    .string()
    .trim()
    .min(10, 'Reversal reason is mandatory and must be at least 10 characters long'),
});

export const receiveProductSchema = z
  .object({
    productBarcode: z
      .string()
      .trim()
      .min(3, 'Product barcode must be at least 3 characters')
      .max(50, 'Product barcode cannot exceed 50 characters')
      .transform((val) => val.toUpperCase()),
    receivePointId: z.string().trim().optional(),
    receivePointCode: z.string().trim().optional(),
    receivePoint: z.string().trim().optional(),
    stationNotes: z.string().trim().max(500, 'Station notes cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => Boolean(data.receivePointId || data.receivePointCode || data.receivePoint),
    {
      message: 'Receive point identifier (ID, code, or name) is required',
      path: ['receivePoint'],
    }
  );
