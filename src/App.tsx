import { CartDrawer } from './components/CartDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { StoreProvider, useStore } from './context/StoreContext';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { OrderPaymentPage } from './pages/OrderPaymentPage';
import { OrdersPage } from './pages/OrdersPage';
import { PolicyPage } from './pages/PolicyPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';

function StoreRouter() {
  const { route, toastMessage } = useStore();

  const renderPage = () => {
    switch (route.page) {
      case 'home':
        return <HomePage />;
      case 'shop':
        return (
          <ShopPage
            initialCategory={route.initialCategory}
            initialType={route.initialType}
          />
        );
      case 'product':
        return <ProductDetailPage slug={route.slug} />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order-payment':
        return <OrderPaymentPage orderId={route.orderId} />;
      case 'orders':
        return <OrdersPage />;
      case 'admin':
        return <AdminPage />;
      case 'policy':
        return <PolicyPage topic={route.topic} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF9] text-[#352336]">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <CartDrawer />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-[#352336] text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl shadow-lg border border-[#4D364F]"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <StoreRouter />
      </StoreProvider>
    </ErrorBoundary>
  );
}
