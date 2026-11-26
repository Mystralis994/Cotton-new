import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

type AppLang = 'id' | 'en';

interface FirebasePublicConfig {
  projectId: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  recaptchaSiteKey?: string;
}

interface CatalogProductRecord {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  published: boolean;
  productType: 'individual_pack' | 'bundle' | 'printable_pack';
  fileFormat: string;
  previewImage: string;
}

const ADMIN_EMAIL = 'jellyzizy@gmail.com';
const SHOP_WHATSAPP_E164 = '6281238078363';
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const FALLBACK_PRODUCTS: CatalogProductRecord[] = [
  {
    id: 'prod-pastel-kawaii-dreams',
    name: 'Pastel Kawaii Dreams Pack',
    slug: 'pastel-kawaii-dreams-pack',
    price: 5.5,
    salePrice: 4.5,
    published: true,
    productType: 'individual_pack',
    fileFormat: 'PNG (300 DPI) · GoodNotes .collection',
    previewImage: '/previews/pack-cute-characters.jpg',
  },
  {
    id: 'prod-kawaii-animal-friends',
    name: 'Strawberry Bunny & Animal Friends',
    slug: 'strawberry-bunny-animal-friends',
    price: 5.0,
    salePrice: null,
    published: true,
    productType: 'individual_pack',
    fileFormat: 'PNG (300 DPI) · GoodNotes · Notability',
    previewImage: '/previews/pack-kawaii-animals.jpg',
  },
  {
    id: 'prod-pastel-habit-planner-kit',
    name: 'Soft Pastel Habit & Washi Planner Kit',
    slug: 'soft-pastel-habit-washi-planner-kit',
    price: 7.5,
    salePrice: 6.0,
    published: true,
    productType: 'individual_pack',
    fileFormat: 'PNG (300 DPI) · GoodNotes · Zinnia',
    previewImage: '/previews/pack-planner-stickers.jpg',
  },
  {
    id: 'prod-four-seasons-kawaii',
    name: 'Four Seasons Pastel Collection',
    slug: 'four-seasons-pastel-collection',
    price: 6.5,
    salePrice: null,
    published: true,
    productType: 'individual_pack',
    fileFormat: 'PNG (300 DPI) · GoodNotes',
    previewImage: '/previews/pack-seasonal-stickers.jpg',
  },
  {
    id: 'prod-kawaii-sweets-printable',
    name: 'Kawaii Sweets Printable Sticker Sheets',
    slug: 'kawaii-sweets-printable-sticker-sheets',
    price: 5.5,
    salePrice: null,
    published: true,
    productType: 'printable_pack',
    fileFormat: 'PNG (300 DPI) · PDF (US Letter & A4) · Cricut Cut-Ready',
    previewImage: '/previews/pack-printable-stickers.jpg',
  },
  {
    id: 'prod-ultimate-cotton-candy-bundle',
    name: 'Ultimate Cotton Candy Studio Bundle',
    slug: 'ultimate-cotton-candy-studio-bundle',
    price: 18.0,
    salePrice: 12.5,
    published: true,
    productType: 'bundle',
    fileFormat: 'PNG (300 DPI) · GoodNotes · PDF Printable',
    previewImage: '/previews/pack-sticker-bundle.jpg',
  },
  {
    id: 'prod-kawaii-bakery-cafe',
    name: 'Kawaii Bakery & Melon Soda Pack',
    slug: 'kawaii-bakery-melon-soda-pack',
    price: 4.5,
    salePrice: null,
    published: true,
    productType: 'printable_pack',
    fileFormat: 'PNG (300 DPI) · PDF Printable · GoodNotes',
    previewImage: '/previews/pack-sweet-cafe.jpg',
  },
  {
    id: 'prod-celestial-dreams-pack',
    name: 'Celestial Dreams Moon & Cloud Pack',
    slug: 'celestial-dreams-moon-cloud-pack',
    price: 4.9,
    salePrice: 3.9,
    published: true,
    productType: 'individual_pack',
    fileFormat: 'PNG (300 DPI) · GoodNotes · Procreate Stamp',
    previewImage: '/previews/pack-celestial-dreams.jpg',
  },
  {
    id: 'prod-pastel-cozy-desk-pack',
    name: 'Pastel Cozy Desk & Study Kit',
    slug: 'pastel-cozy-desk-study-kit',
    price: 11.0,
    salePrice: 8.9,
    published: true,
    productType: 'bundle',
    fileFormat: 'PNG (300 DPI) · GoodNotes · Printable A6 Sheet',
    previewImage: '/previews/pack-cozy-desk.jpg',
  },
];

function loadFirebaseConfig(): FirebasePublicConfig {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw) as FirebasePublicConfig;
  } catch {
    return {
      projectId: 'cellular-bit-pbvhw',
      firestoreDatabaseId: 'ai-studio-8b04fdde-7890-4c82-8b31-93e1040849f7',
      storageBucket: 'cellular-bit-pbvhw.firebasestorage.app',
      recaptchaSiteKey: '',
    };
  }
}

const firebaseConfig = loadFirebaseConfig();

// In-memory x509 cert cache for Firebase ID token verification (no IAM required)
let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const response = await fetch(GOOGLE_CERTS_URL, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error('Failed to load Google public verification certificates.');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const ttlSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await response.json()) as Record<string, string>;
  certsExpiresAt = now + Math.max(60, ttlSeconds) * 1000;
  return cachedCerts;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  isAdmin: boolean;
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }
  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerSeg);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token algorithm or missing key ID.');
  }

  const certs = await getGooglePublicCerts();
  let pem = certs[header.kid];
  if (!pem) {
    certsExpiresAt = 0;
    const refreshed = await getGooglePublicCerts();
    pem = refreshed[header.kid];
  }
  if (!pem) {
    throw new Error('Unknown Firebase signing key.');
  }

  const normalizedSig = sigSeg.replace(/-/g, '+').replace(/_/g, '/');
  const signature = Buffer.from(
    normalizedSig + '='.repeat((4 - (normalizedSig.length % 4)) % 4),
    'base64'
  );
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerSeg}.${payloadSeg}`);
  verifier.end();

  if (!verifier.verify(pem, signature)) {
    throw new Error('Invalid Firebase token signature.');
  }

  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  }>(payloadSeg);

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${firebaseConfig.projectId}`;
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience mismatch.');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Token issuer mismatch.');
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Missing token subject.');
  }
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired.');
  }
  if (payload.iat && payload.iat > nowSec + 300) {
    throw new Error('Invalid token issued-at timestamp.');
  }
  if (payload.auth_time && payload.auth_time > nowSec + 300) {
    throw new Error('Invalid token auth timestamp.');
  }

  const email = typeof payload.email === 'string' ? payload.email : '';
  const emailVerified = payload.email_verified === true;
  return {
    uid: payload.sub,
    email,
    emailVerified,
    name: typeof payload.name === 'string' ? payload.name : '',
    isAdmin: emailVerified && email === ADMIN_EMAIL,
  };
}

// Live catalog cache via public Firestore REST API (filtered by published == true) with seed fallback
const CATALOG_CACHE_TTL_MS = 10_000;
let catalogCache: CatalogProductRecord[] | null = null;
let catalogCacheExpiresAt = 0;

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: unknown;
  arrayValue?: { values?: FirestoreRestValue[] };
}

interface FirestoreRestDoc {
  name: string;
  fields?: Record<string, FirestoreRestValue>;
}

function readRestNumber(val?: FirestoreRestValue): number | null {
  if (!val || val.nullValue !== undefined) return null;
  if (typeof val.doubleValue === 'number') return val.doubleValue;
  if (typeof val.integerValue === 'string') return Number(val.integerValue);
  return null;
}

function parseFirestoreProductDoc(entry: FirestoreRestDoc): CatalogProductRecord {
  const f = entry.fields || {};
  const docId = entry.name.split('/').pop() || f.id?.stringValue || '';
  const rawPrice = readRestNumber(f.price);
  const price = rawPrice !== null && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
  const rawSale = readRestNumber(f.salePrice);
  const salePrice =
    rawSale !== null && Number.isFinite(rawSale) && rawSale >= 0 ? rawSale : null;
  const rawType = f.productType?.stringValue;
  const productType: CatalogProductRecord['productType'] =
    rawType === 'bundle' || rawType === 'printable_pack' ? rawType : 'individual_pack';
  const firstImg = f.previewImages?.arrayValue?.values?.[0]?.stringValue || '';

  return {
    id: f.id?.stringValue || docId,
    name: f.name?.stringValue || 'Cotton Candy Sticker Pack',
    slug: f.slug?.stringValue || docId,
    price,
    salePrice,
    published: f.published?.booleanValue === true,
    productType,
    fileFormat: f.fileFormat?.stringValue || 'PNG (300 DPI)',
    previewImage: firstImg,
  };
}

async function fetchPublishedProductByIdFromRest(
  productId: string
): Promise<CatalogProductRecord | null> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) return null;
  try {
    const endpoint = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/products/${encodeURIComponent(productId)}`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return null;
    }
    const docEntry = (await res.json()) as FirestoreRestDoc;
    if (!docEntry?.name) return null;
    const parsed = parseFirestoreProductDoc(docEntry);
    return parsed.id && parsed.published ? parsed : null;
  } catch {
    return null;
  }
}

async function getAuthoritativeCatalog(): Promise<{
  products: CatalogProductRecord[];
  source: 'firestore_rest' | 'seed_fallback';
}> {
  const now = Date.now();
  if (catalogCache && now < catalogCacheExpiresAt) {
    return { products: catalogCache, source: 'firestore_rest' };
  }

  try {
    // Firestore Security Rules require list queries on /products to filter by published == true
    const endpoint = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'products' }],
          select: {
            fields: [
              { fieldPath: 'id' },
              { fieldPath: 'name' },
              { fieldPath: 'slug' },
              { fieldPath: 'price' },
              { fieldPath: 'salePrice' },
              { fieldPath: 'published' },
              { fieldPath: 'productType' },
              { fieldPath: 'fileFormat' },
            ],
          },
          where: {
            fieldFilter: {
              field: { fieldPath: 'published' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 500,
        },
      }),
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) {
      throw new Error(`Firestore REST returned ${res.status}`);
    }
    const rows = (await res.json()) as Array<{ document?: FirestoreRestDoc }>;
    const docs = Array.isArray(rows)
      ? rows.map((row) => row.document).filter((doc): doc is FirestoreRestDoc => Boolean(doc))
      : [];

    if (docs.length === 0) {
      return { products: FALLBACK_PRODUCTS, source: 'seed_fallback' };
    }

    const parsed = docs
      .map((entry) => parseFirestoreProductDoc(entry))
      .filter((p) => p.id.length > 0 && p.published);

    if (parsed.length === 0) {
      return { products: FALLBACK_PRODUCTS, source: 'seed_fallback' };
    }

    const byId = new Map<string, CatalogProductRecord>();
    for (const item of parsed) {
      byId.set(item.id, item);
    }
    catalogCache = Array.from(byId.values());
    catalogCacheExpiresAt = now + CATALOG_CACHE_TTL_MS;
    return { products: catalogCache, source: 'firestore_rest' };
  } catch {
    return { products: FALLBACK_PRODUCTS, source: 'seed_fallback' };
  }
}

// Sliding-window rate limiter and duplicate-order guard
const ipRequestTimestamps = new Map<string, number[]>();
const uidRequestTimestamps = new Map<string, number[]>();
const recentOrderFingerprints = new Map<string, number>();

const RATE_WINDOW_MS = 60_000;
const MAX_IP_REQUESTS_PER_WINDOW = 10;
const MAX_UID_REQUESTS_PER_WINDOW = 6;
const DUPLICATE_WINDOW_MS = 15_000;

function checkSlidingLimit(map: Map<string, number[]>, key: string, maxRequests: number): number | null {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (map.get(key) || []).filter((ts) => ts > cutoff);
  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000));
    map.set(key, recent);
    return retryAfterSec;
  }
  recent.push(now);
  map.set(key, recent);
  return null;
}

// Periodic cleanup to keep memory bounded
setInterval(() => {
  const now = Date.now();
  const rateCutoff = now - RATE_WINDOW_MS;
  for (const [k, list] of ipRequestTimestamps.entries()) {
    const filtered = list.filter((ts) => ts > rateCutoff);
    if (filtered.length === 0) ipRequestTimestamps.delete(k);
    else ipRequestTimestamps.set(k, filtered);
  }
  for (const [k, list] of uidRequestTimestamps.entries()) {
    const filtered = list.filter((ts) => ts > rateCutoff);
    if (filtered.length === 0) uidRequestTimestamps.delete(k);
    else uidRequestTimestamps.set(k, filtered);
  }
  for (const [k, ts] of recentOrderFingerprints.entries()) {
    if (now - ts > DUPLICATE_WINDOW_MS) {
      recentOrderFingerprints.delete(k);
    }
  }
}, 60_000).unref();

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function formatUsdServer(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getEffectiveUnitPrice(product: CatalogProductRecord): number {
  if (product.salePrice !== null && product.salePrice >= 0 && product.salePrice < product.price) {
    return Number(product.salePrice.toFixed(2));
  }
  return Number(product.price.toFixed(2));
}

function buildLocalizedWhatsAppMessage(params: {
  lang: AppLang;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineSubtotal: number }>;
  total: number;
  customerName: string;
  customerWhatsapp: string;
  orderNote: string;
}): string {
  const isEn = params.lang === 'en';
  const itemBlocks = params.items
    .map((item) =>
      isEn
        ? [
            `- Product name: ${item.name}`,
            `- Quantity: ${item.quantity}`,
            `- Unit price: ${formatUsdServer(item.unitPrice)}`,
            `- Subtotal: ${formatUsdServer(item.lineSubtotal)}`,
          ].join('\n')
        : [
            `- Nama produk: ${item.name}`,
            `- Jumlah: ${item.quantity}`,
            `- Harga per item: ${formatUsdServer(item.unitPrice)}`,
            `- Subtotal: ${formatUsdServer(item.lineSubtotal)}`,
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
        `Order total: ${formatUsdServer(params.total)}`,
        '',
        `Name: ${params.customerName}`,
      ]
    : [
        'Halo Cotton Candy Sticker! 🍬',
        '',
        'Saya ingin membeli sticker berikut:',
        '',
        itemBlocks,
        '',
        `Total pesanan: ${formatUsdServer(params.total)}`,
        '',
        `Nama: ${params.customerName}`,
      ];

  if (params.customerWhatsapp) {
    lines.push(
      isEn ? `WhatsApp Number: ${params.customerWhatsapp}` : `Nomor WhatsApp: ${params.customerWhatsapp}`
    );
  }

  lines.push('');
  lines.push(isEn ? `Note: ${params.orderNote || '-'}` : `Catatan: ${params.orderNote || '-'}`);
  lines.push('');
  lines.push(
    isEn
      ? 'I would like to proceed with this order and receive my sticker files via WhatsApp after payment verification. Thank you! 💗'
      : 'Saya ingin melanjutkan pesanan ini dan menerima file stiker asli lewat WhatsApp setelah pembayaran diverifikasi. Terima kasih! 💗'
  );

  return lines.join('\n');
}

function isBlockedPrivatePath(rawUrl: string): boolean {
  let decodedPath = rawUrl.split('?')[0];
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    return true;
  }
  const lower = decodedPath.toLowerCase();
  if (lower.includes('..') || lower.includes('\\')) {
    return true;
  }
  const normalized = path.posix.normalize(lower.replace(/^\/+/, '/'));

  const blockedPrefixes = [
    '/private-vault',
    '/src/assets/images/pack_',
    '/src/assets/images/hero_',
    '/.env',
    '/.git',
    '/firestore.rules',
    '/storage.rules',
    '/firebase-blueprint.json',
    '/server.ts',
    '/security_spec.md',
    '/walkthrough.md',
  ];

  return blockedPrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix + '/') || normalized.startsWith(prefix)
  );
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Baseline security headers (preserve iframe embedding compatibility for AI Studio preview)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  // Strict private-vault & sensitive configuration block before static/Vite serving
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isBlockedPrivatePath(req.originalUrl || req.url)) {
      res.status(403).json({
        error: 'Access denied to protected studio assets or internal configuration.',
      });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    next(err);
  });

  // Health Check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const appCheckConfigured = Boolean(
      (process.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || firebaseConfig.recaptchaSiteKey || '').trim()
    );
    res.json({
      status: 'ok',
      service: 'cotton-candy-sticker',
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      storageBucket: firebaseConfig.storageBucket,
      appCheckConfigured,
      deliveryModel: 'manual_whatsapp_only',
      timestamp: new Date().toISOString(),
    });
  });

  // Token verification endpoint (stateless RSA verification against Google public x509 certs; zero IAM required)
  app.post('/api/auth/verify-token', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ valid: false, error: 'Missing Bearer token.' });
      return;
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ valid: false, error: 'Empty Bearer token.' });
      return;
    }

    try {
      const user = await verifyFirebaseIdToken(token);
      res.json({ valid: true, user });
    } catch {
      res.status(401).json({ valid: false, error: 'Invalid or expired Firebase ID token.' });
    }
  });

  // Authoritative WhatsApp order validation + rate limit + duplicate guard
  app.post('/api/orders/validate-whatsapp', async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const lang: AppLang = body.lang === 'en' ? 'en' : 'id';
    const ip = getClientIp(req);

    // Optional Firebase Auth check if Bearer header provided
    let verifiedUid: string | null = null;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const user = await verifyFirebaseIdToken(token);
          verifiedUid = user.uid;
        } catch {
          res.status(401).json({
            error:
              lang === 'id'
                ? 'Sesi login tidak valid atau kedaluwarsa. Muat ulang dan coba lagi.'
                : 'Authentication token is invalid or expired.',
          });
          return;
        }
      }
    }

    // 1. Sliding-window rate limiting
    const ipRetry = checkSlidingLimit(ipRequestTimestamps, ip, MAX_IP_REQUESTS_PER_WINDOW);
    if (ipRetry !== null) {
      res.setHeader('Retry-After', String(ipRetry));
      res.status(429).json({
        error:
          lang === 'id'
            ? 'Terlalu banyak permintaan checkout dalam waktu singkat. Mohon tunggu sebentar lalu coba lagi.'
            : 'Too many checkout requests in a short window. Please wait a moment and try again.',
        retryAfterSeconds: ipRetry,
      });
      return;
    }

    if (verifiedUid) {
      const uidRetry = checkSlidingLimit(uidRequestTimestamps, verifiedUid, MAX_UID_REQUESTS_PER_WINDOW);
      if (uidRetry !== null) {
        res.setHeader('Retry-After', String(uidRetry));
        res.status(429).json({
          error:
            lang === 'id'
              ? 'Terlalu banyak permintaan checkout dari akun ini. Mohon tunggu sebentar.'
              : 'Too many checkout requests from this account. Please wait a moment.',
          retryAfterSeconds: uidRetry,
        });
        return;
      }
    }

    // 2. Validate customer fields
    const rawName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 120) : '';
    if (rawName.length < 2) {
      res.status(400).json({
        error:
          lang === 'id'
            ? 'Nama pembeli wajib diisi (minimal 2 karakter).'
            : 'Customer name is required (at least 2 characters).',
      });
      return;
    }

    const rawWhatsapp =
      typeof body.customerWhatsapp === 'string' ? body.customerWhatsapp.trim().slice(0, 32) : '';
    if (rawWhatsapp.length > 0) {
      const digitsOnly = rawWhatsapp.replace(/\D/g, '');
      if (!/^[+\d\s()-]{6,32}$/.test(rawWhatsapp) || digitsOnly.length < 6) {
        res.status(400).json({
          error:
            lang === 'id'
              ? 'Format nomor WhatsApp tidak valid.'
              : 'Invalid WhatsApp phone number format.',
        });
        return;
      }
    }

    const rawNote = typeof body.orderNote === 'string' ? body.orderNote.trim().slice(0, 500) : '';

    // 3. Validate items array against authoritative catalog prices
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0 || rawItems.length > 30) {
      res.status(400).json({
        error:
          lang === 'id'
            ? 'Daftar item pesanan tidak boleh kosong (maksimal 30 item unik).'
            : 'Order items array must contain between 1 and 30 items.',
      });
      return;
    }

    const { products, source } = await getAuthoritativeCatalog();
    const consolidatedQty = new Map<string, number>();

    for (const entry of rawItems) {
      if (!entry || typeof entry !== 'object') {
        res.status(400).json({ error: 'Malformed line item.' });
        return;
      }
      const itemObj = entry as Record<string, unknown>;
      const productId = typeof itemObj.productId === 'string' ? itemObj.productId.trim() : '';
      const rawQty = Number(itemObj.quantity);
      if (!productId || !/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
        res.status(400).json({ error: 'Invalid product ID.' });
        return;
      }
      if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 25) {
        res.status(400).json({
          error:
            lang === 'id'
              ? 'Jumlah pembelian per paket harus bilangan bulat antara 1 dan 25.'
              : 'Quantity per product must be an integer between 1 and 25.',
        });
        return;
      }
      const nextQty = (consolidatedQty.get(productId) || 0) + rawQty;
      if (nextQty > 25) {
        res.status(400).json({
          error:
            lang === 'id'
              ? 'Total jumlah untuk satu paket maksimal 25.'
              : 'Combined quantity per product cannot exceed 25.',
        });
        return;
      }
      consolidatedQty.set(productId, nextQty);
    }

    const validatedItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      lineSubtotal: number;
      productType: CatalogProductRecord['productType'];
      fileFormat: string;
    }> = [];

    for (const [productId, quantity] of consolidatedQty.entries()) {
      let product = products.find((p) => p.id === productId && p.published);
      if (!product) {
        const directProduct = await fetchPublishedProductByIdFromRest(productId);
        if (directProduct) {
          product = directProduct;
          if (catalogCache && !catalogCache.some((p) => p.id === directProduct.id)) {
            catalogCache = [...catalogCache, directProduct];
          }
        }
      }
      if (!product || !product.published) {
        res.status(400).json({
          error:
            lang === 'id'
              ? `Produk (${productId}) tidak tersedia atau belum dipublikasikan.`
              : `Product (${productId}) is unavailable or unpublished.`,
        });
        return;
      }
      const unitPrice = getEffectiveUnitPrice(product);
      const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
      validatedItems.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
        lineSubtotal,
        productType: product.productType,
        fileFormat: product.fileFormat,
      });
    }

    const authoritativeSubtotal = Number(
      validatedItems.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2)
    );
    const authoritativeTotal = authoritativeSubtotal;

    // 4. Tamper check: reject if client submitted a mismatched total
    if (body.clientTotal !== undefined && body.clientTotal !== null) {
      const clientTotal = Number(body.clientTotal);
      if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - authoritativeTotal) > 0.01) {
        res.status(400).json({
          error:
            lang === 'id'
              ? 'Total harga tidak cocok dengan katalog terbaru. Silakan muat ulang halaman dan coba lagi.'
              : 'Submitted total does not match authoritative catalog pricing.',
          expectedTotal: authoritativeTotal,
        });
        return;
      }
    }

    // 5. Duplicate-order guard (15-second window per actor + identical cart + customer details)
    const canonicalItems = validatedItems
      .map((i) => `${i.productId}:${i.quantity}`)
      .sort()
      .join('|');
    const fingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          actor: verifiedUid || ip,
          customerName: rawName.toLowerCase(),
          customerWhatsapp: rawWhatsapp,
          orderNote: rawNote,
          canonicalItems,
        })
      )
      .digest('hex');

    const lastSeen = recentOrderFingerprints.get(fingerprint);
    const now = Date.now();
    if (lastSeen && now - lastSeen < DUPLICATE_WINDOW_MS) {
      res.status(409).json({
        error:
          lang === 'id'
            ? 'Pesanan yang sama baru saja divalidasi. Gunakan tab WhatsApp atau tunggu beberapa detik.'
            : 'An identical order was just submitted. Please check your WhatsApp window or wait a few seconds.',
      });
      return;
    }
    recentOrderFingerprints.set(fingerprint, now);

    const message = buildLocalizedWhatsAppMessage({
      lang,
      items: validatedItems,
      total: authoritativeTotal,
      customerName: rawName,
      customerWhatsapp: rawWhatsapp,
      orderNote: rawNote,
    });

    res.json({
      valid: true,
      lang,
      catalogSource: source,
      items: validatedItems,
      subtotal: authoritativeSubtotal,
      total: authoritativeTotal,
      currency: 'USD',
      message,
      whatsappUrl: `https://wa.me/${SHOP_WHATSAPP_E164}?text=${encodeURIComponent(message)}`,
    });
  });

  // Catch-all for unknown /api routes so they never fall through to SPA HTML
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Cotton Candy Sticker server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
