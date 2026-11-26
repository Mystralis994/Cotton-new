import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { interpolate } from '../i18n/translations';
import { createWhatsAppOrder } from '../services/firestoreStore';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  computeAuthoritativeOrderItems,
  SHOP_WHATSAPP_DISPLAY,
  ValidatedOrderLineItem,
  validateWhatsappCustomerInput,
} from '../services/whatsappCheckout';
import { Order } from '../types/store';
import { formatProductType, formatUSD } from '../utils/formatters';

type CheckoutStep = 'form' | 'review' | 'handoff';

interface HandoffSnapshot {
  customerName: string;
  customerWhatsapp: string;
  orderNote: string;
  items: ValidatedOrderLineItem[];
  total: number;
  message: string;
  whatsappUrl: string;
  popupOpened: boolean;
  savedOrder: Order | null;
  firestoreWarning: string | null;
}

export function CheckoutPage() {
  const {
    user,
    signInWithGoogle,
    publishedProducts,
    cartItemsDetailed,
    cartSubtotal,
    cartTotal,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    navigate,
    showToast,
    lang,
    t,
  } = useStore();

  const [step, setStep] = useState<CheckoutStep>('form');
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [handoff, setHandoff] = useState<HandoffSnapshot | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (user?.displayName) {
      setCustomerName((prev) => prev || user.displayName || '');
    }
  }, [user]);

  const validatedReview = useMemo(() => {
    if (cartItemsDetailed.length === 0) return null;
    try {
      const authoritative = computeAuthoritativeOrderItems(
        cartItemsDetailed.map((entry) => ({
          productId: entry.product.id,
          quantity: entry.quantity,
        })),
        publishedProducts,
        lang
      );
      const previewMessage = buildWhatsAppOrderMessage({
        items: authoritative.items,
        total: authoritative.total,
        customerName: customerName.trim() || (lang === 'id' ? 'Pembeli' : 'Customer'),
        customerWhatsapp: customerWhatsapp.trim(),
        orderNote: orderNote.trim(),
        lang,
      });
      return { ...authoritative, previewMessage };
    } catch {
      return null;
    }
  }, [cartItemsDetailed, publishedProducts, customerName, customerWhatsapp, orderNote, lang]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const cleaned = validateWhatsappCustomerInput(
        {
          customerName,
          customerWhatsapp,
          orderNote,
        },
        lang
      );
      computeAuthoritativeOrderItems(
        cartItemsDetailed.map((entry) => ({
          productId: entry.product.id,
          quantity: entry.quantity,
        })),
        publishedProducts,
        lang
      );
      setCustomerName(cleaned.customerName);
      setCustomerWhatsapp(cleaned.customerWhatsapp);
      setOrderNote(cleaned.orderNote);
      setStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errors.serverRejected);
    }
  };

  const handleConfirmWhatsAppOrder = async () => {
    if (submitLockRef.current || submitting) return;
    setFormError(null);

    let cleanedInput;
    let authoritative;
    try {
      cleanedInput = validateWhatsappCustomerInput(
        {
          customerName,
          customerWhatsapp,
          orderNote,
        },
        lang
      );
      authoritative = computeAuthoritativeOrderItems(
        cartItemsDetailed.map((entry) => ({
          productId: entry.product.id,
          quantity: entry.quantity,
        })),
        publishedProducts,
        lang
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t.errors.serverRejected);
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      // Server-side validation, tamper rejection, rate limiting (429), and duplicate guard (409)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        try {
          const idToken = await user.getIdToken();
          if (idToken) {
            headers.Authorization = `Bearer ${idToken}`;
          }
        } catch {
          // Proceed without bearer header if token refresh fails; Firestore create below checks user auth separately
        }
      }

      const apiRes = await fetch('/api/orders/validate-whatsapp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lang,
          customerName: cleanedInput.customerName,
          customerWhatsapp: cleanedInput.customerWhatsapp,
          orderNote: cleanedInput.orderNote,
          clientTotal: authoritative.total,
          items: authoritative.items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const apiJson = (await apiRes.json().catch(() => ({}))) as {
        valid?: boolean;
        error?: string;
        total?: number;
      };

      if (!apiRes.ok || !apiJson.valid) {
        if (apiRes.status === 429) {
          setFormError(apiJson.error || t.errors.rateLimited);
        } else if (apiRes.status === 409) {
          setFormError(apiJson.error || t.errors.duplicateOrder);
        } else {
          setFormError(apiJson.error || t.errors.serverRejected);
        }
        submitLockRef.current = false;
        setSubmitting(false);
        return;
      }

      let savedOrder: Order | null = null;
      let firestoreWarning: string | null = null;

      if (user) {
        try {
          savedOrder = await createWhatsAppOrder({
            userId: user.uid,
            customerName: cleanedInput.customerName,
            customerEmail: user.email || '',
            customerWhatsapp: cleanedInput.customerWhatsapp,
            customerNote: cleanedInput.orderNote,
            items: authoritative.items.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
          });
        } catch (err) {
          firestoreWarning =
            err instanceof Error
              ? `${err.message}`
              : t.errors.serverRejected;
        }
      }

      const finalMessage = buildWhatsAppOrderMessage({
        items: authoritative.items,
        total: authoritative.total,
        customerName: cleanedInput.customerName,
        customerWhatsapp: cleanedInput.customerWhatsapp,
        orderNote: cleanedInput.orderNote,
        orderNumber: savedOrder?.orderNumber,
        lang,
      });
      const whatsappUrl = buildWhatsAppOrderUrl(finalMessage);

      let popupOpened = false;
      try {
        const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        popupOpened = Boolean(win);
      } catch {
        popupOpened = false;
      }

      setHandoff({
        customerName: cleanedInput.customerName,
        customerWhatsapp: cleanedInput.customerWhatsapp,
        orderNote: cleanedInput.orderNote,
        items: authoritative.items,
        total: authoritative.total,
        message: finalMessage,
        whatsappUrl,
        popupOpened,
        savedOrder,
        firestoreWarning,
      });

      if (popupOpened) {
        clearCart();
        showToast(t.toasts.waOpened);
      }

      setStep('handoff');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setFormError(t.errors.serverRejected);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.message);
      setCopiedMessage(true);
      showToast(t.toasts.waCopied);
      window.setTimeout(() => setCopiedMessage(false), 2400);
    } catch {
      showToast(t.toasts.copyFailed);
    }
  };

  if (step === 'handoff' && handoff) {
    return (
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="clay-card p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl clay-card-pink flex items-center justify-center text-[#D93D7A] shrink-0">
              <MessageCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#B8255F]">
                {t.checkout.handoffEyebrow}
              </p>
              <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336]">
                {handoff.popupOpened ? t.checkout.handoffTitleOpened : t.checkout.handoffTitleBlocked}
              </h1>
              <p className="text-sm text-[#6D586E] leading-relaxed">
                {interpolate(
                  handoff.popupOpened ? t.checkout.handoffDescOpened : t.checkout.handoffDescBlocked,
                  { phone: SHOP_WHATSAPP_DISPLAY }
                )}
              </p>
            </div>
          </div>

          {handoff.savedOrder && (
            <div className="clay-card-lavender p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#4C3475] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" aria-hidden="true" />
                <span>
                  {t.checkout.savedOrderBadgePrefix} ({handoff.savedOrder.orderNumber}) ·{' '}
                  {t.checkout.savedOrderBadgeSuffix}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate({ page: 'orders' })}
                className="font-semibold text-[#D93D7A] hover:underline cursor-pointer"
              >
                {t.checkout.viewMyOrders}
              </button>
            </div>
          )}

          {handoff.firestoreWarning && (
            <div className="bg-[#FFF8EB] border border-[#F5D69E] text-[#8A510F] rounded-2xl p-4 text-xs leading-relaxed">
              {handoff.firestoreWarning}
            </div>
          )}

          <div className="bg-[#FFF8EB] border border-[#F3D8A8] rounded-2xl p-4 text-xs text-[#6B4414] leading-relaxed">
            <strong>{t.checkout.importantTitle}</strong>{' '}
            {interpolate(t.checkout.importantBody, { phone: SHOP_WHATSAPP_DISPLAY })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={handoff.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (cartItemsDetailed.length > 0) {
                  clearCart();
                }
              }}
              className="clay-button flex-1 py-3.5 px-6 text-sm font-semibold inline-flex items-center justify-center gap-2 text-center"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>{interpolate(t.checkout.openWaChatBtn, { phone: SHOP_WHATSAPP_DISPLAY })}</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleCopyMessage}
              className="clay-button-soft py-3.5 px-5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedMessage ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{t.checkout.copiedMessage}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>{t.checkout.copyMessage}</span>
                </>
              )}
            </button>
          </div>

          {!handoff.popupOpened && cartItemsDetailed.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 clay-card-pink p-4 text-xs">
              <span className="text-[#5E3A4C]">{t.checkout.bagSavedNotice}</span>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  showToast(t.toasts.bagCleared);
                }}
                className="font-semibold text-[#B8255F] hover:underline cursor-pointer"
              >
                {t.checkout.clearBagNow}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7E687F]">
              {t.checkout.prefilledLabel}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#352336] bg-[#FFFBF9] border border-[#EADCE4] rounded-2xl p-4 leading-relaxed overflow-x-auto">
              {handoff.message}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3E7ED]">
            <button
              type="button"
              onClick={() => navigate({ page: 'shop' })}
              className="text-sm font-semibold text-[#D93D7A] hover:underline cursor-pointer"
            >
              {t.checkout.continueShopping}
            </button>
            <span className="text-xs text-[#7E687F] tabular-nums font-semibold">
              {t.checkout.orderTotalLabel} {formatUSD(handoff.total)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (cartItemsDetailed.length === 0) {
    return (
      <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="clay-card-pink p-8 sm:p-12 space-y-5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-[#D93D7A]">
            <ShoppingBag className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336]">
            {t.checkout.emptyTitle}
          </h1>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto leading-relaxed">
            {t.checkout.emptyBody}
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="clay-button px-6 py-3 text-sm font-semibold cursor-pointer"
          >
            {t.checkout.exploreShop}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => (step === 'review' ? setStep('form') : navigate({ page: 'shop' }))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7E687F] hover:text-[#D93D7A] mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{step === 'review' ? t.checkout.editDetails : t.checkout.backToShop}</span>
          </button>
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-[#352336] tracking-tight">
            {step === 'review' ? t.checkout.titleReview : t.checkout.titleForm}
          </h1>
          <p className="text-sm text-[#6D586E] mt-1">
            {step === 'review' ? t.checkout.subtitleReview : t.checkout.subtitleForm}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-[#7E687F]">
          <span className={step === 'form' ? 'text-[#D93D7A]' : 'text-[#352336]'}>
            {t.checkout.step1}
          </span>
          <span aria-hidden="true">/</span>
          <span className={step === 'review' ? 'text-[#D93D7A]' : ''}>{t.checkout.step2}</span>
        </div>
      </div>

      {step === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Clay UI Customer Form */}
          <form
            onSubmit={handleProceedToReview}
            className="lg:col-span-6 clay-card p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl clay-card-pink flex items-center justify-center text-[#D93D7A] shrink-0">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-[var(--font-display)] text-xl font-bold text-[#352336]">
                  {t.checkout.customerInfoTitle}
                </h2>
                <p className="text-xs text-[#7E687F]">{t.checkout.customerInfoSubtitle}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="block text-xs font-bold text-[#352336] mb-1.5"
                >
                  {t.checkout.nameLabel}
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  maxLength={120}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.checkout.namePlaceholder}
                  className="clay-input w-full px-4 py-3 text-sm text-[#352336]"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-whatsapp"
                  className="block text-xs font-bold text-[#352336] mb-1.5"
                >
                  {t.checkout.whatsappLabel}
                </label>
                <input
                  id="checkout-whatsapp"
                  type="tel"
                  maxLength={32}
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  placeholder={t.checkout.whatsappPlaceholder}
                  className="clay-input w-full px-4 py-3 text-sm text-[#352336]"
                />
                <p className="text-[11px] text-[#7E687F] mt-1">{t.checkout.whatsappHelp}</p>
              </div>

              <div>
                <label
                  htmlFor="checkout-note"
                  className="block text-xs font-bold text-[#352336] mb-1.5"
                >
                  {t.checkout.noteLabel}
                </label>
                <textarea
                  id="checkout-note"
                  rows={3}
                  maxLength={500}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder={t.checkout.notePlaceholder}
                  className="clay-input w-full px-4 py-3 text-sm text-[#352336]"
                />
              </div>
            </div>

            <div className="clay-card-blue p-4 text-xs text-[#2C4B68] leading-relaxed">
              <strong className="block text-[#1E3B56] mb-0.5">{t.checkout.howItWorksTitle}</strong>
              {interpolate(t.checkout.howItWorksBody, { phone: SHOP_WHATSAPP_DISPLAY })}
            </div>

            {!user && (
              <div className="clay-card-lavender p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#4C3475] leading-relaxed flex-1 min-w-[200px]">
                  {t.checkout.guestBanner}
                </span>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#D8CEF0] text-[#4C3475] font-semibold hover:bg-[#F5F1FC] cursor-pointer shrink-0"
                >
                  {t.checkout.optionalGoogleSignIn}
                </button>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl px-4 py-3 text-xs font-medium"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="clay-button w-full py-3.5 px-6 text-sm font-semibold cursor-pointer"
            >
              {t.checkout.reviewOrderBtn}
            </button>
          </form>

          {/* Right: Compact Clay UI Cart Cards */}
          <aside className="lg:col-span-6 clay-card p-6 sm:p-7 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                {t.checkout.packsInBagTitle}
              </h2>
              <span className="text-xs font-semibold text-[#7E687F] tabular-nums">
                {cartItemsDetailed.reduce((s, i) => s + i.quantity, 0)} {t.checkout.itemsSuffix}
              </span>
            </div>

            <ul className="space-y-3">
              {cartItemsDetailed.map(({ product, quantity, unitPrice, lineTotal }) => (
                <li key={product.id} className="clay-card-pink p-3.5 flex items-center gap-3.5">
                  <div className="w-16 h-14 rounded-2xl overflow-hidden bg-white border border-[#F5D3E1] shrink-0 shadow-sm">
                    <SafeImage
                      src={product.previewImages[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[#352336] truncate">{product.name}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`${t.common.delete} ${product.name}`}
                        className="text-[#8D788E] hover:text-[#B91C1C] p-1 rounded-lg hover:bg-white/70 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#6D586E] tabular-nums">
                      {formatProductType(product.productType, lang)} · {formatUSD(unitPrice)}{' '}
                      {t.common.perPack}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="clay-qty-box inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          aria-label={`- ${product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-[#6D586E] hover:text-[#352336] disabled:opacity-35 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold tabular-nums text-[#352336]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, Math.min(25, quantity + 1))}
                          disabled={quantity >= 25}
                          aria-label={`+ ${product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-[#6D586E] hover:text-[#352336] disabled:opacity-35 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold tabular-nums text-[#352336]">
                        {formatUSD(lineTotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="clay-card-lavender p-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#5E4A68]">
                <span>{t.checkout.subtotal}</span>
                <span className="tabular-nums font-semibold text-[#352336]">
                  {formatUSD(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#5E4A68]">
                <span>{t.checkout.digitalDeliveryWa}</span>
                <span className="tabular-nums font-semibold text-[#352336]">$0.00</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#352336] pt-2 border-t border-[#DFD6F5]">
                <span>{t.checkout.totalUsd}</span>
                <span className="tabular-nums">{formatUSD(cartTotal)}</span>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* STEP 2: Confirmation & Review before server validation + opening WhatsApp */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-7 clay-card p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-[var(--font-display)] text-xl font-bold text-[#352336]">
                {t.checkout.reviewSectionTitle}
              </h2>
              <p className="text-xs text-[#7E687F] mt-0.5">
                {interpolate(t.checkout.reviewSectionSubtitle, { phone: SHOP_WHATSAPP_DISPLAY })}
              </p>
            </div>

            <div className="clay-card-pink p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#7E687F] block">{t.checkout.nameLabel}</span>
                <strong className="text-sm text-[#352336]">{customerName}</strong>
              </div>
              <div>
                <span className="text-[#7E687F] block">{t.checkout.whatsappLabel}</span>
                <strong className="text-sm text-[#352336]">{customerWhatsapp || '—'}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#7E687F] block">{t.checkout.noteLabel}</span>
                <p className="text-sm text-[#352336] mt-0.5">{orderNote || '—'}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7E687F]">
                {t.checkout.whatsappPreviewLabel}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#352336] bg-[#FFFBF9] border border-[#EADCE4] rounded-2xl p-4 leading-relaxed overflow-x-auto">
                {validatedReview?.previewMessage ?? ''}
              </pre>
            </div>

            <div className="bg-[#FFF8EB] border border-[#F3D8A8] rounded-2xl p-4 text-xs text-[#6B4414] leading-relaxed">
              {user ? (
                <span>
                  {t.checkout.signedInNoticePrefix} <strong>{user.email}</strong>{' '}
                  {t.checkout.signedInNoticeMid}{' '}
                  <code className="font-mono">pending_contact</code>{' '}
                  {t.checkout.signedInNoticeSuffix}
                </span>
              ) : (
                <span>{t.checkout.guestNotice}</span>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl px-4 py-3 text-xs font-medium"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('form')}
                className="clay-button-soft px-5 py-3.5 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {t.checkout.backToEdit}
              </button>

              <button
                type="button"
                disabled={submitting || !validatedReview}
                onClick={handleConfirmWhatsAppOrder}
                className="clay-button flex-1 py-3.5 px-6 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>
                  {submitting ? t.checkout.preparingWaBtn : t.checkout.orderViaWaBtn}
                </span>
              </button>
            </div>
          </div>

          <aside className="lg:col-span-5 clay-card p-6 space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336]">
                {t.checkout.verifiedSummaryTitle}
              </h2>
              <ShieldCheck className="w-4 h-4 text-[#166534]" aria-hidden="true" />
            </div>
            <p className="text-[11px] text-[#6D586E]">{t.checkout.serverValidatedBadge}</p>
            <ul className="space-y-2.5">
              {(validatedReview?.items ?? []).map((item) => (
                <li
                  key={item.product.id}
                  className="clay-card-pink p-3 flex items-center gap-3"
                >
                  <div className="w-12 h-10 rounded-xl overflow-hidden bg-white border border-[#F5D3E1] shrink-0">
                    <SafeImage
                      src={item.product.previewImages[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#352336] truncate">{item.product.name}</p>
                    <p className="text-[11px] text-[#6D586E] tabular-nums">
                      {t.common.qty} {item.quantity} × {formatUSD(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-[#352336]">
                    {formatUSD(item.lineSubtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="clay-card-lavender p-4 flex justify-between items-center text-base font-bold text-[#352336]">
              <span>{t.cart.total}</span>
              <span className="tabular-nums">
                {formatUSD(validatedReview?.total ?? cartTotal)}
              </span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
