import { Request, Response, NextFunction } from 'express';
import { MasterDataService } from './masterData.service';
import {
  createProductSchema,
  updateProductSchema,
  createComponentSchema,
  updateComponentSchema,
  createReceivePointSchema,
  updateReceivePointSchema,
  createDeliveryPointSchema,
  updateDeliveryPointSchema,
} from './masterData.validation';
import { sendResponse } from '../../utils/response';

export class MasterDataController {
  // Stats
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await MasterDataService.getStats();
      sendResponse(res, 200, 'Master data overview statistics retrieved', stats);
    } catch (err) {
      next(err);
    }
  }

  // =================== Products ===================
  static async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MasterDataService.getProducts(req.query);
      sendResponse(res, 200, 'Products retrieved successfully', result.data, {
        ...result.pagination,
        categories: result.categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await MasterDataService.getProductById(id);
      sendResponse(res, 200, 'Product retrieved successfully', product);
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createProductSchema.parse(req.body);
      const product = await MasterDataService.createProduct(validated, req);
      sendResponse(res, 201, 'Product created successfully', product);
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateProductSchema.parse(req.body);
      const product = await MasterDataService.updateProduct(id, validated, req);
      sendResponse(res, 200, 'Product updated successfully', product);
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await MasterDataService.deleteProduct(id, req);
      sendResponse(res, 200, result.message, result.product, { wasInUse: result.wasInUse });
    } catch (err) {
      next(err);
    }
  }

  // =================== Components ===================
  static async listComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MasterDataService.getComponents(req.query);
      sendResponse(res, 200, 'Components retrieved successfully', result.data, {
        ...result.pagination,
        categories: result.categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const component = await MasterDataService.getComponentById(id);
      sendResponse(res, 200, 'Component retrieved successfully', component);
    } catch (err) {
      next(err);
    }
  }

  static async createComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createComponentSchema.parse(req.body);
      const component = await MasterDataService.createComponent(validated, req);
      sendResponse(res, 201, 'Component created successfully', component);
    } catch (err) {
      next(err);
    }
  }

  static async updateComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateComponentSchema.parse(req.body);
      const component = await MasterDataService.updateComponent(id, validated, req);
      sendResponse(res, 200, 'Component updated successfully', component);
    } catch (err) {
      next(err);
    }
  }

  static async deleteComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await MasterDataService.deleteComponent(id, req);
      sendResponse(res, 200, result.message, result.component, { wasInUse: result.wasInUse });
    } catch (err) {
      next(err);
    }
  }

  // =================== Receive Points ===================
  static async listReceivePoints(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MasterDataService.getReceivePoints(req.query);
      sendResponse(res, 200, 'Receive points retrieved successfully', result.data, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getReceivePoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const point = await MasterDataService.getReceivePointById(id);
      sendResponse(res, 200, 'Receive point retrieved successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async createReceivePoint(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createReceivePointSchema.parse(req.body);
      const point = await MasterDataService.createReceivePoint(validated, req);
      sendResponse(res, 201, 'Receive point created successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async updateReceivePoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateReceivePointSchema.parse(req.body);
      const point = await MasterDataService.updateReceivePoint(id, validated, req);
      sendResponse(res, 200, 'Receive point updated successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async deleteReceivePoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await MasterDataService.deleteReceivePoint(id, req);
      sendResponse(res, 200, result.message, result.point, { wasInUse: result.wasInUse });
    } catch (err) {
      next(err);
    }
  }

  // =================== Delivery Points ===================
  static async listDeliveryPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MasterDataService.getDeliveryPoints(req.query);
      sendResponse(res, 200, 'Delivery points retrieved successfully', result.data, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getDeliveryPoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const point = await MasterDataService.getDeliveryPointById(id);
      sendResponse(res, 200, 'Delivery point retrieved successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async createDeliveryPoint(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createDeliveryPointSchema.parse(req.body);
      const point = await MasterDataService.createDeliveryPoint(validated, req);
      sendResponse(res, 201, 'Delivery point created successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async updateDeliveryPoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateDeliveryPointSchema.parse(req.body);
      const point = await MasterDataService.updateDeliveryPoint(id, validated, req);
      sendResponse(res, 200, 'Delivery point updated successfully', point);
    } catch (err) {
      next(err);
    }
  }

  static async deleteDeliveryPoint(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await MasterDataService.deleteDeliveryPoint(id, req);
      sendResponse(res, 200, result.message, result.point, { wasInUse: result.wasInUse });
    } catch (err) {
      next(err);
    }
  }
}
