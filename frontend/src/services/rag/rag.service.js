import { apiClient } from "../core/api.client";

export const listDocuments = async () => {
  try {
    const response = await apiClient.get("/api/rag/documents");
    const docs = response.data.data || [];
    return docs.map((doc) => ({
      ...doc,
      id: doc.document_id || doc.id,
      file_name: doc.title || doc.file_name,
      // storage_path is the full Cloudinary HTTPS URL
      storage_path: doc.storage_path,
    }));
  } catch (error) {
    console.error("Error listing documents:", error);
    throw error;
  }
};

export const uploadPdf = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/api/rag/documents", formData);
    return response.data.data;
  } catch (error) {
    const message =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.message ||
      "Upload failed";
    console.error("Error uploading PDF:", error);
    throw new Error(message);
  }
};

export const deleteDocument = async (documentId) => {
  try {
    const response = await apiClient.delete(`/api/rag/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

export const searchInDocument = async (documentId, query) => {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/search?query=${encodeURIComponent(query)}`,
    );
    const data = response.data.data;
    return data?.results || [];
  } catch (error) {
    console.error("Error searching document:", error);
    throw error;
  }
};

export const queryDocument = async (documentId, query) => {
  try {
    const response = await apiClient.post(
      `/api/rag/documents/${documentId}/query`,
      { query },
    );
    return response.data.data;
  } catch (error) {
    console.error("Error querying document:", error);
    throw error;
  }
};

const parseApiErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.message || json.msg || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || data?.msg || error?.message || fallback;
};

/**
 * Fetches a short-lived signed URL for a PDF from the backend.
 * Use for "open in new tab" links — not for iframe embedding.
 *
 * @param {number|string} documentId
 * @returns {Promise<string>} signed URL
 */
export const fetchPdfSignedUrl = async (documentId) => {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file`,
    );
    const url = response.data?.url;
    if (!url) throw new Error("No URL returned from server");
    return url;
  } catch (error) {
    const message = await parseApiErrorMessage(
      error,
      "Failed to load PDF URL",
    );
    console.error("Error fetching signed PDF URL:", error);
    throw new Error(message);
  }
};

/**
 * Downloads the PDF through the authenticated backend proxy and returns
 * a blob: URL suitable for same-origin iframe preview.
 *
 * @param {number|string} documentId
 * @returns {Promise<string>} blob object URL
 */
export const fetchPdfBlobUrl = async (documentId) => {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file?raw=1`,
      { responseType: "blob" },
    );

    const blob = response.data;
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("Received empty PDF from server");
    }

    return URL.createObjectURL(blob);
  } catch (error) {
    const message = await parseApiErrorMessage(error, "Failed to load PDF");
    console.error("Error fetching PDF blob:", error);
    throw new Error(message);
  }
};

export const fetchPdfObjectUrl = async (documentId) => {
  return await fetchPdfSignedUrl(documentId);
};

/**
 * @deprecated Use fetchPdfObjectUrl instead.
 */
export const getPdfUrl = (storagePath) => storagePath;
