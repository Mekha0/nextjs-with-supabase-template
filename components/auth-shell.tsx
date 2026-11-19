import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* App Logo */}
      <div className="flex h-100 w-100 items-center justify-center overflow-hidden rounded-full shadow-md">
        <Image
          src="/images/logo.png"
          alt="App logo"
          width={110}
          height={110}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      <div className="text-center">
        <h1 className="font-display text-4xl tracking-tight">{title}</h1>
        <p className="font-sans mt-1 text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="text-sm w-full rounded-3xl bg-cork p-5 shadow-lg">
        {children}
      </div>
      <p className="font-sans text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}

export function IconField({
  icon: Icon,
  label,
  id,
  ...props
}: {
  icon: LucideIcon;
  label: string;
  id: string;
} & React.ComponentProps<"input">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-foreground/70">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
        <Input
          id={id}
          className="h-11 rounded-xl border-0 bg-cork-input pl-10 shadow-none focus-visible:ring-primary"
          {...props}
        />
      </div>
    </div>
  );
}
