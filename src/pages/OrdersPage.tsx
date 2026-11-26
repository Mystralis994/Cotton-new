import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { AppLang, interpolate } from '../i18n/translations';
import { fetchUserOrderItems, fetchUserOrders } from '../services/firestoreStore';
import { SHOP_WHATSAPP_BASE_URL, SHOP_WHATSAPP_DISPLAY } from '../services/whatsappCheckout';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '../types/store';
import {
  formatIsoDate,
  formatOrderStatus,
  formatPaymentStatus,
  formatUSD,
} from '../utils/formatters';

function OrderStatusLabel({ status, lang }: { status: OrderStatus; lang: AppLang }) {
  const label = formatOrderStatus(status, lang);
  switch (status) {
    case 'completed':
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D47A6]">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'pending_contact':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8255F]">
          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A5B13]">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'cancelled':
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'refunded':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D586E]">
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
  }
}

function PaymentStatusLabel({ status, lang }: { status: PaymentStatus; lang: AppLang }) {
  const label = formatPaymentStatus(status, lang);
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'awaiting_verification') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D47A6]">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'rejected' || status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]">
        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A5B13]">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function OrdersPage() {
  const { user, signInWithGoogle, signOutUser, authLoading, navigate, isAdmin, lang, t } =
    useStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [o, items] = await Promise.all([
        fetchUserOrders(user.uid),
        fetchUserOrderItems(user.uid),
      ]);
      setOrders(o);
      setOrderItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.serverRejected);
    } finally {
      setLoading(false);
    }
  }, [user, t.errors.serverRejected]);

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setOrders([]);
      setOrderItems([]);
    }
  }, [user, loadOrders]);

  if (authLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-16">
        <div className="h-48 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-[#EFE3E9] rounded-3xl p-8 sm:p-10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF1F5] text-[#D93D7A] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#352336]">
            {t.orders.signInTitle}
          </h1>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto leading-relaxed">
            {t.orders.signInBody}
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-6 py-2.5 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] transition-colors cursor-pointer"
          >
            {t.common.signInGoogle}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-10 space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE3E9] pb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-[#352336]">
            {t.orders.pageTitle}
          </h1>
          <p className="text-sm text-[#6D586E] mt-1">
            {t.common.signedInAs} <strong className="text-[#352336]">{user.email}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate({ page: 'admin' })}
              className="px-4 py-2 rounded-xl bg-[#F4F1FC] border border-[#DFD8F5] text-[#4C3475] text-xs font-semibold hover:bg-[#EAE4FA] transition-colors cursor-pointer"
            >
              {t.orders.openAdmin}
            </button>
          )}
          <button
            type="button"
            onClick={loadOrders}
            className="px-4 py-2 rounded-xl bg-white border border-[#EADCE4] text-[#352336] text-xs font-semibold hover:bg-[#FFF1F5] transition-colors cursor-pointer"
          >
            {t.common.refresh}
          </button>
          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#EADCE4] text-[#6D586E] text-xs font-semibold hover:text-[#352336] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.common.signOut}</span>
          </button>
        </div>
      </div>

      {/* Digital Delivery Policy Card (No customer download portals on site) */}
      <div className="clay-card-lavender p-5 flex items-start gap-3.5 text-xs text-[#4C3475] leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-[#6D47A6] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold text-sm text-[#352336] mb-0.5">{t.orders.deliveryInfoTitle}</p>
          <p>{interpolate(t.orders.deliveryInfoBody, { phone: SHOP_WHATSAPP_DISPLAY })}</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-36 rounded-2xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#EFE3E9] rounded-3xl p-10 text-center space-y-4">
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[#352336]">
            {t.orders.emptyTitle}
          </h2>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto">{t.orders.emptyBody}</p>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="px-5 py-2.5 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] transition-colors cursor-pointer"
          >
            {t.orders.browsePacks}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const items = orderItems.filter((item) => item.orderId === order.id);
            const isVerifiedPaid =
              (order.orderStatus === 'paid' ||
                order.orderStatus === 'completed' ||
                order.orderStatus === 'confirmed') &&
              order.paymentStatus === 'paid';
            const needsCustomerAction =
              order.paymentStatus === 'unpaid' ||
              order.paymentStatus === 'rejected' ||
              order.paymentStatus === 'pending';

            const waMessage =
              lang === 'id'
                ? `Halo Cotton Candy Sticker! 🍬 Saya ingin menanyakan pesanan ${order.orderNumber} (${formatUSD(order.total)}).`
                : `Hello Cotton Candy Sticker! 🍬 I am following up on order ${order.orderNumber} (${formatUSD(order.total)}).`;

            return (
              <section
                key={order.id}
                className="bg-white border border-[#EFE3E9] rounded-3xl p-6 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3E7ED] pb-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#352336]">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-[#7E687F] mt-0.5">
                      {formatIsoDate(order.createdAt, lang)} · {order.customerCountry}
                      {order.paymentMethodName ? ` · ${order.paymentMethodName}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#7E687F]">
                        {t.orders.orderStatusLabel}
                      </p>
                      <OrderStatusLabel status={order.orderStatus} lang={lang} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#7E687F]">
                        {t.orders.paymentStatusLabel}
                      </p>
                      <PaymentStatusLabel status={order.paymentStatus} lang={lang} />
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-[11px] uppercase tracking-wider text-[#7E687F]">
                        {t.orders.totalLabel}
                      </p>
                      <p className="text-base font-bold text-[#352336]">
                        {formatUSD(order.total)}
                      </p>
                    </div>
                  </div>
                </div>

                {order.paymentStatus === 'rejected' && order.rejectionReason && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-3.5 text-xs text-[#991B1B]">
                    <strong>{t.orders.paymentRejectedPrefix}</strong> {order.rejectionReason}
                  </div>
                )}

                {order.paymentReference && (
                  <div className="text-xs text-[#6D586E] flex flex-wrap items-center justify-between gap-2 bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl px-4 py-2.5">
                    <span>
                      {t.orders.submittedRefPrefix}{' '}
                      <code className="font-mono font-semibold text-[#352336]">
                        {order.paymentReference}
                      </code>
                    </span>
                    {order.paymentSubmittedAt && (
                      <span className="text-[#7E687F]">
                        {t.orders.submittedDatePrefix} {formatIsoDate(order.paymentSubmittedAt, lang)}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 clay-card-pink px-4 py-3 text-xs">
                  <div className="space-y-0.5 text-[#5D495E]">
                    <p className="font-semibold text-[#352336]">
                      {interpolate(t.orders.waChannelTitle, { phone: SHOP_WHATSAPP_DISPLAY })}
                    </p>
                    {(order.customerWhatsapp || order.customerNote) && (
                      <p className="text-[#6D586E]">
                        {order.customerWhatsapp ? `WhatsApp: ${order.customerWhatsapp}` : ''}
                        {order.customerWhatsapp && order.customerNote ? ' · ' : ''}
                        {order.customerNote ? `${order.customerNote}` : ''}
                      </p>
                    )}
                  </div>
                  <a
                    href={`${SHOP_WHATSAPP_BASE_URL}?text=${encodeURIComponent(waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clay-button-soft inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.orders.continueOnWa}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>

                {order.paymentMethodSnapshot && !isVerifiedPaid && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FDF4F7] border border-[#F2DCE6] rounded-2xl px-4 py-3">
                    <div className="text-xs text-[#5D495E]">
                      {order.paymentStatus === 'awaiting_verification'
                        ? t.orders.underReviewNote
                        : order.paymentStatus === 'rejected'
                          ? t.orders.resubmitNote
                          : t.orders.completePaymentNote}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'order-payment', orderId: order.id })}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        needsCustomerAction
                          ? 'bg-[#D93D7A] text-white hover:bg-[#BE2F68]'
                          : 'bg-white border border-[#EADCE4] text-[#352336] hover:bg-[#FFF1F5]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {order.paymentStatus === 'rejected'
                          ? t.orders.resubmitBtn
                          : order.paymentStatus === 'awaiting_verification'
                            ? t.orders.viewInstructionsBtn
                            : t.orders.payConfirmBtn}
                      </span>
                    </button>
                  </div>
                )}

                {/* Line Items & Manual WhatsApp Delivery Status (No website download buttons/modals) */}
                <ul className="divide-y divide-[#F6ECF0]">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-12 rounded-xl overflow-hidden bg-[#FDF6F8] border border-[#EFE3E9] shrink-0">
                          <SafeImage
                            src={item.previewImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#352336]">{item.productName}</p>
                          <p className="text-xs text-[#7E687F] tabular-nums">
                            {item.fileFormat} · {t.common.qty} {item.quantity} ×{' '}
                            {formatUSD(item.priceSnapshot)}
                          </p>
                        </div>
                      </div>

                      {isVerifiedPaid ? (
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] bg-[#ECFDF5] border border-[#BBF7D0] px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.orders.manualDeliveryReadyBadge}</span>
                          </span>
                          <a
                            href={`${SHOP_WHATSAPP_BASE_URL}?text=${encodeURIComponent(waMessage)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EADCE4] text-xs font-semibold text-[#352336] hover:bg-[#FFF1F5]"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#D93D7A]" aria-hidden="true" />
                            <span>{interpolate(t.orders.needFilesWaLink, { phone: SHOP_WHATSAPP_DISPLAY })}</span>
                          </a>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#7E687F] bg-[#FAF5F8] border border-[#EFE3E9] px-3 py-1.5 rounded-xl self-start sm:self-auto">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            {order.paymentStatus === 'awaiting_verification'
                              ? t.orders.manualDeliveryAwaitingBadge
                              : t.orders.manualDeliveryPendingBadge}
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
