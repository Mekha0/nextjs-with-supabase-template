// "use client";

// import Link from "next/link";
// import { Plus } from "lucide-react";
// import { Corkboard, StickyNote } from "@/components/corkboard";
// import { PageHeader } from "@/components/page-header";
// import { useItems } from "@/hooks/use-items";

// export default function SuppliesPage() {
//   const { items, loading, error, refresh } = useItems();
//   return (
//     <div className="p-4">
//       <PageHeader
//         title="Your Supplies:"
//         action={
//           <Link
//             href="/inventory/new"
//             aria-label="Add supply"
//             className="rounded-md border border-foreground p-1"
//           >
//             <Plus className="h-5 w-5" />
//           </Link>
//         }
//       />
//       <Corkboard
//         loading={loading}
//         error={error}
//         onRetry={refresh}
//         isEmpty={items.length === 0}
//         emptyTitle="No supplies yet"
//         emptyHint="Scan or add something you have on hand."
//       >
//         {items.map((item) => (
//           <StickyNote
//             key={item.id}
//             id={item.id}
//             label={item.name}
//             imageUrl={item.photo_url}
//             badge={`×${item.quantity}`}
//             href={`/inventory/${item.id}`}
//           />
//         ))}
//       </Corkboard>
//     </div>
//   );
// }

import { Suspense } from "react";
import { InventoryGrid } from "@/components/inventory-grid";

export default function InventoryPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-8">
      <div className="font-sans mx-auto w-full max-w-md">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">
              Loading your supplies…
            </p>
          }
        >
          <InventoryGrid />
        </Suspense>
      </div>
    </main>
  );
}
