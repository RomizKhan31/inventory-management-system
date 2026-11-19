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

export const deliverProductSchema = z
  .object({
    productBarcode: z
      .string()
      .trim()
      .min(3, 'Product barcode must be at least 3 characters')
      .max(50, 'Product barcode cannot exceed 50 characters')
      .transform((val) => val.toUpperCase()),
    deliveryPointId: z.string().trim().optional(),
    deliveryPointCode: z.string().trim().optional(),
    deliveryPoint: z.string().trim().optional(),
    stationNotes: z.string().trim().max(500, 'Station notes cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => Boolean(data.deliveryPointId || data.deliveryPointCode || data.deliveryPoint),
    {
      message: 'Delivery point identifier (ID, code, or name) is required',
      path: ['deliveryPoint'],
    }
  );

export const reverseReceiveSchema = z.object({
  productBarcode: z
    .string()
    .trim()
    .min(3, 'Product barcode is required')
    .transform((val) => val.toUpperCase()),
  transactionId: z.string().trim().optional(),
  reason: z
    .string()
    .trim()
    .min(10, 'Reversal reason is mandatory and must be at least 10 characters long')
    .max(500, 'Reversal reason cannot exceed 500 characters'),
});

export const reverseDeliverySchema = z.object({
  productBarcode: z
    .string()
    .trim()
    .min(3, 'Product barcode is required')
    .transform((val) => val.toUpperCase()),
  transactionId: z.string().trim().optional(),
  reason: z
    .string()
    .trim()
    .min(10, 'Reversal reason is mandatory and must be at least 10 characters long')
    .max(500, 'Reversal reason cannot exceed 500 characters'),
});

export const reverseUnifiedSchema = z
  .object({
    transactionId: z.string().trim().optional(),
    productBarcode: z.string().trim().optional().transform((val) => val?.toUpperCase()),
    barcode: z.string().trim().optional().transform((val) => val?.toUpperCase()),
    componentBarcode: z.string().trim().optional().transform((val) => val?.toUpperCase()),
    eventType: z.string().trim().optional(),
    reason: z
      .string()
      .trim()
      .min(10, 'Reversal reason is mandatory and must be at least 10 characters long')
      .max(500, 'Reversal reason cannot exceed 500 characters'),
  })
  .refine((data) => Boolean(data.transactionId || data.productBarcode || data.barcode), {
    message: 'Either transactionId or productBarcode/barcode must be provided',
    path: ['productBarcode'],
  });
