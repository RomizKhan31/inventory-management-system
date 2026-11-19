import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { InventoryController } from './inventory.controller';

const router = Router();

// All operational inventory routes require authentication
router.use(authenticate);

/**
 * 0. Dashboard Summary & Real-Time Operational Statistics
 * Accessible to all authenticated users.
 */
router.get(
  '/dashboard',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getDashboardStats
);

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
router.get(
  '/products',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.listActiveProducts
);

router.get(
  '/components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.listActiveComponents
);

router.post(
  '/track-components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.trackComponents
);

/**
 * 3. Product Receiving:
 * Gated to RECEIVE_USER and ADMIN (enforced via requirePermission('OPERATION_RECEIVE')).
 * 
 * Supports both canonical endpoint '/receive' and descriptive workstation route alias '/receive-product':
 * - POST /api/v1/inventory/receive
 * - POST /api/v1/inventory/receive-product
 * 
 * Payload Contract:
 * - productBarcode (string): Unique finished chassis serial (e.g. '2440701AK2057')
 * - receivePointId (string): Mongo ID or pointCode of the active intake bay
 * - notes (string, optional): Pallet / shift / QC notes
 * 
 * Atomic Guarantee:
 * Enforces component tracking prerequisite, prevents duplicate receiving of already in-stock units,
 * and maintains immutable append-only transaction history.
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

router.post(
  '/receive-product',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.receiveProduct
);

/**
 * 4. Product Delivery:
 * Gated to DELIVERY_USER and ADMIN (enforced via requirePermission('OPERATION_DELIVER')).
 * 
 * Supports both canonical endpoint '/deliver' and descriptive workstation route alias '/deliver-product':
 * - POST /api/v1/inventory/deliver
 * - POST /api/v1/inventory/deliver-product
 * 
 * Payload Contract:
 * - productBarcode (string): Unique finished chassis serial
 * - deliveryPointId (string): Mongo ID or pointCode of the outbound shipping dock
 * - notes (string, optional): Truck / bill of lading / order notes
 * 
 * Invariants Enforced:
 * Unit must be currently IN_STOCK; preserves original intake receive point in ledger history.
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

router.post(
  '/deliver-product',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.deliverProduct
);

/**
 * 5. Transaction Ledger Enquiries:
 * Accessible to operators and administrators.
 */
router.get(
  '/transactions',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getTransactions
);

router.get(
  '/transactions/:id',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getTransactionById
);

/**
 * 6. Reversals & Corrections:
 * Gated to ADMIN exclusively (requirePermission('OPERATION_REVERSE')).
 * Every reversal creates an immutable compensating record with a mandatory audit reason.
 */
router.post(
  '/reverse-receive',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseReceive
);

router.post(
  '/reverse-delivery',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseDelivery
);

router.post(
  '/reverse-component',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseComponentTracking
);

router.post(
  '/reverse',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseTransaction
);

export const inventoryRoutes = router;
