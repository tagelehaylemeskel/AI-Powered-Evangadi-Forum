import { StatusCodes } from "http-status-codes";
import { cloudinary } from "../../../middleware/rag.upload.config.js";
import {
  listDocumentsForUserService,
  getDocumentMetaService,
  assertOwnedDocument,
  createDocumentFromUploadService,
  searchInDocumentService,
  queryDocumentService,
  deleteDocumentService,
} from "../service/rag.service.js";

const getCloudinaryPublicIdFromUrl = (storagePath) => {
  const uploadIndex = storagePath.indexOf("/upload/");
  if (uploadIndex === -1) {
    throw new Error("Invalid Cloudinary storage_path");
  }

  let afterUpload = storagePath.slice(uploadIndex + "/upload/".length);
  afterUpload = afterUpload.replace(/^v\d+\//, "");
  return afterUpload.replace(/\.[^/.]+$/, "");
};

const getSignedCloudinaryUrl = (storagePath) => {
  const publicId = getCloudinaryPublicIdFromUrl(storagePath);
  return cloudinary.url(publicId, {
    resource_type: "raw",
    sign_url: true,
    secure: true,
    format: "pdf",
  });
};

/**
 * GET /api/rag/documents
 */
export const listDocumentsController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const documents = await listDocumentsForUserService(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;
    const data = await getDocumentMetaService(documentId, userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rag/documents
 */
export const createDocumentController = async (req, res, next) => {
  try {
    const result = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Document uploaded and processed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId/file
 *
 * Returns a short-lived signed Cloudinary URL for the PDF.
 * This works for both private (legacy) and public (new) uploads.
 * The frontend loads the signed URL directly in the <iframe>.
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { documentId } = req.params;
    const document = await assertOwnedDocument(documentId, userId);

    if (!document.storage_path) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No file URL found for this document",
      });
    }

    const signedUrl = getSignedCloudinaryUrl(document.storage_path);

    if (req.query.raw === "1") {
      const response = await fetch(signedUrl, {
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(StatusCodes.BAD_GATEWAY).json({
          success: false,
          message: `Unable to fetch PDF from signed storage URL: ${response.status} ${response.statusText}`,
          detail: errorText,
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(document.title)}"`,
      );
      return response.body.pipe(res);
    }

    return res.json({ success: true, url: signedUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/rag/documents/:documentId/query
 */
export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;
    const userId = req.user?.id;
    const data = await queryDocumentService(documentId, userId, query);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Answer and citations",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rag/documents/:documentId/search
 */
export const searchInDocumentController = async (req, res, next) => {
  try {
    const result = await searchInDocumentService({
      documentId: req.params.documentId,
      query: req.query.query,
      k: req.query.k,
      userId: req.user.id,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Ranked chunk excerpts",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rag/documents/:documentId
 */
export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const result = await deleteDocumentService(Number(documentId), userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
