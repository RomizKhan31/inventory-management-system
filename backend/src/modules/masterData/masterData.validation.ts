import { z } from 'zod';

/**
 * Reusable schema helper for optional barcodes.
 * 
 * Industrial Manufacturing Rule:
 * In manufacturing master catalogs, a product model or component catalog item
 * can be defined without an initial fixed master barcode (e.g. barcodes are generated
 * at assembly time or entered optionally).
 * 
 * Handling empty strings ("") safely:
 * - Empty strings ("") or whitespace are converted to undefined.
 * - This prevents Zod .min(2) validation errors when forms send empty strings.
 * - This prevents MongoDB sparse unique index duplicate key errors ({ barcode: "" }).
 * - If a barcode is provided, it is trimmed, converted to UPPERCASE, and must be 2-100 chars.
 */
const optionalBarcodeSchema = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return undefined;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
  })
  .refine(
    (val) => val === undefined || (val.length >= 2 && val.length <= 100),
    { message: 'Barcode must be between 2 and 100 characters if provided' }
  );

/**
 * Reusable schema helper for optional descriptive strings.
 * Converts empty strings or whitespace to undefined.
 */
const optionalTrimmedString = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return undefined;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

// ==========================================
// 1. PRODUCT MASTER VALIDATION SCHEMAS
// ==========================================

export const createProductSchema = z.object({
  productCode: z
    .string()
    .trim()
    .min(2, 'Product Code must be at least 2 characters')
    .max(50, 'Product Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  barcode: optionalBarcodeSchema,
  name: z
    .string()
    .trim()
    .min(2, 'Product Name must be at least 2 characters')
    .max(100, 'Product Name cannot exceed 100 characters'),
  modelNumber: optionalTrimmedString,
  category: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'Appliances')),
  description: optionalTrimmedString,
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

// ==========================================
// 2. COMPONENT MASTER VALIDATION SCHEMAS
// ==========================================

export const createComponentSchema = z.object({
  componentCode: z
    .string()
    .trim()
    .min(2, 'Component Code must be at least 2 characters')
    .max(50, 'Component Code cannot exceed 50 characters')
    .transform((val) => val.toUpperCase()),
  barcode: optionalBarcodeSchema,
  name: z
    .string()
    .trim()
    .min(2, 'Component Name must be at least 2 characters')
    .max(100, 'Component Name cannot exceed 100 characters'),
  category: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'Mechanical')),
  specifications: optionalTrimmedString,
  isActive: z.boolean().default(true),
});

export const updateComponentSchema = createComponentSchema.partial();

// ==========================================
// 3. RECEIVE POINT VALIDATION SCHEMAS
// ==========================================

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
  location: optionalTrimmedString,
  isActive: z.boolean().default(true),
});

export const updateReceivePointSchema = createReceivePointSchema.partial();

// ==========================================
// 4. DELIVERY POINT VALIDATION SCHEMAS
// ==========================================

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
  location: optionalTrimmedString,
  isActive: z.boolean().default(true),
});

export const updateDeliveryPointSchema = createDeliveryPointSchema.partial();

