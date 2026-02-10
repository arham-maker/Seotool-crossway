"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  FiUsers, 
  FiUserPlus, 
  FiEdit, 
  FiTrash2, 
  FiEye, 
  FiEyeOff,
  FiSave,
  FiX,
  FiSearch,
  FiShield,
  FiLink,
  FiMail,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw
} from "react-icons/fi";

const ROLES = {
  SUPER_ADMIN: "super_admin",
  USER: "user",
  VIEWER: "viewer",
};

export default function AdminSection() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
    siteLink: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users?includeInactive=true");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setShowCreateModal(false);
      setFormData({ email: "", password: "", name: "", role: "user", siteLink: "" });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          siteLink: formData.siteLink,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setEditingUser(null);
      setFormData({ email: "", password: "", name: "", role: "user", siteLink: "" });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      role: user.role || "user",
      siteLink: user.siteLink || "",
      isActive: user.isActive !== false,
    });
  };

  const [resendingFor, setResendingFor] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleResendVerification = async (userId) => {
    setResendingFor(userId);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/resend-verification`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      setSuccessMessage(data.message || "Verification email resent.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendingFor(null);
    }
  };

  const [cleaningUp, setCleaningUp] = useState(false);

  const handleCleanup = async () => {
    if (!confirm("This will permanently delete all unverified users older than 7 days. Continue?")) {
      return;
    }

    setCleaningUp(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Cleanup failed");
      }

      setSuccessMessage(data.message);
      setTimeout(() => setSuccessMessage(""), 5000);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCleaningUp(false);
    }
  };

  const getStatusBadge = (user) => {
    if (user.emailVerified || user.status === "active") {
      return {
        label: "Verified",
        icon: FiCheckCircle,
        classes: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      };
    }
    if (user.status === "pending" || user.emailVerified === false) {
      return {
        label: "Pending",
        icon: FiClock,
        classes: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      };
    }
    if (!user.isActive) {
      return {
        label: "Inactive",
        icon: FiEyeOff,
        classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      };
    }
    return {
      label: "Active",
      icon: FiEye,
      classes: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.role && user.role.toLowerCase().includes(searchLower))
    );
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case ROLES.USER:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case ROLES.VIEWER:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-black">User Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-700 mt-1">
            Manage users, roles, and site access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanup}
            disabled={cleaningUp}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-200 hover:bg-gray-200 dark:hover:bg-gray-300 text-gray-700 dark:text-gray-800 rounded-xl font-semibold transition-colors disabled:opacity-50"
            title="Delete unverified users older than 7 days"
          >
            <FiRefreshCw className={`w-4 h-4 ${cleaningUp ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Cleanup Pending</span>
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({ email: "", password: "", name: "", role: "user", siteLink: "" });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-[#0EFF2A] hover:bg-[#0BCC22] text-white rounded-xl font-semibold transition-colors shadow-lg shadow-[#0EFF2A]/20"
          >
            <FiUserPlus className="w-5 h-5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search users by email, name, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-50 rounded-2xl border border-gray-200 dark:border-gray-300 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-100 dark:to-gray-200/50 border-b border-gray-200 dark:border-gray-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-800 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-800 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-800 uppercase tracking-wider">
                  Site Link
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-800 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-800 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-100/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-black">
                          {user.name || "No name"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-700">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role === ROLES.SUPER_ADMIN && <FiShield className="w-3 h-3 mr-1" />}
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.siteLink ? (
                        <div className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-800">
                          <FiLink className="w-4 h-4" />
                          <span className="truncate max-w-xs">{user.siteLink}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No site assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const badge = getStatusBadge(user);
                        const BadgeIcon = badge.icon;
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                          >
                            <BadgeIcon className="w-3 h-3 mr-1" />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Resend verification button for pending users */}
                        {(user.status === "pending" || user.emailVerified === false) && user.role !== "super_admin" && (
                          <button
                            onClick={() => handleResendVerification(user.id)}
                            disabled={resendingFor === user.id}
                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Resend verification email"
                          >
                            {resendingFor === user.id ? (
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiMail className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        {user.id !== session?.user?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-black">
                {editingUser ? "Edit User" : "Create New User"}
              </h3>
            </div>
            <form
              onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-800 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required={!editingUser}
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black disabled:bg-gray-100 dark:disabled:bg-gray-200"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-800 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-800 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-800 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black"
                >
                  <option value="user">User</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-800 mb-2">
                  Site Link
                </label>
                <input
                  type="url"
                  value={formData.siteLink}
                  onChange={(e) => setFormData({ ...formData, siteLink: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black"
                />
              </div>

              {editingUser && (
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#0EFF2A] border-gray-300 rounded focus:ring-[#0EFF2A]"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-800">
                      Active
                    </span>
                  </label>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-[#0EFF2A] hover:bg-[#0BCC22] text-white rounded-xl font-semibold transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{editingUser ? "Update" : "Create"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                    setFormData({ email: "", password: "", name: "", role: "user", siteLink: "" });
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-200 hover:bg-gray-200 dark:hover:bg-gray-300 text-gray-700 dark:text-gray-800 rounded-xl font-semibold transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

