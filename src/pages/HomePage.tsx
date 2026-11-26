import { ArrowRight, Mail, PackageCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useStore } from '../context/StoreContext';
import { HERO_BANNER_IMAGE } from '../data/seedCatalog';
import { formatUSD } from '../utils/formatters';

const CATEGORY_CLAY_CLASSES = [
  'clay-card-pink',
  'clay-card-lavender',
  'clay-card-blue',
  'clay-card-peach',
  'clay-card-mint',
  'clay-card-butter',
];

export function HomePage() {
  const { categories, publishedProducts, navigate, catalogLoading, t } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterNotice, setNewsletterNotice] = useState(false);

  const bestSellers = useMemo(
    () => publishedProducts.filter((p) => p.bestSeller).slice(0, 4),
    [publishedProducts]
  );

  const newArrivals = useMemo(
    () => publishedProducts.filter((p) => p.newArrival).slice(0, 4),
    [publishedProducts]
  );

  const bundleShowcase = useMemo(
    () => publishedProducts.find((p) => p.productType === 'bundle') || publishedProducts[0],
    [publishedProducts]
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of publishedProducts) {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    }
    return map;
  }, [publishedProducts]);

  const handleNewsletterPreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterNotice(true);
  };

  return (
    <div className="space-y-16 sm:space-y-20 pb-8">
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center clay-card-pink p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B8255F] mb-3">
              {t.home.eyebrow}
            </p>
            <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#352336] leading-[1.12] tracking-tight [text-wrap:balance] mb-4">
              {t.home.heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#5E475F] leading-relaxed mb-7 max-w-md">
              {t.home.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'shop' })}
                className="clay-button inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>{t.home.browsePacks}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'shop', initialType: 'bundle' })}
                className="clay-button-soft inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>{t.home.viewBundles}</span>
              </button>
            </div>
            <p className="text-xs text-[#7E687F] mt-6">{t.home.heroNote}</p>
          </div>

          <div className="lg:col-span-7 clay-card p-2.5 sm:p-3 overflow-hidden min-h-[260px]">
            <div className="w-full h-full rounded-2xl overflow-hidden bg-[#FAF1EC]">
              <SafeImage
                src={HERO_BANNER_IMAGE}
                alt="Cotton Candy Sticker flat-lay showcase"
                fallbackTitle="Cotton Candy Sticker Studio Collection"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections (Side-by-Side Colorful Clay Grid) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] tracking-tight">
              {t.home.featuredCollections}
            </h2>
            <p className="text-sm text-[#6D586E] mt-1">{t.home.featuredSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="text-sm font-semibold text-[#D93D7A] hover:text-[#BE2F68] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>{t.home.exploreCatalog}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {categories.map((cat, idx) => {
            const count = categoryCounts.get(cat.id) ?? 0;
            const clayClass = CATEGORY_CLAY_CLASSES[idx % CATEGORY_CLAY_CLASSES.length];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate({ page: 'shop', initialCategory: cat.id })}
                className={`text-left p-4 sm:p-6 transition-transform duration-150 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${clayClass}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 mb-1.5 sm:mb-2">
                  <h3 className="font-[var(--font-display)] text-sm sm:text-lg font-bold text-[#352336] leading-snug">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#6D586E] tabular-nums shrink-0">
                    {count} {count === 1 ? t.home.packSingular : t.home.packPlural}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#5E4B60] leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Best-Selling Products (Side-by-Side Grid) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] tracking-tight">
              {t.home.bestSellersTitle}
            </h2>
            <p className="text-sm text-[#6D586E] mt-1">{t.home.bestSellersSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="text-sm font-semibold text-[#D93D7A] hover:text-[#BE2F68] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>{t.home.seeBestSellers}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {catalogLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-64 sm:h-72 rounded-3xl bg-[#F7EEF4] animate-pulse border border-[#EFE3E9]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Bundle Promotion Banner */}
      {bundleShowcase && (
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="clay-card-lavender p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6D47A6]">
                <PackageCheck className="w-4 h-4" aria-hidden="true" />
                <span>{t.home.bundleEyebrow}</span>
              </div>
              <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] [text-wrap:balance]">
                {t.home.bundleTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#5E4A68] leading-relaxed max-w-xl">
                {t.home.bundleDescPrefix} {t.home.featuredNow}{' '}
                <strong className="font-semibold text-[#352336]">{bundleShowcase.name}</strong> (
                {formatUSD(bundleShowcase.salePrice ?? bundleShowcase.price)}).
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate({ page: 'product', slug: bundleShowcase.slug })}
                  className="clay-button px-5 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  {t.home.inspectBundle}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop', initialType: 'bundle' })}
                  className="clay-button-soft px-5 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  {t.home.browseBundles}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 clay-card p-2">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white">
                <SafeImage
                  src={bundleShowcase.previewImages[0]}
                  alt={bundleShowcase.name}
                  fallbackTitle={bundleShowcase.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals (Side-by-Side Grid) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#352336] tracking-tight">
              {t.home.newArrivalsTitle}
            </h2>
            <p className="text-sm text-[#6D586E] mt-1">{t.home.newArrivalsSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="text-sm font-semibold text-[#D93D7A] hover:text-[#BE2F68] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>{t.home.shopNewReleases}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Honest Newsletter UI (Backend Pending) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="clay-card p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B8255F] mb-2">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{t.home.newsletterEyebrow}</span>
            </div>
            <h2 className="font-[var(--font-display)] text-2xl font-bold text-[#352336] mb-2">
              {t.home.newsletterTitle}
            </h2>
            <p className="text-sm text-[#6D586E] leading-relaxed">{t.home.newsletterDesc}</p>
          </div>

          <form
            onSubmit={handleNewsletterPreviewSubmit}
            className="w-full lg:w-auto lg:min-w-[380px] space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="newsletter-email" className="sr-only">
                {t.home.newsletterPlaceholder}
              </label>
              <div className="relative flex-1">
                <Mail
                  className="w-4 h-4 text-[#8D788E] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="newsletter-email"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterNotice) setNewsletterNotice(false);
                  }}
                  placeholder={t.home.newsletterPlaceholder}
                  className="clay-input w-full pl-10 pr-4 py-2.5 text-sm text-[#352336] placeholder:text-[#9A859B]"
                />
              </div>
              <button
                type="submit"
                className="clay-button-soft px-5 py-2.5 text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                {t.home.comingSoon}
              </button>
            </div>
            {newsletterNotice && (
              <p className="text-xs text-[#6D586E] bg-[#FDF6F8] border border-[#F2DCE6] rounded-xl px-3.5 py-2">
                {t.home.newsletterNotice}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
