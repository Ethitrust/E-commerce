import { LayoutDashboard, Package, ShoppingBag, Store } from "lucide-react";

import type { DashNavItem } from "@/components/dashboard/DashboardSidebar";

/** Sidebar links that match real dashboard routes only. */
export const sellerDashboardNavItems: DashNavItem[] = [
  { to: "/seller", label: "Overview", icon: LayoutDashboard, exactMatch: true },
  { to: "/seller/products", label: "Products", icon: Package },
  { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
];

export const adminDashboardNavItems: DashNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exactMatch: true },
  { to: "/admin/sellers", label: "Sellers", icon: Store },
  { to: "/admin/products", label: "Products", icon: Package },
];
