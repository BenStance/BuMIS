import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Moon, Settings, Sun, User, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { navigateTo } from '../../utils/navigation.js';
import { ROLES } from '../../utils/constants.js';
import { notificationsApi } from '../../api/index.js';

export function Topbar({ user, onLogout, currentPath }) {
  const { darkMode, toggleTheme } = useThemeContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError(null);
        const response = await notificationsApi.list({ limit: 8 });
        if (!active) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setNotifications(items);
        setUnreadCount(Number(response?.unreadCount ?? items.filter((item) => item.unread).length));
      } catch (error) {
        if (!active) return;
        setNotificationsError(error?.message || 'Failed to load notifications.');
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    if (notificationsOpen || notifications.length === 0) {
      loadNotifications();
    }

    return () => {
      active = false;
    };
  }, [notificationsOpen]);

  const handleNotificationClick = async (notification) => {
    try {
      await notificationsApi.markRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Keep the UX forgiving; the notification list still closes.
    } finally {
      setNotificationsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
      setUnreadCount(0);
    } catch {
      // No-op if the backend rejects; users can still read individual notifications.
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    if (typeof onLogout === 'function') {
      await onLogout();
    }
  };

  // Safe check if user is admin - handle null/undefined user
  const isAdmin = (() => {
    if (!user) return false;
    const roleName = String(user?.role?.name || user?.role || '').trim().toLowerCase();
    return [ROLES.ADMIN, 'platform admin', 'platform administrator'].map((value) => value.toLowerCase()).includes(roleName);
  })();

  // Safe user display name
  const displayName = user?.fullName || user?.email || 'Guest';
  const userInitial = displayName.charAt(0) || 'U';
  const userRole = user?.role?.name || user?.role || 'No role';
  const userBusiness = user?.business?.name || 'No business';

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[var(--color-panel-border)] px-4 backdrop-blur-xl transition-colors duration-300 sm:px-6"
      style={{
        background: darkMode
          ? 'rgba(8, 15, 30, 0.78)'
          : 'rgba(255, 255, 255, 0.82)',
        boxShadow: '0 1px 0 0 var(--color-panel-border)',
      }}
    >
      {/* Left: Page title & role */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex flex-col">
          <h2 className="truncate text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">
            {currentPath === '/dashboard' ? 'Dashboard' : 'Workspace'}
          </h2>
          <span className="hidden text-xs text-[var(--color-text-tertiary)] sm:block">
            {userRole} · {userBusiness}
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/50 text-[var(--color-text-primary)] transition-all duration-300 hover:bg-[var(--color-panel-strong)] hover:shadow-md"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-300" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </motion.button>

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/50 text-[var(--color-text-primary)] transition-all duration-300 hover:bg-[var(--color-panel-strong)] hover:shadow-md"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--color-panel-strong)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-11 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-[var(--brand-primary)] transition hover:opacity-80"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">Loading notifications...</div>
                  ) : notificationsError ? (
                    <div className="px-4 py-8 text-center text-sm text-rose-500">{notificationsError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">No notifications yet.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`flex w-full gap-3 border-b border-[var(--color-panel-border)] px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 last:border-0 ${notification.unread ? 'bg-[var(--brand-primary)]/5' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="mt-0.5">
                          {notification.kind === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : notification.kind === 'warning' ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          ) : notification.kind === 'danger' ? (
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                          ) : (
                            <Info className="h-4 w-4 text-[var(--brand-primary)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{notification.title}</p>
                            <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                              {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{notification.message}</p>
                          {notification.unread && <span className="mt-2 inline-flex rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">Unread</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)]/50 px-2 py-1.5 transition-all duration-300 hover:bg-[var(--color-panel-strong)] hover:shadow-md sm:gap-3 sm:px-3"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
              }}
            >
              {userInitial}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
                {displayName}
              </p>
              <p className="text-xs leading-tight text-[var(--color-text-secondary)]">
                {userRole}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] shadow-2xl backdrop-blur-2xl"
              >
                <div className="py-1">
                  {/* Settings - only show for non-admin users */}
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigateTo('/settings');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigateTo('/change-password');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <User className="h-4 w-4" />
                    Change password
                  </button>
                  <hr className="my-1 border-[var(--color-panel-border)]" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
