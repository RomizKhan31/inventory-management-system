import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.middleware';
import { InventoryController } from './inventory.controller';

const router = Router();

// All operational inventory routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/inventory/dashboard:
 *   get:
 *     summary: Real-time dashboard KPI metrics & aging stock
 *     description: |
 *       Returns real-time ledger metrics:
 *       - Current warehouse stock count
 *       - Today's intake (received) count
 *       - Today's dispatched (delivered) count
 *       - WIP assemblies tracked but not yet received
 *       - Longest in-stock aging inventory products array
 *       - Recent transactions ledger feed
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time dashboard statistics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - Bearer token missing or expired.
 */
router.get(
  '/dashboard',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getDashboardStats
);

/**
 * @swagger
 * /api/v1/inventory/product-scan/{barcode}:
 *   get:
 *     summary: Validate chassis barcode scan & get status
 *     description: |
 *       Inspects a product chassis barcode serial (e.g. `2440701AK2057`).
 *       Returns lifecycle state (`NEW_UNTRACKED`, `TRACKED`, `IN_STOCK`, `DELIVERED`), 
 *       bound components, and current bay location.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: 2440701AK2057
 *         description: Product chassis serial barcode
 *     responses:
 *       200:
 *         description: Chassis status and attached components returned.
 *       404:
 *         description: Product chassis not found in catalog or ledger.
 */
router.get(
  '/product-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER', 'REPORT_VIEWER'),
  InventoryController.validateProductScan
);

/**
 * @swagger
 * /api/v1/inventory/component-scan/{barcode}:
 *   get:
 *     summary: Validate sub-assembly component barcode scan
 *     description: |
 *       Inspects a modular component barcode (e.g. Compressor `94A600321852`).
 *       Verifies catalog registration and checks if already bound to an active chassis.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: 94A600321852
 *         description: Modular component serial barcode
 *     responses:
 *       200:
 *         description: Component validation status.
 *       404:
 *         description: Component not found or already bound.
 */
router.get(
  '/component-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER', 'REPORT_VIEWER'),
  InventoryController.validateComponentScan
);

/**
 * @swagger
 * /api/v1/inventory/validate-scan/{barcode}:
 *   get:
 *     summary: Universal barcode scanner validation
 *     description: Universal scan validation endpoint for laser barcode scanners or keyboard input.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: 2440701AK2057
 *     responses:
 *       200:
 *         description: Scan validation payload.
 */
router.get(
  '/validate-scan/:barcode',
  requireRole('ADMIN', 'COMPONENT_TRACKER', 'RECEIVE_USER', 'DELIVERY_USER'),
  InventoryController.validateProductScan
);

/**
 * @swagger
 * /api/v1/inventory/products:
 *   get:
 *     summary: List registered product models for workstation
 *     description: Returns active finished product models for tracking operators.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active products list.
 *       403:
 *         description: Forbidden - Clearance restricted to COMPONENT_TRACKER and ADMIN.
 */
router.get(
  '/products',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.listActiveProducts
);

/**
 * @swagger
 * /api/v1/inventory/components:
 *   get:
 *     summary: List active modular component definitions
 *     description: Returns sub-assemblies (Compressors, Condensers, PCBA) for tracking operators.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active components list.
 *       403:
 *         description: Forbidden - Clearance restricted to COMPONENT_TRACKER and ADMIN.
 */
router.get(
  '/components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.listActiveComponents
);

/**
 * @swagger
 * /api/v1/inventory/track-components:
 *   post:
 *     summary: Bind serialized modular components to product chassis
 *     description: |
 *       Scans product chassis barcode and binds 1-to-N serialized sub-assembly barcodes
 *       (Compressors, Condensers, PCBA) with strict 1-to-1 exclusivity duplicate prevention.
 *       Supports single component or batch components array.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *                 description: Chassis serial barcode
 *               productModel:
 *                 type: string
 *                 example: WSI-INVERNA-18C
 *               components:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - componentBarcode
 *                   properties:
 *                     componentBarcode:
 *                       type: string
 *                       example: 94A600321852
 *                     componentName:
 *                       type: string
 *                       example: Compressor
 *               stationName:
 *                 type: string
 *                 example: Line-01 Assembly Station
 *     responses:
 *       200:
 *         description: Components successfully bound to chassis. Status transitions to TRACKED.
 *       400:
 *         description: Component barcode already bound to another active chassis.
 *       403:
 *         description: Forbidden - Clearance restricted to COMPONENT_TRACKER and ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/track-components',
  requirePermission('OPERATION_COMPONENT_TRACK'),
  InventoryController.trackComponents
);

/**
 * @swagger
 * /api/v1/inventory/receive-points:
 *   get:
 *     summary: List active physical intake bays
 *     description: Returns available warehouse bays for product intake receiving.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Receive bays list.
 *       403:
 *         description: Forbidden - Clearance restricted to RECEIVE_USER and ADMIN.
 */
router.get(
  '/receive-points',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.listActiveReceivePoints
);

/**
 * @swagger
 * /api/v1/inventory/receive:
 *   post:
 *     summary: Admit finished product into warehouse bay stock
 *     description: |
 *       Receives a verified product chassis into active warehouse stock at a designated intake bay.
 *       Enforces atomic prerequisite that required sub-assemblies are bound.
 *       Transitions product status atomically from TRACKED to IN_STOCK.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - receivePoint
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *                 description: Finished goods chassis serial
 *               receivePoint:
 *                 type: string
 *                 example: Receive Point 1
 *                 description: Intake bay name, ID, or point code
 *               stationNotes:
 *                 type: string
 *                 example: Pallet #14 verified
 *     responses:
 *       201:
 *         description: Product successfully admitted into warehouse stock.
 *       400:
 *         description: Product missing sub-assemblies or already in stock.
 *       403:
 *         description: Forbidden - Clearance restricted to RECEIVE_USER and ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/receive',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.receiveProduct
);

/**
 * @swagger
 * /api/v1/inventory/receive-product:
 *   post:
 *     summary: Workstation alias for product receiving
 *     description: Descriptive route alias for /api/v1/inventory/receive.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - receivePoint
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               receivePoint:
 *                 type: string
 *                 example: Receive Point 1
 *     responses:
 *       201:
 *         description: Product admitted into stock.
 */
router.post(
  '/receive-product',
  requirePermission('OPERATION_RECEIVE'),
  InventoryController.receiveProduct
);

/**
 * @swagger
 * /api/v1/inventory/delivery-points:
 *   get:
 *     summary: List active outbound delivery docks
 *     description: Returns available outbound shipping docks for product dispatch.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivery docks list.
 *       403:
 *         description: Forbidden - Clearance restricted to DELIVERY_USER and ADMIN.
 */
router.get(
  '/delivery-points',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.listActiveDeliveryPoints
);

/**
 * @swagger
 * /api/v1/inventory/deliver:
 *   post:
 *     summary: Dispatch finished product through outbound dock
 *     description: |
 *       Dispatches a product unit from active inventory stock (IN_STOCK) through an outbound dock.
 *       Preserves original intake bay reference in the transaction history.
 *       Transitions status to DELIVERED.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - deliveryPoint
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *                 description: Chassis barcode serial
 *               deliveryPoint:
 *                 type: string
 *                 example: Delivery Point 1
 *                 description: Outbound dock name, ID, or point code
 *               stationNotes:
 *                 type: string
 *                 example: Truck Walton-02 dispatched
 *     responses:
 *       201:
 *         description: Product dispatched successfully.
 *       400:
 *         description: Product is not currently IN_STOCK.
 *       403:
 *         description: Forbidden - Clearance restricted to DELIVERY_USER and ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/deliver',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.deliverProduct
);

/**
 * @swagger
 * /api/v1/inventory/deliver-product:
 *   post:
 *     summary: Workstation alias for product delivery
 *     description: Descriptive route alias for /api/v1/inventory/deliver.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - deliveryPoint
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               deliveryPoint:
 *                 type: string
 *                 example: Delivery Point 1
 *     responses:
 *       201:
 *         description: Product dispatched successfully.
 */
router.post(
  '/deliver-product',
  requirePermission('OPERATION_DELIVER'),
  InventoryController.deliverProduct
);

/**
 * @swagger
 * /api/v1/inventory/transactions:
 *   get:
 *     summary: Search & query inventory transactions ledger
 *     description: Retrieves append-only transaction history logs with filters.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productBarcode
 *         schema:
 *           type: string
 *         description: Filter by chassis barcode
 *       - in: query
 *         name: componentBarcode
 *         schema:
 *           type: string
 *         description: Filter by component serial
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [ALL, COMPONENT_TRACKED, RECEIVED, DELIVERED, REVERSED_RECEIVE, REVERSED_DELIVERY, REVERSED_COMPONENT]
 *         description: Filter by lifecycle event type
 *       - in: query
 *         name: userCode
 *         schema:
 *           type: string
 *         description: Filter by operator user code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated transaction list.
 */
router.get(
  '/transactions',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getTransactions
);

/**
 * @swagger
 * /api/v1/inventory/transactions/{id}:
 *   get:
 *     summary: Get single transaction details by ID
 *     description: Returns full transaction record and metadata for a specific Mongo ObjectId.
 *     tags:
 *       - Inventory Operations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mongo ObjectId of transaction
 *     responses:
 *       200:
 *         description: Transaction record retrieved.
 *       404:
 *         description: Transaction not found.
 */
router.get(
  '/transactions/:id',
  requireRole('ADMIN', 'REPORT_VIEWER', 'RECEIVE_USER', 'DELIVERY_USER', 'COMPONENT_TRACKER'),
  InventoryController.getTransactionById
);

/**
 * @swagger
 * /api/v1/inventory/reverse-receive:
 *   post:
 *     summary: Reverse product receiving (ADMIN only)
 *     description: |
 *       Creates an immutable compensating reversal record for a product intake event.
 *       Restores product lifecycle state from IN_STOCK back to TRACKED.
 *       Requires a mandatory audit reason (minimum 10 characters).
 *     tags:
 *       - Reversals & Corrections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - reason
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               reason:
 *                 type: string
 *                 example: Received in wrong physical intake bay by operator during shift handoff
 *     responses:
 *       200:
 *         description: Receiving reversed successfully. State restored to TRACKED.
 *       400:
 *         description: Product is not in IN_STOCK or has subsequent delivery.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 *       422:
 *         description: Validation error - Reason must be >= 10 characters.
 */
router.post(
  '/reverse-receive',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseReceive
);

/**
 * @swagger
 * /api/v1/inventory/reverse-delivery:
 *   post:
 *     summary: Reverse product delivery (ADMIN only)
 *     description: |
 *       Creates a compensating reversal record for a product delivery event.
 *       Restores product lifecycle state from DELIVERED back to IN_STOCK at its original intake bay.
 *       Requires a mandatory audit reason (minimum 10 characters).
 *     tags:
 *       - Reversals & Corrections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - reason
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               reason:
 *                 type: string
 *                 example: Dispatch shipment returned due to customer transport delay
 *     responses:
 *       200:
 *         description: Delivery reversed successfully. State restored to IN_STOCK.
 *       400:
 *         description: Product is not in DELIVERED state.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/reverse-delivery',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseDelivery
);

/**
 * @swagger
 * /api/v1/inventory/reverse-component:
 *   post:
 *     summary: Reverse component tracking (ADMIN only)
 *     description: |
 *       Compensating reversal for modular sub-assembly tracking.
 *       Liberates the component serial barcode so it can be re-used or replaced.
 *       Requires a mandatory audit reason (minimum 10 characters).
 *     tags:
 *       - Reversals & Corrections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productBarcode
 *               - componentBarcode
 *               - reason
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               componentBarcode:
 *                 type: string
 *                 example: 94A600321852
 *               reason:
 *                 type: string
 *                 example: Component barcode misread during assembly station binding
 *     responses:
 *       200:
 *         description: Component liberated and unlinked from chassis.
 *       400:
 *         description: Cannot reverse component on received or delivered unit without reversing those first.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/reverse-component',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseComponentTracking
);

/**
 * @swagger
 * /api/v1/inventory/reverse:
 *   post:
 *     summary: Unified transaction reversal dispatcher (ADMIN only)
 *     description: |
 *       Intelligent reversal dispatcher supporting productBarcode, componentBarcode, or transactionId.
 *       Automatically detects appropriate compensating reversal logic.
 *     tags:
 *       - Reversals & Corrections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               productBarcode:
 *                 type: string
 *                 example: 2440701AK2057
 *               transactionId:
 *                 type: string
 *                 example: 673dbb1234567890abcdef12
 *               reason:
 *                 type: string
 *                 example: Administrative correction for testing ledger compensating reversibility
 *     responses:
 *       200:
 *         description: Reversal executed successfully.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 *       422:
 *         description: Validation error.
 */
router.post(
  '/reverse',
  requirePermission('OPERATION_REVERSE'),
  InventoryController.reverseTransaction
);

export const inventoryRoutes = router;
