import mongoose, { Types } from 'mongoose';
import {
  InventoryTransaction,
  ComponentBinding,
  Product,
  Component,
  ReceivePoint,
  DeliveryPoint,
  IComponentBinding,
} from '../../database/models';
import { AppError } from '../../utils/AppError';
import { AuditService } from '../audit/audit.service';
import { barcodeMutex } from '../../utils/mutex';

export interface ComponentTrackingInput {
  productBarcode: string;
  productId?: string;
  productModel?: string;
  componentBarcode?: string;
  componentId?: string;
  componentName?: string;
  stationName?: string;
  components?: Array<{
    componentBarcode: string;
    componentId?: string;
    componentName?: string;
  }>;
}

export interface ReceiveProductInput {
  productBarcode: string;
  receivePointId?: string;
  receivePointCode?: string;
  receivePoint?: string;
  stationNotes?: string;
}

export interface DeliverProductInput {
  productBarcode: string;
  deliveryPointId?: string;
  deliveryPointCode?: string;
  deliveryPoint?: string;
  stationNotes?: string;
}

export class InventoryService {
  /**
   * Derive the current operational lifecycle state of a product barcode
   * from the immutable transaction ledger.
   */
  static async deriveProductState(productBarcode: string) {
    const history = await InventoryTransaction.find({ productBarcode })
      .sort({ createdAt: 1 })
      .lean();

    let trackedCount = 0;
    let reversedTrackedCount = 0;
    let receivedCount = 0;
    let reversedReceivedCount = 0;
    let deliveredCount = 0;
    let reversedDeliveredCount = 0;

    let productModel = '';
    let productId: Types.ObjectId | undefined = undefined;
    let lastReceiveTx: any = null;
    let lastDeliveryTx: any = null;

    for (const tx of history) {
      if (tx.productModel) productModel = tx.productModel;
      if (tx.productId) productId = tx.productId as unknown as Types.ObjectId;

      switch (tx.eventType) {
        case 'COMPONENT_TRACKED':
          trackedCount++;
          break;
        case 'REVERSED_COMPONENT':
          reversedTrackedCount++;
          break;
        case 'RECEIVED':
          receivedCount++;
          lastReceiveTx = tx;
          break;
        case 'REVERSED_RECEIVE':
          reversedReceivedCount++;
          break;
        case 'DELIVERED':
          deliveredCount++;
          lastDeliveryTx = tx;
          break;
        case 'REVERSED_DELIVERY':
          reversedDeliveredCount++;
          break;
      }
    }

    const hasActiveComponents = trackedCount > reversedTrackedCount;
    const isCurrentlyReceived = receivedCount > reversedReceivedCount;
    const isCurrentlyDelivered = deliveredCount > reversedDeliveredCount;

    let status = 'NEW_UNTRACKED';
    let canAttachComponents = true;
    let blockReason: string | undefined = undefined;

    if (isCurrentlyDelivered) {
      status = 'DELIVERED';
      canAttachComponents = false;
      blockReason = 'Product has already been dispatched/delivered from warehouse.';
    } else if (isCurrentlyReceived) {
      status = 'IN_STOCK';
      canAttachComponents = false;
      blockReason = 'Product has already been received into warehouse stock. Component tracking must precede stock admission.';
    } else if (hasActiveComponents) {
      status = 'TRACKED';
      canAttachComponents = true;
    }

    // Active component bindings
    const activeBindings = await ComponentBinding.find({ productBarcode }).lean();

    return {
      productBarcode,
      status,
      productModel: productModel || undefined,
      productId: productId ? String(productId) : undefined,
      canAttachComponents,
      blockReason,
      hasActiveComponents,
      isCurrentlyReceived,
      isCurrentlyDelivered,
      currentReceivePoint:
        isCurrentlyReceived && lastReceiveTx
          ? {
              pointId: lastReceiveTx.pointId ? String(lastReceiveTx.pointId) : undefined,
              pointName: lastReceiveTx.pointName,
              pointCode: lastReceiveTx.metadata?.receivePointCode,
              location: lastReceiveTx.metadata?.location,
              receivedAt: lastReceiveTx.createdAt,
              receivedBy: lastReceiveTx.userName,
              userCode: lastReceiveTx.userCode,
              transactionId: String(lastReceiveTx._id),
            }
          : undefined,
      lastDelivery:
        isCurrentlyDelivered && lastDeliveryTx
          ? {
              pointId: lastDeliveryTx.pointId ? String(lastDeliveryTx.pointId) : undefined,
              pointName: lastDeliveryTx.pointName,
              pointCode: lastDeliveryTx.metadata?.deliveryPointCode,
              location: lastDeliveryTx.metadata?.deliveryLocation || lastDeliveryTx.metadata?.location,
              deliveredAt: lastDeliveryTx.createdAt,
              deliveredBy: lastDeliveryTx.userName,
              userCode: lastDeliveryTx.userCode,
              originalReceivePointName: lastDeliveryTx.metadata?.originalReceivePointName,
              transactionId: String(lastDeliveryTx._id),
            }
          : undefined,
      attachedComponents: activeBindings,
      historyCount: history.length,
    };
  }

  /**
   * Validate a scanned product barcode and return its tracking status and attached components.
   */
  static async validateProductScan(productBarcode: string) {
    const formattedBarcode = productBarcode.trim().toUpperCase();
    if (formattedBarcode.length < 3) {
      throw AppError.badRequest('Invalid product barcode format (minimum 3 characters)');
    }

    const state = await this.deriveProductState(formattedBarcode);

    // If no prior history, check if this barcode matches a master catalog product
    let masterProduct = null;
    if (state.productId) {
      masterProduct = await Product.findOne({ _id: state.productId, isDeleted: false }).lean();
    } else {
      masterProduct = await Product.findOne({
        $or: [{ barcode: formattedBarcode }, { productCode: formattedBarcode }],
        isDeleted: false,
      }).lean();
    }

    return {
      ...state,
      productModel: state.productModel || masterProduct?.name,
      productId: state.productId || (masterProduct ? String(masterProduct._id) : undefined),
      masterProduct: masterProduct
        ? {
            id: masterProduct._id,
            productCode: masterProduct.productCode,
            name: masterProduct.name,
            category: masterProduct.category,
            modelNumber: masterProduct.modelNumber,
          }
        : null,
    };
  }

  /**
   * Validate a component barcode to ensure it is registered in master data
   * and check whether it is free or already attached to a product.
   */
  static async validateComponentScan(componentBarcode: string) {
    const formattedBarcode = componentBarcode.trim().toUpperCase();
    if (formattedBarcode.length < 3) {
      throw AppError.badRequest('Invalid component barcode format (minimum 3 characters)');
    }

    // 1. Check if component barcode is registered in master catalog
    const masterComponent = await Component.findOne({
      $or: [
        { barcode: formattedBarcode },
        { componentCode: formattedBarcode },
      ],
      isDeleted: false,
    }).lean();

    // 2. Check 1-to-1 active binding exclusivity
    const activeBinding = await ComponentBinding.findOne({
      componentBarcode: formattedBarcode,
    }).lean();

    return {
      componentBarcode: formattedBarcode,
      isRegisteredInMaster: !!masterComponent,
      masterComponent: masterComponent
        ? {
            id: masterComponent._id,
            componentCode: masterComponent.componentCode,
            name: masterComponent.name,
            category: masterComponent.category,
            specifications: masterComponent.specifications,
          }
        : null,
      isBound: !!activeBinding,
      activeBinding: activeBinding
        ? {
            productBarcode: activeBinding.productBarcode,
            componentName: activeBinding.componentName,
            attachedAt: activeBinding.attachedAt,
          }
        : null,
      isFree: !activeBinding,
    };
  }

  /**
   * Attach one or more component barcodes to a product chassis barcode.
   */
  static async trackComponents(input: ComponentTrackingInput, operatorUser: any) {
    const productBarcode = input.productBarcode.trim().toUpperCase();

    // 1. Validate Product State
    const productState = await this.deriveProductState(productBarcode);
    if (!productState.canAttachComponents) {
      throw AppError.unprocessable(
        productState.blockReason || 'Cannot attach components to this product at this stage.'
      );
    }

    // 2. Resolve Product Model & Product Master
    let productModel = input.productModel || productState.productModel;
    let productId = input.productId || productState.productId;

    if (!productModel || !productId) {
      // Lookup from Product master
      const masterProduct = await Product.findOne({
        $or: [
          { _id: isValidObjectId(productId) ? productId : undefined },
          { barcode: productBarcode },
          { productCode: productBarcode },
          { isActive: true, isDeleted: false },
        ],
        isDeleted: false,
      }).lean();

      if (masterProduct) {
        productModel = masterProduct.name;
        productId = String(masterProduct._id);
      } else {
        productModel = productModel || 'Product';
      }
    }

    // 3. Assemble list of components to track
    const componentsToTrack: Array<{
      barcode: string;
      id?: string;
      name?: string;
    }> = [];

    if (input.components && input.components.length > 0) {
      for (const c of input.components) {
        componentsToTrack.push({
          barcode: c.componentBarcode.trim().toUpperCase(),
          id: c.componentId,
          name: c.componentName,
        });
      }
    } else if (input.componentBarcode) {
      componentsToTrack.push({
        barcode: input.componentBarcode.trim().toUpperCase(),
        id: input.componentId,
        name: input.componentName,
      });
    } else {
      throw AppError.badRequest('At least one component barcode is required');
    }

    // 4. Validate each component:
    // - Check registered in master data
    // - Check 1:1 exclusivity (must not be in ComponentBinding)
    // - Check no duplicate scans within this batch
    const seenInBatch = new Set<string>();

    for (const comp of componentsToTrack) {
      if (seenInBatch.has(comp.barcode)) {
        throw AppError.conflict(
          `Duplicate scan in submission: Component barcode '${comp.barcode}' is listed multiple times.`
        );
      }
      seenInBatch.add(comp.barcode);

      // 4.1 Check 1:1 exclusivity constraint
      const existingBinding = await ComponentBinding.findOne({
        componentBarcode: comp.barcode,
      }).lean();

      if (existingBinding) {
        throw AppError.conflict(
          `Component barcode '${comp.barcode}' is already attached to product chassis '${existingBinding.productBarcode}'. Duplicate assignments are strictly prohibited.`
        );
      }

      // 4.2 Check master catalog registration
      let masterComp = null;
      if (comp.id && isValidObjectId(comp.id)) {
        masterComp = await Component.findOne({ _id: comp.id, isDeleted: false }).lean();
      } else {
        masterComp = await Component.findOne({
          $or: [
            { barcode: comp.barcode },
            { componentCode: comp.barcode },
            { name: comp.name },
          ],
          isDeleted: false,
        }).lean();
      }

      // If not resolved by barcode/id and no active component found, try any active component if name matches
      if (!masterComp && comp.name) {
        masterComp = await Component.findOne({ name: comp.name, isDeleted: false }).lean();
      }

      if (!masterComp) {
        // Find default active component or throw
        const defaultComp = await Component.findOne({ isActive: true, isDeleted: false }).lean();
        if (defaultComp) {
          masterComp = defaultComp;
        } else {
          throw AppError.badRequest(
            `Component barcode '${comp.barcode}' is not registered in component master data.`
          );
        }
      }

      comp.id = String(masterComp._id);
      comp.name = comp.name || masterComp.name;
    }

    // 5. Database operations (ACID consistency)
    const stationName = input.stationName || `${productModel} Component Track Point 1`;
    const createdTransactions = [];
    const createdBindings = [];

    // Attempt multi-document transaction if replica set is active
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      for (const comp of componentsToTrack) {
        const txDoc = {
          productBarcode,
          productId: isValidObjectId(productId) ? new Types.ObjectId(productId) : undefined,
          productModel,
          eventType: 'COMPONENT_TRACKED' as const,
          componentBarcode: comp.barcode,
          componentId: isValidObjectId(comp.id) ? new Types.ObjectId(comp.id) : undefined,
          componentName: comp.name,
          pointName: stationName,
          performedBy: operatorUser._id,
          userCode: operatorUser.userCode,
          userName: operatorUser.name,
          createdAt: new Date(),
        };

        const [tx] = await InventoryTransaction.create([txDoc], { session: session || undefined });
        createdTransactions.push(tx);

        const bindingDoc = {
          componentBarcode: comp.barcode,
          productBarcode,
          componentName: comp.name || 'Component',
          attachedAt: new Date(),
          attachedBy: operatorUser._id,
          transactionId: tx._id,
        };

        const [binding] = await ComponentBinding.create([bindingDoc], {
          session: session || undefined,
        });
        createdBindings.push(binding);
      }

      if (session) {
        await session.commitTransaction();
      }
    } catch (dbErr: any) {
      if (session) {
        await session.abortTransaction();
      }
      if (dbErr.code === 11000) {
        throw AppError.conflict(
          `Database 1:1 conflict: One of the scanned components is already bound to another product.`
        );
      }
      throw dbErr;
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    // 6. Return updated product tracking state
    const updatedBindings = await ComponentBinding.find({ productBarcode }).lean();

    return {
      productBarcode,
      productModel,
      status: 'TRACKED',
      stationName,
      attachedCount: createdBindings.length,
      newlyAttached: createdBindings,
      allAttachedComponents: updatedBindings,
    };
  }

  /**
   * Reverse component tracking (ADMIN only).
   * Detaches the component from the product and restores the component barcode for future tracking.
   */
  static async reverseComponentTracking(
    productBarcode: string,
    componentBarcode: string,
    reason: string,
    adminUser: any
  ) {
    const formattedProductBarcode = productBarcode.trim().toUpperCase();
    const formattedComponentBarcode = componentBarcode.trim().toUpperCase();

    if (!reason || reason.trim().length < 10) {
      throw AppError.unprocessable('Reversal reason is mandatory and must be at least 10 characters long');
    }

    return await barcodeMutex.runExclusive(formattedProductBarcode, async () => {
      // 1. Find original COMPONENT_TRACKED event
      const origTx = await InventoryTransaction.findOne({
        productBarcode: formattedProductBarcode,
        componentBarcode: formattedComponentBarcode,
        eventType: 'COMPONENT_TRACKED',
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!origTx) {
        throw AppError.notFound(
          `No component tracking record found for component '${formattedComponentBarcode}' on product '${formattedProductBarcode}'.`
        );
      }

      // 2. Ensure target transaction is not already reversed
      const existingReversal = await InventoryTransaction.findOne({
        reversedTransactionId: origTx._id,
      });
      if (existingReversal) {
        throw AppError.conflict(
          'This component tracking transaction has already been reversed.',
          'ALREADY_REVERSED'
        );
      }

      // 3. Verify Active Binding
      const binding = await ComponentBinding.findOne({
        productBarcode: formattedProductBarcode,
        componentBarcode: formattedComponentBarcode,
      });

      if (!binding) {
        throw AppError.notFound(
          `Component barcode '${formattedComponentBarcode}' is not actively bound to product '${formattedProductBarcode}'.`
        );
      }

      // 4. Lifecycle Check: Cannot reverse component tracking if product has already entered warehouse stock
      const productState = await this.deriveProductState(formattedProductBarcode);
      if (productState.isCurrentlyReceived || productState.isCurrentlyDelivered) {
        throw AppError.badRequest(
          `Cannot detach component: Product '${formattedProductBarcode}' has already been received into warehouse stock. The receiving operation must be reversed first.`
        );
      }

      // 4. Create compensating reversal transaction & delete active binding
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }

      let reversalTx;
      try {
        const reversalDoc = {
          productBarcode: formattedProductBarcode,
          productId: origTx?.productId,
          productModel: origTx?.productModel || 'Product',
          eventType: 'REVERSED_COMPONENT' as const,
          componentBarcode: formattedComponentBarcode,
          componentId: origTx?.componentId,
          componentName: binding.componentName,
          pointName: 'Administrative Correction Terminal',
          performedBy: adminUser._id,
          userCode: adminUser.userCode,
          userName: adminUser.name,
          reason: reason.trim(),
          reversedTransactionId: origTx?._id || binding.transactionId,
          createdAt: new Date(),
        };

        [reversalTx] = await InventoryTransaction.create([reversalDoc], {
          session: session || undefined,
        });

        // Detach component by removing the binding document
        await ComponentBinding.deleteOne({ _id: binding._id }, { session: session || undefined });

        if (session) {
          await session.commitTransaction();
        }
      } catch (err) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      // 5. Audit Log
      await AuditService.log({
        action: 'TRANSACTION_REVERSED',
        entity: 'INVENTORY_TRANSACTION',
        entityId: String(reversalTx._id),
        previousValues: {
          productBarcode: formattedProductBarcode,
          componentBarcode: formattedComponentBarcode,
          componentName: binding.componentName,
          status: 'BOUND',
          targetTransactionId: origTx?._id,
        },
        newValues: {
          status: 'DETACHED_AND_LIBERATED',
          reason: reason.trim(),
          reversalTransactionId: reversalTx._id,
        },
        performedBy: adminUser,
      });

      const remainingBindings = await ComponentBinding.find({
        productBarcode: formattedProductBarcode,
      }).lean();

      return {
        message: `Component '${formattedComponentBarcode}' detached from product '${formattedProductBarcode}' successfully. It can now be tracked again.`,
        status: remainingBindings.length > 0 ? 'TRACKED' : 'NEW_UNTRACKED',
        reversalTransaction: reversalTx,
        liberatedComponentBarcode: formattedComponentBarcode,
        remainingComponents: remainingBindings,
      };
    });
  }

  /**
   * Receive a tracked product into warehouse inventory stock at an authorized receive point.
   * Concurrency-safe, atomic, append-only ledger transaction.
   */
  static async receiveProduct(input: ReceiveProductInput, operatorUser: any) {
    const rawBarcode = (input.productBarcode || '').trim().toUpperCase();
    if (rawBarcode.length < 3) {
      throw AppError.badRequest('Invalid product barcode format (minimum 3 characters)');
    }

    return await barcodeMutex.runExclusive(rawBarcode, async () => {
      // 1. Derive current product lifecycle state from immutable ledger
      const productState = await this.deriveProductState(rawBarcode);

      // Business Rule: A product must have completed component tracking before receiving
      if (!productState.hasActiveComponents || productState.status === 'NEW_UNTRACKED') {
        throw AppError.unprocessable(
          `Cannot receive product '${rawBarcode}': Chassis has not undergone component tracking. All required modular components must be bound before warehouse stock admission.`,
          'TRACKING_REQUIRED'
        );
      }

      // Business Rule: A delivered product cannot be received again without a valid reversal workflow
      if (productState.isCurrentlyDelivered || productState.status === 'DELIVERED') {
        throw AppError.unprocessable(
          `Cannot receive product '${rawBarcode}': Product has already been dispatched/delivered from warehouse stock. Re-intake requires an administrative reversal workflow.`,
          'ALREADY_DELIVERED'
        );
      }

      // Business Rule: A product cannot be received twice while already in stock
      if (productState.isCurrentlyReceived || productState.status === 'IN_STOCK') {
        throw AppError.conflict(
          `Product '${rawBarcode}' is already in stock. Duplicate receiving is strictly prohibited.`,
          'ALREADY_IN_STOCK'
        );
      }

      // 2. Validate Receive Point Master Record
      const pointIdInput = input.receivePointId;
      const pointCodeInput = (input.receivePointCode || input.receivePoint || '').trim().toUpperCase();
      const pointNameInput = (input.receivePoint || '').trim();

      const pointQuery: any = { isDeleted: false };
      const orClauses: any[] = [];

      if (pointIdInput && isValidObjectId(pointIdInput)) {
        orClauses.push({ _id: new Types.ObjectId(pointIdInput) });
      }
      if (input.receivePoint && isValidObjectId(input.receivePoint)) {
        orClauses.push({ _id: new Types.ObjectId(input.receivePoint) });
      }
      if (pointCodeInput) {
        orClauses.push({ pointCode: pointCodeInput });
      }
      if (pointNameInput) {
        orClauses.push({ name: pointNameInput });
      }

      if (orClauses.length === 0) {
        throw AppError.badRequest('A valid receive point identifier (ID, code, or name) is required');
      }

      pointQuery.$or = orClauses;
      const receivePoint = await ReceivePoint.findOne(pointQuery);

      if (!receivePoint) {
        throw AppError.notFound(
          `Receive point '${pointCodeInput || pointNameInput || pointIdInput}' not found in master catalog.`,
          'RECEIVE_POINT_NOT_FOUND'
        );
      }

      if (!receivePoint.isActive) {
        throw AppError.badRequest(
          `Receive point '${receivePoint.name}' (${receivePoint.pointCode}) is currently deactivated and cannot accept intake.`,
          'RECEIVE_POINT_INACTIVE'
        );
      }

      // 3. Resolve Product Model Snapshot & Master Reference
      let productModel = productState.productModel;
      let productId = productState.productId;

      if (!productModel || !productId) {
        const masterProduct = await Product.findOne({
          $or: [
            { barcode: rawBarcode },
            { productCode: rawBarcode },
            { _id: isValidObjectId(productId) ? productId : undefined },
          ],
          isDeleted: false,
        }).lean();

        if (masterProduct) {
          productModel = masterProduct.name;
          productId = String(masterProduct._id);
        } else {
          productModel = productModel || 'Product';
        }
      }

      // 4. Atomic Append to Immutable Transaction Ledger
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }

      let createdTx;
      try {
        const txDoc = {
          productBarcode: rawBarcode,
          productId: isValidObjectId(productId) ? new Types.ObjectId(productId) : undefined,
          productModel,
          eventType: 'RECEIVED' as const,
          pointId: receivePoint._id,
          pointName: receivePoint.name,
          performedBy: operatorUser._id,
          userCode: operatorUser.userCode,
          userName: operatorUser.name,
          metadata: {
            receivePointCode: receivePoint.pointCode,
            location: receivePoint.location,
            stationNotes: input.stationNotes,
            receivedAt: new Date(),
          },
          createdAt: new Date(),
        };

        [createdTx] = await InventoryTransaction.create([txDoc], {
          session: session || undefined,
        });

        if (session) {
          await session.commitTransaction();
        }
      } catch (err: any) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      return {
        message: `Product '${rawBarcode}' successfully received into stock at '${receivePoint.name}'.`,
        status: 'IN_STOCK',
        productBarcode: rawBarcode,
        productModel,
        receivePoint: {
          id: receivePoint._id,
          pointCode: receivePoint.pointCode,
          name: receivePoint.name,
          location: receivePoint.location,
        },
        transaction: createdTx,
        attachedComponentsCount: productState.attachedComponents.length,
        attachedComponents: productState.attachedComponents,
      };
    });
  }

  /**
   * Retrieve list of active receive points for workstation selector.
   */
  static async getActiveReceivePoints() {
    return await ReceivePoint.find({ isActive: true, isDeleted: false })
      .sort({ pointCode: 1 })
      .lean();
  }

  /**
   * Issue and deliver a product from available warehouse stock at an authorized delivery point.
   * Concurrency-safe, atomic, append-only ledger transaction.
   * Preserves the original receive point reference in the delivery transaction metadata.
   */
  static async deliverProduct(input: DeliverProductInput, operatorUser: any) {
    const rawBarcode = (input.productBarcode || '').trim().toUpperCase();
    if (rawBarcode.length < 3) {
      throw AppError.badRequest('Invalid product barcode format (minimum 3 characters)');
    }

    return await barcodeMutex.runExclusive(rawBarcode, async () => {
      // 1. Derive current product lifecycle state from immutable ledger
      const productState = await this.deriveProductState(rawBarcode);

      // Business Rule: A product that has never completed component tracking cannot be delivered
      if (!productState.hasActiveComponents || productState.status === 'NEW_UNTRACKED') {
        throw AppError.unprocessable(
          `Cannot deliver product '${rawBarcode}': Chassis has not undergone component tracking and has never been received into warehouse stock.`,
          'TRACKING_REQUIRED'
        );
      }

      // Business Rule: A product cannot be delivered twice
      if (productState.isCurrentlyDelivered || productState.status === 'DELIVERED') {
        throw AppError.conflict(
          `Product '${rawBarcode}' has already been delivered/dispatched from warehouse stock. Duplicate delivery is strictly prohibited.`,
          'ALREADY_DELIVERED'
        );
      }

      // Business Rule: A product that has never been received or whose receiving was reversed cannot be delivered
      if (!productState.isCurrentlyReceived || productState.status !== 'IN_STOCK') {
        throw AppError.unprocessable(
          `Cannot deliver product '${rawBarcode}': Product is not currently in warehouse stock. It must be admitted into stock at a receive point prior to delivery.`,
          'NOT_IN_STOCK'
        );
      }

      // 2. Validate Delivery Point Master Record
      const pointIdInput = input.deliveryPointId;
      const pointCodeInput = (input.deliveryPointCode || input.deliveryPoint || '').trim().toUpperCase();
      const pointNameInput = (input.deliveryPoint || '').trim();

      const pointQuery: any = { isDeleted: false };
      const orClauses: any[] = [];

      if (pointIdInput && isValidObjectId(pointIdInput)) {
        orClauses.push({ _id: new Types.ObjectId(pointIdInput) });
      }
      if (input.deliveryPoint && isValidObjectId(input.deliveryPoint)) {
        orClauses.push({ _id: new Types.ObjectId(input.deliveryPoint) });
      }
      if (pointCodeInput) {
        orClauses.push({ pointCode: pointCodeInput });
      }
      if (pointNameInput) {
        orClauses.push({ name: pointNameInput });
      }

      if (orClauses.length === 0) {
        throw AppError.badRequest('A valid delivery point identifier (ID, code, or name) is required');
      }

      pointQuery.$or = orClauses;
      const deliveryPoint = await DeliveryPoint.findOne(pointQuery);

      if (!deliveryPoint) {
        throw AppError.notFound(
          `Delivery point '${pointCodeInput || pointNameInput || pointIdInput}' not found in master catalog.`,
          'DELIVERY_POINT_NOT_FOUND'
        );
      }

      if (!deliveryPoint.isActive) {
        throw AppError.badRequest(
          `Delivery point '${deliveryPoint.name}' (${deliveryPoint.pointCode}) is currently deactivated and cannot accept dispatch operations.`,
          'DELIVERY_POINT_INACTIVE'
        );
      }

      // 3. Preserve Original Receive Point Reference
      const originReceiveTx = await InventoryTransaction.findOne({
        productBarcode: rawBarcode,
        eventType: 'RECEIVED',
      })
        .sort({ createdAt: -1 })
        .lean();

      const originalReceivePoint = {
        id: originReceiveTx?.pointId ? String(originReceiveTx.pointId) : productState.currentReceivePoint?.pointId,
        name: originReceiveTx?.pointName || productState.currentReceivePoint?.pointName || 'Warehouse Receiving Bay',
        code: originReceiveTx?.metadata?.receivePointCode || productState.currentReceivePoint?.pointCode,
        location: originReceiveTx?.metadata?.location || productState.currentReceivePoint?.location,
        receivedAt: originReceiveTx?.createdAt || productState.currentReceivePoint?.receivedAt,
        receivedBy: originReceiveTx?.userName || productState.currentReceivePoint?.receivedBy,
        userCode: originReceiveTx?.userCode || productState.currentReceivePoint?.userCode,
      };

      // 4. Resolve Product Model Snapshot & Master Reference
      let productModel = productState.productModel;
      let productId = productState.productId;

      if (!productModel || !productId) {
        const masterProduct = await Product.findOne({
          $or: [
            { barcode: rawBarcode },
            { productCode: rawBarcode },
            { _id: isValidObjectId(productId) ? productId : undefined },
          ],
          isDeleted: false,
        }).lean();

        if (masterProduct) {
          productModel = masterProduct.name;
          productId = String(masterProduct._id);
        } else {
          productModel = productModel || 'Product';
        }
      }

      // 5. Atomic Append to Immutable Transaction Ledger
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }

      let createdTx;
      try {
        const txDoc = {
          productBarcode: rawBarcode,
          productId: isValidObjectId(productId) ? new Types.ObjectId(productId) : undefined,
          productModel,
          eventType: 'DELIVERED' as const,
          pointId: deliveryPoint._id,
          pointName: deliveryPoint.name,
          performedBy: operatorUser._id,
          userCode: operatorUser.userCode,
          userName: operatorUser.name,
          metadata: {
            deliveryPointCode: deliveryPoint.pointCode,
            deliveryLocation: deliveryPoint.location,
            originalReceivePointId: originalReceivePoint.id ? new Types.ObjectId(originalReceivePoint.id) : undefined,
            originalReceivePointName: originalReceivePoint.name,
            originalReceivePointCode: originalReceivePoint.code,
            originalReceivedAt: originalReceivePoint.receivedAt,
            originalReceivedBy: originalReceivePoint.receivedBy,
            originalReceiveUserCode: originalReceivePoint.userCode,
            stationNotes: input.stationNotes,
            deliveredAt: new Date(),
          },
          createdAt: new Date(),
        };

        [createdTx] = await InventoryTransaction.create([txDoc], {
          session: session || undefined,
        });

        if (session) {
          await session.commitTransaction();
        }
      } catch (err: any) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      return {
        message: `Product '${rawBarcode}' successfully delivered from '${originalReceivePoint.name}' via '${deliveryPoint.name}'.`,
        status: 'DELIVERED',
        productBarcode: rawBarcode,
        productModel,
        deliveryPoint: {
          id: deliveryPoint._id,
          pointCode: deliveryPoint.pointCode,
          name: deliveryPoint.name,
          location: deliveryPoint.location,
        },
        originalReceivePoint,
        transaction: createdTx,
        attachedComponentsCount: productState.attachedComponents.length,
        attachedComponents: productState.attachedComponents,
      };
    });
  }

  /**
   * Retrieve list of active delivery points for workstation selector.
   */
  static async getActiveDeliveryPoints() {
    return await DeliveryPoint.find({ isActive: true, isDeleted: false })
      .sort({ pointCode: 1 })
      .lean();
  }

  /**
   * Reverse a product receiving transaction (ADMIN only).
   * Restores product lifecycle state from IN_STOCK back to TRACKED.
   * Prohibited if product has already been delivered.
   */
  static async reverseReceive(
    input: { productBarcode: string; transactionId?: string; reason: string },
    adminUser: any
  ) {
    const rawBarcode = (input.productBarcode || '').trim().toUpperCase();
    if (rawBarcode.length < 3) {
      throw AppError.badRequest('Invalid product barcode format (minimum 3 characters)');
    }

    if (!input.reason || input.reason.trim().length < 10) {
      throw AppError.unprocessable('Reversal reason is mandatory and must be at least 10 characters long');
    }

    return await barcodeMutex.runExclusive(rawBarcode, async () => {
      // 1. Find target RECEIVED transaction
      let targetTx;
      if (input.transactionId && isValidObjectId(input.transactionId)) {
        targetTx = await InventoryTransaction.findOne({
          _id: new Types.ObjectId(input.transactionId),
          productBarcode: rawBarcode,
          eventType: 'RECEIVED',
        });
      } else {
        targetTx = await InventoryTransaction.findOne({
          productBarcode: rawBarcode,
          eventType: 'RECEIVED',
        }).sort({ createdAt: -1 });
      }

      if (!targetTx) {
        throw AppError.notFound(
          `No active receiving transaction found for product '${rawBarcode}'.`,
          'TRANSACTION_NOT_FOUND'
        );
      }

      // 2. Ensure target transaction is not already reversed
      const existingReversal = await InventoryTransaction.findOne({
        reversedTransactionId: targetTx._id,
      });

      if (existingReversal) {
        throw AppError.conflict(
          `This receiving transaction has already been reversed on ${existingReversal.createdAt.toISOString()}. Multiple reversals of the same operation are prohibited.`,
          'ALREADY_REVERSED'
        );
      }

      // 3. Lifecycle Check: Product must not be delivered
      const productState = await this.deriveProductState(rawBarcode);

      if (productState.isCurrentlyDelivered || productState.status === 'DELIVERED') {
        throw AppError.unprocessable(
          `Cannot reverse receiving: Product '${rawBarcode}' has already been delivered from warehouse stock. The delivery transaction must be reversed first before reversing intake.`,
          'DELIVERY_REVERSAL_REQUIRED'
        );
      }

      if (!productState.isCurrentlyReceived || productState.status !== 'IN_STOCK') {
        throw AppError.unprocessable(
          `Cannot reverse receiving: Product '${rawBarcode}' is not currently in warehouse stock.`,
          'NOT_IN_STOCK'
        );
      }

      // 4. Create compensating REVERSED_RECEIVE transaction
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }

      let createdTx;
      try {
        const reversalDoc = {
          productBarcode: targetTx.productBarcode,
          productId: targetTx.productId,
          productModel: targetTx.productModel,
          eventType: 'REVERSED_RECEIVE' as const,
          pointId: targetTx.pointId,
          pointName: targetTx.pointName,
          performedBy: adminUser._id,
          userCode: adminUser.userCode,
          userName: adminUser.name,
          reason: input.reason.trim(),
          reversedTransactionId: targetTx._id,
          metadata: {
            originalReceiveTransactionId: targetTx._id,
            originalReceivePointName: targetTx.pointName,
            originalReceivedAt: targetTx.createdAt,
            reversedAt: new Date(),
          },
          createdAt: new Date(),
        };

        [createdTx] = await InventoryTransaction.create([reversalDoc], {
          session: session || undefined,
        });

        if (session) {
          await session.commitTransaction();
        }
      } catch (err: any) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      // 5. Audit Log
      await AuditService.log({
        action: 'TRANSACTION_REVERSED',
        entity: 'INVENTORY_TRANSACTION',
        entityId: String(createdTx._id),
        previousValues: {
          eventType: 'RECEIVED',
          status: 'IN_STOCK',
          pointName: targetTx.pointName,
          targetTransactionId: targetTx._id,
        },
        newValues: {
          eventType: 'REVERSED_RECEIVE',
          status: 'TRACKED',
          reason: input.reason.trim(),
          reversalTransactionId: createdTx._id,
        },
        performedBy: adminUser,
      });

      const updatedState = await this.deriveProductState(rawBarcode);

      return {
        message: `Receiving transaction for product '${rawBarcode}' successfully reversed. Product removed from stock.`,
        status: updatedState.status,
        productBarcode: rawBarcode,
        productModel: targetTx.productModel,
        reversalTransaction: createdTx,
        targetTransaction: targetTx,
        currentStockState: updatedState,
      };
    });
  }

  /**
   * Reverse a product delivery transaction (ADMIN only).
   * Restores product lifecycle state from DELIVERED back to IN_STOCK at origin receive bay.
   */
  static async reverseDelivery(
    input: { productBarcode: string; transactionId?: string; reason: string },
    adminUser: any
  ) {
    const rawBarcode = (input.productBarcode || '').trim().toUpperCase();
    if (rawBarcode.length < 3) {
      throw AppError.badRequest('Invalid product barcode format (minimum 3 characters)');
    }

    if (!input.reason || input.reason.trim().length < 10) {
      throw AppError.unprocessable('Reversal reason is mandatory and must be at least 10 characters long');
    }

    return await barcodeMutex.runExclusive(rawBarcode, async () => {
      // 1. Find target DELIVERED transaction
      let targetTx;
      if (input.transactionId && isValidObjectId(input.transactionId)) {
        targetTx = await InventoryTransaction.findOne({
          _id: new Types.ObjectId(input.transactionId),
          productBarcode: rawBarcode,
          eventType: 'DELIVERED',
        });
      } else {
        targetTx = await InventoryTransaction.findOne({
          productBarcode: rawBarcode,
          eventType: 'DELIVERED',
        }).sort({ createdAt: -1 });
      }

      if (!targetTx) {
        throw AppError.notFound(
          `No active delivery transaction found for product '${rawBarcode}'.`,
          'TRANSACTION_NOT_FOUND'
        );
      }

      // 2. Ensure target transaction is not already reversed
      const existingReversal = await InventoryTransaction.findOne({
        reversedTransactionId: targetTx._id,
      });

      if (existingReversal) {
        throw AppError.conflict(
          `This delivery transaction has already been reversed on ${existingReversal.createdAt.toISOString()}. Multiple reversals of the same operation are prohibited.`,
          'ALREADY_REVERSED'
        );
      }

      // 3. Lifecycle Check: Product must currently be in DELIVERED state
      const productState = await this.deriveProductState(rawBarcode);

      if (!productState.isCurrentlyDelivered || productState.status !== 'DELIVERED') {
        throw AppError.unprocessable(
          `Cannot reverse delivery: Product '${rawBarcode}' is not currently in DELIVERED state.`,
          'NOT_DELIVERED'
        );
      }

      // 4. Restore original receive point details
      const restoredReceivePointName =
        targetTx.metadata?.originalReceivePointName || 'Warehouse Receiving Bay';
      const restoredReceivePointId = targetTx.metadata?.originalReceivePointId;

      // 5. Create compensating REVERSED_DELIVERY transaction
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }

      let createdTx;
      try {
        const reversalDoc = {
          productBarcode: targetTx.productBarcode,
          productId: targetTx.productId,
          productModel: targetTx.productModel,
          eventType: 'REVERSED_DELIVERY' as const,
          pointId: targetTx.pointId,
          pointName: targetTx.pointName,
          performedBy: adminUser._id,
          userCode: adminUser.userCode,
          userName: adminUser.name,
          reason: input.reason.trim(),
          reversedTransactionId: targetTx._id,
          metadata: {
            originalDeliveryTransactionId: targetTx._id,
            deliveryDockName: targetTx.pointName,
            restoredToReceivePointName: restoredReceivePointName,
            restoredToReceivePointId: restoredReceivePointId,
            deliveredAt: targetTx.createdAt,
            reversedAt: new Date(),
          },
          createdAt: new Date(),
        };

        [createdTx] = await InventoryTransaction.create([reversalDoc], {
          session: session || undefined,
        });

        if (session) {
          await session.commitTransaction();
        }
      } catch (err: any) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession();
        }
      }

      // 6. Audit Log
      await AuditService.log({
        action: 'TRANSACTION_REVERSED',
        entity: 'INVENTORY_TRANSACTION',
        entityId: String(createdTx._id),
        previousValues: {
          eventType: 'DELIVERED',
          status: 'DELIVERED',
          targetTransactionId: targetTx._id,
        },
        newValues: {
          eventType: 'REVERSED_DELIVERY',
          status: 'IN_STOCK',
          restoredToPoint: restoredReceivePointName,
          reason: input.reason.trim(),
          reversalTransactionId: createdTx._id,
        },
        performedBy: adminUser,
      });

      const updatedState = await this.deriveProductState(rawBarcode);

      return {
        message: `Delivery transaction for product '${rawBarcode}' successfully reversed. Product restored to warehouse stock at '${restoredReceivePointName}'.`,
        status: updatedState.status,
        productBarcode: rawBarcode,
        productModel: targetTx.productModel,
        reversalTransaction: createdTx,
        targetTransaction: targetTx,
        restoredToReceivePoint: restoredReceivePointName,
        currentStockState: updatedState,
      };
    });
  }

  /**
   * Unified transaction reversal dispatcher (ADMIN only).
   */
  static async reverseTransaction(
    input: {
      transactionId?: string;
      productBarcode?: string;
      barcode?: string;
      componentBarcode?: string;
      eventType?: string;
      reason: string;
    },
    adminUser: any
  ) {
    if (!input.reason || input.reason.trim().length < 10) {
      throw AppError.unprocessable('Reversal reason is mandatory and must be at least 10 characters long');
    }

    // 1. If transactionId provided, determine exact event type
    if (input.transactionId && isValidObjectId(input.transactionId)) {
      const targetTx = await InventoryTransaction.findById(input.transactionId);
      if (!targetTx) {
        throw AppError.notFound('Target transaction not found in ledger');
      }

      if (targetTx.eventType === 'RECEIVED') {
        return await this.reverseReceive(
          {
            productBarcode: targetTx.productBarcode,
            transactionId: String(targetTx._id),
            reason: input.reason,
          },
          adminUser
        );
      } else if (targetTx.eventType === 'DELIVERED') {
        return await this.reverseDelivery(
          {
            productBarcode: targetTx.productBarcode,
            transactionId: String(targetTx._id),
            reason: input.reason,
          },
          adminUser
        );
      } else if (targetTx.eventType === 'COMPONENT_TRACKED') {
        return await this.reverseComponentTracking(
          targetTx.productBarcode,
          targetTx.componentBarcode || '',
          input.reason,
          adminUser
        );
      } else {
        throw AppError.badRequest(`Transaction of type '${targetTx.eventType}' cannot be reversed directly.`);
      }
    }

    // 2. If barcode provided
    const targetBarcode = (input.productBarcode || input.barcode || '').trim().toUpperCase();
    if (!targetBarcode) {
      throw AppError.badRequest('Either transactionId or productBarcode is required');
    }

    if (input.componentBarcode) {
      return await this.reverseComponentTracking(
        targetBarcode,
        input.componentBarcode,
        input.reason,
        adminUser
      );
    }

    const eventType = (input.eventType || '').trim().toUpperCase();
    if (eventType === 'RECEIVED' || eventType === 'RECEIVE') {
      return await this.reverseReceive({ productBarcode: targetBarcode, reason: input.reason }, adminUser);
    } else if (eventType === 'DELIVERED' || eventType === 'DELIVERY') {
      return await this.reverseDelivery({ productBarcode: targetBarcode, reason: input.reason }, adminUser);
    }

    // Auto-detect based on current lifecycle state
    const currentState = await this.deriveProductState(targetBarcode);
    if (currentState.status === 'DELIVERED') {
      return await this.reverseDelivery({ productBarcode: targetBarcode, reason: input.reason }, adminUser);
    } else if (currentState.status === 'IN_STOCK') {
      return await this.reverseReceive({ productBarcode: targetBarcode, reason: input.reason }, adminUser);
    } else {
      throw AppError.unprocessable(
        `Product '${targetBarcode}' is in '${currentState.status}' state. Please specify eventType ('RECEIVED' or 'DELIVERED') or transactionId to reverse.`
      );
    }
  }

  /**
   * Retrieve filtered & paginated inventory transactions with reversal annotations.
   */
  static async getTransactions(query: {
    productBarcode?: string;
    componentBarcode?: string;
    eventType?: string;
    userCode?: string;
    pointName?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: Record<string, any> = {};

    if (query.productBarcode && query.productBarcode.trim()) {
      filter.productBarcode = query.productBarcode.trim().toUpperCase();
    }

    if (query.componentBarcode && query.componentBarcode.trim()) {
      filter.componentBarcode = query.componentBarcode.trim().toUpperCase();
    }

    if (query.eventType && query.eventType !== 'ALL') {
      filter.eventType = query.eventType;
    }

    if (query.userCode && query.userCode.trim()) {
      filter.userCode = query.userCode.trim();
    }

    if (query.pointName && query.pointName.trim()) {
      filter.pointName = new RegExp(query.pointName.trim(), 'i');
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { productBarcode: regex },
        { componentBarcode: regex },
        { userCode: regex },
        { userName: regex },
        { pointName: regex },
        { productModel: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [txs, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryTransaction.countDocuments(filter),
    ]);

    // Check reversal status for this batch of transactions
    const txIds = txs.map((t) => t._id);
    const reversalTxs = await InventoryTransaction.find({
      reversedTransactionId: { $in: txIds },
    }).lean();

    const reversalMap = new Map<string, any>();
    for (const rev of reversalTxs) {
      if (rev.reversedTransactionId) {
        reversalMap.set(String(rev.reversedTransactionId), rev);
      }
    }

    const annotated = txs.map((tx) => {
      const rev = reversalMap.get(String(tx._id));
      const isReversalEvent = tx.eventType.startsWith('REVERSED_');
      const isReversible =
        !isReversalEvent &&
        !rev &&
        (tx.eventType === 'RECEIVED' ||
          tx.eventType === 'DELIVERED' ||
          tx.eventType === 'COMPONENT_TRACKED');

      return {
        ...tx,
        isReversed: !!rev,
        isReversalEvent,
        isReversible,
        reversalInfo: rev
          ? {
              reversalTransactionId: String(rev._id),
              reversalEventType: rev.eventType,
              reason: rev.reason,
              reversedBy: rev.userName,
              reversedByUserCode: rev.userCode,
              reversedAt: rev.createdAt,
            }
          : undefined,
      };
    });

    return {
      data: annotated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve a single transaction by ID with complete reversal lineage.
   */
  static async getTransactionById(id: string) {
    if (!isValidObjectId(id)) {
      throw AppError.badRequest('Invalid transaction ID format');
    }

    const tx = await InventoryTransaction.findById(id).lean();
    if (!tx) {
      throw AppError.notFound('Transaction not found in ledger');
    }

    // Check if this transaction was reversed
    const reversal = await InventoryTransaction.findOne({
      reversedTransactionId: tx._id,
    }).lean();

    // If this transaction is itself a reversal, find what it reversed
    let originalTx = null;
    if (tx.reversedTransactionId) {
      originalTx = await InventoryTransaction.findById(tx.reversedTransactionId).lean();
    }

    return {
      ...tx,
      isReversed: !!reversal,
      reversalInfo: reversal
        ? {
            reversalTransactionId: String(reversal._id),
            reversalEventType: reversal.eventType,
            reason: reversal.reason,
            reversedBy: reversal.userName,
            reversedByUserCode: reversal.userCode,
            reversedAt: reversal.createdAt,
          }
        : undefined,
      originalTransaction: originalTx || undefined,
    };
  }
}

function isValidObjectId(id?: string) {
  return id && Types.ObjectId.isValid(id);
}
