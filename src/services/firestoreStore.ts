import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/seedCatalog';
import { ADMIN_EMAIL, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AdminAuditLog,
  Category,
  DownloadAccess,
  Order,
  OrderItem,
  OrderStatus,
  PaymentAdminConfig,
  PaymentMethod,
  PaymentMethodSnapshot,
  PaymentMethodType,
  PaymentStatus,
  Product,
  UserProfile,
  VerificationHistoryEntry,
} from '../types/store';

const LEGACY_PREVIEW_MAP: Record<string, string> = {
  '/src/assets/images/hero_cotton_candy_stickers_1795233528190.jpg': '/previews/hero-cotton-candy.jpg',
  '/src/assets/images/pack_cute_characters_1795233529123.jpg': '/previews/pack-cute-characters.jpg',
  '/src/assets/images/pack_kawaii_animals_1795233528802.jpg': '/previews/pack-kawaii-animals.jpg',
  '/src/assets/images/pack_planner_stickers_1795233528126.jpg': '/previews/pack-planner-stickers.jpg',
  '/src/assets/images/pack_seasonal_stickers_1795233528144.jpg': '/previews/pack-seasonal-stickers.jpg',
  '/src/assets/images/pack_printable_stickers_1795233528536.jpg': '/previews/pack-printable-stickers.jpg',
  '/src/assets/images/pack_sticker_bundle_1795233528947.jpg': '/previews/pack-sticker-bundle.jpg',
  '/src/assets/images/pack_sweet_cafe_1795233528765.jpg': '/previews/pack-sweet-cafe.jpg',
  '/src/assets/images/pack_celestial_dreams_1795233528202.jpg': '/previews/pack-celestial-dreams.jpg',
  '/src/assets/images/pack_cozy_desk_1795233528435.jpg': '/previews/pack-cozy-desk.jpg',
};

export function normalizeLegacyPreviewUrl(url: string): string {
  return LEGACY_PREVIEW_MAP[url] ?? url;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function toOptionalIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return '';
}

function mapCategory(data: Record<string, unknown>, id: string): Category {
  return {
    id: String(data.id ?? id),
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    description: String(data.description ?? ''),
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapProduct(data: Record<string, unknown>, id: string): Product {
  const images = Array.isArray(data.previewImages)
    ? data.previewImages
        .filter((x): x is string => typeof x === 'string')
        .map((url) => normalizeLegacyPreviewUrl(url))
    : [];
  return {
    id: String(data.id ?? id),
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    description: String(data.description ?? ''),
    price: Number(data.price ?? 0),
    salePrice: typeof data.salePrice === 'number' ? data.salePrice : null,
    categoryId: String(data.categoryId ?? ''),
    categoryName: String(data.categoryName ?? ''),
    previewImages: images,
    featured: Boolean(data.featured),
    bestSeller: Boolean(data.bestSeller),
    newArrival: Boolean(data.newArrival),
    published: Boolean(data.published),
    productType: (data.productType as Product['productType']) ?? 'individual_pack',
    fileFormat: String(data.fileFormat ?? ''),
    contentsSummary: String(data.contentsSummary ?? ''),
    downloadableAssetKey: String(data.downloadableAssetKey ?? ''),
    popularityScore: Number(data.popularityScore ?? 0),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapPaymentMethod(data: Record<string, unknown>, id: string): PaymentMethod {
  return {
    id: String(data.id ?? id),
    name: String(data.name ?? ''),
    type: (data.type as PaymentMethodType) ?? 'other',
    enabled: Boolean(data.enabled),
    accountHolderName: String(data.accountHolderName ?? ''),
    bankName: String(data.bankName ?? ''),
    accountNumber: String(data.accountNumber ?? ''),
    paypalLink: String(data.paypalLink ?? ''),
    qrisImageUrl: String(data.qrisImageUrl ?? ''),
    description: String(data.description ?? ''),
    instructions: String(data.instructions ?? ''),
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapPaymentSnapshot(raw: unknown): PaymentMethodSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.name) return null;
  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? ''),
    type: (obj.type as PaymentMethodType) ?? 'other',
    accountHolderName: String(obj.accountHolderName ?? ''),
    bankName: String(obj.bankName ?? ''),
    accountNumber: String(obj.accountNumber ?? ''),
    paypalLink: String(obj.paypalLink ?? ''),
    qrisImageUrl: String(obj.qrisImageUrl ?? ''),
    description: String(obj.description ?? ''),
    instructions: String(obj.instructions ?? ''),
  };
}

function mapVerificationHistory(raw: unknown): VerificationHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({
      action:
        entry.action === 'approved' || entry.action === 'rejected'
          ? entry.action
          : 'status_updated',
      by: String(entry.by ?? ''),
      reason: String(entry.reason ?? ''),
      at: String(entry.at ?? ''),
    }));
}

function mapOrder(data: Record<string, unknown>, id: string): Order {
  return {
    id: String(data.id ?? id),
    orderNumber: String(data.orderNumber ?? ''),
    userId: String(data.userId ?? ''),
    customerName: String(data.customerName ?? ''),
    customerEmail: String(data.customerEmail ?? ''),
    customerCountry: String(data.customerCountry ?? ''),
    customerWhatsapp: typeof data.customerWhatsapp === 'string' ? data.customerWhatsapp : '',
    customerNote: typeof data.customerNote === 'string' ? data.customerNote : '',
    checkoutChannel:
      data.checkoutChannel === 'whatsapp' || data.checkoutChannel === 'manual_payment'
        ? data.checkoutChannel
        : undefined,
    productIds: Array.isArray(data.productIds)
      ? data.productIds.filter((x): x is string => typeof x === 'string')
      : undefined,
    productNames: Array.isArray(data.productNames)
      ? data.productNames.filter((x): x is string => typeof x === 'string')
      : undefined,
    quantities: Array.isArray(data.quantities)
      ? data.quantities.filter((x): x is number => typeof x === 'number')
      : undefined,
    unitPrices: Array.isArray(data.unitPrices)
      ? data.unitPrices.filter((x): x is number => typeof x === 'number')
      : undefined,
    subtotal: Number(data.subtotal ?? 0),
    total: Number(data.total ?? 0),
    currency: 'USD',
    orderStatus: (data.orderStatus as OrderStatus) ?? 'pending',
    paymentStatus: (data.paymentStatus as PaymentStatus) ?? 'unpaid',
    paymentMethodId: String(data.paymentMethodId ?? ''),
    paymentMethodName: String(data.paymentMethodName ?? ''),
    paymentMethodType: (data.paymentMethodType as PaymentMethodType | '') ?? '',
    paymentMethodSnapshot: mapPaymentSnapshot(data.paymentMethodSnapshot),
    paymentReference: String(data.paymentReference ?? ''),
    customerPaymentNote: String(data.customerPaymentNote ?? ''),
    paymentProofUrl: String(data.paymentProofUrl ?? ''),
    paymentSubmittedAt: toOptionalIsoString(data.paymentSubmittedAt),
    rejectionReason: String(data.rejectionReason ?? ''),
    verifiedBy: String(data.verifiedBy ?? ''),
    verifiedAt: toOptionalIsoString(data.verifiedAt),
    verificationHistory: mapVerificationHistory(data.verificationHistory),
    downloadAuthorized: Boolean(data.downloadAuthorized),
    itemCount: Number(data.itemCount ?? 1),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapOrderItem(data: Record<string, unknown>, id: string): OrderItem {
  return {
    id: String(data.id ?? id),
    orderId: String(data.orderId ?? ''),
    userId: String(data.userId ?? ''),
    productId: String(data.productId ?? ''),
    productName: String(data.productName ?? ''),
    productType: (data.productType as OrderItem['productType']) ?? 'individual_pack',
    fileFormat: String(data.fileFormat ?? ''),
    priceSnapshot: Number(data.priceSnapshot ?? 0),
    quantity: Number(data.quantity ?? 1),
    previewImage: normalizeLegacyPreviewUrl(String(data.previewImage ?? '')),
    createdAt: toIsoString(data.createdAt),
  };
}

function mapDownloadAccess(data: Record<string, unknown>, id: string): DownloadAccess {
  return {
    id: String(data.id ?? id),
    orderId: String(data.orderId ?? ''),
    userId: String(data.userId ?? ''),
    productId: String(data.productId ?? ''),
    productName: String(data.productName ?? ''),
    assetKey: String(data.assetKey ?? ''),
    fileFormat: String(data.fileFormat ?? ''),
    authorized: Boolean(data.authorized),
    downloadCount: Number(data.downloadCount ?? 0),
    maxDownloads: Number(data.maxDownloads ?? 5),
    grantedBy: String(data.grantedBy ?? ''),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export async function checkAdminDoc(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function syncUserProfile(firebaseUser: User): Promise<UserProfile> {
  const path = `users/${firebaseUser.uid}`;
  try {
    const ref = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);
    const displayName = (
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Creator'
    ).slice(0, 100);
    const email = (firebaseUser.email || '').slice(0, 254);
    const photoURL = (firebaseUser.photoURL || '').slice(0, 500);

    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: firebaseUser.uid,
        email,
        displayName,
        role: 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload);
      return {
        uid: firebaseUser.uid,
        email,
        displayName,
        photoURL: photoURL || undefined,
        role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'customer',
      };
    }

    const existing = snap.data();
    const updatePayload: Record<string, unknown> = {
      displayName,
      updatedAt: serverTimestamp(),
    };
    if (photoURL) updatePayload.photoURL = photoURL;
    await updateDoc(ref, updatePayload);

    return {
      uid: firebaseUser.uid,
      email: String(existing.email ?? email),
      displayName,
      photoURL: photoURL || (typeof existing.photoURL === 'string' ? existing.photoURL : undefined),
      role: (existing.role as 'customer' | 'admin') ?? 'customer',
      createdAt: toIsoString(existing.createdAt),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const path = 'categories';
  try {
    const q = query(collection(db, 'categories'), where('sortOrder', '>=', 0));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapCategory(d.data() as Record<string, unknown>, d.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchPublishedProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const q = query(collection(db, 'products'), where('published', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapProduct(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllProductsForAdmin(): Promise<Product[]> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs.map((d) => mapProduct(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function seedInitialCatalogToFirestore(options?: {
  preserveExisting?: boolean;
}): Promise<{ addedCategories: number; addedProducts: number; skippedExisting: number }> {
  const preserveExisting = options?.preserveExisting ?? true;
  const path = 'products';
  try {
    const [existingCatSnaps, existingProdSnaps] = preserveExisting
      ? await Promise.all([
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'products')),
        ])
      : [null, null];

    const existingCatIds = new Set(existingCatSnaps?.docs.map((d) => d.id) ?? []);
    const existingProdIds = new Set(existingProdSnaps?.docs.map((d) => d.id) ?? []);

    const batch = writeBatch(db);
    let addedCategories = 0;
    let addedProducts = 0;
    let skippedExisting = 0;

    for (const cat of INITIAL_CATEGORIES) {
      if (preserveExisting && existingCatIds.has(cat.id)) {
        skippedExisting += 1;
        continue;
      }
      const catRef = doc(db, 'categories', cat.id);
      batch.set(catRef, {
        id: cat.id,
        name: cat.name.slice(0, 60),
        slug: cat.slug.slice(0, 80),
        description: cat.description.slice(0, 280),
        sortOrder: cat.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addedCategories += 1;
    }
    for (const prod of INITIAL_PRODUCTS) {
      if (preserveExisting && existingProdIds.has(prod.id)) {
        skippedExisting += 1;
        continue;
      }
      const prodRef = doc(db, 'products', prod.id);
      batch.set(prodRef, {
        id: prod.id,
        name: prod.name.slice(0, 120),
        slug: prod.slug.slice(0, 140),
        description: prod.description.slice(0, 2500),
        price: prod.price,
        salePrice: prod.salePrice ?? null,
        categoryId: prod.categoryId,
        categoryName: prod.categoryName.slice(0, 60),
        previewImages: prod.previewImages.slice(0, 6),
        featured: prod.featured,
        bestSeller: prod.bestSeller,
        newArrival: prod.newArrival,
        published: prod.published,
        productType: prod.productType,
        fileFormat: prod.fileFormat.slice(0, 120),
        contentsSummary: prod.contentsSummary.slice(0, 500),
        downloadableAssetKey: prod.downloadableAssetKey.slice(0, 180),
        popularityScore: prod.popularityScore,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addedProducts += 1;
    }

    if (addedCategories > 0 || addedProducts > 0) {
      await batch.commit();
    }
    return { addedCategories, addedProducts, skippedExisting };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function migrateLegacyPreviewUrlsToWatermarked(
  actorEmail: string
): Promise<number> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, 'products'));
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const rawImages = Array.isArray(data.previewImages)
        ? data.previewImages.filter((x): x is string => typeof x === 'string')
        : [];
      const nextImages = rawImages.map((u) => normalizeLegacyPreviewUrl(u));
      const changed = nextImages.some((u, idx) => u !== rawImages[idx]);
      if (changed && nextImages.length > 0) {
        batch.update(d.ref, {
          previewImages: nextImages.slice(0, 6),
          updatedAt: serverTimestamp(),
        });
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      await logAdminAuditEvent({
        action: 'preview_migration',
        actorEmail,
        summary: `Migrated ${updatedCount} Firestore product preview URLs to watermarked /previews assets`,
        details: `Updated ${updatedCount} product document(s) without changing pricing or copy.`,
      });
    }
    return updatedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveCategory(
  category: Omit<Category, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    const ref = doc(db, 'categories', category.id);
    const snap = isNew ? null : await getDoc(ref);
    if (isNew || !snap?.exists()) {
      await setDoc(ref, {
        id: category.id,
        name: category.name.trim().slice(0, 60),
        slug: category.slug.trim().slice(0, 80),
        description: category.description.trim().slice(0, 280),
        sortOrder: Math.max(0, Math.min(10000, Number(category.sortOrder) || 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: category.name.trim().slice(0, 60),
        slug: category.slug.trim().slice(0, 80),
        description: category.description.trim().slice(0, 280),
        sortOrder: Math.max(0, Math.min(10000, Number(category.sortOrder) || 0)),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveProduct(
  product: Omit<Product, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `products/${product.id}`;
  const validSalePrice =
    typeof product.salePrice === 'number' &&
    product.salePrice >= 0 &&
    product.salePrice < product.price
      ? Number(product.salePrice.toFixed(2))
      : null;

  try {
    const ref = doc(db, 'products', product.id);
    const sharedFields = {
      name: product.name.trim().slice(0, 120),
      slug: product.slug.trim().slice(0, 140),
      description: product.description.trim().slice(0, 2500),
      price: Number(Math.max(0, Math.min(9999, product.price)).toFixed(2)),
      salePrice: validSalePrice,
      categoryId: product.categoryId,
      categoryName: product.categoryName.trim().slice(0, 60),
      previewImages: product.previewImages.slice(0, 6),
      featured: Boolean(product.featured),
      bestSeller: Boolean(product.bestSeller),
      newArrival: Boolean(product.newArrival),
      published: Boolean(product.published),
      productType: product.productType,
      fileFormat: product.fileFormat.trim().slice(0, 120),
      contentsSummary: product.contentsSummary.trim().slice(0, 500),
      downloadableAssetKey: product.downloadableAssetKey.trim().slice(0, 180),
      popularityScore: Math.max(0, Math.min(1000000, Number(product.popularityScore) || 0)),
      updatedAt: serverTimestamp(),
    };

    const snap = isNew ? null : await getDoc(ref);
    if (isNew || !snap?.exists()) {
      await setDoc(ref, {
        id: product.id,
        ...sharedFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, sharedFields);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleProductPublish(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await updateDoc(doc(db, 'products', product.id), {
      published: !product.published,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Manual Payment Methods & Admin Payment Config ---

export async function fetchEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  const path = 'paymentMethods';
  try {
    const q = query(collection(db, 'paymentMethods'), where('enabled', '==', true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapPaymentMethod(d.data() as Record<string, unknown>, d.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllPaymentMethodsForAdmin(): Promise<PaymentMethod[]> {
  const path = 'paymentMethods';
  try {
    const snap = await getDocs(collection(db, 'paymentMethods'));
    return snap.docs
      .map((d) => mapPaymentMethod(d.data() as Record<string, unknown>, d.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePaymentMethod(
  method: Omit<PaymentMethod, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `paymentMethods/${method.id}`;
  try {
    const ref = doc(db, 'paymentMethods', method.id);
    const sharedFields = {
      name: method.name.trim().slice(0, 100),
      type: method.type,
      enabled: Boolean(method.enabled),
      accountHolderName: method.accountHolderName.trim().slice(0, 120),
      bankName: method.bankName.trim().slice(0, 120),
      accountNumber: method.accountNumber.trim().slice(0, 80),
      paypalLink: method.paypalLink.trim().slice(0, 500),
      qrisImageUrl: method.qrisImageUrl.trim().slice(0, 300000),
      description: method.description.trim().slice(0, 500),
      instructions: method.instructions.trim().slice(0, 2000),
      sortOrder: Math.max(0, Math.min(10000, Number(method.sortOrder) || 0)),
      updatedAt: serverTimestamp(),
    };

    const snap = isNew ? null : await getDoc(ref);
    if (isNew || !snap?.exists()) {
      await setDoc(ref, {
        id: method.id,
        ...sharedFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, sharedFields);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function togglePaymentMethodEnabled(method: PaymentMethod): Promise<void> {
  const path = `paymentMethods/${method.id}`;
  try {
    await updateDoc(doc(db, 'paymentMethods', method.id), {
      enabled: !method.enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePaymentMethod(methodId: string): Promise<void> {
  const path = `paymentMethods/${methodId}`;
  try {
    await deleteDoc(doc(db, 'paymentMethods', methodId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterPaymentMethodTemplates(): Promise<void> {
  const path = 'paymentMethods';
  const starterTemplates: Omit<PaymentMethod, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'pm-bank-transfer-template',
      name: 'Bank Transfer (Manual)',
      type: 'bank_transfer',
      enabled: false,
      accountHolderName: 'Cotton Candy Sticker Studio',
      bankName: 'BCA / Wise / Local Bank (Edit Me)',
      accountNumber: '0000-0000-0000 (Edit Me)',
      paypalLink: '',
      qrisImageUrl: '',
      description: 'Direct bank transfer in USD or equivalent local currency.',
      instructions:
        '1. Transfer the exact order total to the bank account shown above.\n2. Include your Order ID in the transfer remark.\n3. Return here and submit your bank transaction reference ID.',
      sortOrder: 1,
    },
    {
      id: 'pm-qris-template',
      name: 'QRIS Instant QR',
      type: 'qris',
      enabled: false,
      accountHolderName: 'Cotton Candy Sticker',
      bankName: 'QRIS National QR',
      accountNumber: '',
      paypalLink: '',
      qrisImageUrl: '',
      description: 'Scan QRIS code using any Indonesian e-wallet or mobile banking app.',
      instructions:
        '1. Scan the QRIS code with GoPay, OVO, Dana, ShopeePay, or Mobile Banking.\n2. Confirm the merchant name matches Cotton Candy Sticker.\n3. Submit your payment reference / RRN number below after paying.',
      sortOrder: 2,
    },
    {
      id: 'pm-paypal-template',
      name: 'PayPal Payment Link',
      type: 'paypal',
      enabled: false,
      accountHolderName: 'Cotton Candy Sticker',
      bankName: 'PayPal',
      accountNumber: '',
      paypalLink: 'https://paypal.me/yourstorehandle',
      qrisImageUrl: '',
      description: 'International customers can send payment via our official PayPal link.',
      instructions:
        '1. Open the PayPal payment link and send the exact USD order total.\n2. Add your Order Number in the PayPal note.\n3. Copy your PayPal Transaction ID and submit it on your order page.',
      sortOrder: 3,
    },
  ];

  try {
    const batch = writeBatch(db);
    for (const tpl of starterTemplates) {
      const ref = doc(db, 'paymentMethods', tpl.id);
      batch.set(ref, {
        ...tpl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchPaymentAdminConfig(): Promise<PaymentAdminConfig | null> {
  const path = 'paymentAdminConfig/default';
  try {
    const snap = await getDoc(doc(db, 'paymentAdminConfig', 'default'));
    if (!snap.exists()) return null;
    const d = snap.data() as Record<string, unknown>;
    return {
      id: String(d.id ?? 'default'),
      notificationEmail: String(d.notificationEmail ?? ADMIN_EMAIL),
      internalPaymentNotes: String(d.internalPaymentNotes ?? ''),
      requireReferenceFormatHint: String(d.requireReferenceFormatHint ?? ''),
      updatedBy: String(d.updatedBy ?? ''),
      updatedAt: toOptionalIsoString(d.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function savePaymentAdminConfig(
  config: Omit<PaymentAdminConfig, 'id' | 'updatedAt'>
): Promise<void> {
  const path = 'paymentAdminConfig/default';
  try {
    const ref = doc(db, 'paymentAdminConfig', 'default');
    const snap = await getDoc(ref);
    const payload = {
      notificationEmail: config.notificationEmail.trim().slice(0, 254),
      internalPaymentNotes: config.internalPaymentNotes.trim().slice(0, 2000),
      requireReferenceFormatHint: config.requireReferenceFormatHint.trim().slice(0, 300),
      updatedBy: config.updatedBy.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { id: 'default', ...payload });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Orders, Payment Confirmation & Admin Verification ---

export interface CreatePendingOrderInput {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerCountry: string;
  items: {
    product: Product;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface CreateWhatsAppOrderInput {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  customerNote: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export async function createWhatsAppOrder(input: CreateWhatsAppOrderInput): Promise<Order> {
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const orderNumber = `CCS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const path = `orders/${orderId}`;

  try {
    // Re-validate product existence and prices against authoritative Firestore /products docs (or INITIAL_PRODUCTS if unseeded)
    const verifiedItems: {
      product: Product;
      quantity: number;
      unitPrice: number;
      lineSubtotal: number;
    }[] = [];

    for (const entry of input.items) {
      const qty = Math.max(1, Math.min(25, Math.floor(entry.quantity)));
      const productSnap = await getDoc(doc(db, 'products', entry.productId));
      let authoritativeProduct: Product | undefined;

      if (productSnap.exists()) {
        authoritativeProduct = mapProduct(
          productSnap.data() as Record<string, unknown>,
          productSnap.id
        );
      } else {
        authoritativeProduct = INITIAL_PRODUCTS.find((p) => p.id === entry.productId);
      }

      if (!authoritativeProduct || !authoritativeProduct.published) {
        throw new Error(`Product "${entry.productId}" is unavailable.`);
      }

      const unitPrice =
        typeof authoritativeProduct.salePrice === 'number' &&
        authoritativeProduct.salePrice >= 0 &&
        authoritativeProduct.salePrice < authoritativeProduct.price
          ? Number(authoritativeProduct.salePrice.toFixed(2))
          : Number(authoritativeProduct.price.toFixed(2));

      verifiedItems.push({
        product: authoritativeProduct,
        quantity: qty,
        unitPrice,
        lineSubtotal: Number((unitPrice * qty).toFixed(2)),
      });
    }

    const subtotal = Number(
      verifiedItems.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2)
    );
    const total = subtotal;
    const totalItems = verifiedItems.reduce((sum, item) => sum + item.quantity, 0);

    const productIds = verifiedItems.map((i) => i.product.id).slice(0, 30);
    const productNames = verifiedItems.map((i) => i.product.name.slice(0, 120)).slice(0, 30);
    const quantities = verifiedItems.map((i) => i.quantity).slice(0, 30);
    const unitPrices = verifiedItems.map((i) => i.unitPrice).slice(0, 30);

    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderId);

    batch.set(orderRef, {
      id: orderId,
      orderNumber,
      userId: input.userId,
      customerName: input.customerName.trim().slice(0, 120),
      customerEmail: (input.customerEmail || 'whatsapp-customer@cottoncandysticker.local')
        .trim()
        .slice(0, 254),
      customerCountry: 'WhatsApp Digital',
      customerWhatsapp: input.customerWhatsapp.trim().slice(0, 40),
      customerNote: input.customerNote.trim().slice(0, 500),
      checkoutChannel: 'whatsapp',
      productIds,
      productNames,
      quantities,
      unitPrices,
      subtotal,
      total,
      currency: 'USD',
      orderStatus: 'pending_contact',
      paymentStatus: 'unpaid',
      paymentMethodId: '',
      paymentMethodName: 'WhatsApp Manual Order',
      paymentMethodType: 'other',
      paymentMethodSnapshot: null,
      paymentReference: '',
      customerPaymentNote: input.customerNote.trim().slice(0, 500),
      paymentProofUrl: '',
      paymentSubmittedAt: '',
      rejectionReason: '',
      verifiedBy: '',
      verifiedAt: '',
      verificationHistory: [],
      downloadAuthorized: false,
      itemCount: Math.max(1, totalItems),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (let i = 0; i < verifiedItems.length; i++) {
      const entry = verifiedItems[i];
      const itemId = `${orderId}-item-${i + 1}`;
      const itemRef = doc(db, 'orderItems', itemId);
      batch.set(itemRef, {
        id: itemId,
        orderId,
        userId: input.userId,
        productId: entry.product.id,
        productName: entry.product.name.slice(0, 120),
        productType: entry.product.productType,
        fileFormat: entry.product.fileFormat.slice(0, 120),
        priceSnapshot: entry.unitPrice,
        quantity: entry.quantity,
        previewImage: (entry.product.previewImages[0] ?? '').slice(0, 300000),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      id: orderId,
      orderNumber,
      userId: input.userId,
      customerName: input.customerName.trim(),
      customerEmail: (input.customerEmail || 'whatsapp-customer@cottoncandysticker.local').trim(),
      customerCountry: 'WhatsApp Digital',
      customerWhatsapp: input.customerWhatsapp.trim(),
      customerNote: input.customerNote.trim(),
      checkoutChannel: 'whatsapp',
      productIds,
      productNames,
      quantities,
      unitPrices,
      subtotal,
      total,
      currency: 'USD',
      orderStatus: 'pending_contact',
      paymentStatus: 'unpaid',
      paymentMethodId: '',
      paymentMethodName: 'WhatsApp Manual Order',
      paymentMethodType: 'other',
      paymentMethodSnapshot: null,
      paymentReference: '',
      customerPaymentNote: input.customerNote.trim(),
      paymentProofUrl: '',
      paymentSubmittedAt: '',
      rejectionReason: '',
      verifiedBy: '',
      verifiedAt: '',
      verificationHistory: [],
      downloadAuthorized: false,
      itemCount: Math.max(1, totalItems),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createPendingOrder(input: CreatePendingOrderInput): Promise<Order> {
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const orderNumber = `CCS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const path = `orders/${orderId}`;

  if (!input.items || input.items.length === 0) {
    throw new Error('Cart is empty.');
  }
  if (!input.paymentMethod?.id || !input.paymentMethod.enabled) {
    throw new Error('Selected payment method is unavailable.');
  }

  const snapshot: PaymentMethodSnapshot = {
    id: input.paymentMethod.id,
    name: input.paymentMethod.name.slice(0, 100),
    type: input.paymentMethod.type,
    accountHolderName: input.paymentMethod.accountHolderName.slice(0, 120),
    bankName: input.paymentMethod.bankName.slice(0, 120),
    accountNumber: input.paymentMethod.accountNumber.slice(0, 80),
    paypalLink: input.paymentMethod.paypalLink.slice(0, 500),
    qrisImageUrl: input.paymentMethod.qrisImageUrl.slice(0, 300000),
    description: input.paymentMethod.description.slice(0, 500),
    instructions: input.paymentMethod.instructions.slice(0, 2000),
  };

  try {
    const verifiedItems: {
      product: Product;
      quantity: number;
      unitPrice: number;
      lineSubtotal: number;
    }[] = [];

    for (const entry of input.items) {
      const qty = Math.max(1, Math.min(25, Math.floor(entry.quantity)));
      const productSnap = await getDoc(doc(db, 'products', entry.product.id));
      let authoritativeProduct: Product | undefined;

      if (productSnap.exists()) {
        authoritativeProduct = mapProduct(
          productSnap.data() as Record<string, unknown>,
          productSnap.id
        );
      } else {
        authoritativeProduct = INITIAL_PRODUCTS.find((p) => p.id === entry.product.id);
      }

      if (!authoritativeProduct || !authoritativeProduct.published) {
        throw new Error(`Product "${entry.product.name || entry.product.id}" is unavailable.`);
      }

      const unitPrice =
        typeof authoritativeProduct.salePrice === 'number' &&
        authoritativeProduct.salePrice >= 0 &&
        authoritativeProduct.salePrice < authoritativeProduct.price
          ? Number(authoritativeProduct.salePrice.toFixed(2))
          : Number(authoritativeProduct.price.toFixed(2));

      verifiedItems.push({
        product: authoritativeProduct,
        quantity: qty,
        unitPrice,
        lineSubtotal: Number((unitPrice * qty).toFixed(2)),
      });
    }

    const subtotal = Number(
      verifiedItems.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2)
    );
    const total = subtotal;
    const totalItems = verifiedItems.reduce((sum, item) => sum + item.quantity, 0);

    const productIds = verifiedItems.map((i) => i.product.id).slice(0, 30);
    const productNames = verifiedItems.map((i) => i.product.name.slice(0, 120)).slice(0, 30);
    const quantities = verifiedItems.map((i) => i.quantity).slice(0, 30);
    const unitPrices = verifiedItems.map((i) => i.unitPrice).slice(0, 30);

    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderId);

    batch.set(orderRef, {
      id: orderId,
      orderNumber,
      userId: input.userId,
      customerName: input.customerName.trim().slice(0, 120),
      customerEmail: input.customerEmail.trim().slice(0, 254),
      customerCountry: input.customerCountry.trim().slice(0, 80),
      checkoutChannel: 'manual_payment',
      productIds,
      productNames,
      quantities,
      unitPrices,
      subtotal,
      total,
      currency: 'USD',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      paymentMethodId: input.paymentMethod.id,
      paymentMethodName: snapshot.name,
      paymentMethodType: snapshot.type,
      paymentMethodSnapshot: snapshot,
      paymentReference: '',
      customerPaymentNote: '',
      paymentProofUrl: '',
      paymentSubmittedAt: '',
      rejectionReason: '',
      verifiedBy: '',
      verifiedAt: '',
      verificationHistory: [],
      downloadAuthorized: false,
      itemCount: Math.max(1, totalItems),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (let i = 0; i < verifiedItems.length; i++) {
      const entry = verifiedItems[i];
      const itemId = `${orderId}-item-${i + 1}`;
      const itemRef = doc(db, 'orderItems', itemId);
      batch.set(itemRef, {
        id: itemId,
        orderId,
        userId: input.userId,
        productId: entry.product.id,
        productName: entry.product.name.slice(0, 120),
        productType: entry.product.productType,
        fileFormat: entry.product.fileFormat.slice(0, 120),
        priceSnapshot: entry.unitPrice,
        quantity: entry.quantity,
        previewImage: (entry.product.previewImages[0] ?? '').slice(0, 300000),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      id: orderId,
      orderNumber,
      userId: input.userId,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerCountry: input.customerCountry.trim(),
      checkoutChannel: 'manual_payment',
      productIds,
      productNames,
      quantities,
      unitPrices,
      subtotal,
      total,
      currency: 'USD',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      paymentMethodId: input.paymentMethod.id,
      paymentMethodName: snapshot.name,
      paymentMethodType: snapshot.type,
      paymentMethodSnapshot: snapshot,
      paymentReference: '',
      customerPaymentNote: '',
      paymentProofUrl: '',
      paymentSubmittedAt: '',
      rejectionReason: '',
      verifiedBy: '',
      verifiedAt: '',
      verificationHistory: [],
      downloadAuthorized: false,
      itemCount: Math.max(1, totalItems),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const path = `orders/${orderId}`;
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (!snap.exists()) return null;
    return mapOrder(snap.data() as Record<string, unknown>, snap.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchOrderItemsForOrder(params: {
  orderId: string;
  orderOwnerId: string;
  isAdmin: boolean;
}): Promise<OrderItem[]> {
  const path = 'orderItems';
  try {
    if (params.isAdmin) {
      const q = query(collection(db, 'orderItems'), where('orderId', '==', params.orderId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapOrderItem(d.data() as Record<string, unknown>, d.id));
    }
    const q = query(collection(db, 'orderItems'), where('userId', '==', params.orderOwnerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapOrderItem(d.data() as Record<string, unknown>, d.id))
      .filter((item) => item.orderId === params.orderId);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitCustomerPaymentConfirmation(params: {
  orderId: string;
  paymentReference: string;
  customerPaymentNote: string;
}): Promise<void> {
  const path = `orders/${params.orderId}`;
  try {
    await updateDoc(doc(db, 'orders', params.orderId), {
      paymentStatus: 'awaiting_verification',
      paymentReference: params.paymentReference.trim().slice(0, 160),
      customerPaymentNote: params.customerPaymentNote.trim().slice(0, 500),
      paymentProofUrl: '',
      paymentSubmittedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchUserOrders(uid: string): Promise<Order[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapOrder(d.data() as Record<string, unknown>, d.id))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchUserOrderItems(uid: string): Promise<OrderItem[]> {
  const path = 'orderItems';
  try {
    const q = query(collection(db, 'orderItems'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapOrderItem(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchUserDownloadAccess(uid: string): Promise<DownloadAccess[]> {
  const path = 'downloadAccess';
  try {
    const q = query(collection(db, 'downloadAccess'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDownloadAccess(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllOrdersForAdmin(): Promise<Order[]> {
  const path = 'orders';
  try {
    const snap = await getDocs(collection(db, 'orders'));
    return snap.docs
      .map((d) => mapOrder(d.data() as Record<string, unknown>, d.id))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllOrderItemsForAdmin(): Promise<OrderItem[]> {
  const path = 'orderItems';
  try {
    const snap = await getDocs(collection(db, 'orderItems'));
    return snap.docs.map((d) => mapOrderItem(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllDownloadAccessForAdmin(): Promise<DownloadAccess[]> {
  const path = 'downloadAccess';
  try {
    const snap = await getDocs(collection(db, 'downloadAccess'));
    return snap.docs.map((d) => mapDownloadAccess(d.data() as Record<string, unknown>, d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

function appendVerificationHistory(
  existingHistory: VerificationHistoryEntry[],
  entry: VerificationHistoryEntry
): VerificationHistoryEntry[] {
  return [...existingHistory, entry].slice(-25);
}

export async function adminApproveOrderPayment(params: {
  order: Order;
  orderItems: OrderItem[];
  allProducts: Product[];
  adminEmail: string;
  paymentReference?: string;
}): Promise<void> {
  const path = `orders/${params.order.id}`;
  const nowIso = new Date().toISOString();
  const nextHistory = appendVerificationHistory(params.order.verificationHistory, {
    action: 'approved',
    by: params.adminEmail.slice(0, 120),
    reason: 'Manual payment verified; ready for manual WhatsApp delivery.',
    at: nowIso,
  });

  try {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', params.order.id);
    batch.update(orderRef, {
      orderStatus: 'paid',
      paymentStatus: 'paid',
      paymentReference: (params.paymentReference ?? params.order.paymentReference).trim().slice(0, 160),
      rejectionReason: '',
      verifiedBy: params.adminEmail.slice(0, 120),
      verifiedAt: nowIso,
      verificationHistory: nextHistory,
      downloadAuthorized: true,
      updatedAt: serverTimestamp(),
    });

    for (const item of params.orderItems) {
      const accessId = `da-${params.order.id}-${item.productId}`.slice(0, 64);
      const matchingProduct = params.allProducts.find((p) => p.id === item.productId);
      const assetKey =
        matchingProduct?.downloadableAssetKey || `vault/packs/${item.productId}.zip`;
      const accessRef = doc(db, 'downloadAccess', accessId);
      batch.set(accessRef, {
        id: accessId,
        orderId: params.order.id,
        userId: params.order.userId,
        productId: item.productId,
        productName: item.productName.slice(0, 120),
        assetKey: assetKey.slice(0, 180),
        fileFormat: item.fileFormat.slice(0, 120),
        authorized: true,
        downloadCount: 0,
        maxDownloads: 10,
        grantedBy: params.adminEmail.slice(0, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminRejectOrderPayment(params: {
  order: Order;
  rejectionReason: string;
  adminEmail: string;
}): Promise<void> {
  const path = `orders/${params.order.id}`;
  const nowIso = new Date().toISOString();
  const cleanReason = params.rejectionReason.trim().slice(0, 500);
  const nextHistory = appendVerificationHistory(params.order.verificationHistory, {
    action: 'rejected',
    by: params.adminEmail.slice(0, 120),
    reason: cleanReason,
    at: nowIso,
  });

  try {
    await updateDoc(doc(db, 'orders', params.order.id), {
      orderStatus: 'pending',
      paymentStatus: 'rejected',
      rejectionReason: cleanReason,
      verifiedBy: params.adminEmail.slice(0, 120),
      verifiedAt: nowIso,
      verificationHistory: nextHistory,
      downloadAuthorized: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateOrderAndDownloads(params: {
  order: Order;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  rejectionReason?: string;
  downloadAuthorized: boolean;
  orderItems: OrderItem[];
  allProducts: Product[];
  adminEmail: string;
}): Promise<void> {
  const path = `orders/${params.order.id}`;
  const nowIso = new Date().toISOString();
  const nextHistory = appendVerificationHistory(params.order.verificationHistory, {
    action: 'status_updated',
    by: params.adminEmail.slice(0, 120),
    reason: `Order: ${params.orderStatus}, Payment: ${params.paymentStatus}`,
    at: nowIso,
  });

  try {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', params.order.id);
    batch.update(orderRef, {
      orderStatus: params.orderStatus,
      paymentStatus: params.paymentStatus,
      paymentReference: params.paymentReference.trim().slice(0, 160),
      rejectionReason: (params.rejectionReason ?? params.order.rejectionReason).trim().slice(0, 500),
      verifiedBy: params.adminEmail.slice(0, 120),
      verifiedAt: nowIso,
      verificationHistory: nextHistory,
      downloadAuthorized: params.downloadAuthorized,
      updatedAt: serverTimestamp(),
    });

    if (params.downloadAuthorized) {
      for (const item of params.orderItems) {
        const accessId = `da-${params.order.id}-${item.productId}`.slice(0, 64);
        const matchingProduct = params.allProducts.find((p) => p.id === item.productId);
        const assetKey =
          matchingProduct?.downloadableAssetKey || `vault/packs/${item.productId}.zip`;
        const accessRef = doc(db, 'downloadAccess', accessId);
        batch.set(accessRef, {
          id: accessId,
          orderId: params.order.id,
          userId: params.order.userId,
          productId: item.productId,
          productName: item.productName.slice(0, 120),
          assetKey: assetKey.slice(0, 180),
          fileFormat: item.fileFormat.slice(0, 120),
          authorized: true,
          downloadCount: 0,
          maxDownloads: 10,
          grantedBy: params.adminEmail.slice(0, 120),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateOrderStatus(params: {
  order: Order;
  nextOrderStatus: OrderStatus;
  statusNote?: string;
  adminEmail: string;
}): Promise<void> {
  const path = `orders/${params.order.id}`;
  const nowIso = new Date().toISOString();
  const note = params.statusNote?.trim().slice(0, 320);
  const historyReason = note
    ? `Status changed to ${params.nextOrderStatus} — ${note}`
    : `Status changed to ${params.nextOrderStatus}`;

  const nextHistory = appendVerificationHistory(params.order.verificationHistory, {
    action: 'status_updated',
    by: params.adminEmail.slice(0, 120),
    reason: historyReason.slice(0, 500),
    at: nowIso,
  });

  const payload: Record<string, unknown> = {
    orderStatus: params.nextOrderStatus,
    verifiedBy: params.adminEmail.slice(0, 120),
    verifiedAt: nowIso,
    verificationHistory: nextHistory,
    updatedAt: serverTimestamp(),
  };

  if (params.nextOrderStatus === 'cancelled') {
    payload.downloadAuthorized = false;
  }

  try {
    await updateDoc(doc(db, 'orders', params.order.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSetDownloadAccessAuthorized(
  accessId: string,
  authorized: boolean,
  adminEmail: string
): Promise<void> {
  const path = `downloadAccess/${accessId}`;
  try {
    await updateDoc(doc(db, 'downloadAccess', accessId), {
      authorized,
      grantedBy: adminEmail.slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function logAdminAuditEvent(params: {
  action: AdminAuditLog['action'];
  actorEmail: string;
  summary: string;
  details: string;
}): Promise<void> {
  const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `adminAuditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'adminAuditLogs', logId), {
      id: logId,
      action: params.action,
      actorEmail: params.actorEmail.trim().slice(0, 120),
      summary: params.summary.trim().slice(0, 200),
      details: params.details.trim().slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const path = 'adminAuditLogs';
  try {
    const snap = await getDocs(collection(db, 'adminAuditLogs'));
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: String(data.id ?? d.id),
          action: (data.action as AdminAuditLog['action']) ?? 'backup_restore',
          actorEmail: String(data.actorEmail ?? ''),
          summary: String(data.summary ?? ''),
          details: String(data.details ?? ''),
          createdAt: toIsoString(data.createdAt),
        };
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 20);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
