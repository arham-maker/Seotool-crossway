import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  // Validate NEXTAUTH_SECRET is set
  const secret = process.env.NEXTAUTH_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  
  // In production, require proper secret
  if (isProduction && (!secret || secret === "your-secret-key-change-in-production")) {
    console.error("NEXTAUTH_SECRET is not properly configured");
    return new NextResponse("Server configuration error", { status: 500 });
  }
  
  // In development, warn but allow with fallback
  if (!isProduction && (!secret || secret === "your-secret-key-change-in-production")) {
    console.warn("⚠ NEXTAUTH_SECRET is not properly configured. Using fallback for development only.");
  }

  const token = await getToken({ 
    req, 
    secret: secret || "development-secret-change-in-production" 
  });
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to home
  if (token && isPublicRoute && pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

