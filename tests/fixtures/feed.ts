// Small inline fixtures shaped like the real feed (SPEC section 8). Not a product feature.
export const rawEvent = (over: Record<string, unknown> = {}) => ({
  title: "Tinker Tuesday",
  series: "Tinker Tuesday",
  date: "2026-10-20",
  time: "7:00 PM",
  venue: "Somewhere",
  url: "https://example.com/tinker",
  description: "Hands-on.",
  tags: ["making"],
  featured: true,
  past: true,
  id: "tinker-tuesday-2026-10-20",
  "misha-star": true,
  ...over,
});
