import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileUp,
  FolderPlus,
  History,
  Lock,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminOrderModal } from '../components/admin/AdminOrderModal';
import { AdminPaymentMethodsSection } from '../components/admin/AdminPaymentMethodsSection';
import { AdminProductModal } from '../components/admin/AdminProductModal';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { ADMIN_EMAIL, APP_CHECK_STATUS, FIREBASE_PROJECT_INFO } from '../lib/firebase';
import {
  adminSetDownloadAccessAuthorized,
  adminUpdateOrderStatus,
  deleteCategory,
  deleteProduct,
  fetchAdminAuditLogs,
  fetchAllDownloadAccessForAdmin,
  fetchAllOrderItemsForAdmin,
  fetchAllOrdersForAdmin,
  fetchAllPaymentMethodsForAdmin,
  fetchPaymentAdminConfig,
  migrateLegacyPreviewUrlsToWatermarked,
  saveCategory,
  seedInitialCatalogToFirestore,
  toggleProductPublish,
} from '../services/firestoreStore';
import {
  AdminAuditLog,
  Category,
  DownloadAccess,
  Order,
  OrderItem,
  OrderStatus,
  PaymentAdminConfig,
  PaymentMethod,
  Product,
} from '../types/store';
import {
  AdminOrderFilter,
  AdminOrderSort,
  computeAdminOrderSummary,
  filterAndSortAdminOrders,
  getOrderLineItemsSummary,
  normalizeOrderStatusGroup,
  PHASE3_ORDER_STATUS_OPTIONS,
} from '../utils/adminMetrics';
import { buildAdminBackupPayload, triggerJsonBackupDownload } from '../utils/adminBackup';
import {
  executeAdminRestore,
  MAX_BACKUP_FILE_BYTES,
  RestoreExecutionResult,
  RestoreSectionKey,
  RestoreValidationSummary,
  validateBackupPayload,
} from '../utils/adminRestore';
import {
  formatIsoDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  formatProductType,
  formatUSD,
  sanitizeId,
  slugify,
} from '../utils/formatters';

type AdminTab = 'overview' | 'orders' | 'products' | 'categories' | 'payments';

function AdminOrderStatusTag({ status }: { status: OrderStatus }) {
  const group = normalizeOrderStatusGroup(status);
  const label = formatOrderStatus(status);

  if (group === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534] bg-[#E8FBF1] border border-[#BBEFD4] px-2.5 py-1 rounded-xl">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (group === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A398E] bg-[#F1ECFC] border border-[#D8CCF4] px-2.5 py-1 rounded-xl">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (group === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E5485] bg-[#E9F4FC] border border-[#C3DFF6] px-2.5 py-1 rounded-xl">
        <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (group === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-xl">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9A5B13] bg-[#FFF5E2] border border-[#F5D8A3] px-2.5 py-1 rounded-xl">
      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function AdminPage() {
  const {
    user,
    isAdmin,
    authLoading,
    signInWithGoogle,
    signOutUser,
    categories,
    products,
    catalogSource,
    firestoreConnected,
    refreshCatalog,
    showToast,
    lang,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orderFilter, setOrderFilter] = useState<AdminOrderFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<AdminOrderSort>('newest');
  const [productSearch, setProductSearch] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [downloadAccessList, setDownloadAccessList] = useState<DownloadAccess[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentAdminConfig, setPaymentAdminConfig] = useState<PaymentAdminConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [migratingPreviews, setMigratingPreviews] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);

  // Backup restore state
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreSummary, setRestoreSummary] = useState<RestoreValidationSummary | null>(null);
  const [restoreSections, setRestoreSections] = useState<Record<RestoreSectionKey, boolean>>({
    categories: true,
    products: true,
    paymentMethods: true,
    orders: true,
  });
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreExecutionResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Category editor state
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('1');
  const [catSaving, setCatSaving] = useState(false);

  const loadAdminRecords = useCallback(async () => {
    if (!isAdmin) return;
    setAdminDataLoading(true);
    setAdminError(null);
    try {
      const [allOrders, allItems, allAccess, allPaymentMethods, adminConfig, recentLogs] =
        await Promise.all([
          fetchAllOrdersForAdmin(),
          fetchAllOrderItemsForAdmin(),
          fetchAllDownloadAccessForAdmin(),
          fetchAllPaymentMethodsForAdmin(),
          fetchPaymentAdminConfig(),
          fetchAdminAuditLogs().catch(() => [] as AdminAuditLog[]),
        ]);
      setOrders(allOrders);
      setOrderItems(allItems);
      setDownloadAccessList(allAccess);
      setPaymentMethods(allPaymentMethods);
      setPaymentAdminConfig(adminConfig);
      setAuditLogs(recentLogs);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to load admin order data.');
    } finally {
      setAdminDataLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminRecords();
    }
  }, [isAdmin, loadAdminRecords]);

  const orderSummary = useMemo(() => computeAdminOrderSummary(orders), [orders]);

  const catalogMetrics = useMemo(() => {
    const publishedCount = products.filter((p) => p.published).length;
    const activeGrants = downloadAccessList.filter((d) => d.authorized).length;
    const enabledPaymentMethods = paymentMethods.filter((m) => m.enabled).length;
    return {
      totalProducts: products.length,
      publishedCount,
      draftCount: products.length - publishedCount,
      categoriesCount: categories.length,
      activeGrants,
      enabledPaymentMethods,
      totalPaymentMethods: paymentMethods.length,
    };
  }, [products, categories, downloadAccessList, paymentMethods]);

  const filteredOrders = useMemo(
    () =>
      filterAndSortAdminOrders(orders, orderItems, {
        search: orderSearch,
        statusFilter: orderFilter,
        sortDirection: orderSort,
      }),
    [orders, orderItems, orderSearch, orderFilter, orderSort]
  );

  const recentOrders = useMemo(
    () =>
      filterAndSortAdminOrders(orders, orderItems, {
        search: '',
        statusFilter: 'all',
        sortDirection: 'newest',
      }).slice(0, 4),
    [orders, orderItems]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  if (authLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-16">
        <div className="h-48 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]" />
      </div>
    );
  }

  // Gate 1: Unauthenticated user
  if (!user) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="clay-card p-8 sm:p-10 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF1F5] text-[#D93D7A] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#352336]">
            Admin Authentication Required
          </h1>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto leading-relaxed">
            The Cotton Candy Sticker Admin Dashboard is protected by Firebase Authentication and Firestore security rules. Sign in with an authorized administrator Google account to manage orders and products.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="clay-button px-6 py-3 text-sm font-semibold cursor-pointer min-h-[44px]"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Gate 2: Authenticated non-admin user (403 Access Denied)
  if (!isAdmin) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="clay-card border-[#FECACA] p-8 sm:p-10 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#352336]">
            403 · Administrator Access Denied
          </h1>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto leading-relaxed">
            You are currently signed in as <strong className="text-[#352336]">{user.email}</strong>, which does not have administrator privileges. Both the dashboard UI and Firestore security rules block unauthorized access.
          </p>
          <p className="text-xs text-[#7E687F]">
            Store administrator allowlist: <code className="font-mono">{ADMIN_EMAIL}</code>
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={signOutUser}
              className="px-5 py-2.5 rounded-2xl bg-[#352336] text-white text-sm font-semibold hover:bg-[#4B344D] transition-colors cursor-pointer min-h-[44px]"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSeedCatalog = async () => {
    setSeeding(true);
    setAdminError(null);
    try {
      const result = await seedInitialCatalogToFirestore({ preserveExisting: true });
      await refreshCatalog();
      showToast(
        `Synced safely: +${result.addedCategories} categories, +${result.addedProducts} products (${result.skippedExisting} existing kept).`
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to seed catalog.');
    } finally {
      setSeeding(false);
    }
  };

  const handleMigrateLegacyPreviews = async () => {
    setMigratingPreviews(true);
    setAdminError(null);
    try {
      const updatedCount = await migrateLegacyPreviewUrlsToWatermarked(user.email || ADMIN_EMAIL);
      await Promise.all([refreshCatalog(), loadAdminRecords()]);
      showToast(
        updatedCount > 0
          ? `Migrated ${updatedCount} product preview URL(s) to watermarked /previews assets.`
          : 'All Firestore product previews already point to watermarked /previews URLs.'
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to migrate legacy previews.');
    } finally {
      setMigratingPreviews(false);
    }
  };

  const handleQuickOrderStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingOrderId(order.id);
    setAdminError(null);
    try {
      await adminUpdateOrderStatus({
        order,
        nextOrderStatus: nextStatus,
        adminEmail: user.email || ADMIN_EMAIL,
      });
      await loadAdminRecords();
      showToast(`Order ${order.orderNumber} updated to ${formatOrderStatus(nextStatus)}.`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    try {
      if (catalogSource === 'sample') {
        await seedInitialCatalogToFirestore();
      }
      await toggleProductPublish(product);
      await refreshCatalog();
      showToast(
        `${product.name} is now ${!product.published ? 'Active (Published)' : 'Inactive (Draft)'}.`
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not update product visibility.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      if (catalogSource === 'sample') {
        await seedInitialCatalogToFirestore();
      }
      await deleteProduct(productId);
      setConfirmDeleteProductId(null);
      await refreshCatalog();
      showToast('Product deleted.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not delete product.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCatSaving(true);
    setAdminError(null);
    try {
      if (catalogSource === 'sample') {
        await seedInitialCatalogToFirestore();
      }
      const isNew = !catEditId;
      const slug = slugify(catSlug || catName);
      const id = catEditId ?? sanitizeId('cat', slug);
      await saveCategory(
        {
          id,
          name: catName.trim(),
          slug,
          description: catDesc.trim() || 'Curated digital sticker collection.',
          sortOrder: Number(catSortOrder) || categories.length + 1,
        },
        isNew
      );
      setCatEditId(null);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setCatSortOrder(String(categories.length + 2));
      await refreshCatalog();
      showToast(isNew ? 'Category added.' : 'Category updated.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (catalogSource === 'sample') {
        await seedInitialCatalogToFirestore();
      }
      await deleteCategory(categoryId);
      await refreshCatalog();
      showToast('Category deleted.');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to delete category.');
    }
  };

  const handleExportBackup = () => {
    try {
      const payload = buildAdminBackupPayload({
        adminEmail: user.email || ADMIN_EMAIL,
        catalogSource,
        categories,
        products,
        orders,
        orderItems,
        downloadAccess: downloadAccessList,
        paymentMethods,
      });
      const filename = triggerJsonBackupDownload(payload);
      showToast(
        `Backup exported (${filename}): ${orders.length} orders, ${products.length} products.`
      );
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not export backup JSON.');
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    setRestoreResult(null);
    setRestoreConfirmed(false);
    setRestoreFileName(file.name);

    try {
      if (file.size > MAX_BACKUP_FILE_BYTES) {
        setRestoreSummary(null);
        setRestoreError('Backup file exceeds the 5MB maximum size limit.');
        return;
      }
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const summary = validateBackupPayload(parsed);
      setRestoreSummary(summary);
      if (!summary.valid) {
        setRestoreError(summary.errors[0] || 'Backup validation failed.');
      }
    } catch {
      setRestoreSummary(null);
      setRestoreError('Could not parse JSON backup file. Ensure it is valid UTF-8 JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreSummary?.valid || !restoreSummary.payload || !restoreConfirmed) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const result = await executeAdminRestore({
        backup: restoreSummary.payload,
        sections: restoreSections,
        adminEmail: user.email || ADMIN_EMAIL,
        currentSnapshot: {
          catalogSource,
          categories,
          products,
          orders,
          orderItems,
          downloadAccess: downloadAccessList,
          paymentMethods,
        },
      });
      setRestoreResult(result);
      setRestoreConfirmed(false);
      await Promise.all([refreshCatalog(), loadAdminRecords()]);
      showToast(
        `Restore complete. Safety backup saved as ${result.safetyBackupFilename}.`
      );
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed during Firestore batch write.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="clay-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#B8255F]">
            Cotton Candy Sticker · Store Admin
          </p>
          <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] mt-0.5">
            Admin Order & Catalog Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#6D586E] mt-1">
            Signed in as <strong className="text-[#352336]">{user.email}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="clay-button-soft inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold cursor-pointer min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => {
              refreshCatalog();
              loadAdminRecords();
            }}
            className="clay-button-soft inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            onClick={signOutUser}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#EADCE4] text-xs font-semibold text-[#6D586E] hover:text-[#352336] cursor-pointer min-h-[44px]"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Android-friendly wrapping & touch targets) */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'overview', label: 'Overview' },
            {
              id: 'orders',
              label:
                orderSummary.newOrdersCount > 0
                  ? `Orders (${orders.length} · ${orderSummary.newOrdersCount} New)`
                  : `Orders (${orders.length})`,
            },
            { id: 'products', label: `Products (${products.length})` },
            { id: 'categories', label: `Categories (${categories.length})` },
            { id: 'payments', label: `Payments (${paymentMethods.length})` },
          ] as { id: AdminTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer min-h-[44px] ${
              activeTab === tab.id
                ? 'clay-button'
                : 'bg-white border border-[#EADCE4] rounded-2xl text-[#5B455C] hover:bg-[#FFF1F5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {adminError && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-4 text-xs font-medium">
          {adminError}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 5 Required Order Summary KPI Cards in Kawaii Clay 3D Square Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setOrderFilter('all');
                setActiveTab('orders');
              }}
              className="clay-card-pink p-4 sm:p-5 text-left flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#7A3151]">Total Orders</span>
                <ShoppingBag className="w-4 h-4 text-[#D93D7A] shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#352336] tabular-nums">
                  {orderSummary.totalOrders}
                </p>
                <p className="text-[11px] text-[#6D586E] mt-1">All recorded orders</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderFilter('pending');
                setActiveTab('orders');
              }}
              className="clay-card-butter p-4 sm:p-5 text-left flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#7D5A11]">New Orders</span>
                <Clock className="w-4 h-4 text-[#B7791F] shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#352336] tabular-nums">
                  {orderSummary.newOrdersCount}
                </p>
                <p className="text-[11px] text-[#6D586E] mt-1">Pending & WhatsApp new</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderFilter('processing');
                setActiveTab('orders');
              }}
              className="clay-card-blue p-4 sm:p-5 text-left flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1E5485]">Processing</span>
                <RefreshCw className="w-4 h-4 text-[#2563EB] shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#352336] tabular-nums">
                  {orderSummary.processingOrdersCount}
                </p>
                <p className="text-[11px] text-[#6D586E] mt-1 tabular-nums">
                  {orderSummary.confirmedOrdersCount} confirmed · {orderSummary.inProcessingOnlyCount} active
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderFilter('completed');
                setActiveTab('orders');
              }}
              className="clay-card-mint p-4 sm:p-5 text-left flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#166534]">Completed</span>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#352336] tabular-nums">
                  {orderSummary.completedOrdersCount}
                </p>
                <p className="text-[11px] text-[#6D586E] mt-1 tabular-nums">
                  {orderSummary.cancelledOrdersCount} cancelled
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderFilter('all');
                setActiveTab('orders');
              }}
              className="col-span-2 lg:col-span-1 clay-card-lavender p-4 sm:p-5 text-left flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#5A398E]">Total Order Value</span>
                <DollarSign className="w-4 h-4 text-[#6D47A6] shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#352336] tabular-nums">
                  {formatUSD(orderSummary.totalOrderValue)}
                </p>
                <p className="text-[11px] text-[#6D586E] mt-1 tabular-nums">
                  Paid/Done: {formatUSD(orderSummary.completedOrderValue)}
                </p>
              </div>
            </button>
          </div>

          {/* Recent Orders & Catalog Quick Health */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 clay-card p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                    Recent Orders
                  </h2>
                  <p className="text-xs text-[#6D586E]">
                    Sorted by newest orders first. Tap any order to inspect or update status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="clay-button-soft px-3.5 py-2 text-xs font-semibold cursor-pointer"
                >
                  View All Orders
                </button>
              </div>

              {adminDataLoading ? (
                <div className="space-y-2.5">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-20 rounded-2xl bg-[#F7EEF4] animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="bg-[#FFF8FB] border border-[#F2E0E8] rounded-2xl p-6 text-center text-xs text-[#6D586E]">
                  No signed-in customer orders recorded in Firestore yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#F2E0E8] rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 hover:border-[#D93D7A]/40 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#352336]">
                            {order.orderNumber}
                          </span>
                          <AdminOrderStatusTag status={order.orderStatus} />
                        </div>
                        <p className="text-xs text-[#5D495E]">
                          <strong className="text-[#352336]">{order.customerName}</strong>
                          {order.customerWhatsapp ? ` · ${order.customerWhatsapp}` : ''} ·{' '}
                          {formatIsoDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 ml-auto">
                        <span className="text-sm font-bold text-[#352336] tabular-nums">
                          {formatUSD(order.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingOrder(order)}
                          className="clay-button-soft px-3 py-1.5 text-xs font-semibold cursor-pointer min-h-[38px]"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="clay-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-[#D93D7A]" aria-hidden="true" />
                  <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                    Catalog & Payment Status
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="clay-card-pink p-3.5">
                    <p className="text-[#7A3151]">Sticker Products</p>
                    <p className="text-xl font-bold text-[#352336] tabular-nums mt-0.5">
                      {catalogMetrics.totalProducts}
                    </p>
                    <p className="text-[11px] text-[#6D586E] mt-0.5">
                      {catalogMetrics.publishedCount} active · {catalogMetrics.draftCount} hidden
                    </p>
                  </div>
                  <div className="clay-card-lavender p-3.5">
                    <p className="text-[#5A398E]">Payment Methods</p>
                    <p className="text-xl font-bold text-[#352336] tabular-nums mt-0.5">
                      {catalogMetrics.enabledPaymentMethods}
                    </p>
                    <p className="text-[11px] text-[#6D586E] mt-0.5">
                      {catalogMetrics.activeGrants} WhatsApp deliveries ready
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono text-[#6D586E] bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-3 space-y-1">
                  <p>
                    Source:{' '}
                    <strong className="text-[#352336]">
                      {catalogSource === 'firestore' ? 'Live Cloud Firestore' : 'Sample Preview'}
                    </strong>
                  </p>
                  <p>
                    Firestore: <strong className="text-[#352336]">{firestoreConnected ? 'Connected' : 'Checking'}</strong>
                  </p>
                  <p className="truncate">Project: {FIREBASE_PROJECT_INFO.projectId}</p>
                </div>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleSeedCatalog}
                    disabled={seeding}
                    className="clay-button w-full px-4 py-2.5 text-xs font-semibold disabled:opacity-60 cursor-pointer min-h-[44px]"
                  >
                    {seeding
                      ? 'Syncing Missing Items...'
                      : catalogSource === 'sample'
                        ? 'Sync Initial Catalog to Firestore'
                        : 'Sync Missing Sample Items (Non-Destructive)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMigrateLegacyPreviews}
                    disabled={migratingPreviews}
                    className="clay-button-soft w-full px-4 py-2.5 text-xs font-semibold disabled:opacity-60 cursor-pointer min-h-[44px]"
                  >
                    {migratingPreviews
                      ? 'Migrating Legacy Previews...'
                      : 'Migrate Legacy Previews to /previews'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="clay-button-soft w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold cursor-pointer min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Export Backup (JSON)</span>
                  </button>
                </div>
              </div>

              {/* System Security, App Check & Fulfillment Mode Card */}
              <div className="clay-card p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#16A34A]" aria-hidden="true" />
                  <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                    System Security & Delivery
                  </h2>
                </div>
                <ul className="space-y-2 text-xs text-[#5D495E]">
                  <li className="flex items-start justify-between gap-2 bg-[#FFFBF9] border border-[#EFE3E9] rounded-xl px-3 py-2">
                    <span className="font-semibold text-[#352336]">Firebase App Check</span>
                    <span
                      className={`font-mono font-bold ${
                        APP_CHECK_STATUS.configured ? 'text-[#166534]' : 'text-[#9A5B13]'
                      }`}
                    >
                      {APP_CHECK_STATUS.configured ? 'ACTIVE (reCAPTCHA v3)' : 'NOT CONFIGURED'}
                    </span>
                  </li>
                  <li className="flex items-start justify-between gap-2 bg-[#FFFBF9] border border-[#EFE3E9] rounded-xl px-3 py-2">
                    <span className="font-semibold text-[#352336]">Delivery Mode</span>
                    <span className="font-mono font-bold text-[#A61E56]">Manual WhatsApp Only</span>
                  </li>
                  <li className="flex items-start justify-between gap-2 bg-[#FFFBF9] border border-[#EFE3E9] rounded-xl px-3 py-2">
                    <span className="font-semibold text-[#352336]">Storage Rules</span>
                    <span className="font-mono text-[#6D586E]">storage.rules ready</span>
                  </li>
                </ul>
                <p className="text-[11px] text-[#7E687F] leading-relaxed">
                  {APP_CHECK_STATUS.note}
                </p>
              </div>
            </div>
          </div>

          {/* Safe JSON Backup Restore & Audit Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 clay-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-[#D93D7A]" aria-hidden="true" />
                  <div>
                    <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                      Restore Store Data from JSON Backup
                    </h2>
                    <p className="text-xs text-[#6D586E]">
                      Validates schema (&le;5MB), rejects unsafe URLs, auto-downloads a safety backup first, and logs every restore.
                    </p>
                  </div>
                </div>
              </div>

              <label className="clay-button-soft inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer min-h-[44px]">
                <FileUp className="w-4 h-4" aria-hidden="true" />
                <span>{restoreFileName ? `Selected: ${restoreFileName}` : 'Choose Backup JSON File'}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleRestoreFileSelect}
                  className="sr-only"
                />
              </label>

              {restoreError && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-3.5 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSummary && (
                <div className="bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#352336]">
                      {restoreSummary.valid ? 'Validation Passed' : 'Validation Failed'}
                    </span>
                    <span className="font-mono text-[#7E687F]">
                      Exported {formatIsoDateTime(restoreSummary.exportedAt, lang)} by {restoreSummary.exportedBy || 'admin'}
                    </span>
                  </div>

                  {restoreSummary.warnings.length > 0 && (
                    <ul className="text-xs text-[#9A5B13] bg-[#FFF5E2] border border-[#F5D8A3] rounded-xl p-3 space-y-1">
                      {restoreSummary.warnings.map((w, idx) => (
                        <li key={idx}>• {w}</li>
                      ))}
                    </ul>
                  )}

                  {restoreSummary.valid && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {(
                          [
                            {
                              key: 'categories' as RestoreSectionKey,
                              label: `Categories (${restoreSummary.counts.categories})`,
                            },
                            {
                              key: 'products' as RestoreSectionKey,
                              label: `Products (${restoreSummary.counts.products})`,
                            },
                            {
                              key: 'paymentMethods' as RestoreSectionKey,
                              label: `Payments (${restoreSummary.counts.paymentMethods})`,
                            },
                            {
                              key: 'orders' as RestoreSectionKey,
                              label: `Orders (${restoreSummary.counts.orders})`,
                            },
                          ]
                        ).map((sec) => (
                          <label
                            key={sec.key}
                            className="flex items-center gap-2 bg-white border border-[#EADCE4] rounded-xl px-3 py-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={restoreSections[sec.key]}
                              onChange={(e) =>
                                setRestoreSections((prev) => ({
                                  ...prev,
                                  [sec.key]: e.target.checked,
                                }))
                              }
                              className="accent-[#D93D7A] w-4 h-4"
                            />
                            <span className="font-medium text-[#352336]">{sec.label}</span>
                          </label>
                        ))}
                      </div>

                      <label className="flex items-start gap-2.5 text-xs text-[#5D495E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restoreConfirmed}
                          onChange={(e) => setRestoreConfirmed(e.target.checked)}
                          className="accent-[#D93D7A] w-4 h-4 mt-0.5"
                        />
                        <span>
                          I confirm restoring selected sections. A fresh safety backup of current Firestore records will automatically download first.
                        </span>
                      </label>

                      <button
                        type="button"
                        disabled={
                          restoring ||
                          !restoreConfirmed ||
                          !Object.values(restoreSections).some(Boolean)
                        }
                        onClick={handleExecuteRestore}
                        className="clay-button px-5 py-2.5 text-xs font-semibold disabled:opacity-50 cursor-pointer min-h-[44px]"
                      >
                        {restoring ? 'Executing Safe Restore...' : 'Execute Safe Restore'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {restoreResult && (
                <div className="bg-[#ECFDF5] border border-[#BBF7D0] text-[#166534] rounded-2xl p-4 text-xs space-y-1">
                  <p className="font-bold">Restore Completed Successfully</p>
                  <p>
                    Safety snapshot saved: <code className="font-mono">{restoreResult.safetyBackupFilename}</code>
                  </p>
                  <p>
                    Written: {restoreResult.writtenCounts.categories} categories,{' '}
                    {restoreResult.writtenCounts.products} products,{' '}
                    {restoreResult.writtenCounts.paymentMethods} payment methods,{' '}
                    {restoreResult.writtenCounts.orders} orders (skipped: {restoreResult.skippedCount}).
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 clay-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#6D47A6]" aria-hidden="true" />
                <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                  Admin Audit Log ({auditLogs.length})
                </h2>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-[#6D586E] bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-4">
                  No restore or preview-migration audit entries recorded yet.
                </p>
              ) : (
                <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {auditLogs.map((entry) => (
                    <li
                      key={entry.id}
                      className="bg-white border border-[#EFE3E9] rounded-2xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#5A398E] uppercase">
                          {entry.action.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-[#7E687F]">
                          {formatIsoDateTime(entry.createdAt, lang)}
                        </span>
                      </div>
                      <p className="font-semibold text-[#352336]">{entry.summary}</p>
                      <p className="text-[11px] text-[#6D586E]">
                        {entry.actorEmail} · {entry.details}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: ORDERS & HISTORY */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          {/* Search, Sort & Status Filters */}
          <div className="clay-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#8D788E] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order #, customer name, WhatsApp number, or product..."
                  aria-label="Search orders"
                  className="clay-input w-full pl-10 pr-4 py-2.5 text-sm min-h-[44px]"
                />
              </div>

              <button
                type="button"
                onClick={() => setOrderSort((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                className="clay-button-soft inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer min-h-[44px] shrink-0"
              >
                <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{orderSort === 'newest' ? 'Sort: Newest First' : 'Sort: Oldest First'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(
                [
                  { id: 'all', label: `All (${orderSummary.totalOrders})` },
                  { id: 'pending', label: `Pending (${orderSummary.newOrdersCount})` },
                  { id: 'confirmed', label: `Confirmed (${orderSummary.confirmedOrdersCount})` },
                  { id: 'processing', label: `Processing (${orderSummary.inProcessingOnlyCount})` },
                  { id: 'completed', label: `Completed (${orderSummary.completedOrdersCount})` },
                  { id: 'cancelled', label: `Cancelled (${orderSummary.cancelledOrdersCount})` },
                  ...(orderSummary.awaitingVerificationCount > 0
                    ? [
                        {
                          id: 'awaiting_verification' as AdminOrderFilter,
                          label: `Payment Review (${orderSummary.awaitingVerificationCount})`,
                        },
                      ]
                    : []),
                ] as { id: AdminOrderFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold cursor-pointer transition-colors min-h-[38px] ${
                    orderFilter === f.id
                      ? 'bg-[#352336] text-white shadow-sm'
                      : 'bg-white border border-[#EADCE4] text-[#5B455C] hover:bg-[#FFF1F5]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Card Grid (Android-friendly & Kawaii Clay 3D) */}
          {adminDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-56 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="clay-card p-10 text-center space-y-2">
              <Package className="w-8 h-8 text-[#D93D7A] mx-auto" aria-hidden="true" />
              <p className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                No matching orders found
              </p>
              <p className="text-xs text-[#6D586E] max-w-md mx-auto">
                {orders.length === 0
                  ? 'Orders placed by signed-in customers will appear here automatically for confirmation and tracking.'
                  : 'Try clearing your search text or selecting a different order status filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map((order) => {
                const items = getOrderLineItemsSummary(order, orderItems);
                const selectValue = PHASE3_ORDER_STATUS_OPTIONS.some(
                  (opt) => opt.value === order.orderStatus
                )
                  ? order.orderStatus
                  : order.orderStatus === 'pending_contact'
                    ? 'pending'
                    : order.orderStatus === 'paid'
                      ? 'completed'
                      : 'cancelled';

                return (
                  <article
                    key={order.id}
                    className="clay-card p-4 sm:p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3.5">
                      {/* Card Top Bar */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#F2E0E8] pb-3">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#352336]">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-[#7E687F] mt-0.5">
                            {formatIsoDateTime(order.createdAt)}
                          </p>
                        </div>
                        <AdminOrderStatusTag status={order.orderStatus} />
                      </div>

                      {/* Customer & Contact Info */}
                      <div className="clay-card-pink p-3.5 space-y-1 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-sm text-[#352336]">{order.customerName}</p>
                          <span className="text-[11px] font-semibold text-[#A61E56]">
                            {order.checkoutChannel === 'whatsapp' ? 'WhatsApp Order' : 'Manual Checkout'}
                          </span>
                        </div>
                        <p className="text-[#5D495E] flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-[#D93D7A] shrink-0" aria-hidden="true" />
                          <span className="font-mono font-semibold">
                            {order.customerWhatsapp || 'No customer WhatsApp provided'}
                          </span>
                        </p>
                        <p className="text-[#6D586E] truncate">{order.customerEmail}</p>
                      </div>

                      {/* Purchased Products & Quantities */}
                      <div className="bg-[#FAF7FE] border border-[#E5DDF7] rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#5A398E]">
                          <span>Products Purchased</span>
                          <span className="tabular-nums">{order.itemCount} item(s)</span>
                        </div>
                        {items.length > 0 ? (
                          <ul className="space-y-1.5 text-xs">
                            {items.slice(0, 3).map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between gap-2 text-[#352336]"
                              >
                                <span className="truncate font-medium">
                                  {item.productName}{' '}
                                  <strong className="text-[#B8255F]">× {item.quantity}</strong>
                                </span>
                                <span className="tabular-nums text-[#6D586E] shrink-0">
                                  {formatUSD(item.lineTotal)}
                                </span>
                              </li>
                            ))}
                            {items.length > 3 && (
                              <li className="text-[11px] text-[#7E687F]">
                                +{items.length - 3} more item(s) inside Order Detail
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#6D586E]">
                            {order.itemCount} item(s) · Open detail to inspect.
                          </p>
                        )}
                      </div>

                      {/* Payment & Total Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                        <div className="flex items-center gap-2 text-[#5D495E]">
                          <CreditCard className="w-3.5 h-3.5 text-[#7E687F]" aria-hidden="true" />
                          <span>{formatPaymentStatus(order.paymentStatus)}</span>
                          {order.verificationHistory.length > 0 && (
                            <span className="text-[#7E687F]">
                              · {order.verificationHistory.length} log(s)
                            </span>
                          )}
                        </div>
                        <div className="text-right tabular-nums">
                          <span className="text-[11px] text-[#7E687F] mr-1.5">Total:</span>
                          <span className="text-base font-bold text-[#352336]">
                            {formatUSD(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Android-Friendly Quick Status Control + Detail Modal */}
                    <div className="pt-3 border-t border-[#F2E0E8] flex flex-col sm:flex-row gap-2.5">
                      <select
                        aria-label={`Change status for ${order.orderNumber}`}
                        value={selectValue}
                        disabled={updatingOrderId === order.id}
                        onChange={(e) =>
                          handleQuickOrderStatusChange(order, e.target.value as OrderStatus)
                        }
                        className="clay-input flex-1 px-3 py-2 text-xs font-semibold text-[#352336] min-h-[44px] cursor-pointer"
                      >
                        {PHASE3_ORDER_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            Status: {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className={`px-4 py-2 text-xs font-semibold cursor-pointer min-h-[44px] ${
                          order.paymentStatus === 'awaiting_verification'
                            ? 'clay-button'
                            : 'clay-button-soft'
                        }`}
                      >
                        {order.paymentStatus === 'awaiting_verification'
                          ? 'Verify Payment'
                          : 'Order Details'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Internal WhatsApp Fulfillment Queue */}
          <div className="clay-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                Manual WhatsApp Fulfillment Queue ({downloadAccessList.length})
              </h2>
            </div>

            {downloadAccessList.length === 0 ? (
              <p className="text-xs text-[#6D586E]">
                No fulfillment items queued yet. Approve a payment inside any order detail modal to mark items ready for manual WhatsApp delivery (+6281238078363).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {downloadAccessList.map((da) => (
                  <div
                    key={da.id}
                    className="bg-white border border-[#EFE3E9] rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#352336] truncate">
                        {da.productName}
                      </p>
                      <p className="font-mono text-[11px] text-[#6D586E] truncate">
                        Ref: {da.assetKey}
                      </p>
                      <p className="text-[11px] text-[#7E687F] mt-0.5">
                        Verified by {da.grantedBy} ·{' '}
                        <strong className={da.authorized ? 'text-[#166534]' : 'text-[#B91C1C]'}>
                          {da.authorized ? 'Ready for WhatsApp Delivery' : 'On Hold'}
                        </strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setAdminError(null);
                        try {
                          await adminSetDownloadAccessAuthorized(
                            da.id,
                            !da.authorized,
                            user.email || ADMIN_EMAIL
                          );
                          await loadAdminRecords();
                          showToast(
                            da.authorized
                              ? 'Fulfillment placed on hold.'
                              : 'Marked ready for manual WhatsApp delivery.'
                          );
                        } catch (err) {
                          setAdminError(
                            err instanceof Error
                              ? err.message
                              : 'Could not update fulfillment status.'
                          );
                        }
                      }}
                      className="clay-button-soft px-3.5 py-2 text-xs font-semibold cursor-pointer min-h-[40px] shrink-0"
                    >
                      {da.authorized ? 'Hold' : 'Mark Ready'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS (Kawii Clay 3D Square Card Grid) */}
      {activeTab === 'products' && (
        <div className="space-y-5">
          <div className="clay-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#8D788E] absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filter products by name or category..."
                aria-label="Filter products"
                className="clay-input w-full pl-10 pr-4 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {catalogSource === 'sample' && (
                <button
                  type="button"
                  onClick={handleSeedCatalog}
                  disabled={seeding}
                  className="clay-button-soft px-4 py-2.5 text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer min-h-[44px]"
                >
                  {seeding ? 'Syncing...' : 'Sync Sample Catalog'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="clay-button inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product) => {
              const isConfirmingDelete = confirmDeleteProductId === product.id;

              return (
                <article
                  key={product.id}
                  className="clay-card p-3 sm:p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#FDF6F8] border border-[#F2E0E8]">
                      <SafeImage
                        src={product.previewImages[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(product)}
                        className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer ${
                          product.published
                            ? 'bg-[#E8FBF1]/95 text-[#166534] border border-[#BBEFD4]'
                            : 'bg-[#FAF5F8]/95 text-[#6D586E] border border-[#E6D6DF]'
                        }`}
                      >
                        {product.published ? (
                          <>
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" aria-hidden="true" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#B8255F] truncate">
                        {product.categoryName} · {formatProductType(product.productType)}
                      </p>
                      <h3 className="font-[var(--font-display)] text-sm sm:text-base font-bold text-[#352336] leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 tabular-nums pt-0.5">
                        <span className="text-sm sm:text-base font-bold text-[#352336]">
                          {formatUSD(product.salePrice ?? product.price)}
                        </span>
                        {product.salePrice != null && (
                          <span className="text-xs text-[#8D788E] line-through">
                            {formatUSD(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Product Card Actions */}
                  {isConfirmingDelete ? (
                    <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-2.5 space-y-2">
                      <p className="text-[11px] font-semibold text-[#991B1B] text-center">
                        Delete this product?
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProductId(null)}
                          className="px-2 py-2 rounded-xl bg-white border border-[#EADCE4] text-xs font-semibold text-[#5D495E] cursor-pointer min-h-[38px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-2 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer min-h-[38px]"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F2E0E8]">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="clay-button-soft inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold cursor-pointer min-h-[40px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProductId(product.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-2xl border border-[#FECACA] bg-[#FFF8F8] text-[#B91C1C] text-xs font-semibold hover:bg-[#FEF2F2] cursor-pointer min-h-[40px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSaveCategory} className="lg:col-span-4 clay-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                {catEditId ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  if (!catEditId) setCatSlug(slugify(e.target.value));
                }}
                placeholder="e.g., Pastel Memos"
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">Slug</label>
              <input
                type="text"
                required
                maxLength={80}
                value={catSlug}
                onChange={(e) => setCatSlug(slugify(e.target.value))}
                className="clay-input w-full px-3.5 py-2.5 text-sm font-mono min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Description
              </label>
              <textarea
                rows={2}
                maxLength={280}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={catSortOrder}
                onChange={(e) => setCatSortOrder(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm tabular-nums min-h-[44px]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={catSaving}
                className="clay-button flex-1 py-2.5 px-4 text-sm font-semibold disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                {catSaving ? 'Saving...' : catEditId ? 'Update Category' : 'Add Category'}
              </button>
              {catEditId && (
                <button
                  type="button"
                  onClick={() => {
                    setCatEditId(null);
                    setCatName('');
                    setCatSlug('');
                    setCatDesc('');
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-[#EADCE4] bg-white text-sm font-semibold text-[#6D586E] cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {categories.map((cat) => (
              <div key={cat.id} className="clay-card p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[var(--font-display)] font-bold text-[#352336]">
                      {cat.name}
                    </span>
                    <span className="text-xs font-mono text-[#7E687F] tabular-nums">
                      #{cat.sortOrder}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#B8255F]">{cat.slug}</p>
                  <p className="text-xs text-[#6D586E]">{cat.description}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#F2E0E8]">
                  <button
                    type="button"
                    onClick={() => {
                      setCatEditId(cat.id);
                      setCatName(cat.name);
                      setCatSlug(cat.slug);
                      setCatDesc(cat.description);
                      setCatSortOrder(String(cat.sortOrder));
                    }}
                    className="clay-button-soft px-3 py-1.5 text-xs font-semibold cursor-pointer min-h-[38px]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="px-3 py-1.5 rounded-xl border border-[#FECACA] bg-[#FFF8F8] text-[#B91C1C] text-xs font-semibold hover:bg-[#FEF2F2] cursor-pointer min-h-[38px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PAYMENT SETTINGS */}
      {activeTab === 'payments' && (
        <AdminPaymentMethodsSection
          paymentMethods={paymentMethods}
          adminConfig={paymentAdminConfig}
          adminEmail={user.email || ADMIN_EMAIL}
          onRefresh={loadAdminRecords}
          showToast={showToast}
        />
      )}

      {/* Modals */}
      {editingProduct !== undefined && (
        <AdminProductModal
          product={editingProduct}
          categories={categories}
          seedIfSample={catalogSource === 'sample'}
          onClose={() => setEditingProduct(undefined)}
          onSaved={refreshCatalog}
        />
      )}

      {editingOrder && (
        <AdminOrderModal
          order={editingOrder}
          orderItems={orderItems.filter((item) => item.orderId === editingOrder.id)}
          allProducts={products}
          adminEmail={user.email || ADMIN_EMAIL}
          onClose={() => setEditingOrder(null)}
          onUpdated={loadAdminRecords}
        />
      )}
    </div>
  );
}
