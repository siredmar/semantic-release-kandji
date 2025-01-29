const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

class KandjiClient {
  constructor(baseUrl, apiToken) {
    if (!baseUrl || !apiToken) {
      throw new Error("Base URL and API token are required.");
    }
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    console.debug("KandjiClient initialized with baseUrl:", baseUrl);
  }

  /**
   * Fetch a specific custom app by ID
   * @param {number|string} id - The ID of the custom app
   * @returns {Promise<Object>} - The custom app details
   */
  async getCustomAppById(id) {
    console.debug("Fetching a custom app by ID:", id);
    const endpoint = `/api/v1/library/custom-apps/${id}`;
    const app = await this.request("GET", endpoint);
    console.debug("Fetched app:", app);
    return app;
  }

  /**
   * General method to make requests to the Kandji API.
   * @param {string} method - HTTP method (GET, POST, PATCH, etc.).
   * @param {string} endpoint - API endpoint.
   * @param {Object} [data] - Request payload.
   * @returns {Promise<Object>} - Response data.
   */
  async request(method, endpoint, data = null) {
    console.debug("Making request:", { method, endpoint, data });
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          maxBodyLength: Infinity,
        },
        data,
      });
      console.debug("Request successful:", {
        status: response.status,
        data: response.data,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error during Kandji API request: ${
          error.response?.data || error.message
        }`
      );
      throw error;
    }
  }

  /**
   * Fetch the list of custom apps.
   * @returns {Promise<Array>} - List of custom apps.
   */
  async listApps() {
    console.debug("Fetching list of custom apps");
    const endpoint = "/api/v1/library/custom-apps";
    try {
      const response = await this.request("GET", endpoint);
      console.debug("Fetched apps:", response);
      return response;
    } catch (error) {
      console.error("Error fetching custom apps:", error.message);
      throw error;
    }
  }

  /**
   * Get a signed URL for uploading a file.
   * @param {string} filename - Name of the file to upload.
   * @returns {Promise<Object>} - Signed URL data.
   */
  async getSignedUrl(filename) {
    console.debug("Requesting signed URL for filename:", filename);
    const endpoint = "/api/v1/library/custom-apps/upload";
    const data = new URLSearchParams({ name: filename });
    const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.debug("Received signed URL:", response.data);
    return response.data;
  }

  /**
   * Upload a file to S3 using a signed URL.
   * @param {string} filepath - Path to the file to upload.
   * @param {Object} signedUrl - Signed URL data.
   * @returns {Promise<Object>} - Response from S3.
   */
  async uploadToS3(filepath, signedUrl) {
    console.debug("Uploading file to S3:", filepath);
    console.debug("Signed URL:", signedUrl);

    const fileFormData = new FormData();
    fileFormData.append("key", signedUrl.file_key); // Ensure this is set only once
    Object.entries(signedUrl.post_data).forEach(([key, value]) => {
      if (key !== "key") {
        // Prevent duplicate "key" fields
        fileFormData.append(key, value);
      }
    });
    fileFormData.append("file", fs.createReadStream(filepath));

    try {
      console.debug("Form data being sent to S3:", {
        keys: Object.keys(signedUrl.post_data),
        file: filepath,
      });

      const response = await axios.post(signedUrl.post_url, fileFormData, {
        headers: fileFormData.getHeaders(),
        maxBodyLength: Infinity,
      });

      console.debug("File uploaded to S3 successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error during S3 upload:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Update a custom app with a new file key.
   * @param {string} appId - ID of the custom app to update.
   * @param {string} fileKey - File key to associate with the app.
   * @param {number} [attempt=0] - Current attempt number for retries.
   * @returns {Promise<Object>} - Updated app details.
   */
  async updateCustomApp(appId, fileKey, attempt = 0) {
    const maxAttempts = 10;
    const timeoutDuration = 5000;

    console.debug(
      `[Attempt ${attempt}] Updating custom app with appId: ${appId}, fileKey: ${fileKey}`
    );
    if (attempt > maxAttempts) {
      throw new Error(
        "Unable to verify updated app after 10 attempts. Exiting"
      );
    }

    const endpoint = `/api/v1/library/custom-apps/${appId}`;
    const data = { file_key: fileKey };

    try {
      const updatedApp = await this.request("PATCH", endpoint, data);
      console.debug("Custom app updated successfully:", updatedApp);
      return updatedApp;
    } catch (error) {
      if (
        error.response &&
        error.response.status === 503 &&
        error.response.data?.detail?.includes("still being processed")
      ) {
        console.log("Upload is still processing... Retrying in 5 seconds.");
        await new Promise((resolve) => setTimeout(resolve, timeoutDuration));
        return this.updateCustomApp(appId, fileKey, attempt + 1);
      } else {
        console.error(
          "Failed to update custom app:",
          error.response?.data || error.message
        );
        throw error;
      }
    }
  }

  /**
   * Upload a file and update the corresponding custom app.
   * @param {string} filepath - Path to the file to upload.
   * @param {string} appId - ID of the custom app to update.
   */
  async upload(filepath, appId) {
    console.debug(
      "Starting upload process for filepath:",
      filepath,
      "and appId:",
      appId
    );
    console.debug("Resolved filepath:", fs.realpathSync(filepath));
    console.debug("File exists:", fs.existsSync(filepath));
    const filename = filepath.split("/").pop();
    const signedUrl = await this.getSignedUrl(filename);
    console.log(`Uploading file to Kandji: ${filename}`);

    await this.uploadToS3(filepath, signedUrl);
    console.log(`File uploaded successfully.`);

    await this.updateCustomApp(appId, signedUrl.file_key);
    console.log(`App updated successfully.`);
  }
}

module.exports = KandjiClient;
