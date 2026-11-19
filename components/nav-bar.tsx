"use client";

import type { CSSProperties } from "react";
import { Home, Archive, Camera, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "home", label: "Home", path: "/home", icon: Home },
  { id: "inventory", label: "Inventory", path: "/inventory", icon: Archive },
  { id: "scan", label: "Scan", path: "/scan", icon: Camera },
  {
    id: "suggestions",
    label: "Suggestions",
    path: "/suggestions",
    icon: Search,
  },
];
const ACTIVE_POSITIONS = ["16.55%", "38.8%", "61.05%", "83.3%"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    tabs.findIndex(
      ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
    ),
  );
  const ActiveIcon = tabs[activeIndex].icon;
  const navStyle = {
    "--nav-active-x": ACTIVE_POSITIONS[activeIndex],
  } as CSSProperties;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 z-50 h-[calc(105px+env(safe-area-inset-bottom))] w-full overflow-hidden bg-transparent"
      style={navStyle}
    >
      <div
        aria-hidden="true"
        className="navbar-cutout absolute bottom-0 h-[calc(83px+env(safe-area-inset-bottom))] bg-primary"
      />

      <div
        aria-hidden="true"
        className="navbar-active absolute top-0 z-20 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[hsl(var(--green-900))]"
      >
        <ActiveIcon
          size={29}
          strokeWidth={2}
          className="text-[hsl(var(--green-200))]"
        />
      </div>

      <div className="absolute inset-x-[5.4%] bottom-[env(safe-area-inset-bottom)] flex h-[83px] items-center">
        {tabs.map(({ id, label, path, icon: Icon }, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="flex h-full flex-1 items-center justify-center text-[hsl(var(--green-200))] transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--green-200))]"
            >
              <Icon
                size={32}
                strokeWidth={1.8}
                className={cn(
                  "navbar-item-icon transition-[opacity,transform] duration-300",
                  isActive ? "scale-75 opacity-0" : "scale-100 opacity-100",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
