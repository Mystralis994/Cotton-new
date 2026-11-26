import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/seedCatalog';
import { AppLang, interpolate, TRANSLATIONS, Translations } from '../i18n/translations';
import {
  auth,
  googleProvider,
  isUserAdmin,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  checkAdminDoc,
  fetchAllProductsForAdmin,
  fetchCategories,
  fetchPublishedProducts,
  syncUserProfile,
} from '../services/firestoreStore';
import { CartItem, Category, Product, ProductType, RouteView, UserProfile } from '../types/store';
import { getEffectivePrice } from '../utils/formatters';

const CART_STORAGE_KEY = 'ccs_cart_v1';
const LANG_STORAGE_KEY = 'ccs_lang_v1';

interface StoreContextValue {
  lang: AppLang;
  setLang: (next: AppLang) => void;
  t: Translations;
  route: RouteView;
  navigate: (view: RouteView) => void;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  categories: Category[];
  products: Product[];
  publishedProducts: Product[];
  catalogSource: 'firestore' | 'sample';
  catalogLoading: boolean;
  catalogError: string | null;
  firestoreConnected: boolean;
  refreshCatalog: () => Promise<void>;
  cart: CartItem[];
  cartItemsDetailed: { product: Product; quantity: number; unitPrice: number; lineTotal: number }[];
  cartItemCount: number;
  cartSubtotal: number;
  cartTotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadLangFromStorage(): AppLang {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === 'en' || raw === 'id') return raw;
  } catch {
    // Ignore storage errors
  }
  return 'id';
}

function parseHashToRoute(): RouteView {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const params = new URLSearchParams(queryPart || '');

  if (pathPart === '/shop') {
    const category = params.get('category') || undefined;
    const typeParam = params.get('type') as ProductType | null;
    return {
      page: 'shop',
      initialCategory: category,
      initialType:
        typeParam && ['individual_pack', 'bundle', 'printable_pack'].includes(typeParam)
          ? typeParam
          : undefined,
    };
  }
  if (pathPart.startsWith('/product/')) {
    const slug = decodeURIComponent(pathPart.slice('/product/'.length));
    if (slug) return { page: 'product', slug };
  }
  if (pathPart === '/checkout') return { page: 'checkout' };
  if (pathPart.startsWith('/order-payment/')) {
    const orderId = decodeURIComponent(pathPart.slice('/order-payment/'.length));
    if (orderId) return { page: 'order-payment', orderId };
  }
  if (pathPart === '/orders') return { page: 'orders' };
  if (pathPart === '/admin') return { page: 'admin' };
  if (pathPart.startsWith('/policies/')) {
    const topic = pathPart.slice('/policies/'.length);
    if (topic === 'delivery' || topic === 'licensing' || topic === 'refunds' || topic === 'privacy') {
      return { page: 'policy', topic };
    }
  }
  return { page: 'home' };
}

function routeToHash(view: RouteView): string {
  switch (view.page) {
    case 'home':
      return '#/';
    case 'shop': {
      const p = new URLSearchParams();
      if (view.initialCategory) p.set('category', view.initialCategory);
      if (view.initialType) p.set('type', view.initialType);
      const qs = p.toString();
      return qs ? `#/shop?${qs}` : '#/shop';
    }
    case 'product':
      return `#/product/${encodeURIComponent(view.slug)}`;
    case 'checkout':
      return '#/checkout';
    case 'order-payment':
      return `#/order-payment/${encodeURIComponent(view.orderId)}`;
    case 'orders':
      return '#/orders';
    case 'admin':
      return '#/admin';
    case 'policy':
      return `#/policies/${view.topic}`;
  }
}

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          typeof item?.productId === 'string' &&
          typeof item?.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1 &&
          item.quantity <= 25
      )
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(() => loadLangFromStorage());
  const [route, setRoute] = useState<RouteView>(() => parseHashToRoute());
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAdminDoc, setHasAdminDoc] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [catalogSource, setCatalogSource] = useState<'firestore' | 'sample'>('sample');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isCartOpen, setCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashToRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((view: RouteView) => {
    const nextHash = routeToHash(view);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setRoute(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    testFirestoreConnection().then((res) => {
      setFirestoreConnected(res.connected);
    });
  }, []);

  const isAdmin = useMemo(
    () => isUserAdmin(user, userProfile, hasAdminDoc),
    [user, userProfile, hasAdminDoc]
  );

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [remoteCats, remoteProds] = await Promise.all([
        fetchCategories(),
        isAdmin ? fetchAllProductsForAdmin() : fetchPublishedProducts(),
      ]);
      if (remoteCats.length > 0) {
        setCategories(remoteCats);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }
      if (remoteProds.length > 0) {
        setProducts(remoteProds);
        setCatalogSource('firestore');
      } else {
        setProducts(INITIAL_PRODUCTS);
        setCatalogSource('sample');
      }
    } catch (err) {
      console.warn('Using local sample catalog because Firestore fetch failed:', err);
      setCatalogError(
        lang === 'id'
          ? 'Katalog database tidak dapat dimuat; menampilkan katalog kurasi lokal.'
          : 'Live database catalog could not be loaded; showing curated sample catalog.'
      );
      setCategories(INITIAL_CATEGORIES);
      setProducts(INITIAL_PRODUCTS);
      setCatalogSource('sample');
    } finally {
      setCatalogLoading(false);
    }
  }, [isAdmin, lang]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);
      if (firebaseUser) {
        try {
          const [profile, adminDocExists] = await Promise.all([
            syncUserProfile(firebaseUser),
            checkAdminDoc(firebaseUser.uid),
          ]);
          setUserProfile(profile);
          setHasAdminDoc(adminDocExists);
        } catch (err) {
          console.error('Failed to sync profile:', err);
        }
      } else {
        setUserProfile(null);
        setHasAdminDoc(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      refreshCatalog();
    }
  }, [authLoading, refreshCatalog]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast(t.toasts.signedIn);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in with Google right now.';
      setAuthError(message);
    }
  }, [showToast, t]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    showToast(t.toasts.signedOut);
  }, [showToast, t]);

  const publishedProducts = useMemo(
    () => products.filter((p) => p.published),
    [products]
  );

  const addToCart = useCallback(
    (productId: string, quantity = 1) => {
      const target = publishedProducts.find((p) => p.id === productId);
      if (!target) return;
      const safeQty = Math.max(1, Math.min(25, Math.floor(quantity)));
      setCart((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.min(25, item.quantity + safeQty) }
              : item
          );
        }
        return [...prev, { productId, quantity: safeQty }];
      });
      setCartOpen(true);
      showToast(interpolate(t.toasts.addedToBag, { name: target.name }));
    },
    [publishedProducts, showToast, t]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    const clamped = Math.max(1, Math.min(25, Math.floor(quantity)));
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: clamped } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartItemsDetailed = useMemo(() => {
    return cart
      .map((item) => {
        const product = publishedProducts.find((p) => p.id === item.productId);
        if (!product) return null;
        const unitPrice = getEffectivePrice(product);
        return {
          product,
          quantity: item.quantity,
          unitPrice,
          lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, publishedProducts]);

  const cartItemCount = useMemo(
    () => cartItemsDetailed.reduce((sum, item) => sum + item.quantity, 0),
    [cartItemsDetailed]
  );

  const cartSubtotal = useMemo(
    () => Number(cartItemsDetailed.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
    [cartItemsDetailed]
  );

  const cartTotal = cartSubtotal; // Digital delivery = $0.00 shipping

  const value: StoreContextValue = {
    lang,
    setLang,
    t,
    route,
    navigate,
    user,
    userProfile,
    isAdmin,
    authLoading,
    authError,
    signInWithGoogle,
    signOutUser,
    categories,
    products,
    publishedProducts,
    catalogSource,
    catalogLoading,
    catalogError,
    firestoreConnected,
    refreshCatalog,
    cart,
    cartItemsDetailed,
    cartItemCount,
    cartSubtotal,
    cartTotal,
    isCartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    toastMessage,
    showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
