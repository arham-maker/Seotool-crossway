import { ObjectId } from "mongodb";
import clientPromise from "./db";

/**
 * Save a report to the database
 * @param {string} userId - The user ID
 * @param {string} url - The tested URL
 * @param {Object} reportData - The full report data (pagespeed, etc.)
 * @param {Buffer} pdfBuffer - The PDF buffer
 * @returns {Promise<Object>} The saved report
 */
export async function saveReport(userId, url, reportData, pdfBuffer) {
  const client = await clientPromise;
  const db = client.db();
  const reportsCollection = db.collection("reports");

  // Extract performance summary
  const performanceScore = reportData.pagespeed?.performanceScore ?? null;
  const seoScore = reportData.pagespeed?.seoScore ?? null;
  const accessibilityScore = reportData.pagespeed?.accessibilityScore ?? null;

  const report = {
    userId,
    url,
    reportData,
    pdfBuffer: Buffer.from(pdfBuffer),
    performanceScore,
    seoScore,
    accessibilityScore,
    generatedAt: new Date(),
    createdAt: new Date(),
  };

  const result = await reportsCollection.insertOne(report);

  return {
    id: result.insertedId.toString(),
    userId,
    url,
    performanceScore,
    seoScore,
    accessibilityScore,
    generatedAt: report.generatedAt,
  };
}

/**
 * Get all reports for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of reports
 */
export async function getUserReports(userId) {
  const client = await clientPromise;
  const db = client.db();
  const reportsCollection = db.collection("reports");

  const reports = await reportsCollection
    .find(
      { userId },
      {
        projection: {
          pdfBuffer: 0, // Exclude PDF buffer from list view
        },
      }
    )
    .sort({ generatedAt: -1 }) // Most recent first
    .toArray();

  return reports.map((report) => ({
    id: report._id.toString(),
    url: report.url,
    performanceScore: report.performanceScore,
    seoScore: report.seoScore,
    accessibilityScore: report.accessibilityScore,
    generatedAt: report.generatedAt,
  }));
}

/**
 * Get a report by ID (with PDF buffer)
 * @param {string} reportId - The report ID
 * @param {string} userId - The user ID (for security)
 * @returns {Promise<Object|null>} The report with PDF buffer
 */
export async function getReportById(reportId, userId) {
  const client = await clientPromise;
  const db = client.db();
  const reportsCollection = db.collection("reports");

  const report = await reportsCollection.findOne({
    _id: new ObjectId(reportId),
    userId,
  });

  if (!report) {
    return null;
  }

  // MongoDB stores Buffer as Binary (BSON), need to convert it properly
  let pdfBuffer = report.pdfBuffer;
  
  // Handle MongoDB Binary object (BSON) - MongoDB Binary has a .buffer property
  if (pdfBuffer && typeof pdfBuffer === 'object') {
    // Check if it's a MongoDB Binary object (has buffer property)
    if (pdfBuffer.buffer) {
      pdfBuffer = Buffer.from(pdfBuffer.buffer);
    }
    // Check if it's already a Buffer
    else if (Buffer.isBuffer(pdfBuffer)) {
      // Already a Buffer, keep it as is
    }
    // Try to convert if it's array-like (Uint8Array, etc.)
    else if (Array.isArray(pdfBuffer) || (pdfBuffer.length !== undefined && typeof pdfBuffer.length === 'number')) {
      pdfBuffer = Buffer.from(pdfBuffer);
    }
  }
  
  // Final check: ensure it's a Buffer
  if (!Buffer.isBuffer(pdfBuffer)) {
    pdfBuffer = Buffer.from(pdfBuffer);
  }

  return {
    id: report._id.toString(),
    url: report.url,
    pdfBuffer: pdfBuffer,
    generatedAt: report.generatedAt,
  };
}

/**
 * Delete a report by ID
 * @param {string} reportId - The report ID
 * @param {string} userId - The user ID (for security)
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteReport(reportId, userId) {
  const client = await clientPromise;
  const db = client.db();
  const reportsCollection = db.collection("reports");

  const result = await reportsCollection.deleteOne({
    _id: new ObjectId(reportId),
    userId,
  });

  return result.deletedCount > 0;
}

