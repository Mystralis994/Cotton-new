import { Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types/store';
import {
  formatProductType,
  formatUSD,
  getEffectivePrice,
  isOnSale,
} from '../utils/formatters';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart, lang, t } = useStore();
  const effectivePrice = getEffectivePrice(product);
  const onSale = isOnSale(product);

  return (
    <article className="group clay-card overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1">
      <div className="p-2 sm:p-2.5 pb-0 sm:pb-0">
        <button
          type="button"
          onClick={() => navigate({ page: 'product', slug: product.slug })}
          className="relative aspect-[4/3] w-full rounded-2xl bg-[#FDF6F8] border border-[#F5E4EC] overflow-hidden text-left cursor-pointer block"
          aria-label={product.name}
        >
          <SafeImage
            src={product.previewImages[0]}
            alt={`${product.name} (${t.common.protectedPreviewBadge})`}
            fallbackTitle={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#7E687F] mb-1 truncate">
            <span className="truncate">{product.categoryName}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline shrink-0">
              {formatProductType(product.productType, lang)}
            </span>
            {onSale && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#C02664] font-semibold shrink-0">{t.common.sale}</span>
              </>
            )}
          </div>

          <h3 className="text-xs sm:text-sm md:text-[15px] font-bold text-[#352336] leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'product', slug: product.slug })}
              className="text-left hover:text-[#D93D7A] transition-colors cursor-pointer"
            >
              {product.name}
            </button>
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F4E6EE]">
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-1.5 tabular-nums min-w-0">
            <span className="text-xs sm:text-[15px] font-bold text-[#352336]">
              {formatUSD(effectivePrice)}
            </span>
            {onSale && (
              <span className="text-[10px] sm:text-xs text-[#8D788E] line-through">
                {formatUSD(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => addToCart(product.id, 1)}
            aria-label={`${t.product.addShort} ${product.name}`}
            className="clay-button-soft inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] sm:min-h-[36px]"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            <span>{t.product.addShort}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
