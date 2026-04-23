export type ProductType = "vehicleSpecific" | "universal" | "companyBranded";

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  brand: string;
  product_type: ProductType;
  vehicle_compatibility: string;
}

export interface Vehicle {
  id: number;
  company: string;
  model: string;
  year: number;
  variant: string;
  fuel_type: string;
  vehicle_type: "car" | "bike" | string;
  image_url?: string;
  display_name: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
  line_total: number;
}

export interface CartSummary {
  items: CartLine[];
  subtotal: number;
  discount: number;
  gst: number;
  shipping: number;
  total: number;
  coupon?: {
    code: string | null;
    error: string | null;
  };
}

export interface OrderSummary {
  id: number;
  user_id: number;
  total: number;
  status: string;
  shipping_address: string;
  created_at: string | null;
  subtotal: number;
  gst: number;
  shipping: number;
  discount: number;
  coupon_code: string | null;
  payment_method: "cod" | "upi" | "card" | string;
  payment_status: "success" | "failed" | "pending" | string;
}

export interface OrderDetail extends OrderSummary {
  items: Array<{
    id: number;
    product_id: number;
    product_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface InvoiceResponse {
  invoice: {
    invoice_number: string;
    issued_at: string | null;
    seller: {
      name: string;
      address: string;
      gstin: string;
      support_email: string;
    };
    customer: {
      name: string;
      email: string;
    };
    order: OrderDetail;
  };
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_blocked?: boolean;
}

export interface Address {
  id: number;
  user_id: number;
  label: string;
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export interface AddressPayload {
  label?: string;
  full_name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string;
  is_default?: boolean;
}

export interface GarageEntry {
  id: number;
  user_id: number;
  vehicle_id: number;
  nickname: string;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
  vehicle: Vehicle | null;
}

export interface AdminAnalytics {
  users: number;
  products: number;
  orders: number;
  revenue_total: number;
  history_events: number;
  top_products: Array<{
    product: Product;
    units_sold: number;
  }>;
  recent_orders: Array<{
    id: number;
    user_id: number;
    total: number;
    status: string;
    created_at: string | null;
  }>;
  low_stock_products: Product[];
  ai_enabled: boolean;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  customer_email: string | null;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string | null;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  gst: number;
  shipping: number;
  coupon_code: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  created_at: string | null;
  order_count: number;
  total_spent: number;
}

export interface AdminCoupon {
  id: number;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  active: boolean;
  created_at: string | null;
}

export interface AdminCategory {
  id: number;
  name: string;
  description: string;
  active: boolean;
  created_at: string | null;
}

export interface AdminBrand {
  id: number;
  name: string;
  description: string;
  active: boolean;
  created_at: string | null;
}

export interface AdminCompatibilityMapping {
  id: number;
  product_id: number;
  vehicle_id: number;
  created_at: string | null;
  product: {
    id: number;
    name: string | null;
    brand: string | null;
    category: string | null;
    product_type: ProductType | string | null;
  };
  vehicle: {
    id: number;
    display_name: string | null;
    company: string | null;
    model: string | null;
    year: number | null;
    vehicle_type: "car" | "bike" | string | null;
  };
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatResponse {
  reply: string;
  suggested_products: Product[];
}

export interface PaymentConfig {
  provider: "razorpay" | string;
  enabled: boolean;
  currency: string;
  key_id: string;
  demo_fallback: boolean;
}

export interface RazorpayOrderCreateResponse {
  provider: "razorpay" | string;
  key_id: string;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
  amount_breakdown: {
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
  };
  coupon_code: string | null;
}

interface ApiError extends Error {
  status?: number;
}

type FetchJsonOptions = {
  cacheTtlMs?: number;
  timeoutMs?: number;
};

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const GET_CACHE_PREFIX = "automart:get:";
const inMemoryGetCache = new Map<string, CacheEntry>();

function nowMs() {
  return Date.now();
}

function makeCacheKey(path: string) {
  return `${GET_CACHE_PREFIX}${path}`;
}

function readCachedPayload<T>(cacheKey: string): T | null {
  const now = nowMs();
  const memory = inMemoryGetCache.get(cacheKey);
  if (memory && memory.expiresAt > now) {
    return memory.payload as T;
  }
  if (memory && memory.expiresAt <= now) {
    inMemoryGetCache.delete(cacheKey);
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(cacheKey);
      return null;
    }
    if (parsed.expiresAt <= now) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }
    inMemoryGetCache.set(cacheKey, parsed);
    return parsed.payload as T;
  } catch {
    return null;
  }
}

function writeCachedPayload(cacheKey: string, payload: unknown, ttlMs: number) {
  const entry: CacheEntry = {
    expiresAt: nowMs() + ttlMs,
    payload,
  };
  inMemoryGetCache.set(cacheKey, entry);
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  options?: FetchJsonOptions
): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const cacheTtlMs = method === "GET" ? options?.cacheTtlMs || 0 : 0;
  const timeoutMs = options?.timeoutMs ?? (method === "GET" ? 15000 : 20000);
  const cacheKey = cacheTtlMs > 0 ? makeCacheKey(path) : "";

  if (cacheKey) {
    const cached = readCachedPayload<T>(cacheKey);
    if (cached != null) {
      return cached;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
    signal: init?.signal || controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.error || res.statusText) as ApiError;
    err.status = res.status;
    throw err;
  }
  if (cacheKey) {
    writeCachedPayload(cacheKey, data, cacheTtlMs);
  }
  return data as T;
}

export async function getProducts(params?: {
  q?: string;
  category?: string;
  brand?: string;
  product_type?: string;
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  const query = qs.toString();
  return fetchJson<{ products: Product[] }>(`/api/products${query ? `?${query}` : ""}`, undefined, {
    cacheTtlMs: 120000,
  });
}

export async function getProductBySlug(slug: string) {
  return fetchJson<{ product: Product }>(`/api/products/slug/${encodeURIComponent(slug)}`);
}

export async function getProductsMeta() {
  return fetchJson<{ brands: string[]; categories: string[]; product_types: ProductType[] }>(
    "/api/products/meta",
    undefined,
    {
      cacheTtlMs: 300000,
    }
  );
}

export async function getVehicles(params?: {
  q?: string;
  company?: string;
  model?: string;
  year?: string;
  variant?: string;
  fuel_type?: string;
  vehicle_type?: "car" | "bike";
}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  const query = qs.toString();
  return fetchJson<{ vehicles: Vehicle[] }>(`/api/vehicles${query ? `?${query}` : ""}`, undefined, {
    cacheTtlMs: 180000,
  });
}

export async function getVehicleParts(vehicleId: number) {
  return fetchJson<{ vehicle: Vehicle; products: Product[] }>(`/api/vehicles/${vehicleId}/parts`, undefined, {
    cacheTtlMs: 120000,
  });
}

export async function getCart(coupon?: string) {
  const query = coupon ? `?coupon=${encodeURIComponent(coupon)}` : "";
  return fetchJson<CartSummary>(`/api/cart${query}`);
}

export async function cartAdd(productId: number, quantity = 1) {
  return fetchJson<{ ok: boolean; cart: Record<string, number> }>("/api/cart/add", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function cartUpdate(productId: number, quantity: number) {
  return fetchJson<{ ok: boolean; cart: Record<string, number> }>("/api/cart/update", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function cartClear() {
  return fetchJson<{ ok: boolean }>("/api/cart/clear", { method: "POST" });
}

export async function validateCoupon(code: string) {
  return fetchJson<{ valid: boolean; code: string; message: string; discount: number }>(
    `/api/coupons/validate?code=${encodeURIComponent(code)}`
  );
}

export async function getPaymentConfig() {
  return fetchJson<PaymentConfig>("/api/payments/config");
}

export async function createRazorpayOrder(couponCode?: string) {
  return fetchJson<RazorpayOrderCreateResponse>("/api/payments/razorpay/order", {
    method: "POST",
    body: JSON.stringify({
      coupon_code: couponCode || undefined,
    }),
  });
}

export async function checkoutOrder(payload: {
  shippingAddress: string;
  paymentMethod: "cod" | "upi" | "card";
  couponCode?: string;
  paymentGateway?: "demo" | "razorpay";
  paymentOutcome?: "success" | "failed" | "pending";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}) {
  return fetchJson<{
    order_id: number;
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
    status: string;
    payment_status: "success" | "failed" | "pending";
    payment_method: "cod" | "upi" | "card";
    payment_gateway?: "demo" | "razorpay" | "cod";
  }>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      shipping_address: payload.shippingAddress,
      payment_method: payload.paymentMethod,
      coupon_code: payload.couponCode || undefined,
      payment_gateway: payload.paymentGateway || "demo",
      payment_outcome: payload.paymentOutcome || undefined,
      razorpay_order_id: payload.razorpayOrderId || undefined,
      razorpay_payment_id: payload.razorpayPaymentId || undefined,
      razorpay_signature: payload.razorpaySignature || undefined,
    }),
  });
}

export async function getOrders() {
  return fetchJson<{ orders: OrderSummary[] }>("/api/orders");
}

export async function getOrder(orderId: number) {
  return fetchJson<{ order: OrderDetail }>(`/api/orders/${orderId}`);
}

export async function cancelOrder(orderId: number) {
  return fetchJson<{ order: OrderDetail }>(`/api/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export async function getOrderInvoice(orderId: number) {
  return fetchJson<InvoiceResponse>(`/api/orders/${orderId}/invoice`);
}

export async function loginAuth(email: string, password: string) {
  return fetchJson<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerAuth(name: string, email: string, password: string) {
  return fetchJson<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logoutAuth() {
  return fetchJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function meAuth() {
  return fetchJson<{ user: AuthUser | null }>("/api/auth/me");
}

export async function getProfile() {
  return fetchJson<{
    user: AuthUser;
    default_address: Address | null;
  }>("/api/auth/profile");
}

export async function updateProfile(payload: { name?: string; email?: string }) {
  return fetchJson<{ user: AuthUser }>("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
}) {
  return fetchJson<{ ok: boolean; message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(email: string) {
  return fetchJson<{ ok: boolean; message: string; reset_token?: string }>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );
}

export async function resetPassword(token: string, newPassword: string) {
  return fetchJson<{ ok: boolean; message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function listAddresses() {
  return fetchJson<{ addresses: Address[] }>("/api/auth/addresses");
}

export async function createAddress(payload: AddressPayload) {
  return fetchJson<{ address: Address }>("/api/auth/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAddress(
  addressId: number,
  payload: Partial<AddressPayload>
) {
  return fetchJson<{ address: Address }>(`/api/auth/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAddress(addressId: number) {
  return fetchJson<{ ok: boolean }>(`/api/auth/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export async function listGarage() {
  return fetchJson<{ garage: GarageEntry[] }>("/api/auth/garage");
}

export async function createGarageEntry(payload: {
  vehicle_id: number;
  nickname?: string;
  is_default?: boolean;
}) {
  return fetchJson<{ garage_entry: GarageEntry; created: boolean }>("/api/auth/garage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGarageEntry(
  garageId: number,
  payload: Partial<{ nickname: string; is_default: boolean }>
) {
  return fetchJson<{ garage_entry: GarageEntry }>(`/api/auth/garage/${garageId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteGarageEntry(garageId: number) {
  return fetchJson<{ ok: boolean }>(`/api/auth/garage/${garageId}`, {
    method: "DELETE",
  });
}

export async function chatWithAI(payload: {
  message: string;
  history?: AIChatMessage[];
  language?: string;
}) {
  return fetchJson<AIChatResponse>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminAnalytics() {
  return fetchJson<AdminAnalytics>("/api/admin/analytics");
}

export async function getAdminProducts() {
  return fetchJson<{ products: Product[] }>("/api/admin/products");
}

export async function createAdminProduct(payload: {
  name: string;
  category: string;
  brand?: string;
  product_type: ProductType;
  price: number;
  stock: number;
  description?: string;
  image_url?: string;
  vehicle_compatibility?: string;
}) {
  return fetchJson<{ product: Product }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProduct(
  productId: number,
  payload: Partial<{
    name: string;
    category: string;
    brand: string;
    product_type: ProductType;
    price: number;
    stock: number;
    description: string;
    image_url: string;
    vehicle_compatibility: string;
  }>
) {
  return fetchJson<{ product: Product }>(`/api/admin/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProduct(productId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/products/${productId}`, {
    method: "DELETE",
  });
}

export async function markAdminProductOutOfStock(productId: number) {
  return fetchJson<{ product: Product }>(`/api/admin/products/${productId}/out-of-stock`, {
    method: "POST",
  });
}

export async function getAdminOrders() {
  return fetchJson<{ orders: AdminOrder[]; allowed_statuses: string[] }>("/api/admin/orders");
}

export async function getAdminUsers() {
  return fetchJson<{ users: AdminUser[] }>("/api/admin/users");
}

export async function updateAdminUserBlock(userId: number, blocked: boolean) {
  return fetchJson<{ user: AdminUser }>(`/api/admin/users/${userId}/block`, {
    method: "PATCH",
    body: JSON.stringify({ blocked }),
  });
}

export async function getAdminUserOrders(userId: number) {
  return fetchJson<{ user: AdminUser; orders: AdminOrder[] }>(`/api/admin/users/${userId}/orders`);
}

export async function getAdminCompatibilityMappings(params?: {
  vehicle_id?: number;
  product_id?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.vehicle_id) qs.set("vehicle_id", String(params.vehicle_id));
  if (params?.product_id) qs.set("product_id", String(params.product_id));
  const query = qs.toString();
  return fetchJson<{ mappings: AdminCompatibilityMapping[] }>(
    `/api/admin/compatibility${query ? `?${query}` : ""}`
  );
}

export async function createAdminCompatibilityMapping(payload: {
  product_id: number;
  vehicle_id: number;
}) {
  return fetchJson<{ mapping: AdminCompatibilityMapping; created: boolean }>("/api/admin/compatibility", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCompatibilityMapping(mappingId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/compatibility/${mappingId}`, {
    method: "DELETE",
  });
}

export async function updateAdminOrderStatus(orderId: number, status: string) {
  return fetchJson<{ order: AdminOrder }>(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminCoupons() {
  return fetchJson<{ coupons: AdminCoupon[] }>("/api/admin/coupons");
}

export async function getAdminCategories() {
  return fetchJson<{ categories: AdminCategory[] }>("/api/admin/categories");
}

export async function createAdminCategory(payload: {
  name: string;
  description?: string;
  active?: boolean;
}) {
  return fetchJson<{ category: AdminCategory }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCategory(
  categoryId: number,
  payload: Partial<{ name: string; description: string; active: boolean }>
) {
  return fetchJson<{ category: AdminCategory }>(`/api/admin/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCategory(categoryId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function getAdminBrands() {
  return fetchJson<{ brands: AdminBrand[] }>("/api/admin/brands");
}

export async function createAdminBrand(payload: {
  name: string;
  description?: string;
  active?: boolean;
}) {
  return fetchJson<{ brand: AdminBrand }>("/api/admin/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminBrand(
  brandId: number,
  payload: Partial<{ name: string; description: string; active: boolean }>
) {
  return fetchJson<{ brand: AdminBrand }>(`/api/admin/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminBrand(brandId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/brands/${brandId}`, {
    method: "DELETE",
  });
}

export async function getAdminVehicles(params?: { vehicle_type?: "car" | "bike" }) {
  const qs = new URLSearchParams();
  if (params?.vehicle_type) qs.set("vehicle_type", params.vehicle_type);
  const query = qs.toString();
  return fetchJson<{ vehicles: Vehicle[] }>(`/api/admin/vehicles${query ? `?${query}` : ""}`);
}

export async function createAdminVehicle(payload: {
  company: string;
  model: string;
  year: number;
  variant?: string;
  fuel_type?: string;
  vehicle_type: "car" | "bike";
  image_url?: string;
}) {
  return fetchJson<{ vehicle: Vehicle }>("/api/admin/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminVehicle(
  vehicleId: number,
  payload: Partial<{
    company: string;
    model: string;
    year: number;
    variant: string;
    fuel_type: string;
    vehicle_type: "car" | "bike";
    image_url: string;
  }>
) {
  return fetchJson<{ vehicle: Vehicle }>(`/api/admin/vehicles/${vehicleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminVehicle(vehicleId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/vehicles/${vehicleId}`, {
    method: "DELETE",
  });
}

export async function uploadAdminImage(file: File, entity: "product" | "vehicle" | "general") {
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    const err = new Error("Image too large. Please upload a file under 20MB.");
    (err as Error & { status?: number }).status = 413;
    throw err;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("entity", entity);
  const res = await fetch("/api/admin/uploads/image", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.error || res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as { url: string; provider: "cloudinary" | "local"; width: number; height: number };
}

export async function createAdminCoupon(payload: {
  code: string;
  description?: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_order_amount?: number;
  max_discount?: number | null;
  active?: boolean;
}) {
  return fetchJson<{ coupon: AdminCoupon }>("/api/admin/coupons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCoupon(
  couponId: number,
  payload: Partial<{
    code: string;
    description: string;
    discount_type: "percent" | "fixed";
    value: number;
    min_order_amount: number;
    max_discount: number | null;
    active: boolean;
  }>
) {
  return fetchJson<{ coupon: AdminCoupon }>(`/api/admin/coupons/${couponId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCoupon(couponId: number) {
  return fetchJson<{ ok: boolean }>(`/api/admin/coupons/${couponId}`, {
    method: "DELETE",
  });
}
