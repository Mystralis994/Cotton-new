import { AppLang } from '../i18n/translations';
import { OrderStatus, PaymentMethodType, PaymentStatus, Product, ProductType } from '../types/store';

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getEffectivePrice(product: Pick<Product, 'price' | 'salePrice'>): number {
  if (
    typeof product.salePrice === 'number' &&
    product.salePrice >= 0 &&
    product.salePrice < product.price
  ) {
    return product.salePrice;
  }
  return product.price;
}

export function isOnSale(product: Pick<Product, 'price' | 'salePrice'>): boolean {
  return (
    typeof product.salePrice === 'number' &&
    product.salePrice >= 0 &&
    product.salePrice < product.price
  );
}

export function formatProductType(type: ProductType, lang: AppLang = 'en'): string {
  if (lang === 'id') {
    switch (type) {
      case 'individual_pack':
        return 'Paket Stiker';
      case 'bundle':
        return 'Bundle';
      case 'printable_pack':
        return 'Paket Cetak PNG';
    }
  }
  switch (type) {
    case 'individual_pack':
      return 'Sticker Pack';
    case 'bundle':
      return 'Bundle';
    case 'printable_pack':
      return 'Printable PNG Pack';
  }
}

export function formatOrderStatus(status: OrderStatus, lang: AppLang = 'en'): string {
  if (lang === 'id') {
    switch (status) {
      case 'pending_contact':
        return 'Menunggu (WhatsApp)';
      case 'pending':
        return 'Menunggu';
      case 'confirmed':
        return 'Dikonfirmasi';
      case 'processing':
        return 'Diproses';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      case 'paid':
        return 'Selesai · Lunas';
      case 'failed':
        return 'Gagal';
      case 'refunded':
        return 'Dana Dikembalikan';
    }
  }
  switch (status) {
    case 'pending_contact':
      return 'Pending (WhatsApp)';
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'paid':
      return 'Completed · Paid';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
  }
}

export function formatPaymentMethodType(
  type: PaymentMethodType | '',
  lang: AppLang = 'en'
): string {
  if (lang === 'id') {
    switch (type) {
      case 'bank_transfer':
        return 'Transfer Bank';
      case 'qris':
        return 'QRIS';
      case 'paypal':
        return 'Tautan PayPal';
      case 'other':
      default:
        return 'Pembayaran Manual';
    }
  }
  switch (type) {
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'qris':
      return 'QRIS';
    case 'paypal':
      return 'PayPal Link';
    case 'other':
    default:
      return 'Manual Payment';
  }
}

export function formatPaymentStatus(status: PaymentStatus, lang: AppLang = 'en'): string {
  if (lang === 'id') {
    switch (status) {
      case 'unpaid':
        return 'Belum Dibayar';
      case 'awaiting_verification':
        return 'Menunggu Verifikasi';
      case 'paid':
        return 'Lunas · Terverifikasi';
      case 'rejected':
        return 'Ditolak · Perlu Perbaikan';
      case 'pending':
        return 'Menunggu Pembayaran';
      case 'failed':
        return 'Gagal';
      case 'refunded':
        return 'Dikembalikan';
    }
  }
  switch (status) {
    case 'unpaid':
      return 'Unpaid';
    case 'awaiting_verification':
      return 'Awaiting Verification';
    case 'paid':
      return 'Paid · Verified';
    case 'rejected':
      return 'Rejected · Action Needed';
    case 'pending':
      return 'Pending Payment';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
  }
}

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || `item-${Date.now()}`;
}

export function sanitizeId(prefix: string, name: string): string {
  const base = slugify(name).slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${base}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function formatIsoDate(iso?: string, lang: AppLang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatIsoDateTime(iso?: string, lang: AppLang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

const ALLOWED_RASTER_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024; // 10MB raw limit

export function isSafeHttpsUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || /[\s<>"']/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeImageUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !/[\s<>"']/.test(trimmed);
  }
  if (/^https:\/\/[^\s<>"']+$/.test(trimmed)) {
    return true;
  }
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  const angle = (-28 * Math.PI) / 180;
  const fontSize = Math.max(13, Math.round(Math.min(width, height) * 0.045));
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const stepX = Math.max(190, fontSize * 12);
  const stepY = Math.max(105, fontSize * 5.8);

  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(53, 35, 54, 0.30)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
      ctx.strokeText('COTTON CANDY STICKER', 0, 0);
      ctx.fillText('COTTON CANDY STICKER', 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

export interface CompressPreviewOptions {
  watermark?: boolean;
  maxDim?: number;
}

/**
 * Compresses an uploaded raster preview image into a low-resolution JPEG data URL under ~220KB
 * (stripping original metadata/EXIF via canvas re-encoding and rejecting SVG XSS payloads).
 * Product previews bake a repeated diagonal COTTON CANDY STICKER watermark into pixel data.
 */
export async function compressPreviewImage(
  file: File,
  options: CompressPreviewOptions = {}
): Promise<string> {
  const { watermark = true, maxDim = 720 } = options;

  if (!ALLOWED_RASTER_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Please choose a valid PNG, JPG, or WebP raster image file.');
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error('Selected image file is larger than 10MB. Please choose a smaller image.');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected image.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas image processing is unavailable.');

    ctx.fillStyle = '#FFFBF9';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (watermark) {
      drawWatermarkOnCanvas(ctx, width, height);
    }

    let quality = 0.78;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 220000 && quality > 0.4) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > 280000) {
      throw new Error('Image is still too large after compression. Please choose a smaller image.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
