import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { MasterDataController } from './masterData.controller';

const router = Router();

// ALL Master Data routes require authentication + MASTER_DATA_MANAGE permission (ADMIN only)
router.use(authenticate);
router.use(requirePermission('MASTER_DATA_MANAGE'));

/**
 * @swagger
 * /api/v1/master/stats:
 *   get:
 *     summary: Master catalogs high-level overview statistics (ADMIN only)
 *     description: Returns aggregate counts of products, modular components, receive bays, delivery docks, operators, and audit logs.
 *     tags:
 *       - Master Data - Overview
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics retrieved successfully.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
 */
router.get('/stats', MasterDataController.getStats);

// -------------------------------------------------------------
// Products Master Data
// -------------------------------------------------------------

/**
 * @swagger
 * /api/v1/master/products:
 *   get:
 *     summary: List finished product models (ADMIN only)
 *     description: Paginated query of registered finished product models with filters.
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by code, name, model, or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           default: ALL
 *         description: Category filter (e.g. Appliances, HVAC)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [ALL, "true", "false"]
 *           default: ALL
 *         description: Active status filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated product list.
 *   post:
 *     summary: Create new finished product model (ADMIN only)
 *     description: Registers a new manufactured product model definition.
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productCode
 *               - name
 *             properties:
 *               productCode:
 *                 type: string
 *                 example: REF-WDN-2B6
 *               name:
 *                 type: string
 *                 example: Walton Direct Cool Refrigerator
 *               modelNumber:
 *                 type: string
 *                 example: WDN-2B6-RXXX
 *               category:
 *                 type: string
 *                 example: Appliances
 *               description:
 *                 type: string
 *                 example: Double door frost-free refrigerator
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Product registered successfully.
 *       400:
 *         description: Duplicate productCode or barcode.
 *       422:
 *         description: Validation error.
 */
router.get('/products', MasterDataController.listProducts);
router.post('/products', MasterDataController.createProduct);

/**
 * @swagger
 * /api/v1/master/products/{id}:
 *   get:
 *     summary: Get product details by ID (ADMIN only)
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details retrieved.
 *       404:
 *         description: Product not found.
 *   put:
 *     summary: Update product model (ADMIN only)
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               modelNumber:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully.
 *   patch:
 *     summary: Partially update product model (ADMIN only)
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated.
 *   delete:
 *     summary: Soft-deactivate product model (ADMIN only)
 *     description: |
 *       In-Use Preservation Rule: Safely soft-deactivates the record (`isDeleted: true`, `isActive: false`)
 *       to guarantee unbroken historical ledger audit integrity.
 *     tags:
 *       - Master Data - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product soft-deactivated successfully.
 */
router.get('/products/:id', MasterDataController.getProduct);
router.put('/products/:id', MasterDataController.updateProduct);
router.patch('/products/:id', MasterDataController.updateProduct);
router.delete('/products/:id', MasterDataController.deleteProduct);

// -------------------------------------------------------------
// Components Master Data
// -------------------------------------------------------------

/**
 * @swagger
 * /api/v1/master/components:
 *   get:
 *     summary: List modular components (ADMIN only)
 *     description: Paginated query of modular components (Compressors, Condensers, PCBA).
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           default: ALL
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [ALL, "true", "false"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated components list.
 *   post:
 *     summary: Create new modular component definition (ADMIN only)
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - componentCode
 *               - name
 *             properties:
 *               componentCode:
 *                 type: string
 *                 example: COMP-INVERTER-V2
 *               name:
 *                 type: string
 *                 example: Inverter Compressor V2
 *               category:
 *                 type: string
 *                 example: Mechanical
 *               specifications:
 *                 type: string
 *                 example: 220V 50Hz Variable Speed
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Component created successfully.
 */
router.get('/components', MasterDataController.listComponents);
router.post('/components', MasterDataController.createComponent);

/**
 * @swagger
 * /api/v1/master/components/{id}:
 *   get:
 *     summary: Get component by ID (ADMIN only)
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Component details.
 *   put:
 *     summary: Update component (ADMIN only)
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Component updated.
 *   patch:
 *     summary: Partially update component (ADMIN only)
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Component updated.
 *   delete:
 *     summary: Soft-deactivate component (ADMIN only)
 *     tags:
 *       - Master Data - Components
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Component soft-deactivated.
 */
router.get('/components/:id', MasterDataController.getComponent);
router.put('/components/:id', MasterDataController.updateComponent);
router.patch('/components/:id', MasterDataController.updateComponent);
router.delete('/components/:id', MasterDataController.deleteComponent);

// -------------------------------------------------------------
// Receive Points
// -------------------------------------------------------------

/**
 * @swagger
 * /api/v1/master/receive-points:
 *   get:
 *     summary: List physical intake bays (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [ALL, "true", "false"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Receive bays list.
 *   post:
 *     summary: Create new physical intake bay (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pointCode
 *               - name
 *             properties:
 *               pointCode:
 *                 type: string
 *                 example: BAY-04
 *               name:
 *                 type: string
 *                 example: Receive Point 4
 *               location:
 *                 type: string
 *                 example: Building B, North Warehouse
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Receive point created.
 */
router.get('/receive-points', MasterDataController.listReceivePoints);
router.post('/receive-points', MasterDataController.createReceivePoint);

/**
 * @swagger
 * /api/v1/master/receive-points/{id}:
 *   get:
 *     summary: Get receive bay by ID (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receive point details.
 *   put:
 *     summary: Update receive bay (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Receive point updated.
 *   patch:
 *     summary: Partially update receive bay (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Receive point updated.
 *   delete:
 *     summary: Soft-deactivate receive bay (ADMIN only)
 *     tags:
 *       - Master Data - Receive Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receive point soft-deactivated.
 */
router.get('/receive-points/:id', MasterDataController.getReceivePoint);
router.put('/receive-points/:id', MasterDataController.updateReceivePoint);
router.patch('/receive-points/:id', MasterDataController.updateReceivePoint);
router.delete('/receive-points/:id', MasterDataController.deleteReceivePoint);

// -------------------------------------------------------------
// Delivery Points
// -------------------------------------------------------------

/**
 * @swagger
 * /api/v1/master/delivery-points:
 *   get:
 *     summary: List physical delivery docks (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [ALL, "true", "false"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Delivery docks list.
 *   post:
 *     summary: Create new physical delivery dock (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pointCode
 *               - name
 *             properties:
 *               pointCode:
 *                 type: string
 *                 example: DOCK-03
 *               name:
 *                 type: string
 *                 example: Delivery Point 3
 *               location:
 *                 type: string
 *                 example: Outbound Bay 3, Logistics Gate 2
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Delivery dock created.
 */
router.get('/delivery-points', MasterDataController.listDeliveryPoints);
router.post('/delivery-points', MasterDataController.createDeliveryPoint);

/**
 * @swagger
 * /api/v1/master/delivery-points/{id}:
 *   get:
 *     summary: Get delivery dock by ID (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery dock details.
 *   put:
 *     summary: Update delivery dock (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Delivery dock updated.
 *   patch:
 *     summary: Partially update delivery dock (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Delivery dock updated.
 *   delete:
 *     summary: Soft-deactivate delivery dock (ADMIN only)
 *     tags:
 *       - Master Data - Delivery Points
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery dock soft-deactivated.
 */
router.get('/delivery-points/:id', MasterDataController.getDeliveryPoint);
router.put('/delivery-points/:id', MasterDataController.updateDeliveryPoint);
router.patch('/delivery-points/:id', MasterDataController.updateDeliveryPoint);
router.delete('/delivery-points/:id', MasterDataController.deleteDeliveryPoint);

export const masterDataRoutes = router;
