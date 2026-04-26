"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Heart, LogOut, MapPin, Package, Settings, User } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  changePassword,
  createGarageEntry,
  createAddress,
  deleteGarageEntry,
  deleteAddress,
  getProfile,
  getVehicles,
  listGarage,
  listAddresses,
  logoutAuth,
  type Address,
  type GarageEntry,
  type Vehicle,
  updateGarageEntry,
  updateAddress,
  updateProfile,
} from "../../lib/api";

type TabKey = "details" | "addresses" | "orders" | "saved" | "settings";

type AddressFormState = {
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
};

const EMPTY_ADDRESS_FORM: AddressFormState = {
  label: "Home",
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  phone: "",
  is_default: false,
};

function formatAddressOneLine(address: Partial<Address> | null | undefined): string {
  if (!address) return "No default address saved yet";
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(", ") || "No default address saved yet";
}

function normalizeDisplayName(name: string | null | undefined, email: string): string {
  const raw = String(name || email.split("@")[0] || "User").trim();
  if (!raw) return "User";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("User");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [garageEntries, setGarageEntries] = useState<GarageEntry[]>([]);
  const [garageVehicles, setGarageVehicles] = useState<Vehicle[]>([]);
  const [garageLoading, setGarageLoading] = useState(false);
  const [garageSaving, setGarageSaving] = useState(false);
  const [garageVehicleId, setGarageVehicleId] = useState("");
  const [garageNickname, setGarageNickname] = useState("");

  const [formData, setFormData] = useState({
    name: "User",
    email: "user@example.com",
    phone: "+91 90000 00000",
    address: "Default Address, India",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.is_default) || addresses[0] || null,
    [addresses]
  );

  const loadAddresses = async () => {
    setAddressLoading(true);
    try {
      const res = await listAddresses();
      const rows = res.addresses || [];
      setAddresses(rows);
      const fallback = rows.find((a) => a.is_default) || rows[0];
      setFormData((prev) => ({
        ...prev,
        address: formatAddressOneLine(fallback),
      }));
    } catch (err: any) {
      if (err?.status !== 401) {
        toast.error(err?.message || "Could not load addresses");
      }
    } finally {
      setAddressLoading(false);
    }
  };

  const loadGarage = async () => {
    setGarageLoading(true);
    try {
      const res = await listGarage();
      setGarageEntries(res.garage || []);
    } catch (err: any) {
      if (err?.status !== 401) {
        toast.error(err?.message || "Could not load saved vehicles");
      }
    } finally {
      setGarageLoading(false);
    }
  };

  const loadGarageVehicles = useCallback(async () => {
    try {
      const res = await getVehicles();
      const rows = res.vehicles || [];
      setGarageVehicles(rows);
      if (rows.length > 0 && !garageVehicleId) {
        setGarageVehicleId(String(rows[0].id));
      }
    } catch (err: any) {
      if (err?.status !== 401) {
        toast.error(err?.message || "Could not load vehicles");
      }
    }
  }, [garageVehicleId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getProfile();
        if (!active) return;
        const formattedName = normalizeDisplayName(res.user.name, res.user.email);
        setIsAdmin(Boolean(res.user.is_admin));
        setUserName(formattedName);
        setFormData((f) => ({
          ...f,
          name: formattedName,
          email: res.user.email,
          address: formatAddressOneLine(res.default_address),
        }));
        setAddressForm((prev) => ({
          ...prev,
          full_name: formattedName,
        }));
        await Promise.all([loadAddresses(), loadGarage(), loadGarageVehicles()]);
      } catch (err: any) {
        if (err?.status === 401) {
          toast.error("Please login to access profile.");
          router.push("/login");
          return;
        }
        toast.error(err?.message || "Could not load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadGarageVehicles, router]);

  const handleSaveProfile = async () => {
    try {
      const res = await updateProfile({
        name: formData.name,
        email: formData.email,
      });
      const formatted = normalizeDisplayName(res.user.name, res.user.email);
      setUserName(formatted);
      setFormData((prev) => ({ ...prev, name: formatted, email: res.user.email }));
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Could not save details");
    }
  };

  const resetAddressEditor = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      full_name: userName,
      is_default: addresses.length === 0,
    });
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label || "Home",
      full_name: address.full_name || userName,
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      postal_code: address.postal_code || "",
      country: address.country || "India",
      phone: address.phone || "",
      is_default: Boolean(address.is_default),
    });
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      toast.error("Line 1, city, and state are required");
      return;
    }
    if (!addressForm.postal_code.trim()) {
      toast.error("Postal code is required");
      return;
    }

    setAddressSaving(true);
    try {
      const payload = {
        label: addressForm.label.trim() || "Home",
        full_name: addressForm.full_name.trim() || userName,
        line1: addressForm.line1.trim(),
        line2: addressForm.line2.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: addressForm.country.trim() || "India",
        phone: addressForm.phone.trim(),
        is_default: addressForm.is_default,
      };

      if (editingAddressId) {
        await updateAddress(editingAddressId, payload);
        toast.success("Address updated");
      } else {
        await createAddress(payload);
        toast.success("Address added");
      }

      await loadAddresses();
      resetAddressEditor();
    } catch (err: any) {
      toast.error(err?.message || "Could not save address");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!window.confirm("Delete this address?")) return;
    setAddressSaving(true);
    try {
      await deleteAddress(addressId);
      toast.success("Address deleted");
      await loadAddresses();
      if (editingAddressId === addressId) resetAddressEditor();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete address");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    setAddressSaving(true);
    try {
      await updateAddress(addressId, { is_default: true });
      toast.success("Default address updated");
      await loadAddresses();
    } catch (err: any) {
      toast.error(err?.message || "Could not set default address");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleAddGarageVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageVehicleId) {
      toast.error("Select a vehicle to save");
      return;
    }
    setGarageSaving(true);
    try {
      const res = await createGarageEntry({
        vehicle_id: Number(garageVehicleId),
        nickname: garageNickname.trim() || undefined,
      });
      if (res.created) {
        toast.success("Vehicle saved to My Garage");
      } else {
        toast("Vehicle already in My Garage. Updated details.");
      }
      setGarageNickname("");
      await loadGarage();
    } catch (err: any) {
      toast.error(err?.message || "Could not save vehicle");
    } finally {
      setGarageSaving(false);
    }
  };

  const handleSetDefaultGarage = async (garageId: number) => {
    setGarageSaving(true);
    try {
      await updateGarageEntry(garageId, { is_default: true });
      toast.success("Default vehicle updated");
      await loadGarage();
    } catch (err: any) {
      toast.error(err?.message || "Could not update default vehicle");
    } finally {
      setGarageSaving(false);
    }
  };

  const handleDeleteGarageVehicle = async (garageId: number) => {
    if (!window.confirm("Remove this vehicle from My Garage?")) return;
    setGarageSaving(true);
    try {
      await deleteGarageEntry(garageId);
      toast.success("Vehicle removed from My Garage");
      await loadGarage();
    } catch (err: any) {
      toast.error(err?.message || "Could not remove vehicle");
    } finally {
      setGarageSaving(false);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await logoutAuth();
    } catch {
      // best effort
    }
    toast.success("Logged out securely");
    router.push("/");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordSaving) return;
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await changePassword({
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword,
      });
      toast.success(res.message || "Password updated");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
        <p className="text-slate-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-theme relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--secondary))_48%,hsl(var(--background))_100%)] dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{userName} Profile</h1>
        <p className="text-slate-400 text-lg">
          Manage your details, addresses, orders, and account settings.
        </p>
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
          >
            Open Admin Dashboard
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-6 mb-6 flex flex-col items-center shadow-lg">
            <div className="w-24 h-24 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-inner mb-4">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white">{userName}</h2>
            <p className="text-slate-400 text-sm">AutoMart Member</p>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { key: "details", label: "Account Details", icon: <User size={20} /> },
              { key: "addresses", label: "Saved Addresses", icon: <MapPin size={20} /> },
              { key: "orders", label: "Order History", icon: <Package size={20} /> },
              { key: "saved", label: "Saved Vehicles", icon: <Heart size={20} /> },
              { key: "settings", label: "Settings", icon: <Settings size={20} /> },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as TabKey)}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeTab === item.key
                    ? "bg-primary/20 text-primary font-semibold border border-primary/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                {activeTab === item.key && <ChevronRight size={18} />}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-4 mt-8 w-full rounded-xl text-carRed hover:bg-carRed/10 transition-all font-bold"
            >
              <LogOut size={20} />
              Logout
            </button>
          </nav>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === "details" && (
            <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(
                  [
                    { key: "name", label: "Full Name" },
                    { key: "email", label: "Email Address" },
                    { key: "phone", label: "Phone Number" },
                    { key: "address", label: "Default Shipping Address" },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
                    {isEditing && field.key !== "address" ? (
                      <input
                        className="w-full bg-slate-900 border border-primary/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                        value={formData[field.key]}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <div className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white">
                        {formData[field.key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                {isEditing ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 text-slate-400 hover:text-white font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg"
                    >
                      Save Details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-primary/20 text-primary font-bold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-6">
              <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  {editingAddressId ? "Edit Address" : "Add New Address"}
                </h3>
                <form onSubmit={handleSaveAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={addressForm.label}
                    onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Label (Home/Work)"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                  />
                  <input
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Full Name"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                  />
                  <input
                    value={addressForm.line1}
                    onChange={(e) => setAddressForm((p) => ({ ...p, line1: e.target.value }))}
                    placeholder="Address Line 1"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white md:col-span-2"
                    required
                  />
                  <input
                    value={addressForm.line2}
                    onChange={(e) => setAddressForm((p) => ({ ...p, line2: e.target.value }))}
                    placeholder="Address Line 2 (Optional)"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white md:col-span-2"
                  />
                  <input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                    required
                  />
                  <input
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}
                    placeholder="State"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                    required
                  />
                  <input
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm((p) => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Postal Code"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                    required
                  />
                  <input
                    value={addressForm.country}
                    onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Country"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                  />
                  <input
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white md:col-span-2"
                  />

                  <label className="md:col-span-2 flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm((p) => ({ ...p, is_default: e.target.checked }))}
                    />
                    Set as default address
                  </label>

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={addressSaving}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
                    >
                      {addressSaving ? "Saving..." : editingAddressId ? "Update Address" : "Add Address"}
                    </button>
                    {editingAddressId && (
                      <button
                        type="button"
                        onClick={resetAddressEditor}
                        className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-semibold"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  Saved Addresses
                </h3>
                {addressLoading && <p className="text-slate-300">Loading addresses...</p>}
                {!addressLoading && addresses.length === 0 && (
                  <p className="text-slate-400">No addresses saved yet.</p>
                )}
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="rounded-xl border border-white/10 bg-slate-900/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">
                            {address.label} {address.is_default ? "(Default)" : ""}
                          </p>
                          <p className="text-slate-300 text-sm">{address.full_name}</p>
                          <p className="text-slate-400 text-sm mt-1">{formatAddressOneLine(address)}</p>
                          <p className="text-slate-400 text-xs mt-1">{address.phone || "No phone"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!address.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(address.id)}
                              disabled={addressSaving}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditAddress(address)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            disabled={addressSaving}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {defaultAddress && (
                  <p className="text-slate-400 text-sm mt-4">
                    Current default: <span className="text-slate-200">{formatAddressOneLine(defaultAddress)}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Order History
              </h3>
              <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl">
                <p className="text-slate-300 mb-4">
                  Open your real order history with status, totals, and item-level details.
                </p>
                <Link
                  href="/orders"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
                >
                  Open My Orders
                </Link>
              </div>
            </div>
          )}

          {activeTab === "saved" && (
            <div className="space-y-6">
              <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  Add Vehicle to My Garage
                </h3>
                <form onSubmit={handleAddGarageVehicle} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={garageVehicleId}
                    onChange={(e) => setGarageVehicleId(e.target.value)}
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white md:col-span-2"
                  >
                    {garageVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={String(vehicle.id)}>
                        {vehicle.display_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={garageNickname}
                    onChange={(e) => setGarageNickname(e.target.value)}
                    placeholder="Nickname (optional)"
                    className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                  />
                  <div className="md:col-span-3 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={garageSaving || garageVehicles.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
                    >
                      {garageSaving ? "Saving..." : "Save Vehicle"}
                    </button>
                    <Link
                      href="/vehicle-search"
                      className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-semibold"
                    >
                      Open Vehicle Search
                    </Link>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                  My Garage Vehicles
                </h3>
                {garageLoading && <p className="text-slate-300">Loading garage vehicles...</p>}
                {!garageLoading && garageEntries.length === 0 && (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-white mb-2">No Saved Vehicles Yet</h4>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">
                      Save your frequently used vehicles for faster spare-parts shopping.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {garageEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-slate-900/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">
                            {entry.nickname?.trim() || entry.vehicle?.display_name || "Vehicle"}{" "}
                            {entry.is_default ? "(Default)" : ""}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {entry.vehicle?.display_name || `Vehicle ID ${entry.vehicle_id}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!entry.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultGarage(entry.id)}
                              disabled={garageSaving}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300"
                            >
                              Set Default
                            </button>
                          )}
                          <Link
                            href={`/vehicle/${entry.vehicle_id}`}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary/20 text-primary"
                          >
                            Shop Parts
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteGarageVehicle(entry.id)}
                            disabled={garageSaving}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Application Settings
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-2xl border border-white/5">
                  <div>
                    <h4 className="text-white font-bold mb-1">Email Notifications</h4>
                    <p className="text-sm text-slate-400">Receive order and offer updates.</p>
                  </div>
                  <button
                    className="px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => toast.success("Preferences updated")}
                  >
                    Update
                  </button>
                </div>

                <div className="p-4 bg-slate-900/30 rounded-2xl border border-white/5">
                  <div className="mb-4">
                    <h4 className="text-white font-bold mb-1">Security - Change Password</h4>
                    <p className="text-sm text-slate-400">
                      Update your account password with your current password.
                    </p>
                  </div>
                  <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                      }
                      placeholder="Current password"
                      className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                      autoComplete="current-password"
                      required
                    />
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="New password"
                      className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Confirm new password"
                      className="rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
                      >
                        {passwordSaving ? "Updating Password..." : "Change Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
