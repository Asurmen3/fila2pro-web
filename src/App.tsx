import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import BottomNav from './components/Layout/BottomNav';
import Dashboard from './pages/Dashboard';
import Filaments from './pages/Filaments';
import Stock from './pages/Stock';
import Products from './pages/Products';
import Stats from './pages/Stats';
import Shopping from './pages/Shopping';
import History from './pages/History';
import Settings from './pages/Settings';
import type { Page } from './types';

type PageComponent = () => JSX.Element;
const pageComponents: Record<Page, PageComponent> = {
  dashboard: Dashboard,
  filaments: Filaments,
  stock:     Stock,
  products:  Products,
  stats:     Stats,
  shopping:  Shopping,
  history:   History,
  settings:  Settings,
};

function AppInner() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(page: Page) { setCurrentPage(page); setSidebarOpen(false); }

  const PageComponent = pageComponents[currentPage];

  return (
    <div className="min-h-screen" style={{ background: '#070B1A' }}>
      <Sidebar currentPage={currentPage} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <TopBar currentPage={currentPage} onMenuClick={() => setSidebarOpen(true)} onNavigate={navigate} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}>
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
