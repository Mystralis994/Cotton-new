import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Lock,
  QrCode,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { interpolate } from '../i18n/translations';
import {
  fetchOrderById,
  fetchOrderItemsForOrder,
  submitCustomerPaymentConfirmation,
} from '../services/firestoreStore';
import { SHOP_WHATSAPP_DISPLAY } from '../services/whatsappCheckout';
import { Order, OrderItem, PaymentMethodSnapshot } from '../types/store';
import {
  formatIsoDate,
  formatPaymentMethodType,
  formatPaymentStatus,
  formatUSD,
  isSafeHttpsUrl,
} from '../utils/formatters';

interface OrderPaymentPageProps {
  orderId: string;
}

export function OrderPaymentPage({ orderId }: OrderPaymentPageProps) {
  const { user, authLoading, isAdmin, signInWithGoogle, navigate, showToast, lang, t } =
    useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentReference, setPaymentReference] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadOrderData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const foundOrder = await fetchOrderById(orderId);
      if (!foundOrder) {
        setOrder(null);
        setError(t.orderPayment.unavailableTitle);
        return;
      }
      const orderItems = await fetchOrderItemsForOrder({
        orderId: foundOrder.id,
        orderOwnerId: foundOrder.userId,
        isAdmin,
      });
      setOrder(foundOrder);
      setItems(orderItems);
      setPaymentReference(foundOrder.paymentReference || '');
      setCustomerNote(foundOrder.customerPaymentNote || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.orderPayment.unavailableTitle);
    } finally {
      setLoading(false);
    }
  }, [orderId, user, isAdmin, t.orderPayment.unavailableTitle]);

  useEffect(() => {
    if (!authLoading && user) {
      loadOrderData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, loadOrderData]);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} ✓`);
    } catch {
      showToast(t.toasts.copyFailed);
    }
  };

  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || submitting) return;
    setSubmitError(null);

    const cleanRef = paymentReference.trim();
    if (cleanRef.length < 2) {
      setSubmitError(t.errors.paymentRefTooShort);
      return;
    }

    setSubmitting(true);
    try {
      await submitCustomerPaymentConfirmation({
        orderId: order.id,
        paymentReference: cleanRef,
        customerPaymentNote: customerNote.trim(),
      });
      await loadOrderData();
      showToast(t.toasts.paymentConfirmed);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.errors.serverRejected);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-14 space-y-4">
        <div className="h-12 w-56 rounded-2xl bg-[#F7EEF4] animate-pulse" />
        <div className="h-64 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]" />
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
            {t.orderPayment.signInTitle}
          </h1>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto leading-relaxed">
            {t.orderPayment.signInBody}
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

  if (error || !order) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-14 text-center">
        <div className="bg-white border border-[#EFE3E9] rounded-3xl p-8 space-y-4">
          <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto" aria-hidden="true" />
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#352336]">
            {t.orderPayment.unavailableTitle}
          </h1>
          <p className="text-sm text-[#6D586E]">{error || t.orderPayment.unavailableTitle}</p>
          <button
            type="button"
            onClick={() => navigate({ page: 'orders' })}
            className="px-5 py-2.5 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] cursor-pointer"
          >
            {t.common.backToOrders}
          </button>
        </div>
      </div>
    );
  }

  const snapshot: PaymentMethodSnapshot | null = order.paymentMethodSnapshot;
  const canSubmitConfirmation =
    order.orderStatus === 'pending' &&
    (order.paymentStatus === 'unpaid' ||
      order.paymentStatus === 'rejected' ||
      order.paymentStatus === 'pending');

  const safePaypalUrl =
    snapshot?.paypalLink && isSafeHttpsUrl(snapshot.paypalLink) ? snapshot.paypalLink : '';

  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Bar & Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE3E9] pb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate({ page: 'orders' })}
            className="inline-flex items-center gap-1.5 text-sm text-[#7E687F] hover:text-[#D93D7A] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t.common.backToOrders}</span>
          </button>
          <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336]">
            {t.orderPayment.headingPrefix} {order.orderNumber}
          </h1>
          <p className="text-xs sm:text-sm text-[#6D586E] mt-1">
            Order ID: <span className="font-mono text-[#352336]">{order.id}</span> ·{' '}
            {t.orderPayment.placedText} {formatIsoDate(order.createdAt, lang)} {t.orderPayment.forText}{' '}
            <strong className="text-[#352336]">{order.customerName}</strong>
          </p>
        </div>

        <div className="bg-white border border-[#EFE3E9] rounded-2xl px-4 py-3 text-left sm:text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-[#7E687F]">
            {t.orders.paymentStatusLabel}
          </p>
          {order.paymentStatus === 'paid' && (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#166534] mt-0.5">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>{formatPaymentStatus(order.paymentStatus, lang)}</span>
            </p>
          )}
          {order.paymentStatus === 'awaiting_verification' && (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6D47A6] mt-0.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{formatPaymentStatus(order.paymentStatus, lang)}</span>
            </p>
          )}
          {order.paymentStatus === 'rejected' && (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#B91C1C] mt-0.5">
              <XCircle className="w-4 h-4" aria-hidden="true" />
              <span>{formatPaymentStatus(order.paymentStatus, lang)}</span>
            </p>
          )}
          {(order.paymentStatus === 'unpaid' ||
            order.paymentStatus === 'pending' ||
            order.paymentStatus === 'failed' ||
            order.paymentStatus === 'refunded') && (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9A5B13] mt-0.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{formatPaymentStatus(order.paymentStatus, lang)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Status-Specific Alerts */}
      {order.paymentStatus === 'paid' && (
        <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <ShieldCheck className="w-6 h-6 text-[#166534] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#14532D]">
                {t.orderPayment.verifiedBannerTitle}
              </h2>
              <p className="text-sm text-[#166534] mt-0.5">
                {interpolate(t.orderPayment.verifiedBannerBody, { phone: SHOP_WHATSAPP_DISPLAY })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'orders' })}
            className="px-5 py-2.5 rounded-xl bg-[#166534] text-white text-sm font-semibold hover:bg-[#14532D] transition-colors shrink-0 cursor-pointer"
          >
            {t.orderPayment.viewOrderStatusBtn}
          </button>
        </div>
      )}

      {order.paymentStatus === 'awaiting_verification' && (
        <div className="bg-[#F4F1FC] border border-[#DFD8F5] rounded-3xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-[#4C3475] font-bold font-[var(--font-display)] text-lg">
            <Clock className="w-5 h-5" aria-hidden="true" />
            <span>{t.orderPayment.awaitingTitle}</span>
          </div>
          <p className="text-sm text-[#4C3475] leading-relaxed">
            {t.orderPayment.awaitingBodyPrefix}{' '}
            <code className="font-mono font-semibold bg-white/70 px-1.5 py-0.5 rounded">
              {order.paymentReference}
            </code>
            . {t.orderPayment.awaitingBodySuffix}
          </p>
          {order.customerPaymentNote && (
            <p className="text-xs text-[#5B4485]">
              {t.orderPayment.yourNotePrefix} &ldquo;{order.customerPaymentNote}&rdquo;
            </p>
          )}
        </div>
      )}

      {order.paymentStatus === 'rejected' && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-3xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-[#991B1B] font-bold font-[var(--font-display)] text-lg">
            <XCircle className="w-5 h-5" aria-hidden="true" />
            <span>{t.orderPayment.rejectedTitle}</span>
          </div>
          <p className="text-sm text-[#991B1B] leading-relaxed">
            {order.rejectionReason || t.orderPayment.rejectedFallback}
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Payment Instructions & Confirmation Submission */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-[#EFE3E9] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#F3E7ED] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D93D7A]">
                  {formatPaymentMethodType(snapshot?.type || order.paymentMethodType, lang)}
                </p>
                <h2 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[#352336] mt-0.5">
                  {snapshot?.name || order.paymentMethodName || 'Manual Payment'}
                </h2>
                {snapshot?.description && (
                  <p className="text-sm text-[#6D586E] mt-1">{snapshot.description}</p>
                )}
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#FFF1F5] text-[#D93D7A] flex items-center justify-center shrink-0">
                {snapshot?.type === 'qris' ? (
                  <QrCode className="w-5 h-5" aria-hidden="true" />
                ) : snapshot?.type === 'bank_transfer' ? (
                  <Building2 className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <CreditCard className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Amount Due Highlight */}
            <div className="bg-[#FDF4F7] border border-[#F2DCE6] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#7E687F]">{t.orderPayment.exactAmount}</p>
                <p className="font-[var(--font-display)] text-2xl font-bold text-[#352336] tabular-nums">
                  {formatUSD(order.total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(order.orderNumber, order.orderNumber)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EADCE4] text-xs font-semibold text-[#352336] hover:bg-[#FFF1F5] cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {t.orderPayment.copyOrderNo} {order.orderNumber}
                </span>
              </button>
            </div>

            {/* Account Details */}
            {snapshot && (
              <div className="space-y-3">
                {snapshot.bankName && (
                  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F6ECF0] text-sm">
                    <span className="text-[#7E687F]">{t.orderPayment.bankProvider}</span>
                    <span className="font-semibold text-[#352336]">{snapshot.bankName}</span>
                  </div>
                )}
                {snapshot.accountHolderName && (
                  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F6ECF0] text-sm">
                    <span className="text-[#7E687F]">{t.orderPayment.accountHolder}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#352336]">
                        {snapshot.accountHolderName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(t.orderPayment.accountHolder, snapshot.accountHolderName)
                        }
                        className="p-1.5 rounded-lg text-[#7E687F] hover:text-[#D93D7A] hover:bg-[#FFF1F5] cursor-pointer"
                        aria-label={t.orderPayment.copy}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {snapshot.accountNumber && (
                  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[#F6ECF0] text-sm">
                    <span className="text-[#7E687F]">{t.orderPayment.accountNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#352336]">
                        {snapshot.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(t.orderPayment.accountNumber, snapshot.accountNumber)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF1F5] text-[#B8255F] text-xs font-semibold hover:bg-[#FCE7F3] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>{t.orderPayment.copy}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QRIS Image Display */}
            {snapshot?.qrisImageUrl && (
              <div className="bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-5 text-center space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7E687F]">
                  {t.orderPayment.scanQris}
                </p>
                <div className="max-w-[260px] mx-auto rounded-2xl overflow-hidden border border-[#EADCE4] bg-white p-2">
                  <SafeImage
                    src={snapshot.qrisImageUrl}
                    alt={`${snapshot.name} QRIS`}
                    className="w-full h-auto object-contain rounded-xl"
                  />
                </div>
                <p className="text-xs text-[#6D586E]">
                  {t.orderPayment.verifyMerchantPrefix}{' '}
                  <strong className="text-[#352336]">
                    {snapshot.accountHolderName || 'Cotton Candy Sticker'}
                  </strong>{' '}
                  {t.orderPayment.verifyMerchantSuffix}
                </p>
              </div>
            )}

            {/* PayPal Link CTA */}
            {safePaypalUrl && (
              <div className="bg-[#EFF7FD] border border-[#D4E7F7] rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#26547C]">
                  {t.orderPayment.paypalTitle}
                </p>
                <p className="text-sm text-[#26547C] leading-relaxed">
                  {t.orderPayment.paypalDescPrefix}{' '}
                  <strong className="tabular-nums">{formatUSD(order.total)}</strong>,{' '}
                  {t.orderPayment.paypalDescSuffix}
                </p>
                <a
                  href={safePaypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#26547C] text-white text-sm font-semibold hover:bg-[#1D4263] transition-colors"
                >
                  <span>{t.orderPayment.paypalBtn}</span>
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}

            {/* Customer Instructions */}
            {snapshot?.instructions && (
              <div className="bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7E687F]">
                  {t.orderPayment.instructionsTitle}
                </p>
                <p className="text-sm text-[#352336] whitespace-pre-line leading-relaxed">
                  {snapshot.instructions}
                </p>
              </div>
            )}
          </section>

          {/* Customer Payment Confirmation Submission Form */}
          {canSubmitConfirmation && (
            <section className="bg-white border border-[#EFE3E9] rounded-3xl p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="font-[var(--font-display)] text-xl font-bold text-[#352336]">
                  {order.paymentStatus === 'rejected'
                    ? t.orderPayment.resubmitHeading
                    : t.orderPayment.submitHeading}
                </h2>
                <p className="text-xs sm:text-sm text-[#6D586E] mt-1 leading-relaxed">
                  {t.orderPayment.submitSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmitConfirmation} className="space-y-4">
                <div>
                  <label
                    htmlFor="payment-reference-input"
                    className="block text-xs font-semibold text-[#352336] mb-1.5"
                  >
                    {t.orderPayment.refLabel}
                  </label>
                  <input
                    id="payment-reference-input"
                    type="text"
                    required
                    minLength={2}
                    maxLength={160}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={t.orderPayment.refPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm font-mono text-[#352336]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-note-input"
                    className="block text-xs font-semibold text-[#352336] mb-1.5"
                  >
                    {t.orderPayment.noteLabel}
                  </label>
                  <textarea
                    id="payment-note-input"
                    rows={3}
                    maxLength={500}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder={t.orderPayment.notePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm text-[#352336]"
                  />
                </div>

                <div className="bg-[#FAF5F8] border border-[#EFE3E9] rounded-2xl p-3.5 text-xs text-[#6D586E] leading-relaxed">
                  <strong>{t.orderPayment.receiptNoteTitle}</strong>{' '}
                  {interpolate(t.orderPayment.receiptNoteBody, { phone: SHOP_WHATSAPP_DISPLAY })}
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl px-4 py-3 text-xs font-medium"
                  >
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {submitting ? t.orderPayment.submittingBtn : t.orderPayment.submitBtn}
                  </span>
                </button>
              </form>
            </section>
          )}
        </div>

        {/* Right: Order Items Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#EFE3E9] rounded-3xl p-6 sm:p-7 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-[var(--font-display)] text-lg font-semibold text-[#352336]">
            {t.orderPayment.orderSummaryHeading} ({order.itemCount} {t.checkout.itemsSuffix})
          </h2>

          <ul className="divide-y divide-[#F3E7ED]">
            {items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 flex items-center gap-3.5">
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-[#FDF6F8] border border-[#EFE3E9] shrink-0">
                  <SafeImage
                    src={item.previewImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#352336] truncate">{item.productName}</p>
                  <p className="text-xs text-[#7E687F] tabular-nums">
                    {t.common.qty} {item.quantity} × {formatUSD(item.priceSnapshot)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#352336]">
                  {formatUSD(item.priceSnapshot * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-[#F3E7ED] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#6D586E]">
              <span>{t.orderPayment.subtotal}</span>
              <span className="tabular-nums font-medium text-[#352336]">
                {formatUSD(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[#6D586E]">
              <span>{t.orderPayment.digitalDelivery}</span>
              <span className="tabular-nums font-medium text-[#352336]">$0.00</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#352336] pt-2 border-t border-[#F3E7ED]">
              <span>{t.orderPayment.totalDueUsd}</span>
              <span className="tabular-nums">{formatUSD(order.total)}</span>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-[#EFE3E9] rounded-2xl p-4 text-xs text-[#6D586E] space-y-1">
            <p className="font-semibold text-[#352336]">{t.orderPayment.customerInfoTitle}</p>
            <p>{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>{order.customerCountry}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
