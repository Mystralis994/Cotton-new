import { Minus, Plus, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatProductType, formatUSD } from '../utils/formatters';
import { SafeImage } from './SafeImage';

export function CartDrawer() {
  const {
    isCartOpen,
    setCartOpen,
    cartItemsDetailed,
    cartItemCount,
    cartSubtotal,
    cartTotal,
    updateCartQuantity,
    removeFromCart,
    navigate,
    lang,
    t,
  } = useStore();

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
    >
      <div
        className="fixed inset-0 bg-[#352336]/35 backdrop-blur-[2px]"
        onClick={() => setCartOpen(false)}
      />

      <aside className="relative z-10 w-full max-w-md bg-[#FFFBF9] h-full shadow-2xl border-l border-[#EFE3E9] flex flex-col">
        <div className="px-5 sm:px-6 py-4 border-b border-[#F2E2EA] bg-white/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl clay-card-pink flex items-center justify-center text-[#D93D7A]">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336] leading-tight">
                {t.cart.title}
              </h2>
              <p className="text-[11px] text-[#7E687F] tabular-nums">
                {cartItemCount}{' '}
                {cartItemCount === 1 ? t.cart.readySuffixSingular : t.cart.readySuffixPlural}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label={t.cart.closeAria}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#6D586E] hover:bg-[#FFF1F5] hover:text-[#352336] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {cartItemsDetailed.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="clay-card-pink w-full p-7 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#D93D7A] mb-4">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-[var(--font-display)] text-lg font-bold text-[#352336] mb-1.5">
                  {t.cart.emptyTitle}
                </h3>
                <p className="text-sm text-[#6D586E] max-w-xs mb-6 leading-relaxed">
                  {t.cart.emptyBody}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    navigate({ page: 'shop' });
                  }}
                  className="clay-button px-5 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  {t.cart.browseShop}
                </button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3.5">
              {cartItemsDetailed.map(({ product, quantity, unitPrice, lineTotal }) => (
                <li
                  key={product.id}
                  className="clay-card p-3.5 flex gap-3.5 items-start"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      navigate({ page: 'product', slug: product.slug });
                    }}
                    className="w-20 h-16 rounded-2xl overflow-hidden bg-[#FDF6F8] border border-[#EFE3E9] shrink-0 cursor-pointer shadow-sm"
                  >
                    <SafeImage
                      src={product.previewImages[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCartOpen(false);
                          navigate({ page: 'product', slug: product.slug });
                        }}
                        className="text-sm font-semibold text-[#352336] hover:text-[#D93D7A] text-left truncate cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`${t.common.delete} ${product.name}`}
                        className="text-[#8D788E] hover:text-[#B91C1C] p-1.5 rounded-xl hover:bg-[#FEF2F2] transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#7E687F] mt-0.5 tabular-nums">
                      {formatProductType(product.productType, lang)} · {formatUSD(unitPrice)}{' '}
                      {t.common.each}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
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
          )}
        </div>

        {cartItemsDetailed.length > 0 && (
          <div className="border-t border-[#F2E2EA] bg-white px-5 sm:px-6 py-5 space-y-4">
            <div className="clay-card-lavender p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#5E4A68]">
                <span>{t.cart.subtotal}</span>
                <span className="tabular-nums font-semibold text-[#352336]">
                  {formatUSD(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#5E4A68]">
                <span>{t.cart.deliveryLabel}</span>
                <span className="tabular-nums font-semibold text-[#352336]">
                  {t.cart.deliveryValue}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#352336] pt-2 border-t border-[#DFD6F5]">
                <span>{t.cart.total}</span>
                <span className="tabular-nums">{formatUSD(cartTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                navigate({ page: 'checkout' });
              }}
              className="clay-button w-full py-3.5 px-4 text-sm font-semibold cursor-pointer"
            >
              {t.cart.checkoutButton}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
