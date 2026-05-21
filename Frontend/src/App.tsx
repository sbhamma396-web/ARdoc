import { useState, useEffect } from 'react';
import { Page } from './types';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EncoderPage from './pages/EncoderPage';
import AccessPage from './pages/AccessPage';
import ScannerPage from './pages/ScannerPage';
import UsersPage from './pages/UsersPage';
import { authService } from './services/authService';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser()
      .then(() => setIsLoggedIn(true))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (page: Page) => {
    setIsLoggedIn(true);
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggedIn(false);
      setCurrentPage('login');
    }
  };

  const handleNavigate = (page: Page) => {
    if (!isLoggedIn && page !== 'login') return;
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Chargement de la session...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'encoder':
        return <EncoderPage />;
      case 'access':
        return <AccessPage />;
      case 'scanner':
        return <ScannerPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main>
        {renderPage()}
      </main>
    </div>
  );
}
