import { ImagePlus, RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { BUILT_IN_ARTWORK_OPTIONS } from '../../data/seedCatalog';
import { saveProduct, seedInitialCatalogToFirestore } from '../../services/firestoreStore';
import { Category, Product, ProductType } from '../../types/store';
import { compressPreviewImage, isSafeImageUrl, sanitizeId, slugify } from '../../utils/formatters';
import { SafeImage } from '../SafeImage';

interface AdminProductModalProps {
  product: Product | null;
  categories: Category[];
  seedIfSample?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function AdminProductModal({
  product,
  categories,
  seedIfSample = false,
  onClose,
  onSaved,
}: AdminProductModalProps) {
  const isNew = !product;
  const defaultCat = categories[0] ?? {
    id: 'cat-cute-characters',
    name: 'Cute Characters',
  };

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '5.50');
  const [salePrice, setSalePrice] = useState(
    product?.salePrice != null ? String(product.salePrice) : ''
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCat.id);
  const [productType, setProductType] = useState<ProductType>(
    product?.productType ?? 'individual_pack'
  );
  const [fileFormat, setFileFormat] = useState(
    product?.fileFormat ?? 'PNG (300 DPI) · GoodNotes'
  );
  const [contentsSummary, setContentsSummary] = useState(
    product?.contentsSummary ?? '30 transparent PNG stickers · 1 GoodNotes collection'
  );
  const [downloadableAssetKey, setDownloadableAssetKey] = useState(
    product?.downloadableAssetKey ?? 'vault/packs/new-sticker-pack-v1.zip'
  );
  const [previewImages, setPreviewImages] = useState<string[]>(
    product?.previewImages?.length
      ? product.previewImages
      : [BUILT_IN_ARTWORK_OPTIONS[0].url]
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [newArrival, setNewArrival] = useState(product?.newArrival ?? true);
  const [published, setPublished] = useState(product?.published ?? true);
  const [popularityScore, setPopularityScore] = useState(
    product ? String(product.popularityScore) : '80'
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReplaceMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingImage(true);
    try {
      const compressed = await compressPreviewImage(file);
      setPreviewImages((prev) => [compressed, ...prev.slice(1)].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace main product image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingImage(true);
    try {
      const compressed = await compressPreviewImage(file);
      setPreviewImages((prev) => [...prev, compressed].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process preview image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = Number(price);
    const parsedSale = salePrice.trim() === '' ? null : Number(salePrice);

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Please enter a valid non-negative price.');
      return;
    }
    if (
      parsedSale !== null &&
      (!Number.isFinite(parsedSale) || parsedSale < 0 || parsedSale >= parsedPrice)
    ) {
      setError('Sale price must be lower than the regular price.');
      return;
    }
    if (previewImages.length === 0) {
      setError('Please include at least one preview image.');
      return;
    }
    if (previewImages.some((img) => !isSafeImageUrl(img))) {
      setError('One or more preview image URLs use an unsupported or unsafe format.');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId) ?? defaultCat;
    const finalSlug = slugify(slug || name);
    const id = product?.id ?? sanitizeId('prod', finalSlug);

    setSaving(true);
    try {
      if (seedIfSample) {
        await seedInitialCatalogToFirestore();
      }
      await saveProduct(
        {
          id,
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || 'Cute pastel digital sticker pack.',
          price: parsedPrice,
          salePrice: parsedSale,
          categoryId: cat.id,
          categoryName: cat.name,
          previewImages,
          featured,
          bestSeller,
          newArrival,
          published,
          productType,
          fileFormat: fileFormat.trim(),
          contentsSummary: contentsSummary.trim(),
          downloadableAssetKey: downloadableAssetKey.trim(),
          popularityScore: Math.max(0, Number(popularityScore) || 0),
        },
        isNew
      );
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#352336]/45 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Add Product' : 'Edit Product'}
    >
      <div className="clay-card max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#F2E0E8] bg-white/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#B8255F]">
              Product Catalog Manager
            </p>
            <h2 className="font-[var(--font-display)] text-lg font-bold text-[#352336] truncate">
              {isNew ? 'Add Digital Product' : `Edit: ${product.name}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product modal"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#6D586E] hover:bg-[#FFF1F5] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (isNew) setSlug(slugify(e.target.value));
                }}
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                URL Slug
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="clay-input w-full px-3.5 py-2.5 text-sm font-mono min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm tabular-nums min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Sale Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm tabular-nums min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Product Type
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                <option value="individual_pack">Individual Sticker Pack</option>
                <option value="bundle">Bundle</option>
                <option value="printable_pack">Printable Pack</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                File Format
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#352336] mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              required
              maxLength={2500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="clay-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Contents Summary (separate bullets with ·)
              </label>
              <input
                type="text"
                required
                maxLength={500}
                value={contentsSummary}
                onChange={(e) => setContentsSummary(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#352336] mb-1.5">
                Private Studio Fulfillment Reference (WhatsApp Delivery — Internal)
              </label>
              <input
                type="text"
                required
                maxLength={180}
                value={downloadableAssetKey}
                onChange={(e) => setDownloadableAssetKey(e.target.value)}
                className="clay-input w-full px-3.5 py-2.5 text-sm font-mono min-h-[44px]"
              />
            </div>
          </div>

          {/* Preview Images Upload, Replace Main & Studio Artwork Picker */}
          <div className="clay-card-pink p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A61E56]">
                Product Artwork & Cover Image ({previewImages.length}/6)
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <label className="clay-button-soft inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer min-h-[40px]">
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{uploadingImage ? 'Processing...' : 'Replace Main Image'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleReplaceMainImage}
                    disabled={uploadingImage}
                    className="sr-only"
                  />
                </label>

                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#F4CADB] text-[#352336] text-xs font-semibold hover:bg-[#FFF8FB] cursor-pointer min-h-[40px]">
                  <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Gallery</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || previewImages.length >= 6}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                aria-label="Replace main cover with studio artwork"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    setPreviewImages((prev) => [e.target.value, ...prev.slice(1)].slice(0, 6));
                    e.target.value = '';
                  }
                }}
                className="clay-input px-3 py-2 text-xs min-h-[40px]"
              >
                <option value="">Replace main cover with studio art...</option>
                {BUILT_IN_ARTWORK_OPTIONS.map((art) => (
                  <option key={art.url} value={art.url}>
                    {art.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Add built-in studio artwork"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    setPreviewImages((prev) =>
                      prev.includes(e.target.value)
                        ? prev
                        : [...prev, e.target.value].slice(0, 6)
                    );
                    e.target.value = '';
                  }
                }}
                className="clay-input px-3 py-2 text-xs min-h-[40px]"
              >
                <option value="">+ Add studio art to gallery...</option>
                {BUILT_IN_ARTWORK_OPTIONS.map((art) => (
                  <option key={art.url} value={art.url}>
                    {art.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {previewImages.map((img, idx) => (
                <div
                  key={`${img.slice(0, 32)}-${idx}`}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden border bg-white ${
                    idx === 0 ? 'border-[#D93D7A] ring-2 ring-[#D93D7A]/25' : 'border-[#EADCE4]'
                  }`}
                >
                  <SafeImage src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-[#352336]/80 text-white text-[10px] font-semibold">
                      Main
                    </span>
                  )}
                  {previewImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove preview image"
                      className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/95 text-[#B91C1C] flex items-center justify-center shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#7A3151] leading-relaxed">
              Uploaded images are automatically resized (&le;720px) and stamped with a diagonal <strong>COTTON CANDY STICKER</strong> watermark for catalog protection. Full-resolution originals stay private for WhatsApp delivery.
            </p>
          </div>

          {/* Flags & Popularity */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 border-t border-[#F3E7ED] pt-4 text-xs font-medium text-[#352336]">
            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="accent-[#D93D7A] w-4 h-4"
              />
              <span>Active (Published)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#D93D7A] w-4 h-4"
              />
              <span>Featured</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={bestSeller}
                onChange={(e) => setBestSeller(e.target.checked)}
                className="accent-[#D93D7A] w-4 h-4"
              />
              <span>Best Seller</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={newArrival}
                onChange={(e) => setNewArrival(e.target.checked)}
                className="accent-[#D93D7A] w-4 h-4"
              />
              <span>New Arrival</span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="popularity-score" className="text-[#7E687F]">
                Popularity
              </label>
              <input
                id="popularity-score"
                type="number"
                min="0"
                max="100000"
                value={popularityScore}
                onChange={(e) => setPopularityScore(e.target.value)}
                className="clay-input w-20 px-2.5 py-1.5 text-xs tabular-nums"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-2xl px-4 py-3 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-[#EADCE4] bg-white text-sm font-semibold text-[#6D586E] hover:bg-[#FAF5F8] cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="clay-button px-6 py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer min-h-[44px]"
            >
              {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
