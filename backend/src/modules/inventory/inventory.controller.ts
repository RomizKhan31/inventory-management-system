import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import {
  trackSingleComponentSchema,
  trackBatchComponentsSchema,
  reverseComponentSchema,
  receiveProductSchema,
  deliverProductSchema,
  reverseReceiveSchema,
  reverseDeliverySchema,
  reverseUnifiedSchema,
} from './inventory.validation';
import { sendResponse } from '../../utils/response';

export class InventoryController {
  /**
   * Validate a scanned product barcode and return current tracking state
   */
  static async validateProductScan(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = req.params.barcode as string;
      const result = await InventoryService.validateProductScan(barcode);
      sendResponse(res, 200, 'Product scan validated successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Validate a scanned component barcode and check master registration and binding status
   */
  static async validateComponentScan(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = req.params.barcode as string;
      const result = await InventoryService.validateComponentScan(barcode);
      sendResponse(res, 200, 'Component scan validated successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Attach one or more component barcodes to a product barcode
   */
  static async trackComponents(req: Request, res: Response, next: NextFunction) {
    try {
      let validatedData;
      if (req.body.components && Array.isArray(req.body.components)) {
        validatedData = trackBatchComponentsSchema.parse(req.body);
      } else {
        validatedData = trackSingleComponentSchema.parse(req.body);
      }

      const result = await InventoryService.trackComponents(validatedData, req.user);
      sendResponse(
        res,
        200,
        `Component(s) successfully attached to product '${result.productBarcode}'`,
        result
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Receive a tracked product into warehouse inventory stock
   */
  static async receiveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = receiveProductSchema.parse(req.body);
      const result = await InventoryService.receiveProduct(validated, req.user);
      sendResponse(res, 201, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List active receive points for workstation selector dropdown
   */
  static async listActiveReceivePoints(req: Request, res: Response, next: NextFunction) {
    try {
      const points = await InventoryService.getActiveReceivePoints();
      sendResponse(res, 200, 'Active receive points retrieved successfully', points);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List active products for component tracking workstation selector dropdown
   */
  static async listActiveProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await InventoryService.getActiveProducts();
      sendResponse(res, 200, 'Active products retrieved successfully', products);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List active components for component tracking workstation selector dropdown
   */
  static async listActiveComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const components = await InventoryService.getActiveComponents();
      sendResponse(res, 200, 'Active components retrieved successfully', components);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deliver/issue a product from available warehouse stock
   */
  static async deliverProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = deliverProductSchema.parse(req.body);
      const result = await InventoryService.deliverProduct(validated, req.user);
      sendResponse(res, 201, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List active delivery points for workstation selector dropdown
   */
  static async listActiveDeliveryPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const points = await InventoryService.getActiveDeliveryPoints();
      sendResponse(res, 200, 'Active delivery points retrieved successfully', points);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reverse component tracking (ADMIN only)
   */
  static async reverseComponentTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = reverseComponentSchema.parse(req.body);
      const result = await InventoryService.reverseComponentTracking(
        validated.productBarcode,
        validated.componentBarcode,
        validated.reason,
        req.user
      );
      sendResponse(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reverse product receiving (ADMIN only)
   */
  static async reverseReceive(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = reverseReceiveSchema.parse(req.body);
      const result = await InventoryService.reverseReceive(validated, req.user);
      sendResponse(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reverse product delivery (ADMIN only)
   */
  static async reverseDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = reverseDeliverySchema.parse(req.body);
      const result = await InventoryService.reverseDelivery(validated, req.user);
      sendResponse(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unified transaction reversal dispatcher (ADMIN only)
   */
  static async reverseTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = reverseUnifiedSchema.parse(req.body);
      const result = await InventoryService.reverseTransaction(validated, req.user);
      sendResponse(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List/search inventory transactions with reversal annotations
   */
  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.getTransactions(req.query);
      sendResponse(res, 200, 'Inventory transactions retrieved successfully', result.data, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get real-time dashboard statistics and aging inventory
   */
  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await InventoryService.getDashboardStatistics();
      sendResponse(res, 200, 'Dashboard statistics retrieved successfully', stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single transaction details by ID
   */
  static async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await InventoryService.getTransactionById(id);
      sendResponse(res, 200, 'Transaction details retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  }
}
