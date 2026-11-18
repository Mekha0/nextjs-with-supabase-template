import { request, jsonInit } from "./http";
import type { Item } from "./types";

export const listItems = () =>
  request<{ items: Item[] }>("/api/items").then((r) => r.items);

// Note: if the name already exists, the server merges quantity and returns 200.
export const createItem = (input: {
  name: string;
  quantity?: number;
  photo_url?: string | null;
}) =>
  request<{ item: Item }>("/api/items", jsonInit("POST", input)).then(
    (r) => r.item,
  );

export const updateItem = (
  id: string,
  input: Partial<{ name: string; quantity: number; photo_url: string | null }>,
) =>
  request<{ item: Item }>(`/api/items/${id}`, jsonInit("PATCH", input)).then(
    (r) => r.item,
  );

export const deleteItem = (id: string) =>
  request<void>(`/api/items/${id}`, { method: "DELETE" });

export const getItem = (id: string) =>
  request<{ item: Item }>(`/api/items/${id}`).then((r) => r.item);