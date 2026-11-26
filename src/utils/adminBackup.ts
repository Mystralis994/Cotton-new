import {
  Category,
  DownloadAccess,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
} from '../types/store';

export interface AdminBackupPayload {
  schemaVersion: '1.0';
  storeName: 'Cotton Candy Sticker';
  exportedAt: string;
  exportedBy: string;
  catalogSource: 'firestore' | 'sample';
  counts: {
    categories: number;
    products: number;
    orders: number;
    orderItems: number;
    downloadAccess: number;
    paymentMethods: number;
  };
  data: {
    categories: Category[];
    products: Product[];
    orders: Order[];
    orderItems: OrderItem[];
    downloadAccess: DownloadAccess[];
    paymentMethods: PaymentMethod[];
  };
}

export function buildAdminBackupPayload(params: {
  adminEmail: string;
  catalogSource: 'firestore' | 'sample';
  categories: Category[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  downloadAccess: DownloadAccess[];
  paymentMethods: PaymentMethod[];
}): AdminBackupPayload {
  return {
    schemaVersion: '1.0',
    storeName: 'Cotton Candy Sticker',
    exportedAt: new Date().toISOString(),
    exportedBy: params.adminEmail,
    catalogSource: params.catalogSource,
    counts: {
      categories: params.categories.length,
      products: params.products.length,
      orders: params.orders.length,
      orderItems: params.orderItems.length,
      downloadAccess: params.downloadAccess.length,
      paymentMethods: params.paymentMethods.length,
    },
    data: {
      categories: params.categories,
      products: params.products,
      orders: params.orders,
      orderItems: params.orderItems,
      downloadAccess: params.downloadAccess,
      paymentMethods: params.paymentMethods,
    },
  };
}

export function triggerJsonBackupDownload(payload: AdminBackupPayload): string {
  const datePart = payload.exportedAt.slice(0, 10);
  const filename = `cotton-candy-sticker-backup-${datePart}.json`;
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}
