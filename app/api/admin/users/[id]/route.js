import { requireSuperAdmin } from "../../../../../lib/middleware/auth";
import { getUserById, updateUser, deleteUser, assignSiteLink, assignAccessibleSites } from "../../../../../lib/auth";
import { ROLES } from "../../../../../lib/rbac";

// GET /api/admin/users/[id] - Get user by ID (Super Admin only)
export async function GET(req, { params }) {
  try {
    await requireSuperAdmin();
    
    const { id } = await params;
    const user = await getUserById(id);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Remove password from response
    const { password, ...userData } = user;
    
    return new Response(
      JSON.stringify({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
          siteLink: user.siteLink || null,
          accessibleSites: user.accessibleSites || [],
          isActive: user.isActive !== false,
          emailVerified: user.emailVerified || false,
          status: user.status || (user.emailVerified ? "active" : "pending"),
          emailVerifiedAt: user.emailVerifiedAt || null,
          createdAt: user.createdAt,
          createdBy: user.createdBy || null,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (Super Admin only)
export async function PATCH(req, { params }) {
  try {
    await requireSuperAdmin();
    
    const { id } = await params;
    const body = await req.json();
    
    // Don't allow changing to super_admin role through API
    if (body.role === ROLES.SUPER_ADMIN) {
      return new Response(
        JSON.stringify({ error: "Cannot assign super_admin role through API" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Validate role if provided
    if (body.role) {
      const validRoles = [ROLES.USER, ROLES.VIEWER];
      if (!validRoles.includes(body.role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Handle site link assignment
    if (body.siteLink !== undefined) {
      if (body.siteLink) {
        await assignSiteLink(id, body.siteLink);
      }
      delete body.siteLink; // Remove from update body
    }
    
    // Handle accessible sites for viewers
    if (body.accessibleSites !== undefined && body.role === ROLES.VIEWER) {
      await assignAccessibleSites(id, body.accessibleSites);
      delete body.accessibleSites; // Remove from update body
    }
    
    const updated = await updateUser(id, body);
    
    if (!updated) {
      return new Response(
        JSON.stringify({ error: "User not found or no changes made" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const user = await getUserById(id);
    
    return new Response(
      JSON.stringify({
        message: "User updated successfully",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
          siteLink: user.siteLink || null,
          accessibleSites: user.accessibleSites || [],
          isActive: user.isActive !== false,
          emailVerified: user.emailVerified || false,
          status: user.status || (user.emailVerified ? "active" : "pending"),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (Super Admin only)
export async function DELETE(req, { params }) {
  try {
    const session = await requireSuperAdmin();
    
    const { id } = await params;
    
    // Prevent self-deletion
    if (id === session.user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const deleted = await deleteUser(id);
    
    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ message: "User deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

