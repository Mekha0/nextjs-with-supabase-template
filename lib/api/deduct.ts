import { deleteItem, updateItem } from "./items";
import type { Item } from "./types";

/** Lowers each item's quantity, deleting it at zero (the API requires quantity >= 1).
 *  Never throws: returns the names that failed so the UI can tell the user. */
export async function deductSupplies(uses: { item: Item; used: number }[]) {
  const failed: string[] = [];
  for (const { item, used } of uses) {
    try {
      const left = item.quantity - used;
      if (left < 1) await deleteItem(item.id);
      else await updateItem(item.id, { quantity: left });
    } catch {
      failed.push(item.name);
    }
  }
  return { failed };
}