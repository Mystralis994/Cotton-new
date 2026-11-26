import { ArrowLeft, Check, FileArchive, Minus, PackageCheck, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import {
  formatProductType,
  formatUSD,
  getEffectivePrice,
  isOnSale,
} from '../utils/formatters';

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { publishedProducts, navigate, addToCart, lang, t } = useStore();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(
    () => publishedProducts.find((p) => p.slug === slug),
    [publishedProducts, slug]
  );

  useEffect(() => {
    setSelectedImageIdx(0);
    setQuantity(1);
  }, [slug]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = publishedProducts.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId
    );
    const others = publishedProducts.filter(
      (p) => p.id !== product.id && p.categoryId !== product.categoryId
    );
    return [...sameCategory, ...others].slice(0, 4);
  }, [product, publishedProducts]);

  if (!product) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="clay-card-pink p-10">
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#352336] mb-2">
            {t.product.notFoundTitle}
          </h1>
          <p className="text-sm text-[#6D586E] mb-6">{t.product.notFoundBody}</p>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="clay-button px-5 py-2.5 text-sm font-semibold cursor-pointer"
          >
            {t.common.backToShop}
          </button>
        </div>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const onSale = isOnSale(product);
  const gallery = product.previewImages.length > 0 ? product.previewImages : [''];
  const activeImage = gallery[selectedImageIdx] ?? gallery[0];
  const contentsItems = product.contentsSummary
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-[#7E687F]">
        <button
          type="button"
          onClick={() => navigate({ page: 'shop' })}
          className="inline-flex items-center gap-1.5 hover:text-[#D93D7A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t.product.breadcrumbShop}</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => navigate({ page: 'shop', initialCategory: product.categoryId })}
          className="hover:text-[#D93D7A] transition-colors cursor-pointer"
        >
          {product.categoryName}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[#352336] font-medium truncate">{product.name}</span>
      </nav>

      {/* Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-24">
          <div className="clay-card p-2.5 sm:p-3 space-y-2">
            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#FDF6F8]">
              <SafeImage
                src={activeImage}
                alt={`${product.name} (${t.common.protectedPreviewBadge} ${selectedImageIdx + 1})`}
                fallbackTitle={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-[#7E687F] px-2 pb-1">
              {t.product.previewProtectionNote}
            </p>
          </div>

          {gallery.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {gallery.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`${product.name} ${idx + 1}`}
                  className={`w-24 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    idx === selectedImageIdx
                      ? 'border-[#D93D7A] ring-2 ring-[#FCE7F3]'
                      : 'border-[#EFE3E9] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Details Right */}
        <div className="lg:col-span-5 clay-card p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7E687F] mb-2">
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{formatProductType(product.productType, lang)}</span>
            </div>
            <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] leading-tight [text-wrap:balance]">
              {product.name}
            </h1>
            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-bold text-[#352336]">
                {formatUSD(effectivePrice)}
              </span>
              {onSale && (
                <span className="text-base text-[#8D788E] line-through">
                  {formatUSD(product.price)}
                </span>
              )}
              <span className="text-xs text-[#7E687F]">{t.common.usd}</span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#5D495E] leading-relaxed">
            {product.description}
          </p>

          {/* File Format & Contents */}
          <div className="border-t border-b border-[#F3E7ED] py-5 space-y-4">
            <div className="flex items-start gap-3">
              <FileArchive className="w-4 h-4 text-[#D93D7A] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7E687F]">
                  {t.product.fileFormat}
                </p>
                <p className="text-sm font-medium text-[#352336] mt-0.5">
                  {product.fileFormat}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <PackageCheck className="w-4 h-4 text-[#6D47A6] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7E687F] mb-1">
                  {t.product.includedTitle}
                </p>
                <ul className="space-y-1">
                  {contentsItems.map((line) => (
                    <li key={line} className="text-sm text-[#352336] flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#D93D7A] shrink-0" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="clay-qty-box inline-flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="-"
                className="w-10 h-11 flex items-center justify-center text-[#6D586E] hover:text-[#352336] cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums text-[#352336]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(25, q + 1))}
                aria-label="+"
                className="w-10 h-11 flex items-center justify-center text-[#6D586E] hover:text-[#352336] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => addToCart(product.id, quantity)}
              className="clay-button flex-1 py-3 px-6 text-sm font-semibold cursor-pointer min-h-[44px]"
            >
              {t.product.addToBag} — {formatUSD(effectivePrice * quantity)}
            </button>
          </div>

          {/* Mandatory Digital Product & Manual WhatsApp Delivery Notice */}
          <div className="clay-card-pink p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#352336]">
              <ShieldCheck className="w-4 h-4 text-[#D93D7A]" aria-hidden="true" />
              <span>{t.product.digitalNoticeTitle}</span>
            </div>
            <p className="text-xs text-[#6D586E] leading-relaxed">
              {t.product.digitalNoticeBody}
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-[#EFE3E9]">
          <h2 className="font-[var(--font-display)] text-2xl font-bold text-[#352336]">
            {t.product.pairsWellWith}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
