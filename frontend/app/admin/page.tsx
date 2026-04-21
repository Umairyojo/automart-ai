"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  createAdminCompatibilityMapping,
  createAdminBrand,
  createAdminCategory,
  createAdminCoupon,
  createAdminProduct,
  createAdminVehicle,
  deleteAdminCompatibilityMapping,
  deleteAdminBrand,
  deleteAdminCategory,
  deleteAdminCoupon,
  deleteAdminProduct,
  deleteAdminVehicle,
  getAdminAnalytics,
  getAdminBrands,
  getAdminCategories,
  getAdminCompatibilityMappings,
  getAdminCoupons,
  getAdminOrders,
  getAdminProducts,
  getAdminUserOrders,
  getAdminUsers,
  getAdminVehicles,
  markAdminProductOutOfStock,
  meAuth,
  type AdminAnalytics,
  type AdminBrand,
  type AdminCategory,
  type AdminCompatibilityMapping,
  type AdminCoupon,
  type AdminOrder,
  type AdminUser,
  type Product,
  type ProductType,
  type Vehicle,
  updateAdminCategory,
  updateAdminBrand,
  updateAdminCoupon,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminUserBlock,
  uploadAdminImage,
} from "../../lib/api";
import { formatINR } from "../../lib/currency";

type AdminTab =
  | "overview"
  | "products"
  | "vehicles"
  | "categories"
  | "brands"
  | "compatibility"
  | "users"
  | "orders"
  | "coupons";

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingVehicleImage, setUploadingVehicleImage] = useState(false);

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [compatibilityMappings, setCompatibilityMappings] = useState<AdminCompatibilityMapping[]>([]);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [loadingUserOrdersId, setLoadingUserOrdersId] = useState<number | null>(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState<{
    user: AdminUser;
    orders: AdminOrder[];
  } | null>(null);
  const [compatibilityForm, setCompatibilityForm] = useState({
    vehicle_id: "",
    product_id: "",
  });
  const [compatibilityFilter, setCompatibilityFilter] = useState({
    vehicle_id: "",
    product_type: "",
  });

  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    value: "10",
    min_order_amount: "999",
    max_discount: "500",
    active: true,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    active: true,
  });
  const [brandForm, setBrandForm] = useState({
    name: "",
    description: "",
    active: true,
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category: "engine",
    brand: "",
    product_type: "vehicleSpecific" as ProductType,
    price: "0",
    stock: "0",
    description: "",
    image_url: "",
    vehicle_compatibility: "",
  });
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_type: "car" as "car" | "bike",
    company: "",
    model: "",
    year: String(new Date().getFullYear()),
    variant: "",
    fuel_type: "Petrol",
    image_url: "",
  });
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});

  const categoryNames = useMemo(
    () => categories.filter((c) => c.active).map((c) => c.name),
    [categories]
  );
  const brandNames = useMemo(
    () => brands.filter((b) => b.active).map((b) => b.name),
    [brands]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const me = await meAuth();
      if (!me.user) {
        router.push("/login");
        return;
      }
      if (!me.user.is_admin) {
        setForbidden(true);
        return;
      }

      const [
        analyticsRes,
        ordersRes,
        couponsRes,
        categoriesRes,
        brandsRes,
        productsRes,
        vehiclesRes,
        usersRes,
        mappingsRes,
      ] =
        await Promise.all([
          getAdminAnalytics(),
          getAdminOrders(),
          getAdminCoupons(),
          getAdminCategories(),
          getAdminBrands(),
          getAdminProducts(),
          getAdminVehicles(),
          getAdminUsers(),
          getAdminCompatibilityMappings(),
        ]);
      setAnalytics(analyticsRes);
      setOrders(ordersRes.orders || []);
      setAllowedStatuses(ordersRes.allowed_statuses || []);
      setCoupons(couponsRes.coupons || []);
      setCategories(categoriesRes.categories || []);
      setBrands(brandsRes.brands || []);
      setProducts(productsRes.products || []);
      setVehicles(vehiclesRes.vehicles || []);
      setUsers(usersRes.users || []);
      setCompatibilityMappings(mappingsRes.mappings || []);
    } catch (e: any) {
      if (e?.status === 401) {
        router.push("/login");
        return;
      }
      if (e?.status === 403) {
        setForbidden(true);
        return;
      }
      setError(e?.message || "Could not load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard().catch(() => {
      // handled in loader
    });
  }, [loadDashboard]);

  useEffect(() => {
    if (categoryNames.length > 0 && !categoryNames.includes(productForm.category)) {
      setProductForm((prev) => ({ ...prev, category: categoryNames[0] }));
    }
  }, [categoryNames, productForm.category]);

  useEffect(() => {
    if (brandNames.length > 0 && !brandNames.includes(productForm.brand)) {
      setProductForm((prev) => ({ ...prev, brand: brandNames[0] }));
    }
  }, [brandNames, productForm.brand]);

  useEffect(() => {
    if (!compatibilityForm.vehicle_id && vehicles.length > 0) {
      setCompatibilityForm((prev) => ({ ...prev, vehicle_id: String(vehicles[0].id) }));
    }
    if (!compatibilityForm.product_id && products.length > 0) {
      const preferred =
        products.find((p) => p.product_type === "vehicleSpecific") ||
        products.find((p) => p.product_type === "companyBranded") ||
        products[0];
      if (preferred) {
        setCompatibilityForm((prev) => ({ ...prev, product_id: String(preferred.id) }));
      }
    }
  }, [compatibilityForm.product_id, compatibilityForm.vehicle_id, products, vehicles]);

  const summaryCards = useMemo(
    () => [
      { label: "Total Revenue", value: formatINR(analytics?.revenue_total || 0) },
      { label: "Orders", value: String(analytics?.orders || 0) },
      { label: "Products", value: String(products.length) },
      { label: "Users", value: String(users.length || analytics?.users || 0) },
      { label: "Vehicles", value: String(vehicles.length) },
    ],
    [analytics, products.length, users.length, vehicles.length]
  );

  const compatibilityRows = useMemo(() => {
    return compatibilityMappings.filter((row) => {
      if (
        compatibilityFilter.vehicle_id &&
        String(row.vehicle_id) !== compatibilityFilter.vehicle_id
      ) {
        return false;
      }
      if (
        compatibilityFilter.product_type &&
        String(row.product?.product_type || "") !== compatibilityFilter.product_type
      ) {
        return false;
      }
      return true;
    });
  }, [compatibilityFilter.product_type, compatibilityFilter.vehicle_id, compatibilityMappings]);

  const handleStatusUpdate = async (orderId: number, status: string) => {
    setSavingOrderId(orderId);
    try {
      const res = await updateAdminOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      toast.success(`Order #${orderId} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Could not update order status");
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim(),
        discount_type: couponForm.discount_type,
        value: Number(couponForm.value || 0),
        min_order_amount: Number(couponForm.min_order_amount || 0),
        max_discount: couponForm.max_discount.trim() ? Number(couponForm.max_discount) : null,
        active: couponForm.active,
      };
      const res = await createAdminCoupon(payload);
      setCoupons((prev) => [res.coupon, ...prev]);
      setCouponForm((prev) => ({ ...prev, code: "", description: "" }));
      toast.success(`Coupon ${res.coupon.code} created`);
    } catch (e: any) {
      toast.error(e?.message || "Could not create coupon");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCoupon = async (coupon: AdminCoupon) => {
    setBusy(true);
    try {
      const res = await updateAdminCoupon(coupon.id, { active: !coupon.active });
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? res.coupon : c)));
      toast.success(`Coupon ${res.coupon.code} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Could not update coupon");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCoupon = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    setBusy(true);
    try {
      await deleteAdminCoupon(coupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      toast.success(`Coupon ${coupon.code} deleted`);
    } catch (e: any) {
      toast.error(e?.message || "Could not delete coupon");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createAdminCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        active: categoryForm.active,
      });
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryForm({ name: "", description: "", active: true });
      toast.success("Category created");
    } catch (e: any) {
      toast.error(e?.message || "Could not create category");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCategory = async (category: AdminCategory) => {
    setBusy(true);
    try {
      const res = await updateAdminCategory(category.id, { active: !category.active });
      setCategories((prev) => prev.map((c) => (c.id === category.id ? res.category : c)));
      toast.success(`Category ${res.category.name} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Could not update category");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (category: AdminCategory) => {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    setBusy(true);
    try {
      await deleteAdminCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success("Category deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete category");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateBrand = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createAdminBrand({
        name: brandForm.name,
        description: brandForm.description,
        active: brandForm.active,
      });
      setBrands((prev) => [...prev, res.brand].sort((a, b) => a.name.localeCompare(b.name)));
      setBrandForm({ name: "", description: "", active: true });
      toast.success("Brand created");
    } catch (e: any) {
      toast.error(e?.message || "Could not create brand");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBrand = async (brand: AdminBrand) => {
    setBusy(true);
    try {
      const res = await updateAdminBrand(brand.id, { active: !brand.active });
      setBrands((prev) => prev.map((b) => (b.id === brand.id ? res.brand : b)));
      toast.success(`Brand ${res.brand.name} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Could not update brand");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBrand = async (brand: AdminBrand) => {
    if (!window.confirm(`Delete brand ${brand.name}?`)) return;
    setBusy(true);
    try {
      await deleteAdminBrand(brand.id);
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
      toast.success("Brand deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete brand");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadProductImage = async (file: File) => {
    setUploadingProductImage(true);
    try {
      const uploaded = await uploadAdminImage(file, "product");
      setProductForm((prev) => ({ ...prev, image_url: uploaded.url }));
      toast.success("Product image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Could not upload product image");
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleUploadVehicleImage = async (file: File) => {
    setUploadingVehicleImage(true);
    try {
      const uploaded = await uploadAdminImage(file, "vehicle");
      setVehicleForm((prev) => ({ ...prev, image_url: uploaded.url }));
      toast.success("Vehicle image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Could not upload vehicle image");
    } finally {
      setUploadingVehicleImage(false);
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createAdminProduct({
        name: productForm.name.trim(),
        category: productForm.category,
        brand: productForm.brand.trim(),
        product_type: productForm.product_type,
        price: Number(productForm.price || 0),
        stock: Number(productForm.stock || 0),
        description: productForm.description.trim(),
        image_url: productForm.image_url.trim(),
        vehicle_compatibility: productForm.vehicle_compatibility.trim(),
      });
      setProducts((prev) => [res.product, ...prev]);
      setProductForm((prev) => ({
        ...prev,
        name: "",
        brand: "",
        price: "0",
        stock: "0",
        description: "",
        image_url: "",
        vehicle_compatibility: "",
      }));
      toast.success("Spare part added");
    } catch (e: any) {
      toast.error(e?.message || "Could not add spare part");
    } finally {
      setBusy(false);
    }
  };

  const handleOutOfStock = async (product: Product) => {
    setBusy(true);
    try {
      const res = await markAdminProductOutOfStock(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      toast.success(`${product.name} marked out of stock`);
    } catch (e: any) {
      toast.error(e?.message || "Could not mark out of stock");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStock = async (product: Product) => {
    const value = stockDrafts[product.id];
    if (value == null || value === "") return;
    setBusy(true);
    try {
      const res = await updateAdminProduct(product.id, { stock: Number(value) });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      toast.success("Stock updated");
    } catch (e: any) {
      toast.error(e?.message || "Could not update stock");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete spare part ${product.name}?`)) return;
    setBusy(true);
    try {
      await deleteAdminProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Spare part deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete spare part");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createAdminVehicle({
        vehicle_type: vehicleForm.vehicle_type,
        company: vehicleForm.company.trim(),
        model: vehicleForm.model.trim(),
        year: Number(vehicleForm.year),
        variant: vehicleForm.variant.trim(),
        fuel_type: vehicleForm.fuel_type.trim(),
        image_url: vehicleForm.image_url.trim(),
      });
      setVehicles((prev) =>
        [res.vehicle, ...prev].sort((a, b) => {
          if (a.vehicle_type !== b.vehicle_type) return a.vehicle_type.localeCompare(b.vehicle_type);
          if (a.company !== b.company) return a.company.localeCompare(b.company);
          if (a.model !== b.model) return a.model.localeCompare(b.model);
          return b.year - a.year;
        })
      );
      setVehicleForm((prev) => ({ ...prev, company: "", model: "", variant: "", image_url: "" }));
      toast.success("Vehicle added");
    } catch (e: any) {
      toast.error(e?.message || "Could not add vehicle");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Delete ${vehicle.display_name}?`)) return;
    setBusy(true);
    try {
      await deleteAdminVehicle(vehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      toast.success("Vehicle deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete vehicle");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCompatibility = async (e: FormEvent) => {
    e.preventDefault();
    if (!compatibilityForm.product_id || !compatibilityForm.vehicle_id) {
      toast.error("Select both product and vehicle");
      return;
    }
    setBusy(true);
    try {
      const res = await createAdminCompatibilityMapping({
        product_id: Number(compatibilityForm.product_id),
        vehicle_id: Number(compatibilityForm.vehicle_id),
      });
      if (res.created) {
        setCompatibilityMappings((prev) => [res.mapping, ...prev]);
        toast.success("Compatibility mapping created");
      } else {
        toast("Mapping already exists");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not create compatibility mapping");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCompatibility = async (mapping: AdminCompatibilityMapping) => {
    if (!window.confirm("Delete this compatibility mapping?")) return;
    setBusy(true);
    try {
      await deleteAdminCompatibilityMapping(mapping.id);
      setCompatibilityMappings((prev) => prev.filter((row) => row.id !== mapping.id));
      toast.success("Compatibility mapping deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete compatibility mapping");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleUserBlock = async (user: AdminUser) => {
    setBusy(true);
    try {
      const res = await updateAdminUserBlock(user.id, !user.is_blocked);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      setSelectedUserOrders((prev) =>
        prev && prev.user.id === user.id ? { ...prev, user: res.user } : prev
      );
      toast.success(
        res.user.is_blocked ? `User ${res.user.email} blocked` : `User ${res.user.email} unblocked`
      );
    } catch (e: any) {
      toast.error(e?.message || "Could not update user status");
    } finally {
      setBusy(false);
    }
  };

  const handleViewUserOrders = async (user: AdminUser) => {
    setLoadingUserOrdersId(user.id);
    try {
      const res = await getAdminUserOrders(user.id);
      setSelectedUserOrders({ user: res.user, orders: res.orders || [] });
    } catch (e: any) {
      toast.error(e?.message || "Could not load user orders");
    } finally {
      setLoadingUserOrdersId(null);
    }
  };

  if (loading) {
    return <p className="text-slate-300">Loading admin dashboard...</p>;
  }

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6">
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
        <p className="text-slate-300">
          This page is for admin users only. Login with an admin account to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-white">AutoMart Admin Dashboard</h1>
        <button
          type="button"
          onClick={() => loadDashboard()}
          className="px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <section className="grid grid-cols-2 md:grid-cols-8 gap-3">
        {(
          [
            "overview",
            "products",
            "vehicles",
            "categories",
            "brands",
            "compatibility",
            "users",
            "orders",
            "coupons",
          ] as AdminTab[]
        ).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
              tab === k
                ? "bg-primary text-primary-foreground"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {k}
          </button>
        ))}
      </section>

      {tab === "overview" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-3">Low Stock Products</h2>
            <div className="space-y-2">
              {(analytics?.low_stock_products || []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                >
                  <span className="text-slate-200">{p.name}</span>
                  <span className="text-amber-300 font-semibold">Stock: {p.stock}</span>
                </div>
              ))}
              {(analytics?.low_stock_products || []).length === 0 && (
                <p className="text-slate-400">No low stock items right now.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Add Spare Part</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Part name"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              />
              <select
                value={productForm.category}
                onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                {categoryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={productForm.product_type}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, product_type: e.target.value as ProductType }))
                }
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="vehicleSpecific">vehicleSpecific</option>
                <option value="universal">universal</option>
                <option value="companyBranded">companyBranded</option>
              </select>
              <select
                value={productForm.brand}
                onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              >
                <option value="">Select brand/company</option>
                {brandNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="Price (INR)"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <input
                type="number"
                min="0"
                value={productForm.stock}
                onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="Stock"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={productForm.image_url}
                onChange={(e) => setProductForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="Image URL (optional)"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white md:col-span-2"
              />
              <label className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-slate-300 cursor-pointer text-sm flex items-center justify-between">
                <span>{uploadingProductImage ? "Uploading image..." : "Upload product image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadProductImage(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <input
                value={productForm.vehicle_compatibility}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, vehicle_compatibility: e.target.value }))
                }
                placeholder="Compatibility (optional)"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white md:col-span-2"
              />
              {productForm.image_url && (
                <div className="md:col-span-3">
                  <div className="h-28 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productForm.image_url} alt="Product preview" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 disabled:opacity-60"
              >
                Add Spare Part
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Spare Parts Inventory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Category</th>
                    <th className="text-left py-3">Brand</th>
                    <th className="text-left py-3">Type</th>
                    <th className="text-left py-3">Price</th>
                    <th className="text-left py-3">Stock</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-white/5">
                      <td className="py-3 text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 overflow-hidden rounded-lg bg-slate-900 border border-white/10">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <span>{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-300">{product.category}</td>
                      <td className="py-3 text-slate-300">{product.brand || "-"}</td>
                      <td className="py-3 text-slate-300">{product.product_type}</td>
                      <td className="py-3 text-slate-200">{formatINR(product.price)}</td>
                      <td className="py-3 text-slate-200">{product.stock}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            value={stockDrafts[product.id] ?? String(product.stock)}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                            }
                            className="w-20 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(product)}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-xs"
                          >
                            Set Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOutOfStock(product)}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs"
                          >
                            Out of Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "vehicles" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Add Car/Bike</h2>
            <form onSubmit={handleCreateVehicle} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={vehicleForm.vehicle_type}
                onChange={(e) =>
                  setVehicleForm((p) => ({ ...p, vehicle_type: e.target.value as "car" | "bike" }))
                }
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="car">car</option>
                <option value="bike">bike</option>
              </select>
              <input
                value={vehicleForm.company}
                onChange={(e) => setVehicleForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="Company"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              />
              <input
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))}
                placeholder="Model"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              />
              <input
                type="number"
                min="1980"
                max="2100"
                value={vehicleForm.year}
                onChange={(e) => setVehicleForm((p) => ({ ...p, year: e.target.value }))}
                placeholder="Year"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={vehicleForm.variant}
                onChange={(e) => setVehicleForm((p) => ({ ...p, variant: e.target.value }))}
                placeholder="Variant"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={vehicleForm.fuel_type}
                onChange={(e) => setVehicleForm((p) => ({ ...p, fuel_type: e.target.value }))}
                placeholder="Fuel Type"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={vehicleForm.image_url}
                onChange={(e) => setVehicleForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="Vehicle image URL (optional)"
                className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white md:col-span-2"
              />
              <label className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-slate-300 cursor-pointer text-sm flex items-center justify-between">
                <span>{uploadingVehicleImage ? "Uploading image..." : "Upload vehicle image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadVehicleImage(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {vehicleForm.image_url && (
                <div className="md:col-span-3">
                  <div className="h-28 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={vehicleForm.image_url} alt="Vehicle preview" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 disabled:opacity-60 md:col-span-3"
              >
                Add Vehicle
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Vehicle Master</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="text-left py-3">Type</th>
                    <th className="text-left py-3">Company</th>
                    <th className="text-left py-3">Model</th>
                    <th className="text-left py-3">Year</th>
                    <th className="text-left py-3">Variant</th>
                    <th className="text-left py-3">Fuel</th>
                    <th className="text-left py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b border-white/5">
                      <td className="py-3 text-slate-300">{vehicle.vehicle_type}</td>
                      <td className="py-3 text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-10 overflow-hidden rounded-md bg-slate-900 border border-white/10">
                            {vehicle.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={vehicle.image_url} alt={vehicle.display_name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <span>{vehicle.company}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-200">{vehicle.model}</td>
                      <td className="py-3 text-slate-300">{vehicle.year}</td>
                      <td className="py-3 text-slate-300">{vehicle.variant || "-"}</td>
                      <td className="py-3 text-slate-300">{vehicle.fuel_type || "-"}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(vehicle)}
                          disabled={busy}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No vehicles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "categories" && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Add Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Category name (e.g. engine)"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              />
              <input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={categoryForm.active}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 disabled:opacity-60"
              >
                Add Category
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Category List</h2>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold">{category.name}</p>
                      <p className="text-xs text-slate-400">{category.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(category)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          category.active
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {category.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-slate-400">No categories found.</p>}
            </div>
          </div>
        </section>
      )}

      {tab === "brands" && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Add Brand / Company</h2>
            <form onSubmit={handleCreateBrand} className="space-y-3">
              <input
                value={brandForm.name}
                onChange={(e) => setBrandForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Brand name (e.g. Bosch)"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                required
              />
              <input
                value={brandForm.description}
                onChange={(e) => setBrandForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={brandForm.active}
                  onChange={(e) => setBrandForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 disabled:opacity-60"
              >
                Add Brand
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Brand List</h2>
            <div className="space-y-3">
              {brands.map((brand) => (
                <div key={brand.id} className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold">{brand.name}</p>
                      <p className="text-xs text-slate-400">{brand.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleBrand(brand)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          brand.active
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {brand.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBrand(brand)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {brands.length === 0 && <p className="text-slate-400">No brands found.</p>}
            </div>
          </div>
        </section>
      )}

      {tab === "compatibility" && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Map Product to Vehicle</h2>
            <form onSubmit={handleCreateCompatibility} className="space-y-3">
              <select
                value={compatibilityForm.product_id}
                onChange={(e) =>
                  setCompatibilityForm((prev) => ({ ...prev, product_id: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="">Select spare part</option>
                {products
                  .filter((p) => p.product_type !== "universal")
                  .map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} [{p.product_type}]
                    </option>
                  ))}
              </select>
              <select
                value={compatibilityForm.vehicle_id}
                onChange={(e) =>
                  setCompatibilityForm((prev) => ({ ...prev, vehicle_id: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.display_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                Universal products are auto-available for all vehicles. Map only vehicleSpecific and
                companyBranded products.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
              >
                Add Mapping
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Compatibility Mappings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <select
                value={compatibilityFilter.vehicle_id}
                onChange={(e) =>
                  setCompatibilityFilter((prev) => ({ ...prev, vehicle_id: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="">All vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.display_name}
                  </option>
                ))}
              </select>
              <select
                value={compatibilityFilter.product_type}
                onChange={(e) =>
                  setCompatibilityFilter((prev) => ({ ...prev, product_type: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              >
                <option value="">All product types</option>
                <option value="vehicleSpecific">vehicleSpecific</option>
                <option value="companyBranded">companyBranded</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {compatibilityRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{row.product?.name || "Product"}</p>
                      <p className="text-xs text-slate-400">
                        {row.product?.brand || "Generic"} | {row.product?.product_type || "-"} |{" "}
                        {row.product?.category || "-"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Vehicle: {row.vehicle?.display_name || row.vehicle_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCompatibility(row)}
                      disabled={busy}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {compatibilityRows.length === 0 && (
                <p className="text-slate-400">No compatibility mappings found.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "users" && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Registered Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Email</th>
                    <th className="text-left py-3">Role</th>
                    <th className="text-left py-3">Orders</th>
                    <th className="text-left py-3">Spent</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5">
                      <td className="py-3 text-slate-200">{user.name || "User"}</td>
                      <td className="py-3 text-slate-300">{user.email}</td>
                      <td className="py-3 text-slate-300">{user.is_admin ? "Admin" : "Customer"}</td>
                      <td className="py-3 text-slate-300">{user.order_count}</td>
                      <td className="py-3 text-slate-200">{formatINR(user.total_spent || 0)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            user.is_blocked
                              ? "bg-red-500/20 text-red-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {user.is_blocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewUserOrders(user)}
                            disabled={loadingUserOrdersId === user.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-xs disabled:opacity-60"
                          >
                            {loadingUserOrdersId === user.id ? "Loading..." : "View Orders"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUserBlock(user)}
                            disabled={busy}
                            className={`px-2.5 py-1 rounded-lg text-xs ${
                              user.is_blocked
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {user.is_blocked ? "Unblock" : "Block"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Selected User Orders</h2>
            {!selectedUserOrders && (
              <p className="text-slate-400">Choose a user and click View Orders.</p>
            )}
            {selectedUserOrders && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                  <p className="text-white font-semibold">{selectedUserOrders.user.name || "User"}</p>
                  <p className="text-xs text-slate-400">{selectedUserOrders.user.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Total spent: {formatINR(selectedUserOrders.user.total_spent || 0)} | Orders:{" "}
                    {selectedUserOrders.user.order_count}
                  </p>
                </div>
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {selectedUserOrders.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-white/10 bg-slate-900/40 p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-white font-semibold">Order #{order.id}</p>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatINR(order.total)}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          {order.status} | {order.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedUserOrders.orders.length === 0 && (
                    <p className="text-slate-400">This user has not placed any orders yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "orders" && (
        <section className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
          <h2 className="text-xl font-bold text-white mb-4">Order Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-white/10">
                <tr>
                  <th className="text-left py-3">Order</th>
                  <th className="text-left py-3">Customer</th>
                  <th className="text-left py-3">Payment</th>
                  <th className="text-left py-3">Total</th>
                  <th className="text-left py-3">Created</th>
                  <th className="text-left py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5">
                    <td className="py-3 text-white font-semibold">#{order.id}</td>
                    <td className="py-3 text-slate-300">
                      <p>{order.customer_name || "Customer"}</p>
                      <p className="text-xs text-slate-400">{order.customer_email || "-"}</p>
                    </td>
                    <td className="py-3 text-slate-300 capitalize">
                      {order.payment_method} / {order.payment_status}
                    </td>
                    <td className="py-3 text-white">{formatINR(order.total)}</td>
                    <td className="py-3 text-slate-400">{formatDate(order.created_at)}</td>
                    <td className="py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        disabled={savingOrderId === order.id}
                        className="rounded-lg bg-slate-900 border border-white/15 px-2 py-1 text-slate-100 capitalize disabled:opacity-60"
                      >
                        {allowedStatuses.map((status) => (
                          <option key={status} value={status} className="capitalize">
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-400 text-center">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "coupons" && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Create Coupon</h2>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="Code (e.g. NEW10)"
                  className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                  required
                />
                <select
                  value={couponForm.discount_type}
                  onChange={(e) =>
                    setCouponForm((p) => ({
                      ...p,
                      discount_type: e.target.value as "percent" | "fixed",
                    }))
                  }
                  className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (Rs)</option>
                </select>
              </div>
              <input
                value={couponForm.description}
                onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={couponForm.value}
                  onChange={(e) => setCouponForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="Value"
                  className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={couponForm.min_order_amount}
                  onChange={(e) => setCouponForm((p) => ({ ...p, min_order_amount: e.target.value }))}
                  placeholder="Min Order Rs"
                  className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={couponForm.max_discount}
                  onChange={(e) => setCouponForm((p) => ({ ...p, max_discount: e.target.value }))}
                  placeholder="Max Discount Rs"
                  className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Active coupon
              </label>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                Create Coupon
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
            <h2 className="text-xl font-bold text-white mb-4">Existing Coupons</h2>
            <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{coupon.code}</p>
                      <p className="text-xs text-slate-400">{coupon.description || "No description"}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {coupon.discount_type === "percent"
                          ? `${coupon.value}% off`
                          : `${formatINR(coupon.value)} off`}{" "}
                        | Min order: {formatINR(coupon.min_order_amount)}
                        {coupon.max_discount ? ` | Max: ${formatINR(coupon.max_discount)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(coupon)}
                        disabled={busy}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          coupon.active
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {coupon.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon)}
                        disabled={busy}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && <p className="text-slate-400">No coupons found.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
