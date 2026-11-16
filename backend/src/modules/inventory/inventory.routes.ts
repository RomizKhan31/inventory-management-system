import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';

const router = Router();

// All operational inventory routes require authentication
router.use(authenticate);

/**
 * 1. Component Tracking:
 * Strictly gated to COMPONENT_TRACKER and ADMIN.
 * Other roles (Receive, Delivery, Report Viewer) MUST be rejected with 403.
 */
router.post(
  '/track-components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Component tracking operation permission verified', {
      operator: req.user?.userCode,
      role: req.user?.role,
      action: 'COMPONENT_TRACKING',
    });
  }
);

/**
 * 2. Product Receiving:
 * Strictly gated to RECEIVE_USER and ADMIN.
 * Other roles (Component Tracker, Delivery User, Report Viewer) MUST be rejected with 403.
 */
router.post(
  '/receive',
  requirePermission('OPERATION_RECEIVE'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Product receiving operation permission verified', {
      operator: req.user?.userCode,
      role: req.user?.role,
      action: 'RECEIVE_STOCK',
    });
  }
);

/**
 * 3. Product Delivery:
 * Strictly gated to DELIVERY_USER and ADMIN.
 * Other roles (Component Tracker, Receive User, Report Viewer) MUST be rejected with 403.
 */
router.post(
  '/deliver',
  requirePermission('OPERATION_DELIVER'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Product delivery operation permission verified', {
      operator: req.user?.userCode,
      role: req.user?.role,
      action: 'DELIVER_STOCK',
    });
  }
);

/**
 * 4. Reversal & Correction:
 * Strictly gated to ADMIN exclusively.
 * All other roles (Component Tracker, Receive User, Delivery User, Report Viewer) MUST be rejected with 403.
 */
router.post(
  '/reverse',
  requirePermission('OPERATION_REVERSE'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Authorized: Reversal operation permission verified', {
      operator: req.user?.userCode,
      role: req.user?.role,
      action: 'REVERSE_TRANSACTION',
    });
  }
);

/**
 * 5. Validate Barcode Scan (Shared by operational roles)
 */
router.get(
  '/validate-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER'),
  async (req: Request, res: Response) => {
    sendResponse(res, 200, 'Barcode query authorized', {
      barcode: req.params.barcode,
      operator: req.user?.userCode,
    });
  }
);

export const inventoryRoutes = router;
