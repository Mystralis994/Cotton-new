import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldAlert,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  adminApproveOrderPayment,
  adminRejectOrderPayment,
  adminUpdateOrderAndDownloads,
  adminUpdateOrderStatus,
} from '../../services/firestoreStore';
import { Order, OrderItem, OrderStatus, PaymentStatus, Product } from '../../types/store';
import { getOrderLineItemsSummary, PHASE3_ORDER_STATUS_OPTIONS } from '../../utils/adminMetrics';
import {
  formatIsoDateTime,
  formatOrderStatus,
  formatPaymentMethodType,
  formatPaymentStatus,
  formatUSD,
} from '../../utils/formatters';

interface AdminOrderModalProps {
  order: Order;
  orderItems: OrderItem[];
  allProducts: Product[];
  adminEmail: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

function toWhatsappChatUrl(rawPhone?: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export function AdminOrderModal({
  order,
  orderItems,
  allProducts,
  adminEmail,
  onClose,
  onUpdated,
}: AdminOrderModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order.orderStatus === 'pending_contact' ? 'pending' : order.orderStatus
  );
  const [statusNote, setStatusNote] = useState('');

  const [rejectionReason, setRejectionReason] = useState(order.rejectionReason || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [paymentReference, setPaymentReference] = useState(order.paymentReference);
  const [downloadAuthorized, setDownloadAuthorized] = useState(order.downloadAuthorized);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineItems = getOrderLineItemsSummary(order, orderItems);
  const customerWaUrl = toWhatsappChatUrl(order.customerWhatsapp);

  const handleSaveOrderStatus = async () => {
    setError(null);
    setSaving(true);
    try {
      await adminUpdateOrderStatus({
        order,
        nextOrderStatus: selectedStatus,
        statusNote,
        adminEmail,
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setSaving(true);
    try {
      await adminApproveOrderPayment({
        order,
        orderItems,
        allProducts,
        adminEmail,
        paymentReference,
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve order payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    const cleanReason = rejectionReason.trim();
    if (cleanReason.length < 3) {
      setError('Please enter a short rejection reason so the customer knows what to fix.');
      return;
    }
    setSaving(true);
    try {
      await adminRejectOrderPayment({
        order,
        rejectionReason: cleanReason,
        adminEmail,
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvancedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await adminUpdateOrderAndDownloads({
        order,
        orderStatus,
        paymentStatus,
        paymentReference,
        rejectionReason,
        downloadAuthorized,
        orderItems,
        allProducts,
        adminEmail,
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#352336]/45 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Manage Order ${order.orderNumber}`}
    >
      <div className="clay-card max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#F2E0E8] bg-white/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#B8255F]">
              Order Detail & Status
            </p>
            <h2 className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-[#352336] truncate">
              {order.orderNumber}
            </h2>
            <p className="text-xs text-[#6D586E] truncate">
              {formatIsoDateTime(order.createdAt)} · Current:{' '}
              <strong className="text-[#352336]">{formatOrderStatus(order.orderStatus)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order modal"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#6D586E] hover:bg-[#FFF1F5] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Customer Info Card */}
          <div className="clay-card-pink p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#A61E56]">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Customer & Contact Details</span>
              </span>
              {customerWaUrl && (
                <a
                  href={`${customerWaUrl}?text=${encodeURIComponent(
                    `Halo ${order.customerName}, kami dari Cotton Candy Sticker mengenai pesanan ${order.orderNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clay-button-soft inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Chat WhatsApp</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[#5D495E]">
              <div className="bg-white/75 rounded-2xl px-3.5 py-2.5 border border-[#F7D3E1]">
                <span className="text-[11px] text-[#7E687F] block">Customer Name</span>
                <strong className="text-sm text-[#352336]">{order.customerName}</strong>
              </div>

              <div className="bg-white/75 rounded-2xl px-3.5 py-2.5 border border-[#F7D3E1]">
                <span className="text-[11px] text-[#7E687F] block">WhatsApp Number</span>
                <strong className="text-sm font-mono text-[#352336]">
                  {order.customerWhatsapp || 'Via Direct Store WhatsApp'}
                </strong>
              </div>

              <div className="bg-white/75 rounded-2xl px-3.5 py-2.5 border border-[#F7D3E1]">
                <span className="text-[11px] text-[#7E687F] block">Email</span>
                <span className="font-medium text-[#352336] break-all">{order.customerEmail}</span>
              </div>

              <div className="bg-white/75 rounded-2xl px-3.5 py-2.5 border border-[#F7D3E1]">
                <span className="text-[11px] text-[#7E687F] block">Channel & Payment Method</span>
                <span className="font-medium text-[#352336]">
                  {order.paymentMethodName || 'WhatsApp Order'}{' '}
                  {order.checkoutChannel === 'whatsapp'
                    ? '(WhatsApp)'
                    : `(${formatPaymentMethodType(order.paymentMethodType)})`}
                </span>
              </div>
            </div>

            {(order.customerNote || order.customerPaymentNote || order.paymentReference) && (
              <div className="bg-white/85 border border-[#F7D3E1] rounded-2xl p-3 space-y-1.5 text-[#352336]">
                {order.paymentReference && (
                  <p>
                    <span className="text-[#7E687F]">Payment Reference:</span>{' '}
                    <code className="font-mono font-semibold">{order.paymentReference}</code>
                  </p>
                )}
                {(order.customerNote || order.customerPaymentNote) && (
                  <p>
                    <span className="text-[#7E687F]">Customer Note:</span>{' '}
                    {order.customerNote || order.customerPaymentNote}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Purchased Products Breakdown */}
          <div className="clay-card-lavender p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A398E]">
                <Package className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Purchased Items ({lineItems.length})</span>
              </span>
              <span className="text-xs font-semibold text-[#5A398E] tabular-nums">
                Total Qty: {order.itemCount}
              </span>
            </div>

            {lineItems.length === 0 ? (
              <p className="text-xs text-[#6D586E] bg-white/70 rounded-2xl p-3">
                No individual item breakdown recorded for this legacy order. Total items: {order.itemCount}.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lineItems.map((item) => (
                  <li
                    key={item.id}
                    className="bg-white/85 border border-[#DFD6F5] rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#352336] truncate">{item.productName}</p>
                      <p className="text-xs text-[#6D586E] tabular-nums">
                        Qty {item.quantity} × {formatUSD(item.unitPrice)}
                      </p>
                    </div>
                    <span className="tabular-nums font-bold text-[#352336] shrink-0">
                      {formatUSD(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#DFD6F5] text-sm font-bold text-[#352336] tabular-nums">
              <span>Total Payment</span>
              <span className="text-base text-[#5A398E]">{formatUSD(order.total)}</span>
            </div>
          </div>

          {/* Phase 3 Order Status Management */}
          <div className="clay-card-blue p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E5485]">
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Update Order Status</span>
              </span>
              <span className="text-xs font-semibold text-[#1E5485]">
                Payment: {formatPaymentStatus(order.paymentStatus)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PHASE3_ORDER_STATUS_OPTIONS.map((opt) => {
                const isActive = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      isActive
                        ? opt.value === 'cancelled'
                          ? 'bg-[#B91C1C] text-white border-[#991B1B] shadow-md'
                          : opt.value === 'completed'
                            ? 'bg-[#166534] text-white border-[#14532D] shadow-md'
                            : 'bg-[#D93D7A] text-white border-[#C9306B] shadow-md'
                        : 'bg-white/90 text-[#352336] border-[#CFE3F4] hover:bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                maxLength={300}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Optional admin note for order history (e.g., Sticker files sent via WhatsApp)"
                className="clay-input flex-1 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveOrderStatus}
                className="clay-button px-5 py-2.5 text-sm font-semibold min-h-[44px] whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Order Status'}
              </button>
            </div>
          </div>

          {/* Payment Verification Decision */}
          <div className="clay-card p-4 sm:p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7E687F]">
              Manual Payment Verification & WhatsApp Delivery
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Verification / Rejection Note (required if rejecting)
              </label>
              <input
                type="text"
                maxLength={500}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason if rejecting (e.g., Transfer reference not found)"
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={handleApprove}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#166534] text-white text-sm font-semibold hover:bg-[#14532D] disabled:opacity-60 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>{saving ? 'Processing...' : 'Approve Payment (Ready for WhatsApp Delivery)'}</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleReject}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm font-semibold hover:bg-[#FEE2E2] disabled:opacity-60 cursor-pointer"
              >
                <XCircle className="w-4 h-4" aria-hidden="true" />
                <span>Reject Payment</span>
              </button>
            </div>
          </div>

          {/* Order & Verification Audit History */}
          {order.verificationHistory.length > 0 && (
            <div className="clay-card-peach p-4 sm:p-5 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8C4D17]">
                Order Status & Verification History ({order.verificationHistory.length})
              </p>
              <ul className="space-y-2 text-xs">
                {[...order.verificationHistory].reverse().map((entry, idx) => (
                  <li
                    key={`${entry.at}-${idx}`}
                    className="flex items-start gap-2.5 bg-white/80 border border-[#F7DEC4] rounded-2xl p-3 text-[#5D495E]"
                  >
                    <Clock className="w-3.5 h-3.5 mt-0.5 text-[#8C4D17] shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="font-bold text-[#352336] capitalize">
                        {entry.action.replace('_', ' ')}
                      </span>{' '}
                      by <span className="font-mono">{entry.by}</span> · {formatIsoDateTime(entry.at)}
                      {entry.reason && <p className="text-[#5D495E] mt-0.5">{entry.reason}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible Advanced Override */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs font-semibold text-[#7E687F] hover:text-[#352336] cursor-pointer py-1"
            >
              {showAdvanced ? 'Hide Combined Advanced Override' : 'Show Combined Advanced Override'}
            </button>

            {showAdvanced && (
              <form
                onSubmit={handleAdvancedSubmit}
                className="mt-3 clay-card p-4 space-y-4 bg-[#FFFBF9]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#352336] mb-1">
                      Order Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                      className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
                    >
                      <option value="pending_contact">Pending (WhatsApp Contact)</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#352336] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="awaiting_verification">Awaiting Verification</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                      <option value="pending">Pending (Legacy)</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#352336] mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="clay-input w-full px-3.5 py-2.5 text-sm font-mono min-h-[44px]"
                  />
                </div>

                <label className="flex items-start gap-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={downloadAuthorized}
                    onChange={(e) => setDownloadAuthorized(e.target.checked)}
                    className="accent-[#D93D7A] w-4 h-4 mt-0.5"
                  />
                  <span>Mark Ready for Manual WhatsApp Delivery</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl bg-[#352336] text-white text-xs font-semibold hover:bg-[#4B344D] cursor-pointer min-h-[44px]"
                >
                  Save Combined Override
                </button>
              </form>
            )}
          </div>

          <div className="bg-[#F4F1FC] border border-[#DFD8F5] rounded-2xl p-3.5 text-xs text-[#4C3475] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              All order updates and status history entries are written exclusively by authenticated store administrators and protected by Firestore Security Rules.
            </span>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl px-4 py-3 text-xs font-medium">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
