import { Sidebar } from '../components/navigation/Sidebar.jsx';
import { Topbar } from '../components/navigation/Topbar.jsx';

export function AppLayout({ currentPath, user, onLogout, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-page-bg)]">
      <Sidebar currentPath={currentPath} user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar currentPath={currentPath} user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}