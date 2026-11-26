import { useState } from 'react';
import { Globe, Menu, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { interpolate } from '../i18n/translations';

export function Header() {
  const { route, navigate, cartItemCount, setCartOpen, lang, setLang, t } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isShopAll = route.page === 'shop' && route.initialType !== 'bundle';
  const isBundles = route.page === 'shop' && route.initialType === 'bundle';

  const navItems = [
    {
      label: t.nav.home,
      active: route.page === 'home',
      onClick: () => {
        navigate({ page: 'home' });
        setMobileOpen(false);
      },
    },
    {
      label: t.nav.shop,
      active: isShopAll || route.page === 'product',
      onClick: () => {
        navigate({ page: 'shop' });
        setMobileOpen(false);
      },
    },
    {
      label: t.nav.bundles,
      active: isBundles,
      onClick: () => {
        navigate({ page: 'shop', initialType: 'bundle' });
        setMobileOpen(false);
      },
    },
    {
      label: t.nav.orders,
      active: route.page === 'orders' || route.page === 'order-payment',
      onClick: () => {
        navigate({ page: 'orders' });
        setMobileOpen(false);
      },
    },
    {
      label: t.nav.admin,
      active: route.page === 'admin',
      onClick: () => {
        navigate({ page: 'admin' });
        setMobileOpen(false);
      },
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFBF9]/95 backdrop-blur-md border-b border-[#EFE3E9]">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate({ page: 'home' });
            setMobileOpen(false);
          }}
          className="font-[var(--font-display)] text-base sm:text-xl font-bold tracking-tight text-[#352336] whitespace-nowrap shrink-0"
        >
          Cotton Candy Sticker
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 cursor-pointer ${
                item.active
                  ? 'text-[#D93D7A] border-[#D93D7A]'
                  : 'text-[#6D586E] border-transparent hover:text-[#352336] hover:border-[#E5C8D7]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Compact Language Toggle + Bag + Mobile Drawer Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            role="group"
            aria-label={t.nav.langToggleAria}
            className="inline-flex items-center rounded-xl border border-[#EADCE4] bg-white p-0.5 text-[11px] font-bold"
          >
            <Globe className="w-3.5 h-3.5 text-[#8D788E] ml-1.5 mr-1 hidden sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setLang('id')}
              aria-pressed={lang === 'id'}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                lang === 'id' ? 'bg-[#D93D7A] text-white' : 'text-[#6D586E] hover:text-[#352336]'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-[#D93D7A] text-white' : 'text-[#6D586E] hover:text-[#352336]'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={interpolate(t.nav.openBagAria, { count: cartItemCount })}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#D93D7A] text-white text-xs sm:text-sm font-semibold hover:bg-[#BE2F68] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums min-h-[40px]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>
              {t.nav.bag} ({cartItemCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? t.nav.closeMenuAria : t.nav.openMenuAria}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#EADCE4] bg-white text-[#352336] hover:bg-[#FFF1F5] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#EFE3E9] bg-[#FFFBF9] px-4 py-3">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  item.active
                    ? 'bg-[#FFF1F5] text-[#D93D7A]'
                    : 'text-[#352336] hover:bg-[#F7EEF4]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
