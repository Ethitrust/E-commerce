import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Heart,
  ShoppingCart,
  Bell,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  Store,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Package,
} from "lucide-react";
import { useState } from "react";
import type { AuthUser } from "@/store/use-app-store";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { fetchCategories } from "@/lib/api/catalog";

function avatarForUser(user: AuthUser): string {
  const trimmed = user.avatar?.trim();
  if (trimmed) return trimmed;
  return `https://ui-avatars.com/api/?background=ebebeb&color=383838&name=${encodeURIComponent(user.name)}`;
}

const mainNav = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Marketplace" },
  { to: "/categories", label: "Categories" },
  { to: "/help", label: "Help" },
];

export function Navbar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { user, logout, theme, toggleTheme, cart, wishlist } = useAppStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: navCategories } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
    staleTime: 30_000,
  });

  const categories = navCategories ?? [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q } as never });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="mt-6 flex flex-col gap-1">
              {mainNav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Categories
              </div>
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.slug}
                  to="/categories/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Nexus</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {mainNav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-xl md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search millions of products, brands and sellers..."
              className="h-10 w-full rounded-full border border-border bg-secondary/60 pl-10 pr-24 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/30 focus:bg-surface focus:ring-2 focus:ring-primary/15"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Link to="/wishlist" className="relative">
            <Button variant="ghost" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            {wishlist.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-4 w-4" />
            </Button>
            {cart.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cart.length}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" asChild>
            <Link to="/help" aria-label="Help and updates">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 hover:bg-accent">
                  <img
                    src={avatarForUser(user)}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span className="hidden text-xs font-semibold md:inline">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="text-sm font-semibold">{user.email}</div>
                  <div className="mt-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    {user.role}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders">
                    <Package className="mr-2 h-4 w-4" />
                    Orders
                  </Link>
                </DropdownMenuItem>
                {user.role === "seller" && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller">
                      <Store className="mr-2 h-4 w-4" />
                      Seller Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Join free</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Category sub-bar */}
      <div className="border-t border-border bg-surface/50">
        <div className="container-page flex h-10 items-center gap-5 overflow-x-auto scrollbar-hide text-xs font-medium">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
