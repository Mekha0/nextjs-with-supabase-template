"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddItemForm } from "@/components/add-item-form";
import { errorMessage } from "@/lib/api/http";
import { deleteItem, getItem, updateItem } from "@/lib/api/items";
import type { Item } from "@/lib/api/types";
// import EditItemForm from './EditItemForm';

function EditItemContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItem(id)
      .then(setItem)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <p className="p-4 text-destructive">{error}</p>;
  if (!item) return <p className="p-4 text-muted-foreground">Loading…</p>;

  return (
    <AddItemForm
      variant="editor"
      initial={item}
      onCancel={() => router.push("/inventory")}
      onSave={async (values) => {
        await updateItem(id, values);
        router.push("/inventory");
      }}
      onDelete={async () => {
        await deleteItem(id);
        router.push("/inventory");
      }}
    />
  );
}

export default function EditItemPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-32 pt-4">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-3 flex items-center justify-between border-b border-[#502d1e] pb-1">
          <h1 className="text-2xl font-bold text-[#502d1e]">Edit Item</h1>
          <Button
            asChild
            variant="outline"
            className="h-10 min-w-[103px] rounded-full border-[#496944] px-4 text-[16px] font-bold text-[#502d1e] shadow-none"
          >
            <Link href="/inventory">Cancel</Link>
          </Button>
        </header>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading item…</p>}>
          <EditItemContent />
        </Suspense>
      </div>
    </main>
  );
}
