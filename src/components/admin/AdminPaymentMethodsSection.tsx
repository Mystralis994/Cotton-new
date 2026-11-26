import {
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Mail,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { SafeImage } from '../SafeImage';
import { ADMIN_EMAIL } from '../../lib/firebase';
import { getEmailProviderStatus } from '../../services/emailPreparation';
import {
  deletePaymentMethod,
  savePaymentAdminConfig,
  savePaymentMethod,
  seedStarterPaymentMethodTemplates,
  togglePaymentMethodEnabled,
} from '../../services/firestoreStore';
import { PaymentAdminConfig, PaymentMethod, PaymentMethodType } from '../../types/store';
import {
  compressPreviewImage,
  formatPaymentMethodType,
  isSafeHttpsUrl,
  isSafeImageUrl,
  sanitizeId,
} from '../../utils/formatters';

interface AdminPaymentMethodsSectionProps {
  paymentMethods: PaymentMethod[];
  adminConfig: PaymentAdminConfig | null;
  adminEmail: string;
  onRefresh: () => Promise<void>;
  showToast: (msg: string) => void;
}

function TypeIcon({ type }: { type: PaymentMethodType }) {
  switch (type) {
    case 'bank_transfer':
      return <Building2 className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />;
    case 'qris':
      return <QrCode className="w-4 h-4 text-[#6D47A6]" aria-hidden="true" />;
    case 'paypal':
      return <Wallet className="w-4 h-4 text-[#26547C]" aria-hidden="true" />;
    case 'other':
      return <CreditCard className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />;
  }
}

export function AdminPaymentMethodsSection({
  paymentMethods,
  adminConfig,
  adminEmail,
  onRefresh,
  showToast,
}: AdminPaymentMethodsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('bank_transfer');
  const [enabled, setEnabled] = useState(true);
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paypalLink, setPaypalLink] = useState('');
  const [qrisImageUrl, setQrisImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sortOrder, setSortOrder] = useState(String(paymentMethods.length + 1));

  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [seedingTemplates, setSeedingTemplates] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin-only private operational payment config state
  const [notificationEmail, setNotificationEmail] = useState(
    adminConfig?.notificationEmail || ADMIN_EMAIL
  );
  const [internalPaymentNotes, setInternalPaymentNotes] = useState(
    adminConfig?.internalPaymentNotes || ''
  );
  const [requireReferenceFormatHint, setRequireReferenceFormatHint] = useState(
    adminConfig?.requireReferenceFormatHint ||
      'Bank transfer reference ID, QRIS RRN, or PayPal Transaction ID.'
  );
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (!adminConfig) return;
    setNotificationEmail(adminConfig.notificationEmail || ADMIN_EMAIL);
    setInternalPaymentNotes(adminConfig.internalPaymentNotes || '');
    setRequireReferenceFormatHint(
      adminConfig.requireReferenceFormatHint ||
        'Bank transfer reference ID, QRIS RRN, or PayPal Transaction ID.'
    );
  }, [adminConfig]);

  const emailProviderStatus = getEmailProviderStatus();

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('bank_transfer');
    setEnabled(true);
    setAccountHolderName('');
    setBankName('');
    setAccountNumber('');
    setPaypalLink('');
    setQrisImageUrl('');
    setDescription('');
    setInstructions('');
    setSortOrder(String(paymentMethods.length + 1));
    setError(null);
  };

  const loadMethodIntoForm = (method: PaymentMethod) => {
    setEditingId(method.id);
    setName(method.name);
    setType(method.type);
    setEnabled(method.enabled);
    setAccountHolderName(method.accountHolderName);
    setBankName(method.bankName);
    setAccountNumber(method.accountNumber);
    setPaypalLink(method.paypalLink);
    setQrisImageUrl(method.qrisImageUrl);
    setDescription(method.description);
    setInstructions(method.instructions);
    setSortOrder(String(method.sortOrder));
    setError(null);
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingQr(true);
    try {
      const compressed = await compressPreviewImage(file, { watermark: false });
      setQrisImageUrl(compressed);
      showToast('Compressed QRIS preview ready.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process QRIS image.');
    } finally {
      setUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Payment method name is required.');
      return;
    }
    const cleanPaypal = paypalLink.trim();
    if (cleanPaypal && !isSafeHttpsUrl(cleanPaypal)) {
      setError('PayPal payment link must be a valid https:// URL.');
      return;
    }

    const cleanQris = qrisImageUrl.trim();
    if (cleanQris && !isSafeImageUrl(cleanQris)) {
      setError('QRIS image must be a valid https:// URL or compressed PNG/JPG/WebP image.');
      return;
    }

    setSavingMethod(true);
    try {
      const isNew = !editingId;
      const id = editingId ?? sanitizeId('pm', cleanName);
      await savePaymentMethod(
        {
          id,
          name: cleanName,
          type,
          enabled,
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          paypalLink: cleanPaypal,
          qrisImageUrl: cleanQris,
          description: description.trim(),
          instructions: instructions.trim(),
          sortOrder: Number(sortOrder) || paymentMethods.length + 1,
        },
        isNew
      );
      resetForm();
      await onRefresh();
      showToast(isNew ? 'Payment method created.' : 'Payment method updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment method.');
    } finally {
      setSavingMethod(false);
    }
  };

  const handleToggleEnabled = async (method: PaymentMethod) => {
    setError(null);
    try {
      await togglePaymentMethodEnabled(method);
      await onRefresh();
      showToast(`${method.name} is now ${!method.enabled ? 'Enabled' : 'Disabled'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle payment method.');
    }
  };

  const handleDelete = async (methodId: string) => {
    setError(null);
    try {
      await deletePaymentMethod(methodId);
      setConfirmDeleteId(null);
      if (editingId === methodId) resetForm();
      await onRefresh();
      showToast('Payment method deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment method.');
    }
  };

  const handleSeedTemplates = async () => {
    setSeedingTemplates(true);
    setError(null);
    try {
      await seedStarterPaymentMethodTemplates();
      await onRefresh();
      showToast('Starter payment templates added (disabled by default until you edit them).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment templates.');
    } finally {
      setSeedingTemplates(false);
    }
  };

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    try {
      await savePaymentAdminConfig({
        notificationEmail,
        internalPaymentNotes,
        requireReferenceFormatHint,
        updatedBy: adminEmail,
      });
      await onRefresh();
      showToast('Admin payment configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save admin configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Top Grid: Form + Configured Methods List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveMethod}
          className="lg:col-span-5 bg-white border border-[#EFE3E9] rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-[#7E687F] hover:text-[#352336] cursor-pointer"
              >
                + New
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Method Name *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., BCA Bank Transfer"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Payment Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PaymentMethodType)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="qris">QRIS</option>
                <option value="paypal">PayPal Payment Link</option>
                <option value="other">Other Manual Method</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                maxLength={120}
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Cotton Candy Sticker Studio"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Sort Order
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Bank / Provider Name
              </label>
              <input
                type="text"
                maxLength={120}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BCA, Wise, PayPal, QRIS"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Account Number
              </label>
              <input
                type="text"
                maxLength={80}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account / VA number"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#352336] mb-1">
              PayPal Payment Link (HTTPS)
            </label>
            <input
              type="url"
              maxLength={500}
              value={paypalLink}
              onChange={(e) => setPaypalLink(e.target.value)}
              placeholder="https://paypal.me/yourstore"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm font-mono"
            />
          </div>

          {/* QRIS Image URL or Compressed Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#352336]">
              QRIS Image URL or Compressed QR Upload
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={300000}
                value={qrisImageUrl}
                onChange={(e) => setQrisImageUrl(e.target.value)}
                placeholder="https://... or upload compressed QR image"
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-xs font-mono"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EADCE4] bg-white text-xs font-semibold text-[#352336] hover:bg-[#FFF1F5] cursor-pointer shrink-0">
                <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{uploadingQr ? '...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleQrisUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-[#7E687F] leading-relaxed">
              Images upload as crisp unwatermarked compressed QR (&lt;220KB JPEG) or HTTPS URL. If upgrading Firebase Storage, deploy <code className="font-mono">storage.rules</code> in Firebase Console first.
            </p>
            {qrisImageUrl && (
              <div className="w-28 h-28 rounded-2xl border border-[#EADCE4] bg-white p-1.5 overflow-hidden">
                <SafeImage
                  src={qrisImageUrl}
                  alt="QRIS preview"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#352336] mb-1">
              Short Checkout Description
            </label>
            <input
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown beneath payment method option at checkout"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#352336] mb-1">
              Customer Payment Instructions
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step instructions shown after order creation..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm font-medium text-[#352336] cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="accent-[#D93D7A] w-4 h-4"
            />
            <span>Enabled for customer checkout</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={savingMethod}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] disabled:opacity-60 cursor-pointer"
            >
              {savingMethod
                ? 'Saving...'
                : editingId
                  ? 'Update Payment Method'
                  : 'Save Payment Method'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-[#EADCE4] text-sm font-semibold text-[#6D586E] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Right: Configured Payment Methods List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#EFE3E9] rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EFE3E9] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                  Configured Payment Methods ({paymentMethods.length})
                </h2>
                <p className="text-xs text-[#7E687F]">
                  Only enabled methods appear to customers on the Checkout page.
                </p>
              </div>
              {paymentMethods.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedTemplates}
                  disabled={seedingTemplates}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF1F5] text-[#B8255F] text-xs font-semibold hover:bg-[#FCE7F3] disabled:opacity-60 cursor-pointer"
                >
                  {seedingTemplates ? 'Adding...' : 'Add Starter Draft Templates'}
                </button>
              )}
            </div>

            {paymentMethods.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6D586E] space-y-2">
                <p>No manual payment methods configured in Firestore yet.</p>
                <p className="text-xs text-[#7E687F]">
                  Add a Bank Transfer, QRIS, PayPal link, or Other payment method using the form on the left.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3E7ED]">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FDF9FB]"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeIcon type={method.type} />
                        <span className="font-semibold text-sm text-[#352336]">
                          {method.name}
                        </span>
                        <span className="text-xs text-[#7E687F]">
                          · {formatPaymentMethodType(method.type)}
                        </span>
                      </div>
                      {method.description && (
                        <p className="text-xs text-[#6D586E] truncate max-w-md">
                          {method.description}
                        </p>
                      )}
                      <p className="text-xs text-[#7E687F] font-mono">
                        {[method.bankName, method.accountNumber, method.accountHolderName]
                          .filter(Boolean)
                          .join(' · ') || method.paypalLink || 'Custom instructions'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(method)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                          method.enabled
                            ? 'border-[#BBF7D0] bg-[#ECFDF5] text-[#166534]'
                            : 'border-[#EADCE4] bg-[#FAF5F8] text-[#7E687F]'
                        }`}
                      >
                        {method.enabled ? (
                          <>
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => loadMethodIntoForm(method)}
                        aria-label={`Edit ${method.name}`}
                        className="p-2 rounded-lg border border-[#EADCE4] text-[#352336] hover:bg-[#FFF1F5] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteId === method.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#EADCE4] bg-white text-[#5D495E] text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(method.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(method.id)}
                          aria-label={`Delete ${method.name}`}
                          className="p-2 rounded-lg border border-[#EADCE4] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin-Only Payment Operational Settings */}
          <form
            onSubmit={handleSaveAdminConfig}
            className="bg-white border border-[#EFE3E9] rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6D47A6]" aria-hidden="true" />
              <h3 className="font-[var(--font-display)] text-base font-bold text-[#352336]">
                Admin-Only Payment Configuration
              </h3>
            </div>
            <p className="text-xs text-[#6D586E]">
              Stored in <code className="font-mono">paymentAdminConfig/default</code> and strictly isolated from customer reads by Firestore rules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#352336] mb-1">
                  Owner Notification Email
                </label>
                <input
                  type="email"
                  maxLength={254}
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#352336] mb-1">
                  Reference Hint
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={requireReferenceFormatHint}
                  onChange={(e) => setRequireReferenceFormatHint(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1">
                Internal Verification Notes (Admin Only)
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                value={internalPaymentNotes}
                onChange={(e) => setInternalPaymentNotes(e.target.value)}
                placeholder="Internal checklist before approving transfers..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EADCE4] bg-[#FFFBF9] text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-[#352336] text-white text-xs font-semibold hover:bg-[#4B344D] disabled:opacity-60 cursor-pointer"
              >
                {savingConfig ? 'Saving...' : 'Save Admin Config'}
              </button>
            </div>
          </form>

          {/* Email Notification Preparation Architecture Summary */}
          <div className="bg-[#F4F1FC] border border-[#DFD8F5] rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#4C3475]">
              <Mail className="w-4 h-4" aria-hidden="true" />
              <h3 className="font-[var(--font-display)] text-base font-bold">
                Email Notification Preparation Status
              </h3>
            </div>
            <p className="text-xs text-[#4C3475] leading-relaxed">
              {emailProviderStatus.note}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4C3475]">
              {[
                'New order alert (to owner)',
                'Order confirmation (to customer)',
                'Payment instructions (to customer)',
                'Payment verified (to customer)',
                'Payment rejected (to customer)',
              ].map((hookLabel) => (
                <li key={hookLabel} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{hookLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
