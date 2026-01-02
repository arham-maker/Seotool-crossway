import clientPromise from "../../../lib/db";
import { isProduction } from "../../../lib/env";

/**
 * Health check endpoint
 * GET /api/health
 * Returns the health status of the application
 */
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "0.1.0",
    checks: {
      database: "unknown",
    },
  };

  // Check database connection (non-blocking)
  try {
    const client = await clientPromise;
    await client.db().admin().ping();
    health.checks.database = "connected";
  } catch (error) {
    health.checks.database = "disconnected";
    health.status = "degraded";
    
    if (!isProduction()) {
      health.error = error.message;
    }
  }

  const statusCode = health.status === "healthy" ? 200 : 503;

  return new Response(JSON.stringify(health), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

