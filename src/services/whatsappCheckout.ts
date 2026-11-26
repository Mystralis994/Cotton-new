import { AppLang, interpolate, TRANSLATIONS } from '../i18n/translations';
import { Product } from '../types/store';
import { formatUSD, getEffectivePrice } from '../utils/formatters';

export const SHOP_WHATSAPP_E164 = '6281238078363';
export const SHOP_WHATSAPP_DISPLAY = '+6281238078363';
export const SHOP_WHATSAPP_BASE_URL = `https://wa.me/${SHOP_WHATSAPP_E164}`;

export interface ValidatedOrderLineItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
}

export interface WhatsAppCustomerInput {
  customerName: string;
  customerWhatsapp: string;
  orderNote: string;
}

export interface ValidatedWhatsAppCustomerInput {
  customerName: string;
  customerWhatsapp: string;
  orderNote: string;
}

export function validateWhatsappCustomerInput(
  input: WhatsAppCustomerInput,
  lang: AppLang = 'en'
): ValidatedWhatsAppCustomerInput {
  const errs = TRANSLATIONS[lang].errors;
  const cleanName = input.customerName.trim().slice(0, 120);
  if (cleanName.length < 2) {
    throw new Error(errs.enterFullName);
  }

  const cleanWhatsapp = input.customerWhatsapp.trim().slice(0, 32);
  if (cleanWhatsapp.length > 0) {
    const digitsOnly = cleanWhatsapp.replace(/\D/g, '');
    if (!/^[+\d\s()-]{6,32}$/.test(cleanWhatsapp) || digitsOnly.length < 6) {
      throw new Error(errs.invalidWhatsapp);
    }
  }

  const cleanNote = input.orderNote.trim().slice(0, 500);
  return {
    customerName: cleanName,
    customerWhatsapp: cleanWhatsapp,
    orderNote: cleanNote,
  };
}

export function computeAuthoritativeOrderItems(
  cartItems: { productId: string; quantity: number }[],
  catalogProducts: Product[],
  lang: AppLang = 'en'
): { items: ValidatedOrderLineItem[]; subtotal: number; total: number } {
  const errs = TRANSLATIONS[lang].errors;
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error(errs.emptyCart);
  }

  const items: ValidatedOrderLineItem[] = [];
  for (const entry of cartItems) {
    const product = catalogProducts.find((p) => p.id === entry.productId && p.published);
    if (!product) {
      throw new Error(errs.itemUnavailable);
    }
    const qty = Math.floor(entry.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 25) {
      throw new Error(interpolate(errs.invalidQuantity, { name: product.name }));
    }
    const unitPrice = Number(getEffectivePrice(product).toFixed(2));
    const lineSubtotal = Number((unitPrice * qty).toFixed(2));
    items.push({ product, quantity: qty, unitPrice, lineSubtotal });
  }

  const subtotal = Number(items.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2));
  return {
    items,
    subtotal,
    total: subtotal,
  };
}

export function buildWhatsAppOrderMessage(params: {
  items: ValidatedOrderLineItem[];
  total: number;
  customerName: string;
  customerWhatsapp?: string;
  orderNote?: string;
  orderNumber?: string;
  lang?: AppLang;
}): string {
  const isEn = params.lang === 'en';
  const itemBlocks = params.items
    .map((item) =>
      isEn
        ? [
            `- Product name: ${item.product.name}`,
            `- Quantity: ${item.quantity}`,
            `- Unit price: ${formatUSD(item.unitPrice)}`,
            `- Subtotal: ${formatUSD(item.lineSubtotal)}`,
          ].join('\n')
        : [
            `- Nama produk: ${item.product.name}`,
            `- Jumlah: ${item.quantity}`,
            `- Harga per item: ${formatUSD(item.unitPrice)}`,
            `- Subtotal: ${formatUSD(item.lineSubtotal)}`,
          ].join('\n')
    )
    .join('\n\n');

  const lines: string[] = isEn
    ? [
        'Hello Cotton Candy Sticker! 🍬',
        '',
        'I would like to order the following digital stickers:',
        '',
        itemBlocks,
        '',
        `Order total: ${formatUSD(params.total)}`,
        '',
        `Name: ${params.customerName.trim()}`,
      ]
    : [
        'Halo Cotton Candy Sticker! 🍬',
        '',
        'Saya ingin membeli sticker berikut:',
        '',
        itemBlocks,
        '',
        `Total pesanan: ${formatUSD(params.total)}`,
        '',
        `Nama: ${params.customerName.trim()}`,
      ];

  const cleanWa = (params.customerWhatsapp || '').trim();
  if (cleanWa) {
    lines.push(isEn ? `WhatsApp Number: ${cleanWa}` : `Nomor WhatsApp: ${cleanWa}`);
  }

  if (params.orderNumber) {
    lines.push(`Order ID: ${params.orderNumber}`);
  }

  lines.push('');
  lines.push(
    isEn
      ? `Note: ${(params.orderNote || '').trim() || '-'}`
      : `Catatan: ${(params.orderNote || '').trim() || '-'}`
  );
  lines.push('');
  lines.push(
    isEn
      ? 'I would like to proceed with this order and receive my sticker files via WhatsApp after payment verification. Thank you! 💗'
      : 'Saya ingin melanjutkan pesanan ini dan menerima file stiker asli lewat WhatsApp setelah pembayaran diverifikasi. Terima kasih! 💗'
  );

  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(message: string): string {
  return `${SHOP_WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}
