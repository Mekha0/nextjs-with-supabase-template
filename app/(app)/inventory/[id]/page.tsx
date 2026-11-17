"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AddItemForm } from "@/components/add-item-form";
import { errorMessage } from "@/lib/api/http";
import { deleteItem, getItem, updateItem } from "@/lib/api/items";
import type { Item } from "@/lib/api/types";

export default function EditItemPage() {
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
    <div className="p-4">
      <h1 className="mb-4 border-b border-foreground pb-1 text-xl font-bold">
        Edit Item
      </h1>
      <AddItemForm
        initial={item}
        onCancel={() => router.back()}
        onSave={async (values) => {
          await updateItem(id, values);
          router.push("/inventory");
        }}
        onDelete={async () => {
          await deleteItem(id);
          router.push("/inventory");
        }}
      />
    </div>
  );
}
