import { useStore } from '../context/StoreContext';
import { interpolate } from '../i18n/translations';
import { SHOP_WHATSAPP_BASE_URL, SHOP_WHATSAPP_DISPLAY } from '../services/whatsappCheckout';

export function Footer() {
  const { navigate, t } = useStore();

  return (
    <footer className="border-t border-[#EFE3E9] bg-[#FDF6F8] text-[#6D586E] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336] mb-3">
              {t.common.brandName}
            </h2>
            <p className="text-sm leading-relaxed text-[#6D586E] max-w-xs">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#352336] mb-3">{t.footer.shopTitle}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.allPacks}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop', initialType: 'bundle' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.bundles}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop', initialType: 'printable_pack' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.printable}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'orders' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.ordersLink}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#352336] mb-3">{t.footer.policiesTitle}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'policy', topic: 'delivery' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.policyDelivery}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'policy', topic: 'licensing' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.policyLicensing}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'policy', topic: 'refunds' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.policyRefunds}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'policy', topic: 'privacy' })}
                  className="hover:text-[#D93D7A] transition-colors cursor-pointer"
                >
                  {t.footer.policyPrivacy}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#352336] mb-3">{t.footer.contactTitle}</h3>
            <p className="text-sm leading-relaxed mb-2">{t.footer.contactPrompt}</p>
            <div className="space-y-1">
              <a
                href="mailto:halo@cottoncandysticker.studio"
                className="block text-sm font-medium text-[#D93D7A] hover:underline"
              >
                halo@cottoncandysticker.studio
              </a>
              <a
                href={SHOP_WHATSAPP_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-semibold text-[#352336] hover:text-[#D93D7A]"
              >
                WhatsApp: {SHOP_WHATSAPP_DISPLAY}
              </a>
            </div>
            <p className="text-xs text-[#7E687F] mt-3">
              {interpolate(t.footer.deliveryFooterNote, { phone: SHOP_WHATSAPP_DISPLAY })}
            </p>
          </div>
        </div>

        <div className="border-t border-[#EFE3E9] mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#7E687F]">
          <p>{interpolate(t.common.copyright, { year: new Date().getFullYear() })}</p>
          <p>{t.common.pricesNote}</p>
        </div>
      </div>
    </footer>
  );
}
