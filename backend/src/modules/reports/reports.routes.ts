import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { ReportsController } from './reports.controller';
import { AuditService } from '../audit/audit.service';

const router = Router();

// All reporting routes require authentication
router.use(authenticate);

/**
 * 1. Stock Details Report (Read-only):
 * Permitted for REPORT_VIEWER and ADMIN.
 * Operational roles (Tracker, Receive, Delivery) MUST be rejected with 403.
 */
router.get(
  '/stock-details',
  requirePermission('REPORT_VIEW'),
  ReportsController.getStockDetails
);

/**
 * 2. Date-Range Summary Report & Charts:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/summary',
  requirePermission('REPORT_VIEW'),
  ReportsController.getSummary
);

/**
 * 3. Barcode-Wise Full Lifecycle History:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/barcode-history/:barcode',
  requirePermission('REPORT_VIEW'),
  ReportsController.getBarcodeHistory
);

/**
 * 4. CSV / Excel Report Export:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/export',
  requirePermission('REPORT_EXPORT'),
  ReportsController.exportReport
);

/**
 * 5. System Audit Logs:
 * Permitted exclusively for ADMIN.
 * Report Viewer, Tracker, Receive, Delivery MUST be rejected with 403.
 */
router.get(
  '/audit-logs',
  requirePermission('AUDIT_VIEW'),
  async (req: Request, res: Response) => {
    const result = await AuditService.getLogs(req.query);
    sendResponse(res, 200, 'Authorized: Audit logs retrieved successfully', result.data, result.pagination);
  }
);

export const reportsRoutes = router;
