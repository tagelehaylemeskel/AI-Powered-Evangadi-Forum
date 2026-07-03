import Joi from "joi";
import { body, param } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";
import { BadRequestError } from "../../../utils/errors/index.js";

/**
 * Upload Validation
 */
export function validateUploadedDocument(file) {
  if (!file) {
    throw new BadRequestError("PDF file is required");
  }

  const mimetype = file.mimetype?.toLowerCase() || "";
  const filename = file.originalname?.toLowerCase() || "";
  const isPdfMime = [
    "application/pdf",
    "application/octet-stream",
    "application/x-pdf",
  ].includes(mimetype);
  const isPdfExtension = filename.endsWith(".pdf");

  if (!isPdfMime && !isPdfExtension) {
    throw new BadRequestError("Only PDF files are allowed");
  }

  return true;
}

/**
 * Search Validation Schema
 */
export const searchDocumentSchema = Joi.object({
  documentId: Joi.number().integer().required(),
  query: Joi.string().min(1).required(),
  k: Joi.number().integer().min(1).max(20).optional(),
});

/**
 * Validate Document ID Param
 */
export const documentIdParamValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  validationErrorHandler,
];

/**
 * Validate Query Request
 */
export const queryDocumentValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  body("query")
    .notEmpty()
    .withMessage("Query is required")
    .isString()
    .withMessage("Query must be a string")
    .trim(),
  validationErrorHandler,
];
