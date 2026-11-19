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
