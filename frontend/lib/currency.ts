const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(value: number): string {
  return INR_FORMATTER.format(Number.isFinite(value) ? value : 0);
}
