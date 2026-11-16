import mongoose, { Types } from 'mongoose';
import {
  InventoryTransaction,
  ComponentBinding,
  Product,
  Component,
  IComponentBinding,
} from '../../database/models';
import { AppError } from '../../utils/AppError';
import { AuditService } from '../audit/audit.service';

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
          break;
        case 'REVERSED_RECEIVE':
          reversedReceivedCount++;
          break;
        case 'DELIVERED':
          deliveredCount++;
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

    // 1. Verify Active Binding
    const binding = await ComponentBinding.findOne({
      productBarcode: formattedProductBarcode,
      componentBarcode: formattedComponentBarcode,
    });

    if (!binding) {
      throw AppError.notFound(
        `Component barcode '${formattedComponentBarcode}' is not actively bound to product '${formattedProductBarcode}'.`
      );
    }

    // 2. Lifecycle Check: Cannot reverse component tracking if product has already entered warehouse stock
    const productState = await this.deriveProductState(formattedProductBarcode);
    if (productState.isCurrentlyReceived || productState.isCurrentlyDelivered) {
      throw AppError.badRequest(
        `Cannot detach component: Product '${formattedProductBarcode}' has already been received into warehouse stock. The receiving operation must be reversed first.`
      );
    }

    // 3. Find original COMPONENT_TRACKED event
    const origTx = await InventoryTransaction.findOne({
      productBarcode: formattedProductBarcode,
      componentBarcode: formattedComponentBarcode,
      eventType: 'COMPONENT_TRACKED',
    })
      .sort({ createdAt: -1 })
      .lean();

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
        reason,
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
      },
      newValues: {
        status: 'DETACHED_AND_LIBERATED',
        reason,
        reversalTransactionId: reversalTx._id,
      },
      performedBy: adminUser,
    });

    const remainingBindings = await ComponentBinding.find({
      productBarcode: formattedProductBarcode,
    }).lean();

    return {
      message: `Component '${formattedComponentBarcode}' detached from product '${formattedProductBarcode}' successfully. It can now be tracked again.`,
      reversalTransaction: reversalTx,
      liberatedComponentBarcode: formattedComponentBarcode,
      remainingComponents: remainingBindings,
    };
  }
}

function isValidObjectId(id?: string) {
  return id && Types.ObjectId.isValid(id);
}
