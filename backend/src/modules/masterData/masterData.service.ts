import { Request } from 'express';
import {
  Product,
  Component,
  ReceivePoint,
  DeliveryPoint,
  InventoryTransaction,
  ComponentBinding,
  User,
  AuditLog,
} from '../../database/models';
import { AppError } from '../../utils/AppError';
import { AuditService } from '../audit/audit.service';

export interface PaginationOptions {
  search?: string;
  category?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export class MasterDataService {
  // ==========================================
  // 1. PRODUCT MANAGEMENT
  // ==========================================

  static async getProducts(options: PaginationOptions) {
    const filter: Record<string, any> = { isDeleted: false };

    if (options.category && options.category !== 'ALL') {
      filter.category = options.category;
    }

    if (options.isActive !== undefined && options.isActive !== 'ALL') {
      filter.isActive = options.isActive === 'true';
    }

    if (options.search && options.search.trim()) {
      const regex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { productCode: regex },
        { barcode: regex },
        { name: regex },
        { modelNumber: regex },
        { description: regex },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [products, total, categories] = await Promise.all([
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      Product.distinct('category', { isDeleted: false }),
    ]);

    return {
      data: products,
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getProductById(id: string) {
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) throw AppError.notFound('Product not found');
    return product;
  }

  static async createProduct(data: any, req: Request) {
    const existingCode = await Product.findOne({ productCode: data.productCode });
    if (existingCode) {
      throw AppError.conflict(`Product code '${data.productCode}' already exists`);
    }

    const payload: any = { ...data, isDeleted: false };

    // Industrial Safety Rule:
    // If barcode is not provided, delete the property so Mongoose does not insert
    // an empty string or null into MongoDB, preserving the sparse unique index.
    if (!payload.barcode || typeof payload.barcode !== 'string' || payload.barcode.trim() === '') {
      delete payload.barcode;
    } else {
      payload.barcode = payload.barcode.trim().toUpperCase();
      const existingBarcode = await Product.findOne({ barcode: payload.barcode });
      if (existingBarcode) {
        throw AppError.conflict(`Product barcode '${payload.barcode}' already exists`);
      }
    }

    if (!payload.modelNumber || (typeof payload.modelNumber === 'string' && payload.modelNumber.trim() === '')) {
      delete payload.modelNumber;
    }
    if (!payload.description || (typeof payload.description === 'string' && payload.description.trim() === '')) {
      delete payload.description;
    }

    const product = await Product.create(payload);

    await AuditService.log({
      action: 'MASTER_DATA_CREATED',
      entity: 'PRODUCT',
      entityId: product.productCode,
      newValues: {
        productCode: product.productCode,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        modelNumber: product.modelNumber,
        isActive: product.isActive,
      },
      req,
    });

    return product;
  }

  static async updateProduct(id: string, data: any, req: Request) {
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) throw AppError.notFound('Product not found');

    if (data.productCode && data.productCode !== product.productCode) {
      const existing = await Product.findOne({
        productCode: data.productCode,
        _id: { $ne: product._id },
      });
      if (existing) {
        throw AppError.conflict(`Product code '${data.productCode}' is already in use`);
      }
    }

    if (data.barcode !== undefined) {
      if (data.barcode && typeof data.barcode === 'string' && data.barcode.trim() !== '') {
        const cleanBarcode = data.barcode.trim().toUpperCase();
        if (cleanBarcode !== product.barcode) {
          const existingBarcode = await Product.findOne({
            barcode: cleanBarcode,
            _id: { $ne: product._id },
          });
          if (existingBarcode) {
            throw AppError.conflict(`Product barcode '${cleanBarcode}' is already in use`);
          }
        }
        product.barcode = cleanBarcode;
      } else {
        // If empty or null is passed, unset the barcode
        product.set('barcode', undefined);
      }
    }

    const previousValues = {
      productCode: product.productCode,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      modelNumber: product.modelNumber,
      description: product.description,
      isActive: product.isActive,
    };

    const updatePayload = { ...data };
    delete updatePayload.barcode; // Barcode already managed above
    Object.assign(product, updatePayload);
    await product.save();

    await AuditService.log({
      action: 'MASTER_DATA_UPDATED',
      entity: 'PRODUCT',
      entityId: product.productCode,
      previousValues,
      newValues: {
        productCode: product.productCode,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        modelNumber: product.modelNumber,
        description: product.description,
        isActive: product.isActive,
      },
      req,
    });

    return product;
  }

  static async deleteProduct(id: string, req: Request) {
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) throw AppError.notFound('Product not found');

    // Referential integrity check: Is this product referenced in ledger transactions?
    const inUse = await InventoryTransaction.exists({
      $or: [{ productId: product._id }, { productModel: product.name }],
    });

    // Enforce industrial safety rule: soft-deactivate instead of hard delete
    product.isDeleted = true;
    product.isActive = false;
    await product.save();

    await AuditService.log({
      action: 'MASTER_DATA_SOFT_DELETED',
      entity: 'PRODUCT',
      entityId: product.productCode,
      previousValues: { isActive: true, isDeleted: false },
      newValues: { isActive: false, isDeleted: true, wasInUse: !!inUse },
      req,
    });

    return {
      product,
      wasInUse: !!inUse,
      message: inUse
        ? 'Product is referenced in inventory transactions and has been soft-deactivated to preserve ledger auditability.'
        : 'Product has been deactivated (soft-deleted) successfully.',
    };
  }

  // ==========================================
  // 2. COMPONENT MANAGEMENT
  // ==========================================

  static async getComponents(options: PaginationOptions) {
    const filter: Record<string, any> = { isDeleted: false };

    if (options.category && options.category !== 'ALL') {
      filter.category = options.category;
    }

    if (options.isActive !== undefined && options.isActive !== 'ALL') {
      filter.isActive = options.isActive === 'true';
    }

    if (options.search && options.search.trim()) {
      const regex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { componentCode: regex },
        { barcode: regex },
        { name: regex },
        { specifications: regex },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [components, total, categories] = await Promise.all([
      Component.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Component.countDocuments(filter),
      Component.distinct('category', { isDeleted: false }),
    ]);

    return {
      data: components,
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getComponentById(id: string) {
    const component = await Component.findOne({ _id: id, isDeleted: false });
    if (!component) throw AppError.notFound('Component not found');
    return component;
  }

  static async createComponent(data: any, req: Request) {
    const existingCode = await Component.findOne({ componentCode: data.componentCode });
    if (existingCode) {
      throw AppError.conflict(`Component code '${data.componentCode}' already exists`);
    }

    const payload: any = { ...data, isDeleted: false };

    // Industrial Safety Rule:
    // Strip empty/whitespace barcode so MongoDB sparse index doesn't collide on { barcode: "" }
    if (!payload.barcode || typeof payload.barcode !== 'string' || payload.barcode.trim() === '') {
      delete payload.barcode;
    } else {
      payload.barcode = payload.barcode.trim().toUpperCase();
      const existingBarcode = await Component.findOne({ barcode: payload.barcode });
      if (existingBarcode) {
        throw AppError.conflict(`Component barcode '${payload.barcode}' already exists`);
      }
    }

    if (!payload.specifications || (typeof payload.specifications === 'string' && payload.specifications.trim() === '')) {
      delete payload.specifications;
    }

    const component = await Component.create(payload);

    await AuditService.log({
      action: 'MASTER_DATA_CREATED',
      entity: 'COMPONENT',
      entityId: component.componentCode,
      newValues: {
        componentCode: component.componentCode,
        barcode: component.barcode,
        name: component.name,
        category: component.category,
        specifications: component.specifications,
        isActive: component.isActive,
      },
      req,
    });

    return component;
  }

  static async updateComponent(id: string, data: any, req: Request) {
    const component = await Component.findOne({ _id: id, isDeleted: false });
    if (!component) throw AppError.notFound('Component not found');

    if (data.componentCode && data.componentCode !== component.componentCode) {
      const existing = await Component.findOne({
        componentCode: data.componentCode,
        _id: { $ne: component._id },
      });
      if (existing) {
        throw AppError.conflict(`Component code '${data.componentCode}' is already in use`);
      }
    }

    if (data.barcode !== undefined) {
      if (data.barcode && typeof data.barcode === 'string' && data.barcode.trim() !== '') {
        const cleanBarcode = data.barcode.trim().toUpperCase();
        if (cleanBarcode !== component.barcode) {
          const existingBarcode = await Component.findOne({
            barcode: cleanBarcode,
            _id: { $ne: component._id },
          });
          if (existingBarcode) {
            throw AppError.conflict(`Component barcode '${cleanBarcode}' is already in use`);
          }
        }
        component.barcode = cleanBarcode;
      } else {
        component.set('barcode', undefined);
      }
    }

    const previousValues = {
      componentCode: component.componentCode,
      barcode: component.barcode,
      name: component.name,
      category: component.category,
      specifications: component.specifications,
      isActive: component.isActive,
    };

    const updatePayload = { ...data };
    delete updatePayload.barcode;
    Object.assign(component, updatePayload);
    await component.save();

    await AuditService.log({
      action: 'MASTER_DATA_UPDATED',
      entity: 'COMPONENT',
      entityId: component.componentCode,
      previousValues,
      newValues: {
        componentCode: component.componentCode,
        barcode: component.barcode,
        name: component.name,
        category: component.category,
        specifications: component.specifications,
        isActive: component.isActive,
      },
      req,
    });

    return component;
  }

  static async deleteComponent(id: string, req: Request) {
    const component = await Component.findOne({ _id: id, isDeleted: false });
    if (!component) throw AppError.notFound('Component not found');

    // Referential integrity check: Is this component actively bound or in transaction history?
    const [inBinding, inTx] = await Promise.all([
      ComponentBinding.exists({ componentName: component.name }),
      InventoryTransaction.exists({
        $or: [{ componentId: component._id }, { componentName: component.name }],
      }),
    ]);
    const inUse = !!inBinding || !!inTx;

    component.isDeleted = true;
    component.isActive = false;
    await component.save();

    await AuditService.log({
      action: 'MASTER_DATA_SOFT_DELETED',
      entity: 'COMPONENT',
      entityId: component.componentCode,
      previousValues: { isActive: true, isDeleted: false },
      newValues: { isActive: false, isDeleted: true, wasInUse: inUse },
      req,
    });

    return {
      component,
      wasInUse: inUse,
      message: inUse
        ? 'Component is referenced in operational bindings/transactions and has been soft-deactivated.'
        : 'Component has been deactivated (soft-deleted) successfully.',
    };
  }

  // ==========================================
  // 3. RECEIVE POINT MANAGEMENT
  // ==========================================

  static async getReceivePoints(options: PaginationOptions) {
    const filter: Record<string, any> = { isDeleted: false };

    if (options.isActive !== undefined && options.isActive !== 'ALL') {
      filter.isActive = options.isActive === 'true';
    }

    if (options.search && options.search.trim()) {
      const regex = new RegExp(options.search.trim(), 'i');
      filter.$or = [{ pointCode: regex }, { name: regex }, { location: regex }];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [points, total] = await Promise.all([
      ReceivePoint.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      ReceivePoint.countDocuments(filter),
    ]);

    return {
      data: points,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getReceivePointById(id: string) {
    const point = await ReceivePoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Receive point not found');
    return point;
  }

  static async createReceivePoint(data: any, req: Request) {
    const existing = await ReceivePoint.findOne({ pointCode: data.pointCode });
    if (existing) {
      throw AppError.conflict(`Point code '${data.pointCode}' already exists`);
    }

    const point = await ReceivePoint.create({
      ...data,
      isDeleted: false,
    });

    await AuditService.log({
      action: 'MASTER_DATA_CREATED',
      entity: 'RECEIVE_POINT',
      entityId: point.pointCode,
      newValues: {
        pointCode: point.pointCode,
        name: point.name,
        location: point.location,
        isActive: point.isActive,
      },
      req,
    });

    return point;
  }

  static async updateReceivePoint(id: string, data: any, req: Request) {
    const point = await ReceivePoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Receive point not found');

    if (data.pointCode && data.pointCode !== point.pointCode) {
      const existing = await ReceivePoint.findOne({
        pointCode: data.pointCode,
        _id: { $ne: point._id },
      });
      if (existing) {
        throw AppError.conflict(`Point code '${data.pointCode}' is already in use`);
      }
    }

    const previousValues = {
      pointCode: point.pointCode,
      name: point.name,
      location: point.location,
      isActive: point.isActive,
    };

    Object.assign(point, data);
    await point.save();

    await AuditService.log({
      action: 'MASTER_DATA_UPDATED',
      entity: 'RECEIVE_POINT',
      entityId: point.pointCode,
      previousValues,
      newValues: {
        pointCode: point.pointCode,
        name: point.name,
        location: point.location,
        isActive: point.isActive,
      },
      req,
    });

    return point;
  }

  static async deleteReceivePoint(id: string, req: Request) {
    const point = await ReceivePoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Receive point not found');

    const inUse = await InventoryTransaction.exists({
      $or: [{ pointId: point._id }, { pointName: point.name }],
    });

    point.isDeleted = true;
    point.isActive = false;
    await point.save();

    await AuditService.log({
      action: 'MASTER_DATA_SOFT_DELETED',
      entity: 'RECEIVE_POINT',
      entityId: point.pointCode,
      previousValues: { isActive: true, isDeleted: false },
      newValues: { isActive: false, isDeleted: true, wasInUse: !!inUse },
      req,
    });

    return {
      point,
      wasInUse: !!inUse,
      message: inUse
        ? 'Receive point is referenced in inventory receiving records and has been soft-deactivated.'
        : 'Receive point has been deactivated (soft-deleted) successfully.',
    };
  }

  // ==========================================
  // 4. DELIVERY POINT MANAGEMENT
  // ==========================================

  static async getDeliveryPoints(options: PaginationOptions) {
    const filter: Record<string, any> = { isDeleted: false };

    if (options.isActive !== undefined && options.isActive !== 'ALL') {
      filter.isActive = options.isActive === 'true';
    }

    if (options.search && options.search.trim()) {
      const regex = new RegExp(options.search.trim(), 'i');
      filter.$or = [{ pointCode: regex }, { name: regex }, { location: regex }];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [points, total] = await Promise.all([
      DeliveryPoint.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      DeliveryPoint.countDocuments(filter),
    ]);

    return {
      data: points,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getDeliveryPointById(id: string) {
    const point = await DeliveryPoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Delivery point not found');
    return point;
  }

  static async createDeliveryPoint(data: any, req: Request) {
    const existing = await DeliveryPoint.findOne({ pointCode: data.pointCode });
    if (existing) {
      throw AppError.conflict(`Point code '${data.pointCode}' already exists`);
    }

    const point = await DeliveryPoint.create({
      ...data,
      isDeleted: false,
    });

    await AuditService.log({
      action: 'MASTER_DATA_CREATED',
      entity: 'DELIVERY_POINT',
      entityId: point.pointCode,
      newValues: {
        pointCode: point.pointCode,
        name: point.name,
        location: point.location,
        isActive: point.isActive,
      },
      req,
    });

    return point;
  }

  static async updateDeliveryPoint(id: string, data: any, req: Request) {
    const point = await DeliveryPoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Delivery point not found');

    if (data.pointCode && data.pointCode !== point.pointCode) {
      const existing = await DeliveryPoint.findOne({
        pointCode: data.pointCode,
        _id: { $ne: point._id },
      });
      if (existing) {
        throw AppError.conflict(`Point code '${data.pointCode}' is already in use`);
      }
    }

    const previousValues = {
      pointCode: point.pointCode,
      name: point.name,
      location: point.location,
      isActive: point.isActive,
    };

    Object.assign(point, data);
    await point.save();

    await AuditService.log({
      action: 'MASTER_DATA_UPDATED',
      entity: 'DELIVERY_POINT',
      entityId: point.pointCode,
      previousValues,
      newValues: {
        pointCode: point.pointCode,
        name: point.name,
        location: point.location,
        isActive: point.isActive,
      },
      req,
    });

    return point;
  }

  static async deleteDeliveryPoint(id: string, req: Request) {
    const point = await DeliveryPoint.findOne({ _id: id, isDeleted: false });
    if (!point) throw AppError.notFound('Delivery point not found');

    const inUse = await InventoryTransaction.exists({
      $or: [{ pointId: point._id }, { pointName: point.name }],
    });

    point.isDeleted = true;
    point.isActive = false;
    await point.save();

    await AuditService.log({
      action: 'MASTER_DATA_SOFT_DELETED',
      entity: 'DELIVERY_POINT',
      entityId: point.pointCode,
      previousValues: { isActive: true, isDeleted: false },
      newValues: { isActive: false, isDeleted: true, wasInUse: !!inUse },
      req,
    });

    return {
      point,
      wasInUse: !!inUse,
      message: inUse
        ? 'Delivery point is referenced in outbound dispatch records and has been soft-deactivated.'
        : 'Delivery point has been deactivated (soft-deleted) successfully.',
    };
  }

  // ==========================================
  // 5. MASTER DATA OVERVIEW STATS
  // ==========================================

  static async getStats() {
    const [
      totalProducts,
      activeProducts,
      totalComponents,
      activeComponents,
      totalReceivePoints,
      activeReceivePoints,
      totalDeliveryPoints,
      activeDeliveryPoints,
      totalUsers,
      activeUsers,
      totalAuditLogs,
    ] = await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false, isActive: true }),
      Component.countDocuments({ isDeleted: false }),
      Component.countDocuments({ isDeleted: false, isActive: true }),
      ReceivePoint.countDocuments({ isDeleted: false }),
      ReceivePoint.countDocuments({ isDeleted: false, isActive: true }),
      DeliveryPoint.countDocuments({ isDeleted: false }),
      DeliveryPoint.countDocuments({ isDeleted: false, isActive: true }),
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      AuditLog.countDocuments(),
    ]);

    return {
      products: { total: totalProducts, active: activeProducts },
      components: { total: totalComponents, active: activeComponents },
      receivePoints: { total: totalReceivePoints, active: activeReceivePoints },
      deliveryPoints: { total: totalDeliveryPoints, active: activeDeliveryPoints },
      users: { total: totalUsers, active: activeUsers },
      auditLogs: { total: totalAuditLogs },
    };
  }
}
