"use client";

import { useRouter } from "next/navigation";
import { AddItemForm } from "@/components/add-item-form";
import { createItem } from "@/lib/api/items";

export default function NewItemPage() {
  const router = useRouter();
  return (
    <div className="p-4">
      <h1 className="mb-4 border-b border-foreground pb-1 text-xl font-bold">
        Add Item
      </h1>
      <AddItemForm
        onCancel={() => router.back()}
        onSave={async (values) => {
          await createItem(values);
          router.push("/inventory");
        }}
      />
    </div>
  );
}
