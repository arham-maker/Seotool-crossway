import { requireAuth, canAccess } from "../../../../lib/middleware/auth";
import { getReportById, deleteReport } from "../../../../lib/reports";
import { isSuperAdmin, ROLES } from "../../../../lib/rbac";
import clientPromise from "../../../../lib/db";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Report ID is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let report;
    
    // Super admin can access any report
    if (isSuperAdmin(session.user.role)) {
      const client = await clientPromise;
      const db = client.db();
      const reportsCollection = db.collection("reports");
      
      const reportDoc = await reportsCollection.findOne({
        _id: new ObjectId(id),
      });
      
      if (!reportDoc) {
        return new Response(
          JSON.stringify({ error: "Report not found." }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // Convert MongoDB document to report format
      let pdfBuffer = reportDoc.pdfBuffer;
      if (pdfBuffer && typeof pdfBuffer === 'object' && pdfBuffer.buffer) {
        pdfBuffer = Buffer.from(pdfBuffer.buffer);
      } else if (!Buffer.isBuffer(pdfBuffer)) {
        pdfBuffer = Buffer.from(pdfBuffer);
      }
      
      report = {
        id: reportDoc._id.toString(),
        url: reportDoc.url,
        pdfBuffer: pdfBuffer,
        generatedAt: reportDoc.generatedAt,
      };
    } else {
      // Regular users and viewers can only access their own reports
      report = await getReportById(id, session.user.id);

      if (!report) {
        return new Response(
          JSON.stringify({ error: "Report not found." }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Ensure pdfBuffer is a proper Buffer, then convert to Uint8Array for Response
    let pdfBuffer = report.pdfBuffer;
    if (!Buffer.isBuffer(pdfBuffer)) {
      pdfBuffer = Buffer.from(pdfBuffer);
    }
    const pdfArray = new Uint8Array(pdfBuffer);

    return new Response(pdfArray, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pagespeed-report-${id}.pdf"`,
        "Content-Length": String(pdfArray.length),
      },
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const errorMessage = err?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to fetch report:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to fetch report.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "An error occurred while fetching the report.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await requireAuth();
    
    // Viewers cannot delete reports
    if (session.user.role === ROLES.VIEWER) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Viewers cannot delete reports." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Report ID is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let deleted;
    
    // Super admin can delete any report
    if (isSuperAdmin(session.user.role)) {
      const client = await clientPromise;
      const db = client.db();
      const reportsCollection = db.collection("reports");
      
      const result = await reportsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      
      deleted = result.deletedCount > 0;
    } else {
      // Regular users can only delete their own reports
      deleted = await deleteReport(id, session.user.id);
    }

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Report not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Report deleted successfully." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    if (err.message === "Unauthorized") {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    if (err.message.includes("Forbidden")) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const errorMessage = err?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to delete report:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to delete report.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "An error occurred while deleting the report.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

