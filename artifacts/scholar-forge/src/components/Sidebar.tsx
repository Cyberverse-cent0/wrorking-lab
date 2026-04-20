import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, Search, Plus, User, Shield, LogOut,
  BookOpen, ChevronLeft, ChevronRight, Menu, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects?myProjects=true", label: "My Projects", icon: FolderOpen },
  { to: "/projects", label: "Discover Projects", icon: Search },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => {
    const path = to.split("?")[0];
    return location === path || (path !== "/" && location.startsWith(path));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-serif text-lg font-semibold text-sidebar-foreground tracking-tight">
            ScholarForge
          </span>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Create Button */}
      <div className={cn("px-3 py-3", collapsed && "px-2")}>
        <Link to="/projects/create" onClick={() => setMobileOpen(false)}>
          <Button
            className={cn(
              "w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 gap-2",
              collapsed && "px-2"
            )}
            data-testid="button-create-project"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>New Project</span>}
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive(item.to)
                  ? "bg-sidebar-primary/20 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.label}
            </div>
          </Link>
        ))}

        <Separator className="bg-sidebar-border my-2" />

        <Link to="/account" onClick={() => setMobileOpen(false)}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              isActive("/account")
                ? "bg-sidebar-primary/20 text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-2"
            )}
            data-testid="nav-account"
          >
            <User className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "Account"}
          </div>
        </Link>

        {user?.role === "ADMIN" && (
          <Link to="/admin" onClick={() => setMobileOpen(false)}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive("/admin")
                  ? "bg-sidebar-primary/20 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              data-testid="nav-admin"
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!collapsed && "Admin Panel"}
            </div>
          </Link>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-sidebar-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-card border border-border shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="button-mobile-menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar z-50 transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col h-full bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <button
          className="absolute -right-3 top-20 z-10 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-accent transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          data-testid="button-collapse-sidebar"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        <SidebarContent />
      </div>
    </>
  );
}
