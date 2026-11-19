import { z } from 'zod';

export const stockDetailsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'IN_STOCK', 'DELIVERED', 'TRACKED', 'NEW_UNTRACKED']).optional().default('ALL'),
  pointName: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});

export const dateRangeSummaryQuerySchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const barcodeHistoryQuerySchema = z.object({
  barcode: z.string().trim().min(3, 'Barcode must be at least 3 characters long'),
});

export const exportReportQuerySchema = z.object({
  reportType: z.enum(['stock-details', 'summary', 'barcode-history']),
  format: z.enum(['csv', 'json']).optional().default('csv'),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'IN_STOCK', 'DELIVERED', 'TRACKED', 'NEW_UNTRACKED']).optional(),
  pointName: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
});
