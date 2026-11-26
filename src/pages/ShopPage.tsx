import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { PriceFilter, ProductType, SortOption } from '../types/store';
import { getEffectivePrice } from '../utils/formatters';

interface ShopPageProps {
  initialCategory?: string;
  initialType?: ProductType;
}

export function ShopPage({ initialCategory, initialType }: ShopPageProps) {
  const { categories, publishedProducts, catalogLoading, t } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedType, setSelectedType] = useState<ProductType | 'all'>(initialType || 'all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  useEffect(() => {
    setSelectedCategory(initialCategory || 'all');
  }, [initialCategory]);

  useEffect(() => {
    setSelectedType(initialType || 'all');
  }, [initialType]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = publishedProducts.filter((product) => {
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedType !== 'all' && product.productType !== selectedType) {
        return false;
      }
      const price = getEffectivePrice(product);
      if (priceFilter === 'under-5' && price >= 5) return false;
      if (priceFilter === '5-to-10' && (price < 5 || price > 10)) return false;
      if (priceFilter === 'over-10' && price <= 10) return false;

      if (q) {
        const haystack = `${product.name} ${product.description} ${product.categoryName} ${product.fileFormat}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.popularityScore - a.popularityScore;
        case 'newest':
          return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        case 'price-asc':
          return getEffectivePrice(a) - getEffectivePrice(b);
        case 'price-desc':
          return getEffectivePrice(b) - getEffectivePrice(a);
      }
    });
  }, [publishedProducts, selectedCategory, selectedType, priceFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    priceFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setPriceFilter('all');
    setSortBy('popular');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EFE3E9] pb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-[#352336] tracking-tight">
            {t.shop.title}
          </h1>
          <p className="text-sm sm:text-base text-[#6D586E] mt-1.5">{t.shop.subtitle}</p>
        </div>

        <p className="text-sm text-[#6D586E] tabular-nums">
          {t.shop.showing}{' '}
          <strong className="font-semibold text-[#352336]">{filteredProducts.length}</strong>{' '}
          {filteredProducts.length === 1 ? t.shop.productSingular : t.shop.productPlural}
        </p>
      </div>

      {/* Search & Controls */}
      <div className="clay-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search
              className="w-4 h-4 text-[#8D788E] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="shop-search" className="sr-only">
              {t.shop.searchPlaceholder}
            </label>
            <input
              id="shop-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.shop.searchPlaceholder}
              className="clay-input w-full pl-10 pr-9 py-2.5 text-sm text-[#352336] placeholder:text-[#9A859B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.shop.clearSearchAria}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D788E] hover:text-[#352336] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Product Type Select */}
          <div className="md:col-span-3">
            <label htmlFor="type-filter" className="sr-only">
              {t.shop.allTypes}
            </label>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ProductType | 'all')}
              className="clay-input w-full px-3.5 py-2.5 text-sm text-[#352336]"
            >
              <option value="all">{t.shop.allTypes}</option>
              <option value="individual_pack">{t.shop.typePack}</option>
              <option value="bundle">{t.shop.typeBundle}</option>
              <option value="printable_pack">{t.shop.typePrintable}</option>
            </select>
          </div>

          {/* Price Select */}
          <div className="md:col-span-2">
            <label htmlFor="price-filter" className="sr-only">
              {t.shop.anyPrice}
            </label>
            <select
              id="price-filter"
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              className="clay-input w-full px-3.5 py-2.5 text-sm text-[#352336]"
            >
              <option value="all">{t.shop.anyPrice}</option>
              <option value="under-5">{t.shop.under5}</option>
              <option value="5-to-10">{t.shop.range5to10}</option>
              <option value="over-10">{t.shop.over10}</option>
            </select>
          </div>

          {/* Sort Select */}
          <div className="md:col-span-2">
            <label htmlFor="sort-select" className="sr-only">
              {t.shop.sortPopular}
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="clay-input w-full px-3.5 py-2.5 text-sm text-[#352336]"
            >
              <option value="popular">{t.shop.sortPopular}</option>
              <option value="newest">{t.shop.sortNewest}</option>
              <option value="price-asc">{t.shop.sortPriceAsc}</option>
              <option value="price-desc">{t.shop.sortPriceDesc}</option>
            </select>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7E687F] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.shop.categoriesLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all' ? 'clay-button' : 'clay-button-soft'
            }`}
          >
            {t.shop.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.id ? 'clay-button' : 'clay-button-soft'
              }`}
            >
              {cat.name}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs font-semibold text-[#B8255F] hover:underline cursor-pointer whitespace-nowrap"
            >
              {t.shop.resetFilters}
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Product Grid / States */}
      {catalogLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-64 sm:h-72 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="clay-card-pink p-10 sm:p-12 text-center">
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[#352336] mb-2">
            {t.shop.emptyTitle}
          </h2>
          <p className="text-sm text-[#6D586E] max-w-md mx-auto mb-6">{t.shop.emptyBody}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="clay-button px-5 py-2.5 text-sm font-semibold cursor-pointer"
          >
            {t.shop.resetAllFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
