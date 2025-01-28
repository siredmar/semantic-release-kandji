// Import KandjiClient from kandji-client.js
import KandjiClient from "./kandji-client.js";
import fs from "fs/promises";

/**
 * Semantic-release plugin for Kandji custom apps.
 * @param {Object} config - Plugin configuration.
 * @param {string} config.appID - The Kandji app ID to update.
 * @param {string} config.asset - Path to the asset to upload.
 * @param {boolean} config.preRelease - Indicates whether to publish on pre-releases.
 * @param {boolean} config.release - Indicates whether to publish on releases.
 * @param {Array<string>} [config.postinstall_script] - Optional post-install script to add.
 */
export async function kandjiSemanticReleasePlugin(config, context) {
  const {
    appID,
    asset,
    preRelease = false,
    release = true,
    postinstall_script = [],
  } = config;

  const { branch, logger } = context;
  const isPrerelease = branch.prerelease || false;

  if (
    (!release && !preRelease) ||
    (isPrerelease && !preRelease) ||
    (!isPrerelease && !release)
  ) {
    logger.log("Skipping Kandji plugin execution: release conditions not met.");
    return;
  }

  if (!appID || !asset) {
    throw new Error("Invalid configuration: appID and asset are required.");
  }

  const baseUrl = process.env.KANDJI_BASE_URL;
  const apiToken = process.env.KANDJI_API_TOKEN;

  if (!baseUrl || !apiToken) {
    throw new Error(
      "Environment variables KANDJI_BASE_URL and KANDJI_API_TOKEN must be set."
    );
  }

  const kandjiClient = new KandjiClient(baseUrl, apiToken);

  try {
    logger.log("Validating asset:", asset);
    await fs.access(asset);

    logger.log(
      `Starting upload process for asset: ${asset} to app ID: ${appID}`
    );
    await kandjiClient.upload(asset, appID);

    if (postinstall_script.length > 0) {
      logger.log("Updating postinstall script for the custom app.");
      const endpoint = `/api/v1/library/custom-apps/${appID}`;
      const data = { postinstall_script: postinstall_script.join("\n") };
      await kandjiClient.request("PATCH", endpoint, data);
      logger.log("Postinstall script updated successfully.");
    }

    logger.log("Kandji app update completed successfully.");
  } catch (error) {
    logger.error("Error during Kandji app update process:", error.message);
    throw error;
  }
}

// Example usage for semantic-release
(async () => {
  const config = {
    appID: "your-app-id", // Replace with actual app ID
    asset: "/path/to/asset.zip", // Replace with actual asset path
    preRelease: false,
    release: true,
    postinstall_script: [
      "#!/bin/bash",
      "cp /usr/local/bin/gxctl.conf $HOME/.gxctl/gxctl.conf",
    ],
  };

  const context = {
    branch: { prerelease: false }, // Simulate branch context
    logger: console, // Use console as logger for testing
  };

  try {
    await kandjiSemanticReleasePlugin(config, context);
  } catch (error) {
    process.exit(1);
  }
})();
