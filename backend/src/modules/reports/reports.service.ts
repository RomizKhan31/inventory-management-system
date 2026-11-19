import { Types } from 'mongoose';
import { InventoryTransaction, InventoryEventType } from '../../database/models/InventoryTransaction';
import { ComponentBinding } from '../../database/models/ComponentBinding';
import { Product } from '../../database/models/Product';
import { AppError } from '../../utils/AppError';

export interface StockItemReportDto {
  productBarcode: string;
  productModel: string;
  status: 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
  currentReceivePoint?: string;
  receivePointCode?: string;
  receivedAt?: Date;
  receivedBy?: string;
  receiveUserCode?: string;
  deliveryPoint?: string;
  deliveredAt?: Date;
  deliveredBy?: string;
  deliveryUserCode?: string;
  components: Array<{
    barcode: string;
    name: string;
    attachedAt: Date;
  }>;
  componentCount: number;
  daysInStock?: number;
  totalTransactionsCount: number;
  hasReversals: boolean;
  lastActivityAt: Date;
  latestTransactionId?: string;
}

export interface DateRangeSummaryDto {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalTransactions: number;
    totalReceived: number;
    totalDelivered: number;
    totalComponentsTracked: number;
    reversals: {
      reversedReceive: number;
      reversedDelivery: number;
      reversedComponent: number;
      total: number;
    };
    netActiveReceived: number;
    netActiveDelivered: number;
  };
  dailyActivity: Array<{
    date: string;
    received: number;
    delivered: number;
    componentsTracked: number;
    reversals: number;
    netReceived: number;
  }>;
  receivePointsSummary: Array<{
    pointName: string;
    receivedCount: number;
    reversedCount: number;
    netReceived: number;
  }>;
  deliveryPointsSummary: Array<{
    pointName: string;
    deliveredCount: number;
    reversedCount: number;
    netDelivered: number;
  }>;
  operatorActivity: Array<{
    userCode: string;
    userName: string;
    totalActions: number;
    receivedCount: number;
    deliveredCount: number;
    trackedCount: number;
    reversedCount: number;
  }>;
}

export interface BarcodeHistoryReportDto {
  productBarcode: string;
  productModel: string;
  masterProduct?: {
    productCode?: string;
    name?: string;
    category?: string;
    description?: string;
  };
  currentStatus: 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
  stockLocation?: string;
  dispatchLocation?: string;
  activeComponents: Array<{
    componentBarcode: string;
    componentName: string;
    attachedAt: Date;
  }>;
  lifecycleStages: {
    componentTracking: {
      isComplete: boolean;
      completedAt?: Date;
      isReversed: boolean;
      activeComponentsCount: number;
    };
    receiving: {
      isComplete: boolean;
      receivedAt?: Date;
      receivePoint?: string;
      isReversed: boolean;
    };
    delivery: {
      isComplete: boolean;
      deliveredAt?: Date;
      deliveryPoint?: string;
      isReversed: boolean;
    };
  };
  eventsTimeline: Array<{
    _id: string;
    stepNumber: number;
    eventType: InventoryEventType;
    pointName: string;
    componentBarcode?: string;
    componentName?: string;
    userCode: string;
    userName: string;
    reason?: string;
    createdAt: Date;
    isReversed: boolean;
    isReversalEvent: boolean;
    reversalDetails?: {
      reversalTransactionId: string;
      reversalEventType: string;
      reason: string;
      reversedBy: string;
      reversedByUserCode: string;
      reversedAt: Date;
    };
    metadata?: Record<string, unknown>;
  }>;
  summary: {
    totalEvents: number;
    reversalEventsCount: number;
    firstTrackedAt?: Date;
    receivedAt?: Date;
    deliveredAt?: Date;
    lastActivityAt?: Date;
  };
}

export class ReportsService {
  /**
   * 1. Stock Details Report:
   * Aggregates products from the append-only ledger, interpreting reversal transactions
   * so reversed receipts/deliveries are NOT counted as active stock.
   */
  static async getStockDetailsReport(query: {
    search?: string;
    status?: string;
    pointName?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));

    // Optional search match in aggregation
    const matchFilter: Record<string, any> = {};
    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      matchFilter.$or = [
        { productBarcode: regex },
        { productModel: regex },
        { pointName: regex },
        { componentBarcode: regex },
      ];
    }

    // High performance aggregation grouped by productBarcode
    const groupedProducts = await InventoryTransaction.aggregate([
      ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$productBarcode',
          productBarcode: { $first: '$productBarcode' },
          productModel: { $last: '$productModel' },
          transactions: {
            $push: {
              _id: '$_id',
              eventType: '$eventType',
              pointName: '$pointName',
              pointId: '$pointId',
              componentBarcode: '$componentBarcode',
              componentName: '$componentName',
              userCode: '$userCode',
              userName: '$userName',
              reason: '$reason',
              reversedTransactionId: '$reversedTransactionId',
              createdAt: '$createdAt',
              metadata: '$metadata',
            },
          },
          lastActivity: { $max: '$createdAt' },
        },
      },
      { $sort: { lastActivity: -1 } },
    ]);

    // Also fetch active component bindings for all returned products
    const productBarcodes = groupedProducts.map((p) => p.productBarcode);
    const activeBindings = await ComponentBinding.find({
      productBarcode: { $in: productBarcodes },
    }).lean();

    const bindingsMap = new Map<string, Array<{ barcode: string; name: string; attachedAt: Date }>>();
    for (const b of activeBindings) {
      if (!bindingsMap.has(b.productBarcode)) {
        bindingsMap.set(b.productBarcode, []);
      }
      bindingsMap.get(b.productBarcode)!.push({
        barcode: b.componentBarcode,
        name: b.componentName,
        attachedAt: b.attachedAt,
      });
    }

    // Interpret ledger transactions per product and determine derived stock status
    const calculatedItems: StockItemReportDto[] = [];
    let totalInStockCount = 0;
    let totalDeliveredCount = 0;
    let totalTrackedCount = 0;
    let totalReversalsCount = 0;
    const activeReceiveBays = new Set<string>();

    for (const group of groupedProducts) {
      const txs = group.transactions || [];
      const reversedIds = new Set<string>();

      for (const tx of txs) {
        if (tx.reversedTransactionId) {
          reversedIds.add(String(tx.reversedTransactionId));
        }
      }

      if (reversedIds.size > 0) {
        totalReversalsCount++;
      }

      // Filter active (unreversed) transactions
      const activeTxs = txs.filter(
        (t: any) => !reversedIds.has(String(t._id)) && !t.eventType.startsWith('REVERSED_')
      );

      const activeReceived = activeTxs.filter((t: any) => t.eventType === 'RECEIVED');
      const activeDelivered = activeTxs.filter((t: any) => t.eventType === 'DELIVERED');
      const boundComponents = bindingsMap.get(group.productBarcode) || [];

      // Determine Derived Status
      let derivedStatus: 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
      if (activeDelivered.length > 0) {
        derivedStatus = 'DELIVERED';
        totalDeliveredCount++;
      } else if (activeReceived.length > 0) {
        derivedStatus = 'IN_STOCK';
        totalInStockCount++;
      } else if (boundComponents.length > 0) {
        derivedStatus = 'TRACKED';
        totalTrackedCount++;
      } else {
        derivedStatus = 'NEW_UNTRACKED';
      }

      const latestReceived = activeReceived[activeReceived.length - 1];
      const latestDelivered = activeDelivered[activeDelivered.length - 1];
      const latestTx = txs[txs.length - 1];

      if (latestReceived?.pointName) {
        activeReceiveBays.add(latestReceived.pointName);
      }

      // Calculate days in stock for products currently in stock
      let daysInStock: number | undefined = undefined;
      if (derivedStatus === 'IN_STOCK' && latestReceived?.createdAt) {
        const diffMs = Date.now() - new Date(latestReceived.createdAt).getTime();
        daysInStock = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const item: StockItemReportDto = {
        productBarcode: group.productBarcode,
        productModel: group.productModel || 'Standard Product',
        status: derivedStatus,
        currentReceivePoint: latestReceived?.pointName,
        receivePointCode: latestReceived?.metadata?.receivePointCode,
        receivedAt: latestReceived?.createdAt,
        receivedBy: latestReceived?.userName,
        receiveUserCode: latestReceived?.userCode,
        deliveryPoint: latestDelivered?.pointName,
        deliveredAt: latestDelivered?.createdAt,
        deliveredBy: latestDelivered?.userName,
        deliveryUserCode: latestDelivered?.userCode,
        components: boundComponents,
        componentCount: boundComponents.length,
        daysInStock,
        totalTransactionsCount: txs.length,
        hasReversals: reversedIds.size > 0,
        lastActivityAt: group.lastActivity,
        latestTransactionId: latestTx?._id ? String(latestTx._id) : undefined,
      };

      calculatedItems.push(item);
    }

    // Apply Filters (Status, Receive Point, Date Range)
    let filteredItems = calculatedItems;

    if (query.status && query.status !== 'ALL') {
      filteredItems = filteredItems.filter((i) => i.status === query.status);
    }

    if (query.pointName && query.pointName.trim()) {
      const pName = query.pointName.trim().toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          (i.currentReceivePoint && i.currentReceivePoint.toLowerCase().includes(pName)) ||
          (i.deliveryPoint && i.deliveryPoint.toLowerCase().includes(pName))
      );
    }

    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      filteredItems = filteredItems.filter((i) => {
        const dateToCheck = i.receivedAt || i.lastActivityAt;
        return dateToCheck ? new Date(dateToCheck).getTime() >= start : true;
      });
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      const endMs = end.getTime();
      filteredItems = filteredItems.filter((i) => {
        const dateToCheck = i.receivedAt || i.lastActivityAt;
        return dateToCheck ? new Date(dateToCheck).getTime() <= endMs : true;
      });
    }

    // Pagination
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    return {
      kpiSummary: {
        totalProductsTracked: calculatedItems.length,
        totalInStock: totalInStockCount,
        totalDelivered: totalDeliveredCount,
        totalTrackedOnly: totalTrackedCount,
        totalUnitsWithReversals: totalReversalsCount,
        distinctReceiveBaysInUse: activeReceiveBays.size,
      },
      data: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * 2. Date Range Summary Report:
   * Aggregates activity counts, net received/delivered (excluding reversed entries),
   * daily timeseries data for charts, and station throughput.
   */
  static async getDateRangeSummaryReport(query: {
    startDate?: string;
    endDate?: string;
  }) {
    // Default to last 30 days if no date range is provided
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const start = query.startDate ? new Date(query.startDate) : thirtyDaysAgo;
    let end: Date;
    if (query.endDate) {
      end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = now;
    }

    const matchQuery = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    // 1. Aggregation by eventType
    const eventCounts = await InventoryTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap: Record<string, number> = {};
    for (const item of eventCounts) {
      countMap[item._id] = item.count;
    }

    const rawReceived = countMap['RECEIVED'] || 0;
    const rawDelivered = countMap['DELIVERED'] || 0;
    const rawComponentsTracked = countMap['COMPONENT_TRACKED'] || 0;

    const reversedReceive = countMap['REVERSED_RECEIVE'] || 0;
    const reversedDelivery = countMap['REVERSED_DELIVERY'] || 0;
    const reversedComponent = countMap['REVERSED_COMPONENT'] || 0;
    const totalReversals = reversedReceive + reversedDelivery + reversedComponent;

    // Net active operations in this date window
    const netActiveReceived = Math.max(0, rawReceived - reversedReceive);
    const netActiveDelivered = Math.max(0, rawDelivered - reversedDelivery);
    const totalTransactions = await InventoryTransaction.countDocuments(matchQuery);

    // 2. Daily activity aggregation for graphical chart visualization
    const dailyRaw = await InventoryTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const dailyMap = new Map<
      string,
      { received: number; delivered: number; componentsTracked: number; reversals: number }
    >();

    for (const row of dailyRaw) {
      const d = row._id.date;
      const type = row._id.eventType;
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { received: 0, delivered: 0, componentsTracked: 0, reversals: 0 });
      }
      const entry = dailyMap.get(d)!;
      if (type === 'RECEIVED') entry.received += row.count;
      else if (type === 'DELIVERED') entry.delivered += row.count;
      else if (type === 'COMPONENT_TRACKED') entry.componentsTracked += row.count;
      else if (type.startsWith('REVERSED_')) entry.reversals += row.count;
    }

    const dailyActivity = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({
        date,
        received: vals.received,
        delivered: vals.delivered,
        componentsTracked: vals.componentsTracked,
        reversals: vals.reversals,
        netReceived: Math.max(0, vals.received - vals.reversals),
      }));

    // 3. Receive Points summary
    const receivePointsRaw = await InventoryTransaction.aggregate([
      {
        $match: {
          ...matchQuery,
          eventType: { $in: ['RECEIVED', 'REVERSED_RECEIVE'] },
        },
      },
      {
        $group: {
          _id: '$pointName',
          received: {
            $sum: { $cond: [{ $eq: ['$eventType', 'RECEIVED'] }, 1, 0] },
          },
          reversed: {
            $sum: { $cond: [{ $eq: ['$eventType', 'REVERSED_RECEIVE'] }, 1, 0] },
          },
        },
      },
      { $sort: { received: -1 } },
      { $limit: 15 },
    ]);

    const receivePointsSummary = receivePointsRaw.map((r) => ({
      pointName: r._id || 'Unknown Intake Bay',
      receivedCount: r.received,
      reversedCount: r.reversed,
      netReceived: Math.max(0, r.received - r.reversed),
    }));

    // 4. Delivery Points summary
    const deliveryPointsRaw = await InventoryTransaction.aggregate([
      {
        $match: {
          ...matchQuery,
          eventType: { $in: ['DELIVERED', 'REVERSED_DELIVERY'] },
        },
      },
      {
        $group: {
          _id: '$pointName',
          delivered: {
            $sum: { $cond: [{ $eq: ['$eventType', 'DELIVERED'] }, 1, 0] },
          },
          reversed: {
            $sum: { $cond: [{ $eq: ['$eventType', 'REVERSED_DELIVERY'] }, 1, 0] },
          },
        },
      },
      { $sort: { delivered: -1 } },
      { $limit: 15 },
    ]);

    const deliveryPointsSummary = deliveryPointsRaw.map((d) => ({
      pointName: d._id || 'Unknown Dispatch Dock',
      deliveredCount: d.delivered,
      reversedCount: d.reversed,
      netDelivered: Math.max(0, d.delivered - d.reversed),
    }));

    // 5. Operator activity breakdown
    const operatorsRaw = await InventoryTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { userCode: '$userCode', userName: '$userName' },
          totalActions: { $sum: 1 },
          receivedCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'RECEIVED'] }, 1, 0] },
          },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'DELIVERED'] }, 1, 0] },
          },
          trackedCount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'COMPONENT_TRACKED'] }, 1, 0] },
          },
          reversedCount: {
            $sum: { $cond: [{ $regexMatch: { input: '$eventType', regex: '^REVERSED_' } }, 1, 0] },
          },
        },
      },
      { $sort: { totalActions: -1 } },
      { $limit: 10 },
    ]);

    const operatorActivity = operatorsRaw.map((op) => ({
      userCode: op._id.userCode || 'N/A',
      userName: op._id.userName || 'Anonymous',
      totalActions: op.totalActions,
      receivedCount: op.receivedCount,
      deliveredCount: op.deliveredCount,
      trackedCount: op.trackedCount,
      reversedCount: op.reversedCount,
    }));

    const result: DateRangeSummaryDto = {
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      metrics: {
        totalTransactions,
        totalReceived: rawReceived,
        totalDelivered: rawDelivered,
        totalComponentsTracked: rawComponentsTracked,
        reversals: {
          reversedReceive,
          reversedDelivery,
          reversedComponent,
          total: totalReversals,
        },
        netActiveReceived,
        netActiveDelivered,
      },
      dailyActivity,
      receivePointsSummary,
      deliveryPointsSummary,
      operatorActivity,
    };

    return result;
  }

  /**
   * 3. Barcode-Wise History Report:
   * Retrieves the full chronological product lifecycle journey from Component Tracking,
   * Receiving, Delivery, to Compensating Reversals, with responsible operators and locations.
   */
  static async getBarcodeHistoryReport(barcode: string): Promise<BarcodeHistoryReportDto> {
    const rawBarcode = (barcode || '').trim().toUpperCase();
    if (rawBarcode.length < 3) {
      throw AppError.badRequest('Barcode must be at least 3 characters long');
    }

    // 1. Fetch all transactions matching this productBarcode (or componentBarcode)
    const transactions = await InventoryTransaction.find({
      $or: [{ productBarcode: rawBarcode }, { componentBarcode: rawBarcode }],
    })
      .sort({ createdAt: 1 }) // STRICT CHRONOLOGICAL ORDER
      .lean();

    if (!transactions || transactions.length === 0) {
      throw AppError.notFound(
        `No inventory transaction history found for barcode '${rawBarcode}'.`,
        'BARCODE_HISTORY_NOT_FOUND'
      );
    }

    // 2. Fetch reversal mapping for all transactions in this lifecycle
    const txIds = transactions.map((t) => t._id);
    const reversalTxs = await InventoryTransaction.find({
      reversedTransactionId: { $in: txIds },
    }).lean();

    const reversalMap = new Map<string, any>();
    for (const rev of reversalTxs) {
      if (rev.reversedTransactionId) {
        reversalMap.set(String(rev.reversedTransactionId), rev);
      }
    }

    // 3. Resolve master product record if available
    const masterProduct = await Product.findOne({
      $or: [{ barcode: rawBarcode }, { productCode: rawBarcode }],
      isDeleted: false,
    }).lean();

    // 4. Fetch currently active components bound to this chassis
    const activeBindings = await ComponentBinding.find({
      productBarcode: rawBarcode,
    }).lean();

    // 5. Annotate events chronologically
    let stepNumber = 1;
    let reversalEventsCount = 0;
    let firstTrackedAt: Date | undefined;
    let receivedAt: Date | undefined;
    let deliveredAt: Date | undefined;
    let receivePointName: string | undefined;
    let deliveryPointName: string | undefined;
    let hasActiveReceive = false;
    let hasActiveDelivery = false;
    let hasReceiveReversal = false;
    let hasDeliveryReversal = false;
    let hasComponentReversal = false;

    const eventsTimeline = transactions.map((tx) => {
      const isReversalEvent = tx.eventType.startsWith('REVERSED_');
      const rev = reversalMap.get(String(tx._id));

      if (isReversalEvent) {
        reversalEventsCount++;
        if (tx.eventType === 'REVERSED_RECEIVE') hasReceiveReversal = true;
        if (tx.eventType === 'REVERSED_DELIVERY') hasDeliveryReversal = true;
        if (tx.eventType === 'REVERSED_COMPONENT') hasComponentReversal = true;
      }

      if (tx.eventType === 'COMPONENT_TRACKED' && !firstTrackedAt) {
        firstTrackedAt = tx.createdAt;
      }

      if (tx.eventType === 'RECEIVED') {
        receivedAt = tx.createdAt;
        receivePointName = tx.pointName;
        if (!rev) hasActiveReceive = true;
      }

      if (tx.eventType === 'DELIVERED') {
        deliveredAt = tx.createdAt;
        deliveryPointName = tx.pointName;
        if (!rev) hasActiveDelivery = true;
      }

      return {
        _id: String(tx._id),
        stepNumber: stepNumber++,
        eventType: tx.eventType,
        pointName: tx.pointName,
        componentBarcode: tx.componentBarcode,
        componentName: tx.componentName,
        userCode: tx.userCode,
        userName: tx.userName,
        reason: tx.reason,
        createdAt: tx.createdAt,
        isReversed: !!rev,
        isReversalEvent,
        reversalDetails: rev
          ? {
              reversalTransactionId: String(rev._id),
              reversalEventType: rev.eventType,
              reason: rev.reason,
              reversedBy: rev.userName,
              reversedByUserCode: rev.userCode,
              reversedAt: rev.createdAt,
            }
          : undefined,
        metadata: tx.metadata,
      };
    });

    // 6. Current lifecycle state derivation
    let currentStatus: 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
    if (hasActiveDelivery) {
      currentStatus = 'DELIVERED';
    } else if (hasActiveReceive) {
      currentStatus = 'IN_STOCK';
    } else if (activeBindings.length > 0) {
      currentStatus = 'TRACKED';
    } else {
      currentStatus = 'NEW_UNTRACKED';
    }

    const firstTx = transactions[0];
    const lastTx = transactions[transactions.length - 1];

    return {
      productBarcode: rawBarcode,
      productModel: firstTx.productModel || masterProduct?.name || 'Standard Unit',
      masterProduct: masterProduct
        ? {
            productCode: masterProduct.productCode,
            name: masterProduct.name,
            category: masterProduct.category,
            description: masterProduct.description,
          }
        : undefined,
      currentStatus,
      stockLocation: hasActiveReceive ? receivePointName : undefined,
      dispatchLocation: hasActiveDelivery ? deliveryPointName : undefined,
      activeComponents: activeBindings.map((b) => ({
        componentBarcode: b.componentBarcode,
        componentName: b.componentName,
        attachedAt: b.attachedAt,
      })),
      lifecycleStages: {
        componentTracking: {
          isComplete: activeBindings.length > 0 || firstTrackedAt !== undefined,
          completedAt: firstTrackedAt,
          isReversed: hasComponentReversal,
          activeComponentsCount: activeBindings.length,
        },
        receiving: {
          isComplete: hasActiveReceive,
          receivedAt,
          receivePoint: receivePointName,
          isReversed: hasReceiveReversal,
        },
        delivery: {
          isComplete: hasActiveDelivery,
          deliveredAt,
          deliveryPoint: deliveryPointName,
          isReversed: hasDeliveryReversal,
        },
      },
      eventsTimeline,
      summary: {
        totalEvents: transactions.length,
        reversalEventsCount,
        firstTrackedAt,
        receivedAt,
        deliveredAt,
        lastActivityAt: lastTx.createdAt,
      },
    };
  }

  /**
   * 4. CSV Serializer:
   * Produces RFC-4180 compliant CSV exports for stock details, date range summary, or barcode history.
   */
  static serializeToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const formatCell = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const headerLine = headers.map(formatCell).join(',');
    const dataLines = rows.map((row) => row.map(formatCell).join(','));
    return [headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Export stock details to CSV format
   */
  static async exportStockDetailsCsv(query: {
    search?: string;
    status?: string;
    pointName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const report = await this.getStockDetailsReport({ ...query, page: 1, limit: 10000 });
    const headers = [
      'Product Barcode',
      'Model Name',
      'Current Status',
      'Receive Bay',
      'Received Date',
      'Received By',
      'Delivery Point',
      'Delivered Date',
      'Days In Stock',
      'Components Count',
      'Components List',
      'Has Reversals',
      'Last Activity',
    ];

    const rows = report.data.map((item) => [
      item.productBarcode,
      item.productModel,
      item.status,
      item.currentReceivePoint || 'N/A',
      item.receivedAt ? new Date(item.receivedAt).toISOString() : 'N/A',
      item.receivedBy ? `${item.receivedBy} (${item.receiveUserCode})` : 'N/A',
      item.deliveryPoint || 'N/A',
      item.deliveredAt ? new Date(item.deliveredAt).toISOString() : 'N/A',
      item.daysInStock !== undefined ? item.daysInStock : 'N/A',
      item.componentCount,
      item.components.map((c) => `${c.name}: ${c.barcode}`).join('; '),
      item.hasReversals ? 'YES' : 'NO',
      item.lastActivityAt ? new Date(item.lastActivityAt).toISOString() : 'N/A',
    ]);

    return this.serializeToCsv(headers, rows);
  }

  /**
   * Export barcode history lifecycle to CSV format
   */
  static async exportBarcodeHistoryCsv(barcode: string): Promise<string> {
    const history = await this.getBarcodeHistoryReport(barcode);
    const headers = [
      'Step',
      'Transaction ID',
      'Event Type',
      'Product Barcode',
      'Model',
      'Component',
      'Location / Bay',
      'Operator Code',
      'Operator Name',
      'Timestamp (ISO)',
      'Is Reversed',
      'Reversal Reason',
      'Reversed By',
    ];

    const rows = history.eventsTimeline.map((ev) => [
      ev.stepNumber,
      ev._id,
      ev.eventType,
      history.productBarcode,
      history.productModel,
      ev.componentBarcode ? `${ev.componentName}: ${ev.componentBarcode}` : 'N/A',
      ev.pointName,
      ev.userCode,
      ev.userName,
      new Date(ev.createdAt).toISOString(),
      ev.isReversed ? 'YES' : 'NO',
      ev.reversalDetails?.reason || ev.reason || 'N/A',
      ev.reversalDetails?.reversedBy || 'N/A',
    ]);

    return this.serializeToCsv(headers, rows);
  }

  /**
   * Export date range summary breakdown to CSV format
   */
  static async exportSummaryCsv(query: { startDate?: string; endDate?: string }): Promise<string> {
    const summary = await this.getDateRangeSummaryReport(query);
    const headers = [
      'Date',
      'Received Count',
      'Delivered Count',
      'Components Tracked',
      'Reversals Count',
      'Net Active Intake',
    ];

    const rows = summary.dailyActivity.map((day) => [
      day.date,
      day.received,
      day.delivered,
      day.componentsTracked,
      day.reversals,
      day.netReceived,
    ]);

    return this.serializeToCsv(headers, rows);
  }
}
