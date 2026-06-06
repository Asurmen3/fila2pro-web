import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import BottomNav from './components/Layout/BottomNav';
import Dashboard from './pages/Dashboard';
import Filaments from './pages/Filaments';
import Stock from './pages/Stock';
import Products from './pages/Products';
import History from './pages/History';
import Settings from './pages/Settings';
import { seedDemoData } from './db/database';
import type { Page } from './types';

type PageComponent = () => JSX.Element;
const pageComponents: Record<Page, PageComponent> = {
  dashboard: Dashboard,
  filaments: Filaments,
  stock:     Stock,
  products:  Products,
  history:   History,
  settings:  Settings,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { seedDemoData(); }, []);

  function navigate(page: Page) {
    setCurrentPage(page);
    setSidebarOpen(false);
  }

  const PageComponent = pageComponents[currentPage];

  return (
    <div className="min-h-screen" style={{ background: '#070B1A' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content — offset by sidebar on desktop */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <TopBar currentPage={currentPage} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}>
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <BottomNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
}
