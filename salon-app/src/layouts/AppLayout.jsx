import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { SettingsProvider } from '../context/SettingsContext';

export default function AppLayout() {
  return (
    <SettingsProvider>
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </SettingsProvider>
  );
}
