import { Link, useLocation } from "react-router-dom";
import { Home, Newspaper, Star, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Market", icon: Home },
    { path: "/stocks", label: "Stocks", icon: TrendingUp },
    { path: "/news", label: "News", icon: Newspaper },
    { path: "/watchlist", label: "Watchlist", icon: Star },
    { path: "/portfolio", label: "Portfolio", icon: Briefcase },
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FinRLX
            </div>
            <div className="text-xs text-muted-foreground ml-2">AI Trading Platform</div>
          </div>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
