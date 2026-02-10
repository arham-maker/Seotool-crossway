import crypto from "crypto";
import { requireSuperAdmin } from "../../../../lib/middleware/auth";
import { getAllUsers, createUser, hashPassword, getUserByEmail, hashToken, createEmailVerificationToken } from "../../../../lib/auth";
import { ROLES } from "../../../../lib/rbac";
import { sendVerificationEmail } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";

// GET /api/admin/users - Get all users (Super Admin only)
export async function GET(req) {
  try {
    await requireSuperAdmin();
    
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
    const users = await getAllUsers(includeInactive);
    
    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
      JSON.stringify({ error: error.message || "Failed to fetch users" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// POST /api/admin/users - Create a new user (Super Admin only)
export async function POST(req) {
  try {
    const session = await requireSuperAdmin();
    
    const body = await req.json();
    const { email, password, name, role = "user", siteLink = null } = body;
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Validate role
    const validRoles = [ROLES.USER, ROLES.VIEWER];
    if (role && !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const hashedPassword = await hashPassword(password);
    const user = await createUser(
      email,
      hashedPassword,
      name || null,
      role,
      siteLink,
      session.user.id
    );

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedTokenValue = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await createEmailVerificationToken(email, hashedTokenValue, expiresAt.toISOString());

    // Send verification email (use raw token in URL, hashed in DB)
    const emailSent = await sendVerificationEmail(email, name || null, rawToken);

    logger.info("User created by admin with verification email", {
      userId: user.id,
      email,
      emailSent,
      createdBy: session.user.id,
    });

    return new Response(
      JSON.stringify({ 
        message: emailSent 
          ? "User created successfully. Verification email sent." 
          : "User created successfully. Failed to send verification email — you can resend it from the admin panel.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          siteLink: user.siteLink,
          emailVerified: user.emailVerified,
          status: user.status,
        },
        emailSent,
      }),
      {
        status: 201,
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
      JSON.stringify({ error: error.message || "Failed to create user" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

