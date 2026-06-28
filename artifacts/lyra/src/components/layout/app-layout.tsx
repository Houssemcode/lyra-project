import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, Flame, CalendarDays, Moon, Timer, BarChart3, Menu, X, Star, Settings, Trophy, FileText, LogOut } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/App";
import { useClerk, useUser } from "@clerk/react";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/prayers", label: "Prayers", icon: Moon },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/islamic", label: "Islamic Life", icon: Star },
  { href: "/progress", label: "Progress", icon: Trophy },
  { href: "/reports", label: "Reports", icon: FileText },
];

function UserProfile({ onClose }: { onClose: () => void }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const displayName = user?.firstName
    || user?.username
    || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0]
    || "User";
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const initials = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
      <Link
        href="/settings"
        onClick={onClose}
        data-testid="nav-settings"
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer w-full",
          location === "/settings"
            ? "bg-sidebar-primary/15 text-primary"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Settings size={16} className={location === "/settings" ? "text-primary" : "text-sidebar-foreground/40"} />
        Settings
      </Link>

      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-primary">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
          {email && (
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{email}</p>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className="p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors shrink-0"
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm" style={{ fontFamily: "var(--app-font-display)" }}>L</span>
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground" style={{ fontFamily: "var(--app-font-display)" }}>Lyra</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                data-testid={`nav-${label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-sidebar-primary/15 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon size={16} className={active ? "text-primary" : "text-sidebar-foreground/50"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: settings + user profile */}
        <UserProfile onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold flex-1" style={{ fontFamily: "var(--app-font-display)" }}>Lyra</span>
        </header>

        {/* Page content — animated on route change */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
