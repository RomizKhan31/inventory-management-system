import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import {
  trackSingleComponentSchema,
  trackBatchComponentsSchema,
  reverseComponentSchema,
  receiveProductSchema,
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
}
