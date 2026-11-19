export type InventoryEventType =
  | 'COMPONENT_TRACKED'
  | 'RECEIVED'
  | 'DELIVERED'
  | 'REVERSED_RECEIVE'
  | 'REVERSED_DELIVERY'
  | 'REVERSED_COMPONENT';

export type ProductLifecycleStatus =
  | 'NEW_UNTRACKED'
  | 'TRACKED'
  | 'IN_STOCK'
  | 'DELIVERED';

export interface IAttachedComponentItem {
  _id?: string;
  componentBarcode: string;
  componentName: string;
  attachedAt: string;
  attachedBy?: string;
  transactionId?: string;
}

export interface IInventoryTransactionItem {
  _id: string;
  productBarcode: string;
  productId?: string;
  productModel?: string;
  eventType: InventoryEventType;
  componentBarcode?: string;
  componentId?: string;
  componentName?: string;
  pointId?: string;
  pointName?: string;
  performedBy?: string;
  userCode?: string;
  userName?: string;
  reason?: string;
  reversedTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  isReversed?: boolean;
  isReversalEvent?: boolean;
  isReversible?: boolean;
  reversalInfo?: {
    reversalTransactionId: string;
    reversalEventType: string;
    reason: string;
    reversedBy: string;
    reversedByUserCode: string;
    reversedAt: string;
  };
}

export interface IProductLifecycleState {
  productBarcode: string;
  status: ProductLifecycleStatus;
  productModel?: string;
  productId?: string;
  canAttachComponents: boolean;
  blockReason?: string;
  hasActiveComponents: boolean;
  isCurrentlyReceived: boolean;
  isCurrentlyDelivered: boolean;
  currentReceivePoint?: {
    pointId?: string;
    pointName?: string;
    pointCode?: string;
    location?: string;
    receivedAt?: string;
    receivedBy?: string;
    userCode?: string;
  };
  deliveryInfo?: {
    pointId?: string;
    pointName?: string;
    pointCode?: string;
    location?: string;
    deliveredAt?: string;
    deliveredBy?: string;
    userCode?: string;
  };
  attachedComponents: IAttachedComponentItem[];
  historyCount: number;
}

export interface IReversalPayload {
  transactionId?: string;
  productBarcode?: string;
  componentBarcode?: string;
  eventType?: 'RECEIVED' | 'DELIVERED' | 'COMPONENT_TRACKED';
  reason: string;
}

export interface IReversalResponse {
  message: string;
  status: ProductLifecycleStatus;
  productBarcode: string;
  productModel?: string;
  reversalTransaction: IInventoryTransactionItem;
  targetTransaction?: IInventoryTransactionItem;
  liberatedComponentBarcode?: string;
  restoredToReceivePoint?: string;
  currentStockState?: IProductLifecycleState;
}

export interface IStockItemReportItem {
  productBarcode: string;
  productModel: string;
  status: 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
  currentReceivePoint?: string;
  receivePointCode?: string;
  receivedAt?: string;
  receivedBy?: string;
  receiveUserCode?: string;
  deliveryPoint?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  deliveryUserCode?: string;
  components: Array<{
    barcode: string;
    name: string;
    attachedAt: string;
  }>;
  componentCount: number;
  daysInStock?: number;
  totalTransactionsCount: number;
  hasReversals: boolean;
  lastActivityAt: string;
  latestTransactionId?: string;
}

export interface IStockDetailsKpiSummary {
  totalProductsTracked: number;
  totalInStock: number;
  totalDelivered: number;
  totalTrackedOnly: number;
  totalUnitsWithReversals: number;
  distinctReceiveBaysInUse: number;
}

export interface IDateRangeSummaryMetrics {
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
}

export interface IDailyActivityTimeseries {
  date: string;
  received: number;
  delivered: number;
  componentsTracked: number;
  reversals: number;
  netReceived: number;
}

export interface IPointSummaryItem {
  pointName: string;
  receivedCount?: number;
  deliveredCount?: number;
  reversedCount: number;
  netReceived?: number;
  netDelivered?: number;
}

export interface IOperatorActivityItem {
  userCode: string;
  userName: string;
  totalActions: number;
  receivedCount: number;
  deliveredCount: number;
  trackedCount: number;
  reversedCount: number;
}

export interface IDateRangeSummaryData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: IDateRangeSummaryMetrics;
  dailyActivity: IDailyActivityTimeseries[];
  receivePointsSummary: IPointSummaryItem[];
  deliveryPointsSummary: IPointSummaryItem[];
  operatorActivity: IOperatorActivityItem[];
}

export interface IBarcodeHistoryReportData {
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
    attachedAt: string;
  }>;
  lifecycleStages: {
    componentTracking: {
      isComplete: boolean;
      completedAt?: string;
      isReversed: boolean;
      activeComponentsCount: number;
    };
    receiving: {
      isComplete: boolean;
      receivedAt?: string;
      receivePoint?: string;
      isReversed: boolean;
    };
    delivery: {
      isComplete: boolean;
      deliveredAt?: string;
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
    createdAt: string;
    isReversed: boolean;
    isReversalEvent: boolean;
    reversalDetails?: {
      reversalTransactionId: string;
      reversalEventType: string;
      reason: string;
      reversedBy: string;
      reversedByUserCode: string;
      reversedAt: string;
    };
    metadata?: Record<string, unknown>;
  }>;
  summary: {
    totalEvents: number;
    reversalEventsCount: number;
    firstTrackedAt?: string;
    receivedAt?: string;
    deliveredAt?: string;
    lastActivityAt?: string;
  };
}
