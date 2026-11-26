import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAuditEvent, normalizeLegacyPreviewUrl } from '../services/firestoreStore';
import {
  Category,
  DownloadAccess,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
} from '../types/store';
import { AdminBackupPayload, buildAdminBackupPayload, triggerJsonBackupDownload } from './adminBackup';
import { isSafeHttpsUrl, isSafeImageUrl } from './formatters';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_SLUG_REGEX = /^[a-z0-9-]{1,140}$/;

const VALID_PRODUCT_TYPES = new Set(['individual_pack', 'bundle', 'printable_pack']);
const VALID_ORDER_STATUSES = new Set<OrderStatus>([
  'pending_contact',
  'pending',
  'confirmed',
  'processing',
  'completed',
  'cancelled',
  'paid',
  'failed',
  'refunded',
]);
const VALID_PAYMENT_STATUSES = new Set<PaymentStatus>([
  'unpaid',
  'awaiting_verification',
  'paid',
  'rejected',
  'pending',
  'failed',
  'refunded',
]);
const VALID_PAYMENT_METHOD_TYPES = new Set(['bank_transfer', 'qris', 'paypal', 'other']);

export type RestoreSectionKey = 'categories' | 'products' | 'paymentMethods' | 'orders';

export interface RestoreValidationSummary {
  valid: boolean;
  errors: string[];
  warnings: string[];
  exportedAt: string;
  exportedBy: string;
  counts: {
    categories: number;
    products: number;
    orders: number;
    orderItems: number;
    downloadAccess: number;
    paymentMethods: number;
  };
  payload: AdminBackupPayload | null;
}

export interface RestoreExecutionResult {
  safetyBackupFilename: string;
  writtenCounts: {
    categories: number;
    products: number;
    paymentMethods: number;
    orders: number;
    orderItems: number;
    downloadAccess: number;
  };
  skippedCount: number;
  restoredAt: string;
}

export const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024; // 5MB cap

function isValidIdString(val: unknown): val is string {
  return typeof val === 'string' && SAFE_ID_REGEX.test(val);
}

export function validateBackupPayload(raw: unknown): RestoreValidationSummary {
  const emptyCounts = {
    categories: 0,
    products: 0,
    orders: 0,
    orderItems: 0,
    downloadAccess: 0,
    paymentMethods: 0,
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Backup file must be a JSON object.'],
      warnings: [],
      exportedAt: '',
      exportedBy: '',
      counts: emptyCounts,
      payload: null,
    };
  }

  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (obj.schemaVersion !== '1.0') {
    errors.push(`Unsupported schemaVersion "${String(obj.schemaVersion ?? '')}" (expected "1.0").`);
  }
  if (obj.storeName !== 'Cotton Candy Sticker') {
    errors.push(`Invalid storeName "${String(obj.storeName ?? '')}" (expected "Cotton Candy Sticker").`);
  }

  const data = obj.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('Missing or invalid "data" object inside backup JSON.');
    return {
      valid: false,
      errors,
      warnings,
      exportedAt: String(obj.exportedAt ?? ''),
      exportedBy: String(obj.exportedBy ?? ''),
      counts: emptyCounts,
      payload: null,
    };
  }

  const d = data as Record<string, unknown>;
  const rawCategories = Array.isArray(d.categories) ? d.categories : [];
  const rawProducts = Array.isArray(d.products) ? d.products : [];
  const rawOrders = Array.isArray(d.orders) ? d.orders : [];
  const rawOrderItems = Array.isArray(d.orderItems) ? d.orderItems : [];
  const rawDownloadAccess = Array.isArray(d.downloadAccess) ? d.downloadAccess : [];
  const rawPaymentMethods = Array.isArray(d.paymentMethods) ? d.paymentMethods : [];

  const categories: Category[] = [];
  for (let i = 0; i < rawCategories.length; i++) {
    const c = rawCategories[i] as Record<string, unknown>;
    if (!c || typeof c !== 'object' || !isValidIdString(c.id)) {
      errors.push(`Category #${i + 1} has missing or unsafe ID.`);
      continue;
    }
    const slug = typeof c.slug === 'string' && SAFE_SLUG_REGEX.test(c.slug) ? c.slug : '';
    if (!slug || typeof c.name !== 'string' || !c.name.trim()) {
      errors.push(`Category "${c.id}" has invalid name or slug.`);
      continue;
    }
    categories.push({
      id: c.id,
      name: c.name.trim().slice(0, 60),
      slug,
      description: String(c.description ?? '').slice(0, 280),
      sortOrder: Math.max(0, Math.min(10000, Number(c.sortOrder) || 0)),
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : undefined,
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : undefined,
    });
  }

  const products: Product[] = [];
  for (let i = 0; i < rawProducts.length; i++) {
    const p = rawProducts[i] as Record<string, unknown>;
    if (!p || typeof p !== 'object' || !isValidIdString(p.id) || !isValidIdString(p.categoryId)) {
      errors.push(`Product #${i + 1} has invalid id or categoryId.`);
      continue;
    }
    const slug = typeof p.slug === 'string' && SAFE_SLUG_REGEX.test(p.slug) ? p.slug : '';
    const price = Number(p.price);
    const salePrice = p.salePrice === null || p.salePrice === undefined ? null : Number(p.salePrice);
    if (
      !slug ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 9999
    ) {
      errors.push(`Product "${p.id}" has invalid name, slug, or price.`);
      continue;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) {
      errors.push(`Product "${p.id}" has invalid salePrice.`);
      continue;
    }
    const images = Array.isArray(p.previewImages)
      ? p.previewImages
          .filter((img): img is string => typeof img === 'string')
          .map((img) => normalizeLegacyPreviewUrl(img))
          .filter((img) => isSafeImageUrl(img))
          .slice(0, 6)
      : [];
    if (images.length === 0) {
      errors.push(`Product "${p.id}" has no valid previewImages.`);
      continue;
    }
    const productType = String(p.productType ?? 'individual_pack');
    if (!VALID_PRODUCT_TYPES.has(productType)) {
      errors.push(`Product "${p.id}" has invalid productType "${productType}".`);
      continue;
    }

    products.push({
      id: p.id,
      name: p.name.trim().slice(0, 120),
      slug,
      description: String(p.description ?? 'Digital sticker pack').slice(0, 2500),
      price: Number(price.toFixed(2)),
      salePrice: salePrice !== null ? Number(salePrice.toFixed(2)) : null,
      categoryId: p.categoryId,
      categoryName: String(p.categoryName ?? 'Stickers').slice(0, 60) || 'Stickers',
      previewImages: images,
      featured: Boolean(p.featured),
      bestSeller: Boolean(p.bestSeller),
      newArrival: Boolean(p.newArrival),
      published: Boolean(p.published),
      productType: productType as Product['productType'],
      fileFormat: String(p.fileFormat ?? 'PNG (300 DPI)').slice(0, 120) || 'PNG (300 DPI)',
      contentsSummary:
        String(p.contentsSummary ?? 'Sticker archive').slice(0, 500) || 'Sticker archive',
      downloadableAssetKey:
        String(p.downloadableAssetKey ?? `vault/packs/${p.id}.zip`).slice(0, 180) ||
        `vault/packs/${p.id}.zip`,
      popularityScore: Math.max(0, Math.min(1000000, Number(p.popularityScore) || 0)),
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : undefined,
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : undefined,
    });
  }

  const paymentMethods: PaymentMethod[] = [];
  for (let i = 0; i < rawPaymentMethods.length; i++) {
    const m = rawPaymentMethods[i] as Record<string, unknown>;
    if (!m || typeof m !== 'object' || !isValidIdString(m.id)) {
      errors.push(`Payment method #${i + 1} has invalid ID.`);
      continue;
    }
    const type = String(m.type ?? 'other');
    if (!VALID_PAYMENT_METHOD_TYPES.has(type)) {
      errors.push(`Payment method "${m.id}" has invalid type "${type}".`);
      continue;
    }
    const paypalLink = typeof m.paypalLink === 'string' ? m.paypalLink.trim() : '';
    if (paypalLink && !isSafeHttpsUrl(paypalLink)) {
      errors.push(`Payment method "${m.id}" has unsafe paypalLink.`);
      continue;
    }
    const qrisImageUrl = typeof m.qrisImageUrl === 'string' ? m.qrisImageUrl.trim() : '';
    if (qrisImageUrl && !isSafeImageUrl(qrisImageUrl)) {
      errors.push(`Payment method "${m.id}" has unsafe qrisImageUrl.`);
      continue;
    }
    paymentMethods.push({
      id: m.id,
      name: String(m.name ?? '').trim().slice(0, 100) || 'Manual Payment',
      type: type as PaymentMethod['type'],
      enabled: Boolean(m.enabled),
      accountHolderName: String(m.accountHolderName ?? '').slice(0, 120),
      bankName: String(m.bankName ?? '').slice(0, 120),
      accountNumber: String(m.accountNumber ?? '').slice(0, 80),
      paypalLink: paypalLink.slice(0, 500),
      qrisImageUrl: qrisImageUrl.slice(0, 300000),
      description: String(m.description ?? '').slice(0, 500),
      instructions: String(m.instructions ?? '').slice(0, 2000),
      sortOrder: Math.max(0, Math.min(10000, Number(m.sortOrder) || 0)),
      createdAt: typeof m.createdAt === 'string' ? m.createdAt : undefined,
      updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : undefined,
    });
  }

  const orders: Order[] = [];
  for (let i = 0; i < rawOrders.length; i++) {
    const o = rawOrders[i] as Record<string, unknown>;
    if (!o || typeof o !== 'object' || !isValidIdString(o.id) || !isValidIdString(o.userId)) {
      errors.push(`Order #${i + 1} has invalid id or userId.`);
      continue;
    }
    const orderStatus = String(o.orderStatus ?? 'pending') as OrderStatus;
    const paymentStatus = String(o.paymentStatus ?? 'unpaid') as PaymentStatus;
    if (!VALID_ORDER_STATUSES.has(orderStatus) || !VALID_PAYMENT_STATUSES.has(paymentStatus)) {
      errors.push(`Order "${o.id}" has invalid orderStatus or paymentStatus.`);
      continue;
    }
    const total = Number(o.total);
    if (!Number.isFinite(total) || total < 0 || total > 100000) {
      errors.push(`Order "${o.id}" has invalid total.`);
      continue;
    }
    orders.push({
      ...(o as unknown as Order),
      id: o.id,
      userId: o.userId,
      orderNumber: String(o.orderNumber ?? o.id).slice(0, 32),
      customerName: String(o.customerName ?? 'Customer').slice(0, 120),
      customerEmail: String(o.customerEmail ?? 'guest@cottoncandysticker.local').slice(0, 254),
      customerCountry: String(o.customerCountry ?? 'Digital').slice(0, 80),
      subtotal: Number(total.toFixed(2)),
      total: Number(total.toFixed(2)),
      currency: 'USD',
      orderStatus,
      paymentStatus,
      paymentReference: String(o.paymentReference ?? '').slice(0, 160),
      downloadAuthorized: Boolean(o.downloadAuthorized),
      itemCount: Math.max(1, Math.min(100, Number(o.itemCount) || 1)),
    });
  }

  const orderItems: OrderItem[] = [];
  for (let i = 0; i < rawOrderItems.length; i++) {
    const item = rawOrderItems[i] as Record<string, unknown>;
    if (
      !item ||
      typeof item !== 'object' ||
      !isValidIdString(item.id) ||
      !isValidIdString(item.orderId) ||
      !isValidIdString(item.userId) ||
      !isValidIdString(item.productId)
    ) {
      warnings.push(`Skipped malformed orderItem #${i + 1}.`);
      continue;
    }
    const rawImg = normalizeLegacyPreviewUrl(String(item.previewImage ?? ''));
    orderItems.push({
      id: item.id,
      orderId: item.orderId,
      userId: item.userId,
      productId: item.productId,
      productName: String(item.productName ?? 'Sticker Pack').slice(0, 120),
      productType: VALID_PRODUCT_TYPES.has(String(item.productType))
        ? (item.productType as OrderItem['productType'])
        : 'individual_pack',
      fileFormat: String(item.fileFormat ?? 'PNG (300 DPI)').slice(0, 120),
      priceSnapshot: Math.max(0, Math.min(9999, Number(item.priceSnapshot) || 0)),
      quantity: Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1))),
      previewImage: isSafeImageUrl(rawImg) ? rawImg : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    });
  }

  const downloadAccess: DownloadAccess[] = [];
  for (let i = 0; i < rawDownloadAccess.length; i++) {
    const da = rawDownloadAccess[i] as Record<string, unknown>;
    if (
      !da ||
      typeof da !== 'object' ||
      !isValidIdString(da.id) ||
      !isValidIdString(da.orderId) ||
      !isValidIdString(da.userId) ||
      !isValidIdString(da.productId)
    ) {
      warnings.push(`Skipped malformed fulfillment record #${i + 1}.`);
      continue;
    }
    downloadAccess.push({
      id: da.id,
      orderId: da.orderId,
      userId: da.userId,
      productId: da.productId,
      productName: String(da.productName ?? 'Sticker Pack').slice(0, 120),
      assetKey: String(da.assetKey ?? `vault/packs/${da.productId}.zip`).slice(0, 180),
      fileFormat: String(da.fileFormat ?? 'PNG (300 DPI)').slice(0, 120),
      authorized: Boolean(da.authorized),
      downloadCount: Math.max(0, Math.min(100, Number(da.downloadCount) || 0)),
      maxDownloads: Math.max(1, Math.min(50, Number(da.maxDownloads) || 10)),
      grantedBy: String(da.grantedBy ?? 'admin').slice(0, 120),
      createdAt: typeof da.createdAt === 'string' ? da.createdAt : undefined,
      updatedAt: typeof da.updatedAt === 'string' ? da.updatedAt : undefined,
    });
  }

  if (
    categories.length +
      products.length +
      orders.length +
      paymentMethods.length ===
    0
  ) {
    errors.push('Backup JSON contains zero restorable categories, products, orders, or payment methods.');
  }

  if (orders.length > 0 && orderItems.length === 0) {
    warnings.push('Backup contains orders without line-item snapshots (will rely on inline order summaries).');
  }

  const counts = {
    categories: categories.length,
    products: products.length,
    orders: orders.length,
    orderItems: orderItems.length,
    downloadAccess: downloadAccess.length,
    paymentMethods: paymentMethods.length,
  };

  const valid = errors.length === 0;
  const payload: AdminBackupPayload | null = valid
    ? {
        schemaVersion: '1.0',
        storeName: 'Cotton Candy Sticker',
        exportedAt: String(obj.exportedAt ?? new Date().toISOString()),
        exportedBy: String(obj.exportedBy ?? 'unknown'),
        catalogSource: obj.catalogSource === 'firestore' ? 'firestore' : 'sample',
        counts,
        data: {
          categories,
          products,
          orders,
          orderItems,
          downloadAccess,
          paymentMethods,
        },
      }
    : null;

  return {
    valid,
    errors,
    warnings,
    exportedAt: String(obj.exportedAt ?? ''),
    exportedBy: String(obj.exportedBy ?? ''),
    counts,
    payload,
  };
}

export async function executeAdminRestore(params: {
  backup: AdminBackupPayload;
  sections: Record<RestoreSectionKey, boolean>;
  adminEmail: string;
  currentSnapshot: {
    catalogSource: 'firestore' | 'sample';
    categories: Category[];
    products: Product[];
    orders: Order[];
    orderItems: OrderItem[];
    downloadAccess: DownloadAccess[];
    paymentMethods: PaymentMethod[];
  };
}): Promise<RestoreExecutionResult> {
  const { backup, sections, adminEmail, currentSnapshot } = params;

  // Step 1: Mandatory safety backup download of current state before writing
  const preRestorePayload = buildAdminBackupPayload({
    adminEmail,
    catalogSource: currentSnapshot.catalogSource,
    categories: currentSnapshot.categories,
    products: currentSnapshot.products,
    orders: currentSnapshot.orders,
    orderItems: currentSnapshot.orderItems,
    downloadAccess: currentSnapshot.downloadAccess,
    paymentMethods: currentSnapshot.paymentMethods,
  });
  const safetyBackupFilename = triggerJsonBackupDownload(preRestorePayload);

  const writtenCounts = {
    categories: 0,
    products: 0,
    paymentMethods: 0,
    orders: 0,
    orderItems: 0,
    downloadAccess: 0,
  };
  let skippedCount = 0;

  // Fetch live document IDs so existing docs update cleanly without mutating immutable createdAt
  const [catSnaps, prodSnaps, pmSnaps, ordSnaps, itemSnaps, daSnaps] = await Promise.all([
    sections.categories ? getDocs(collection(db, 'categories')) : Promise.resolve(null),
    sections.products ? getDocs(collection(db, 'products')) : Promise.resolve(null),
    sections.paymentMethods ? getDocs(collection(db, 'paymentMethods')) : Promise.resolve(null),
    sections.orders ? getDocs(collection(db, 'orders')) : Promise.resolve(null),
    sections.orders ? getDocs(collection(db, 'orderItems')) : Promise.resolve(null),
    sections.orders ? getDocs(collection(db, 'downloadAccess')) : Promise.resolve(null),
  ]);

  const existingCats = new Set(catSnaps?.docs.map((d) => d.id) ?? []);
  const existingProds = new Set(prodSnaps?.docs.map((d) => d.id) ?? []);
  const existingPms = new Set(pmSnaps?.docs.map((d) => d.id) ?? []);
  const existingOrders = new Set(ordSnaps?.docs.map((d) => d.id) ?? []);
  const existingOrderItems = new Set(itemSnaps?.docs.map((d) => d.id) ?? []);
  const existingDownloadAccess = new Set(daSnaps?.docs.map((d) => d.id) ?? []);

  // Collect all Firestore writes and commit in chunks <= 350
  const operations: { path: string; mode: 'set' | 'update'; data: Record<string, unknown> }[] = [];

  if (sections.categories) {
    for (const c of backup.data.categories) {
      const base = {
        name: c.name.slice(0, 60),
        slug: c.slug.slice(0, 80),
        description: c.description.slice(0, 280),
        sortOrder: c.sortOrder,
        updatedAt: serverTimestamp(),
      };
      if (existingCats.has(c.id)) {
        operations.push({ path: `categories/${c.id}`, mode: 'update', data: base });
      } else {
        operations.push({
          path: `categories/${c.id}`,
          mode: 'set',
          data: { id: c.id, ...base, createdAt: serverTimestamp() },
        });
      }
      writtenCounts.categories += 1;
    }
  } else {
    skippedCount += backup.data.categories.length;
  }

  if (sections.products) {
    for (const p of backup.data.products) {
      const base = {
        name: p.name.slice(0, 120),
        slug: p.slug.slice(0, 140),
        description: p.description.slice(0, 2500),
        price: p.price,
        salePrice: p.salePrice ?? null,
        categoryId: p.categoryId,
        categoryName: p.categoryName.slice(0, 60),
        previewImages: p.previewImages.map(normalizeLegacyPreviewUrl).slice(0, 6),
        featured: Boolean(p.featured),
        bestSeller: Boolean(p.bestSeller),
        newArrival: Boolean(p.newArrival),
        published: Boolean(p.published),
        productType: p.productType,
        fileFormat: p.fileFormat.slice(0, 120),
        contentsSummary: p.contentsSummary.slice(0, 500),
        downloadableAssetKey: p.downloadableAssetKey.slice(0, 180),
        popularityScore: p.popularityScore,
        updatedAt: serverTimestamp(),
      };
      if (existingProds.has(p.id)) {
        operations.push({ path: `products/${p.id}`, mode: 'update', data: base });
      } else {
        operations.push({
          path: `products/${p.id}`,
          mode: 'set',
          data: { id: p.id, ...base, createdAt: serverTimestamp() },
        });
      }
      writtenCounts.products += 1;
    }
  } else {
    skippedCount += backup.data.products.length;
  }

  if (sections.paymentMethods) {
    for (const m of backup.data.paymentMethods) {
      const base = {
        name: m.name.slice(0, 100),
        type: m.type,
        enabled: Boolean(m.enabled),
        accountHolderName: m.accountHolderName.slice(0, 120),
        bankName: m.bankName.slice(0, 120),
        accountNumber: m.accountNumber.slice(0, 80),
        paypalLink: m.paypalLink.slice(0, 500),
        qrisImageUrl: m.qrisImageUrl.slice(0, 300000),
        description: m.description.slice(0, 500),
        instructions: m.instructions.slice(0, 2000),
        sortOrder: m.sortOrder,
        updatedAt: serverTimestamp(),
      };
      if (existingPms.has(m.id)) {
        operations.push({ path: `paymentMethods/${m.id}`, mode: 'update', data: base });
      } else {
        operations.push({
          path: `paymentMethods/${m.id}`,
          mode: 'set',
          data: { id: m.id, ...base, createdAt: serverTimestamp() },
        });
      }
      writtenCounts.paymentMethods += 1;
    }
  } else {
    skippedCount += backup.data.paymentMethods.length;
  }

  if (sections.orders) {
    for (const o of backup.data.orders) {
      const baseUpdate: Record<string, unknown> = {
        customerName: o.customerName.slice(0, 120),
        customerEmail: o.customerEmail.slice(0, 254),
        customerCountry: o.customerCountry.slice(0, 80),
        subtotal: o.subtotal,
        total: o.total,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethodId: (o.paymentMethodId ?? '').slice(0, 64),
        paymentMethodName: (o.paymentMethodName ?? '').slice(0, 100),
        paymentMethodType: o.paymentMethodType ?? '',
        paymentMethodSnapshot: o.paymentMethodSnapshot ?? null,
        paymentReference: (o.paymentReference ?? '').slice(0, 160),
        customerPaymentNote: (o.customerPaymentNote ?? '').slice(0, 500),
        paymentProofUrl: isSafeHttpsUrl(o.paymentProofUrl) ? o.paymentProofUrl.slice(0, 500) : '',
        paymentSubmittedAt: (o.paymentSubmittedAt ?? '').slice(0, 64),
        rejectionReason: (o.rejectionReason ?? '').slice(0, 500),
        verifiedBy: (o.verifiedBy ?? '').slice(0, 120),
        verifiedAt: (o.verifiedAt ?? '').slice(0, 64),
        verificationHistory: Array.isArray(o.verificationHistory)
          ? o.verificationHistory.slice(-25)
          : [],
        downloadAuthorized: Boolean(o.downloadAuthorized),
        itemCount: o.itemCount,
        updatedAt: serverTimestamp(),
      };
      if (o.customerWhatsapp) baseUpdate.customerWhatsapp = o.customerWhatsapp.slice(0, 40);
      if (o.customerNote) baseUpdate.customerNote = o.customerNote.slice(0, 500);
      if (o.checkoutChannel) baseUpdate.checkoutChannel = o.checkoutChannel;
      if (o.productIds?.length) baseUpdate.productIds = o.productIds.slice(0, 30);
      if (o.productNames?.length) baseUpdate.productNames = o.productNames.slice(0, 30);
      if (o.quantities?.length) baseUpdate.quantities = o.quantities.slice(0, 30);
      if (o.unitPrices?.length) baseUpdate.unitPrices = o.unitPrices.slice(0, 30);

      if (existingOrders.has(o.id)) {
        operations.push({ path: `orders/${o.id}`, mode: 'update', data: baseUpdate });
      } else {
        operations.push({
          path: `orders/${o.id}`,
          mode: 'set',
          data: {
            id: o.id,
            orderNumber: o.orderNumber.slice(0, 32),
            userId: o.userId,
            currency: 'USD',
            ...baseUpdate,
            createdAt: serverTimestamp(),
          },
        });
      }
      writtenCounts.orders += 1;
    }

    for (const item of backup.data.orderItems) {
      if (existingOrderItems.has(item.id)) {
        // OrderItem documents are immutable once written
        skippedCount += 1;
        continue;
      }
      operations.push({
        path: `orderItems/${item.id}`,
        mode: 'set',
        data: {
          id: item.id,
          orderId: item.orderId,
          userId: item.userId,
          productId: item.productId,
          productName: item.productName.slice(0, 120),
          productType: item.productType,
          fileFormat: item.fileFormat.slice(0, 120),
          priceSnapshot: item.priceSnapshot,
          quantity: item.quantity,
          previewImage: normalizeLegacyPreviewUrl(item.previewImage).slice(0, 300000),
          createdAt: serverTimestamp(),
        },
      });
      writtenCounts.orderItems += 1;
    }

    for (const da of backup.data.downloadAccess) {
      if (existingDownloadAccess.has(da.id)) {
        operations.push({
          path: `downloadAccess/${da.id}`,
          mode: 'update',
          data: {
            authorized: Boolean(da.authorized),
            downloadCount: da.downloadCount,
            maxDownloads: da.maxDownloads,
            grantedBy: da.grantedBy.slice(0, 120) || adminEmail.slice(0, 120),
            updatedAt: serverTimestamp(),
          },
        });
      } else {
        operations.push({
          path: `downloadAccess/${da.id}`,
          mode: 'set',
          data: {
            id: da.id,
            orderId: da.orderId,
            userId: da.userId,
            productId: da.productId,
            productName: da.productName.slice(0, 120),
            assetKey: da.assetKey.slice(0, 180),
            fileFormat: da.fileFormat.slice(0, 120),
            authorized: Boolean(da.authorized),
            downloadCount: da.downloadCount,
            maxDownloads: da.maxDownloads,
            grantedBy: da.grantedBy.slice(0, 120) || adminEmail.slice(0, 120),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }
      writtenCounts.downloadAccess += 1;
    }
  } else {
    skippedCount +=
      backup.data.orders.length +
      backup.data.orderItems.length +
      backup.data.downloadAccess.length;
  }

  try {
    const CHUNK = 350;
    for (let i = 0; i < operations.length; i += CHUNK) {
      const slice = operations.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const op of slice) {
        const [col, id] = op.path.split('/');
        if (op.mode === 'update') {
          batch.update(doc(db, col, id), op.data);
        } else {
          batch.set(doc(db, col, id), op.data);
        }
      }
      await batch.commit();
    }

    await logAdminAuditEvent({
      action: 'backup_restore',
      actorEmail: adminEmail,
      summary: `Restored ${writtenCounts.categories} categories, ${writtenCounts.products} products, ${writtenCounts.paymentMethods} payment methods, ${writtenCounts.orders} orders`,
      details: `Safety backup: ${safetyBackupFilename}. ExportedAt: ${backup.exportedAt}. Skipped: ${skippedCount}.`,
    });

    return {
      safetyBackupFilename,
      writtenCounts,
      skippedCount,
      restoredAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'adminRestore');
  }
}
