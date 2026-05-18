import { useState } from 'react';
import { Page } from './types';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EncoderPage from './pages/EncoderPage';
import AccessPage from './pages/AccessPage';
import ScannerPage from './pages/ScannerPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (page: Page) => {
    setIsLoggedIn(true);
    setCurrentPage(page);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  const handleNavigate = (page: Page) => {
    if (!isLoggedIn && page !== 'login') return;
    setCurrentPage(page);
  };

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
