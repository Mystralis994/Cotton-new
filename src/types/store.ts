export type ProductType = 'individual_pack' | 'bundle' | 'printable_pack';

export type OrderStatus =
  | 'pending_contact'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'awaiting_verification'
  | 'paid'
  | 'rejected'
  | 'pending'
  | 'failed'
  | 'refunded';

export type PaymentMethodType = 'bank_transfer' | 'qris' | 'paypal' | 'other';

export type PriceFilter = 'all' | 'under-5' | '5-to-10' | 'over-10';

export type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'customer' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number | null;
  categoryId: string;
  categoryName: string;
  previewImages: string[];
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  published: boolean;
  productType: ProductType;
  fileFormat: string;
  contentsSummary: string;
  downloadableAssetKey: string;
  popularityScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  enabled: boolean;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  paypalLink: string;
  qrisImageUrl: string;
  description: string;
  instructions: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentMethodSnapshot {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  paypalLink: string;
  qrisImageUrl: string;
  description: string;
  instructions: string;
}

export interface PaymentAdminConfig {
  id: string;
  notificationEmail: string;
  internalPaymentNotes: string;
  requireReferenceFormatHint: string;
  updatedBy: string;
  updatedAt?: string;
}

export interface VerificationHistoryEntry {
  action: 'approved' | 'rejected' | 'status_updated';
  by: string;
  reason: string;
  at: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerCountry: string;
  customerWhatsapp?: string;
  customerNote?: string;
  checkoutChannel?: 'whatsapp' | 'manual_payment';
  productIds?: string[];
  productNames?: string[];
  quantities?: number[];
  unitPrices?: number[];
  subtotal: number;
  total: number;
  currency: 'USD';
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: PaymentMethodType | '';
  paymentMethodSnapshot: PaymentMethodSnapshot | null;
  paymentReference: string;
  customerPaymentNote: string;
  paymentProofUrl: string;
  paymentSubmittedAt: string;
  rejectionReason: string;
  verifiedBy: string;
  verifiedAt: string;
  verificationHistory: VerificationHistoryEntry[];
  downloadAuthorized: boolean;
  itemCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  productType: ProductType;
  fileFormat: string;
  priceSnapshot: number;
  quantity: number;
  previewImage: string;
  createdAt?: string;
}

export interface DownloadAccess {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  assetKey: string;
  fileFormat: string;
  authorized: boolean;
  downloadCount: number;
  maxDownloads: number;
  grantedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  action: 'backup_restore' | 'catalog_sync' | 'preview_migration';
  actorEmail: string;
  summary: string;
  details: string;
  createdAt?: string;
}

export type RouteView =
  | { page: 'home' }
  | { page: 'shop'; initialCategory?: string; initialType?: ProductType }
  | { page: 'product'; slug: string }
  | { page: 'checkout' }
  | { page: 'order-payment'; orderId: string }
  | { page: 'orders' }
  | { page: 'admin' }
  | { page: 'policy'; topic: 'delivery' | 'licensing' | 'refunds' | 'privacy' };
