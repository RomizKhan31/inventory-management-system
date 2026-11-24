import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware';
import { sendResponse } from '../../utils/response';
import { ReportsController } from './reports.controller';
import { AuditService } from '../audit/audit.service';

const router = Router();

// All reporting routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/reports/stock-details:
 *   get:
 *     summary: Real-time stock details report & bay breakdown
 *     description: |
 *       Returns serialized stock items currently in warehouse inventory, 
 *       along with their physical receive bays, days in stock, and attached sub-assembly barcodes.
 *     tags:
 *       - Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by chassis barcode, model, or component serial
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, IN_STOCK, DELIVERED, TRACKED, NEW_UNTRACKED]
 *           default: ALL
 *         description: Filter by inventory status
 *       - in: query
 *         name: pointName
 *         schema:
 *           type: string
 *         description: Filter by physical intake bay name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-01-01'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-12-31'
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
 *         description: Stock details report retrieved.
 *       403:
 *         description: Forbidden - Clearance restricted to REPORT_VIEWER and ADMIN.
 */
router.get(
  '/stock-details',
  requirePermission('REPORT_VIEW'),
  ReportsController.getStockDetails
);

/**
 * @swagger
 * /api/v1/reports/summary:
 *   get:
 *     summary: Date-range throughput summary report & timeseries
 *     description: |
 *       Aggregates inventory intake, dispatch velocity, net received stock, and operator throughput.
 *       Returns daily timeseries arrays for chart visualization.
 *     tags:
 *       - Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-01-01'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-12-31'
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Date-range summary report generated.
 *       403:
 *         description: Forbidden - Clearance restricted to REPORT_VIEWER and ADMIN.
 */
router.get(
  '/summary',
  requirePermission('REPORT_VIEW'),
  ReportsController.getSummary
);

/**
 * @swagger
 * /api/v1/reports/barcode-history/{barcode}:
 *   get:
 *     summary: End-to-end barcode lifecycle journey trace
 *     description: |
 *       Returns the complete chronological event timeline for any chassis barcode or modular component serial.
 *       Includes assembly binding, warehouse bay intake, delivery dock dispatches, and compensating reversal annotations.
 *     tags:
 *       - Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: 2440701AK2057
 *         description: Chassis barcode or component serial
 *     responses:
 *       200:
 *         description: Barcode journey history timeline retrieved.
 *       403:
 *         description: Forbidden - Clearance restricted to REPORT_VIEWER and ADMIN.
 *       404:
 *         description: Barcode not found.
 */
router.get(
  '/barcode-history/:barcode',
  requirePermission('REPORT_VIEW'),
  ReportsController.getBarcodeHistory
);

/**
 * @swagger
 * /api/v1/reports/export:
 *   get:
 *     summary: Export reports as CSV or JSON download
 *     description: Exports stock-details, date-range summary, or barcode history as text/csv or application/json.
 *     tags:
 *       - Reports & Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stock-details, summary, barcode-history]
 *         example: stock-details
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, IN_STOCK, DELIVERED, TRACKED, NEW_UNTRACKED]
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         example: 2440701AK2057
 *     responses:
 *       200:
 *         description: Report file exported.
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       403:
 *         description: Forbidden - Clearance restricted to REPORT_VIEWER and ADMIN.
 */
router.get(
  '/export',
  requirePermission('REPORT_EXPORT'),
  ReportsController.exportReport
);

/**
 * @swagger
 * /api/v1/reports/audit-logs:
 *   get:
 *     summary: System audit logs & security change trail (ADMIN only)
 *     description: |
 *       Immutable audit records capturing master data modifications, user role alterations,
 *       previous delta values, responsible operator user codes, and IP addresses.
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by userCode, userName, or entityId
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *           default: ALL
 *         description: Filter by entity type (e.g. User, Product, InventoryTransaction)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           default: ALL
 *         description: Filter by action (e.g. CREATE, UPDATE, DELETE, REVERSAL)
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
 *         description: Audit logs list.
 *       403:
 *         description: Forbidden - Clearance restricted to ADMIN.
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
