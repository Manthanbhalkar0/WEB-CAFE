const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

export async function fetchMenu() {
  const res = await fetch(`${API_BASE}/menu`);
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export async function placeOrderApi({ customerName, customerPhone, items }) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName,
      customerPhone,
      items: items.map((i) => ({ menuItemId: i.id, quantity: i.qty })),
    }),
  });
  if (!res.ok) throw new Error("Failed to place order");
  return res.json();
}
