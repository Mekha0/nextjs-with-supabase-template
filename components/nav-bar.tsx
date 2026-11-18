"use client";

import { Home, Archive, Camera, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

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

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 z-50 w-full bg-primary pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative flex h-20 w-full items-center justify-around bg-primary">
        {tabs.map(({ id, label, path, icon: Icon }) => {
          const isActive =
            pathname === path ||
            (path !== "/home" && pathname.startsWith(`${path}/`));

          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(path)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-full flex-1 items-center justify-center"
            >
              {isActive ? (
                <span className="absolute -top-6 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-background">
                  <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[hsl(var(--green-900))]">
                    <Icon
                      size={29}
                      strokeWidth={2}
                      className="text-[hsl(var(--green-200))]"
                    />
                  </span>
                </span>
              ) : (
                <Icon
                  size={32}
                  strokeWidth={1.8}
                  className="text-[hsl(var(--green-200))]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
