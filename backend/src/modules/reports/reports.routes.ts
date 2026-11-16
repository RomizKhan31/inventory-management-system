import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { AuditLog } from '../../database/models/AuditLog';

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
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Stock details report access granted', {
      viewer: req.user?.userCode,
      role: req.user?.role,
      report: 'STOCK_DETAILS',
    });
  }
);

/**
 * 2. Date-Range Summary Report & Charts:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/summary',
  requirePermission('REPORT_VIEW'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Date-range summary report access granted', {
      viewer: req.user?.userCode,
      role: req.user?.role,
      report: 'SUMMARY_REPORT',
    });
  }
);

/**
 * 3. Barcode-Wise Full Lifecycle History:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/barcode-history/:barcode',
  requirePermission('REPORT_VIEW'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Barcode history report access granted', {
      barcode: req.params.barcode,
      viewer: req.user?.userCode,
      role: req.user?.role,
      report: 'BARCODE_HISTORY',
    });
  }
);

/**
 * 4. CSV / Excel Report Export:
 * Permitted for REPORT_VIEWER and ADMIN.
 */
router.get(
  '/export',
  requirePermission('REPORT_EXPORT'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Report export access granted', {
      viewer: req.user?.userCode,
      role: req.user?.role,
      action: 'EXPORT',
    });
  }
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
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    sendResponse(res, 200, 'Authorized: Audit logs retrieved successfully', logs);
  }
);

export const reportsRoutes = router;
