import { Order, OrderItem, OrderStatus } from '../types/store';

export type AdminOrderFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'awaiting_verification';

export type AdminOrderSort = 'newest' | 'oldest';

export type AdminOrderStatusGroup =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled';

export interface AdminOrderSummary {
  totalOrders: number;
  newOrdersCount: number;
  confirmedOrdersCount: number;
  inProcessingOnlyCount: number;
  processingOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  awaitingVerificationCount: number;
  totalOrderValue: number;
  completedOrderValue: number;
}

export interface NormalizedOrderLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  previewImage?: string;
}

export const PHASE3_ORDER_STATUS_OPTIONS: {
  value: OrderStatus;
  label: string;
  description: string;
}[] = [
  { value: 'pending', label: 'Pending', description: 'New order waiting for confirmation' },
  { value: 'confirmed', label: 'Confirmed', description: 'Order verified and confirmed by admin' },
  { value: 'processing', label: 'Processing', description: 'Preparing digital sticker delivery' },
  { value: 'completed', label: 'Completed', description: 'Order fulfilled and delivered' },
  { value: 'cancelled', label: 'Cancelled', description: 'Order cancelled or voided' },
];

export function normalizeOrderStatusGroup(status: OrderStatus): AdminOrderStatusGroup {
  switch (status) {
    case 'pending':
    case 'pending_contact':
      return 'pending';
    case 'confirmed':
      return 'confirmed';
    case 'processing':
      return 'processing';
    case 'completed':
    case 'paid':
      return 'completed';
    case 'cancelled':
    case 'failed':
    case 'refunded':
      return 'cancelled';
  }
}

export function computeAdminOrderSummary(orders: Order[]): AdminOrderSummary {
  let newOrdersCount = 0;
  let confirmedOrdersCount = 0;
  let inProcessingOnlyCount = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let awaitingVerificationCount = 0;
  let totalOrderValue = 0;
  let completedOrderValue = 0;

  for (const order of orders) {
    const group = normalizeOrderStatusGroup(order.orderStatus);
    if (group === 'pending') newOrdersCount += 1;
    if (group === 'confirmed') confirmedOrdersCount += 1;
    if (group === 'processing') inProcessingOnlyCount += 1;
    if (group === 'completed') completedOrdersCount += 1;
    if (group === 'cancelled') cancelledOrdersCount += 1;

    if (order.paymentStatus === 'awaiting_verification') {
      awaitingVerificationCount += 1;
    }

    const orderTotal = Number.isFinite(order.total) ? Math.max(0, order.total) : 0;
    if (group !== 'cancelled') {
      totalOrderValue += orderTotal;
    }
    if (group === 'completed' || order.paymentStatus === 'paid') {
      completedOrderValue += orderTotal;
    }
  }

  return {
    totalOrders: orders.length,
    newOrdersCount,
    confirmedOrdersCount,
    inProcessingOnlyCount,
    processingOrdersCount: confirmedOrdersCount + inProcessingOnlyCount,
    completedOrdersCount,
    cancelledOrdersCount,
    awaitingVerificationCount,
    totalOrderValue: Number(totalOrderValue.toFixed(2)),
    completedOrderValue: Number(completedOrderValue.toFixed(2)),
  };
}

export function getOrderLineItemsSummary(
  order: Order,
  orderItems: OrderItem[]
): NormalizedOrderLineItem[] {
  const matching = orderItems.filter((item) => item.orderId === order.id);
  if (matching.length > 0) {
    return matching.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.priceSnapshot) || 0);
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: qty,
        unitPrice,
        lineTotal: Number((unitPrice * qty).toFixed(2)),
        previewImage: item.previewImage,
      };
    });
  }

  const names = order.productNames ?? [];
  const ids = order.productIds ?? [];
  const quantities = order.quantities ?? [];
  const unitPrices = order.unitPrices ?? [];

  if (names.length > 0) {
    return names.map((productName, idx) => {
      const qty = Math.max(1, Number(quantities[idx]) || 1);
      const unitPrice = Math.max(0, Number(unitPrices[idx]) || 0);
      return {
        id: `${order.id}-snapshot-${idx}`,
        productId: ids[idx] ?? `prod-${idx}`,
        productName,
        quantity: qty,
        unitPrice,
        lineTotal: Number((unitPrice * qty).toFixed(2)),
      };
    });
  }

  return [];
}

function getOrderTimestampMs(order: Order): number {
  if (!order.createdAt) return 0;
  const parsed = Date.parse(order.createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function filterAndSortAdminOrders(
  orders: Order[],
  orderItems: OrderItem[],
  options: {
    search: string;
    statusFilter: AdminOrderFilter;
    sortDirection?: AdminOrderSort;
  }
): Order[] {
  const cleanSearch = options.search.trim().toLowerCase();
  const sortDir = options.sortDirection ?? 'newest';

  const filtered = orders.filter((order) => {
    if (options.statusFilter !== 'all') {
      if (options.statusFilter === 'awaiting_verification') {
        if (order.paymentStatus !== 'awaiting_verification') return false;
      } else {
        const group = normalizeOrderStatusGroup(order.orderStatus);
        if (group !== options.statusFilter) return false;
      }
    }

    if (!cleanSearch) return true;

    const lineItems = getOrderLineItemsSummary(order, orderItems);
    const searchableFields = [
      order.orderNumber,
      order.id,
      order.customerName,
      order.customerWhatsapp ?? '',
      order.customerEmail,
      order.customerNote ?? '',
      order.paymentReference,
      order.paymentMethodName,
      ...lineItems.map((i) => i.productName),
    ];

    return searchableFields.some((value) => value.toLowerCase().includes(cleanSearch));
  });

  return [...filtered].sort((a, b) => {
    const diff = getOrderTimestampMs(b) - getOrderTimestampMs(a);
    if (diff !== 0) {
      return sortDir === 'newest' ? diff : -diff;
    }
    const strCmp = (b.orderNumber || b.id).localeCompare(a.orderNumber || a.id);
    return sortDir === 'newest' ? strCmp : -strCmp;
  });
}
