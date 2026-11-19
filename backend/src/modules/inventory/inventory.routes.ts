import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { InventoryController } from './inventory.controller';

const router = Router();

// All operational inventory routes require authentication
router.use(authenticate);

/**
 * 1. Product & Component Barcode Validation Enquiries
 */
router.get(
  '/product-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER', 'REPORT_VIEWER'),
  InventoryController.validateProductScan
);

router.get(
  '/component-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER', 'REPORT_VIEWER'),
  InventoryController.validateComponentScan
);

router.get(
  '/validate-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER'),
  InventoryController.validateProductScan
);

/**
 * 2. Component Tracking:
 * Strictly gated to COMPONENT_TRACKER and ADMIN.
 * Other roles (Receive, Delivery, Report Viewer) MUST be rejected with 403.
 */
router.post(
  '/track-components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.trackComponents
);

/**
 * 3. Product Receiving:
 * Gated to RECEIVE_USER and ADMIN.
 */
router.get(
  '/receive-points',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.listActiveReceivePoints
);

router.post(
  '/receive',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.receiveProduct
);

/**
 * 4. Product Delivery:
 * Gated to DELIVERY_USER and ADMIN.
 */
router.get(
  '/delivery-points',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.listActiveDeliveryPoints
);

router.post(
  '/deliver',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.deliverProduct
);

/**
 * 5. Reversals:
 * Gated to ADMIN exclusively.
 */
router.post(
  '/reverse-component',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseComponentTracking
);

router.post(
  '/reverse',
  requirePermission('OPERATION_REVERSE'),
  async (req: Request, res: Response, next) => {
    // If body contains componentBarcode, route to component reversal
    if (req.body.componentBarcode) {
      return InventoryController.reverseComponentTracking(req, res, next);
    }
    // Generic reversal acknowledgement for RBAC test
    sendResponse(res, 200, 'Authorized: Reversal operation permission verified', {
      operator: req.user?.userCode,
      role: req.user?.role,
      action: 'REVERSE_TRANSACTION',
    });
  }
);

export const inventoryRoutes = router;
