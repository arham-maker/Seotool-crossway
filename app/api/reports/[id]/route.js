import { getServerSession } from "next-auth";
import { getReportById, deleteReport } from "../../../../lib/reports";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req, { params }) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please log in." }),
      {
        status: 401,
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

  try {
    const report = await getReportById(id, session.user.id);

    if (!report) {
      return new Response(
        JSON.stringify({ error: "Report not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
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
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please log in." }),
      {
        status: 401,
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

  try {
    const deleted = await deleteReport(id, session.user.id);

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

