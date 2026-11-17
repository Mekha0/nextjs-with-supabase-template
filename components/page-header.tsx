import type { ReactNode } from "react";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {action}
    </header>
  );
}
