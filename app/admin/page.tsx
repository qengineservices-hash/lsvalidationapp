"use client";

import { useState } from "react";
import { useAuthStore, ROLE_LABELS, type UserRole } from "@/stores/useAuthStore";
import { useAppDataStore, type City } from "@/stores/useAppDataStore";
import type { AppUser } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import {
  Users,
  Link2,
  MapPin,
  FileText,
  Plus,
  Trash2,
  UserPlus,
  Building2,
  LayoutGrid,
  Table,
  FileDown
} from "lucide-react";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import TableView from "@/components/dashboard/TableView";
import { exportGlobalTracker } from "@/lib/exportTracker";

// ===================================================
// TAB DEFINITIONS
// ===================================================
const TABS = [
  { key: "users", label: "Users", icon: Users },
  { key: "cities", label: "Cities", icon: Building2 },
  { key: "vm-vl", label: "VM ↔ VL Tagging", icon: Link2 },
  { key: "vl-city", label: "User ↔ City", icon: MapPin },
  { key: "requests", label: "All Requests", icon: FileText },
];

export default function AdminPanel() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState("users");

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-red-600 font-bold">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-livspace-dark">Admin Panel</h1>
        <p className="text-sm text-livspace-gray-500">
          Manage users, cities, assignments, and view all requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-livspace-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === tab.key
                ? "border-livspace-orange text-livspace-orange"
                : "border-transparent text-livspace-gray-400 hover:text-livspace-gray-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "cities" && <CitiesTab />}
      {activeTab === "vm-vl" && <VmVlTab />}
      {activeTab === "vl-city" && <VlCityTab />}
      {activeTab === "requests" && <AllRequestsTab />}
    </div>
  );
}

// ===================================================
// CITIES TAB
// ===================================================
function CitiesTab() {
  const { cities, addCity, updateCity, deleteCity } = useAppDataStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });

  const handleAdd = () => {
    if (!form.name.trim() || !form.code.trim()) {
      alert("City name and code are required.");
      return;
    }
    if (cities.some((c) => c.code.toUpperCase() === form.code.toUpperCase())) {
      alert("City code already exists.");
      return;
    }
    addCity({
      id: "city_" + Date.now(),
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      is_active: true,
    });
    setForm({ name: "", code: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-livspace-dark">Cities ({cities.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add City
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-livspace-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="City Name (e.g. Pune)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
            <input
              type="text"
              placeholder="Code (e.g. PUN)"
              maxLength={5}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-livspace-blue text-white text-xs font-bold rounded-lg">
              Save City
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-livspace-gray-600 border rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-livspace-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-livspace-gray-50 border-b border-livspace-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">City</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Code</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.id} className="border-b border-livspace-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-livspace-dark">{city.name}</td>
                <td className="px-4 py-3 text-livspace-gray-500 text-xs font-mono">{city.code}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full",
                    city.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {city.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => updateCity(city.id, { is_active: !city.is_active })}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded",
                      city.is_active ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                    )}
                  >
                    {city.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete ${city.name}?`)) deleteCity(city.id); }}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================================================
// USERS TAB — with city assignment during creation
// ===================================================
function UsersTab() {
  const { users, cities, addUser, updateUser, assignUserToCity, userCities } = useAppDataStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", role: "designer" as UserRole, city_id: "" });

  const handleAdd = () => {
    if (!form.email.endsWith("@livspace.com")) {
      alert("Only @livspace.com emails are allowed.");
      return;
    }
    if (!form.full_name.trim()) {
      alert("Full name is required.");
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      alert("User with this email already exists.");
      return;
    }

    const userId = "user_" + Date.now();
    addUser({
      id: userId,
      email: form.email.toLowerCase().trim(),
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      is_active: true,
    });

    // Auto-assign city if selected
    if (form.city_id) {
      assignUserToCity({ id: "uc_" + Date.now(), user_id: userId, city_id: form.city_id });
    }

    setForm({ email: "", full_name: "", phone: "", role: "designer", city_id: "" });
    setShowForm(false);
  };

  // Helper: get cities assigned to a user
  const getUserCities = (userId: string) => {
    const cityIds = userCities.filter((uc) => uc.user_id === userId).map((uc) => uc.city_id);
    return cities.filter((c) => cityIds.includes(c.id)).map((c) => c.name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-livspace-dark">All Users ({users.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="bg-white border border-livspace-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="email@livspace.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange bg-white"
            >
              <option value="designer">Designer</option>
              <option value="validation_lead">Validation Lead</option>
              <option value="validation_manager">Validation Manager</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={form.city_id}
              onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}
              className="border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange bg-white sm:col-span-2"
            >
              <option value="">— Assign City (optional) —</option>
              {cities.filter((c) => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-livspace-blue text-white text-xs font-bold rounded-lg">
              Save User
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-livspace-gray-600 border rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-xl border border-livspace-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-livspace-gray-50 border-b border-livspace-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Role</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">City</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => !u.is_deleted).map((user) => {
                const assignedCities = getUserCities(user.id);
                return (
                  <tr key={user.id} className="border-b border-livspace-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-livspace-dark">{user.full_name}</td>
                    <td className="px-4 py-3 text-livspace-gray-500 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={user.email === "qengine_services@livspace.com"}
                        onChange={(e) => {
                          updateUser(user.id, { role: e.target.value as UserRole });
                          alert(`Role for ${user.full_name} changed to ${ROLE_LABELS[e.target.value as UserRole] || e.target.value}`);
                        }}
                        className={cn(
                          "text-xs border border-livspace-gray-200 rounded px-2 py-1 bg-white",
                          user.email === "qengine_services@livspace.com" && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <option value="designer">Designer</option>
                        <option value="validation_lead">Validation Lead</option>
                        <option value="validation_manager">Validation Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {assignedCities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedCities.map((c) => (
                            <span key={c} className="text-[9px] font-bold bg-blue-50 text-livspace-blue px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-livspace-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full",
                        user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                        disabled={user.email === "qengine_services@livspace.com"}
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded",
                          user.email === "qengine_services@livspace.com"
                            ? "text-livspace-gray-300 cursor-not-allowed"
                            : user.is_active
                            ? "text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        )}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${user.full_name}?`)) updateUser(user.id, { is_deleted: true }); }}
                        disabled={user.email === "qengine_services@livspace.com"}
                        title="Soft delete user"
                        className={cn(
                          "text-red-500 hover:bg-red-50 p-1 rounded",
                          user.email === "qengine_services@livspace.com" && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================================================
// VM-VL TAGGING TAB
// ===================================================
function VmVlTab() {
  const { users, vmVlAssignments, assignVlToVm, removeVlFromVm, getUsersByRole } = useAppDataStore();
  const [selectedVm, setSelectedVm] = useState("");
  const [selectedVl, setSelectedVl] = useState("");

  const vms = getUsersByRole("validation_manager");
  const vls = getUsersByRole("validation_lead");

  const handleAssign = () => {
    if (!selectedVm || !selectedVl) return;
    if (vmVlAssignments.some((a) => a.vm_id === selectedVm && a.vl_id === selectedVl)) {
      alert("This VL is already assigned to this VM.");
      return;
    }
    assignVlToVm({
      id: "vmvl_" + Date.now(),
      vm_id: selectedVm,
      vl_id: selectedVl,
      is_active: true,
    });
    setSelectedVl("");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-livspace-dark">VM ↔ VL Assignments</h3>

      <div className="bg-white border border-livspace-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Validation Manager</label>
          <select value={selectedVm} onChange={(e) => setSelectedVm(e.target.value)} className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Select VM</option>
            {vms.map((vm) => <option key={vm.id} value={vm.id}>{vm.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">Validation Lead</label>
          <select value={selectedVl} onChange={(e) => setSelectedVl(e.target.value)} className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Select VL</option>
            {vls.map((vl) => <option key={vl.id} value={vl.id}>{vl.full_name}</option>)}
          </select>
        </div>
        <button onClick={handleAssign} className="px-4 py-2 bg-livspace-blue text-white text-xs font-bold rounded-lg">
          Assign
        </button>
      </div>

      <div className="space-y-2">
        {vmVlAssignments.length === 0 ? (
          <p className="text-sm text-livspace-gray-400 py-4 text-center">No assignments yet.</p>
        ) : (
          vmVlAssignments.map((a) => {
            const vm = users.find((u) => u.id === a.vm_id);
            const vl = users.find((u) => u.id === a.vl_id);
            return (
              <div key={a.id} className="flex items-center justify-between bg-white border border-livspace-gray-200 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-bold text-purple-700">{vm?.full_name || "?"}</span>
                  <span className="text-livspace-gray-400 mx-2">→</span>
                  <span className="font-bold text-green-700">{vl?.full_name || "?"}</span>
                </div>
                <button onClick={() => removeVlFromVm(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ===================================================
// VL-CITY TAGGING TAB
// ===================================================
function VlCityTab() {
  const { users, cities, userCities, assignUserToCity, removeUserFromCity, getUsersByRole } = useAppDataStore();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");

  const vls = getUsersByRole("validation_lead");
  const vms = getUsersByRole("validation_manager");
  const assignableUsers = [...vls, ...vms];

  const handleAssign = () => {
    if (!selectedUser || !selectedCityId) return;
    if (userCities.some((uc) => uc.user_id === selectedUser && uc.city_id === selectedCityId)) {
      alert("Already assigned to this city.");
      return;
    }
    assignUserToCity({ id: "uc_" + Date.now(), user_id: selectedUser, city_id: selectedCityId });
    setSelectedCityId("");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-livspace-dark">User ↔ City Assignments</h3>

      <div className="bg-white border border-livspace-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">User (VL / VM)</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Select User</option>
            {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role]})</option>)}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">City</label>
          <select value={selectedCityId} onChange={(e) => setSelectedCityId(e.target.value)} className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Select City</option>
            {cities.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={handleAssign} className="px-4 py-2 bg-livspace-blue text-white text-xs font-bold rounded-lg">
          Assign
        </button>
      </div>

      <div className="space-y-2">
        {userCities.length === 0 ? (
          <p className="text-sm text-livspace-gray-400 py-4 text-center">No city assignments yet.</p>
        ) : (
          userCities.map((uc) => {
            const user = users.find((u) => u.id === uc.user_id);
            const city = cities.find((c) => c.id === uc.city_id);
            return (
              <div key={uc.id} className="flex items-center justify-between bg-white border border-livspace-gray-200 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-bold text-livspace-dark">{user?.full_name || "?"}</span>
                  <span className="text-livspace-gray-400 mx-2">→</span>
                  <span className="font-bold text-livspace-blue">{city?.name || "?"}</span>
                </div>
                <button onClick={() => removeUserFromCity(uc.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ===================================================
// ALL REQUESTS TAB
// ===================================================
function AllRequestsTab() {
  const { validationRequests } = useAppDataStore();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-livspace-dark">
          All Requests ({validationRequests.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-livspace-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("card")}
              className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "card" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "table" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => exportGlobalTracker(validationRequests, `Global_Tracker_${new Date().toISOString().split('T')[0]}.csv`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Download CSV
          </button>
        </div>
      </div>
      
      {viewMode === "card" ? (
        <StatusBuckets 
          requests={validationRequests} 
          showAssignee 
          getActionHref={(r) => `/validation-lead/validate/${r.id}`}
        />
      ) : (
        <TableView requests={validationRequests} />
      )}
    </div>
  );
}
