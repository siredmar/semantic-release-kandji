const KandjiClient = require("./kandji-client.js");
const fs = require("fs/promises");
const path = require("path");
const glob = require("glob"); // Import glob for wildcard matching

/**
 * Semantic-release plugin for Kandji custom apps.
 */
async function verifyConditions(pluginConfig, context) {
  const { logger } = context;
  const { appID, asset } = pluginConfig;

  if (!process.env.KANDJI_BASE_URL || !process.env.KANDJI_API_TOKEN) {
    throw new Error(
      "Environment variables KANDJI_BASE_URL and KANDJI_API_TOKEN are required."
    );
  }

  if (!appID || !asset) {
    throw new Error(
      'The Kandji plugin requires "appID" and a valid "asset" configuration.'
    );
  }

  logger.log("Kandji plugin configuration verified.");
}

async function resolveAsset(assetPattern, nextReleaseVersion) {
  // Ensure nextReleaseVersion is properly defined
  if (!nextReleaseVersion) {
    throw new Error(
      "nextRelease.version is undefined. Cannot resolve asset path."
    );
  }

  // Replace ${nextRelease.version} with the actual version
  const processedPattern = assetPattern.replace(
    /\$\{nextRelease\.version\}/g,
    nextReleaseVersion
  );

  console.debug(
    `Resolving asset pattern: ${assetPattern} → ${processedPattern}`
  );

  // Resolve files using glob pattern
  const matchedFiles = glob.sync(processedPattern);

  if (matchedFiles.length === 0) {
    throw new Error(`No files found for pattern: ${processedPattern}`);
  }

  if (matchedFiles.length > 1) {
    throw new Error(
      `Multiple files matched for pattern "${processedPattern}", but only one asset is allowed.`
    );
  }

  return matchedFiles[0]; // Return the single matched file
}

async function prepare(pluginConfig, context) {
  const { logger, nextRelease } = context;
  const resolvedAsset = await resolveAsset(
    pluginConfig.asset,
    nextRelease.version
  );

  logger.log("Validating asset exists:", resolvedAsset);

  try {
    await fs.access(resolvedAsset);
    logger.log("Asset exists:", resolvedAsset);
  } catch (err) {
    throw new Error(`The asset file does not exist: ${resolvedAsset}`);
  }
}

async function publish(pluginConfig, context) {
  const { logger, branch, nextRelease } = context;
  const {
    appID,
    asset,
    release = true,
    preRelease = false,
    postinstallScript = [],
  } = pluginConfig;
  const isPrerelease = branch.prerelease || false;

  if (
    (!release && !preRelease) ||
    (isPrerelease && !preRelease) ||
    (!isPrerelease && !release)
  ) {
    logger.log("Skipping Kandji plugin execution: release conditions not met.");
    return;
  }

  const baseUrl = process.env.KANDJI_BASE_URL;
  const apiToken = process.env.KANDJI_API_TOKEN;
  const kandjiClient = new KandjiClient(baseUrl, apiToken);

  try {
    const resolvedAsset = await resolveAsset(asset, nextRelease.version);

    logger.log(
      `Starting upload process for asset: ${resolvedAsset} to app ID: ${appID}`
    );
    await kandjiClient.upload(resolvedAsset, appID);

    if (postinstallScript.length > 0) {
      logger.log("Updating postinstall script for the custom app.");
      const endpoint = `/api/v1/library/custom-apps/${appID}`;
      const data = { postinstall_script: postinstallScript.join("\n") };
      await kandjiClient.request("PATCH", endpoint, data);
      logger.log("Postinstall script updated successfully.");
    }

    logger.log("Kandji app update completed successfully.");
  } catch (error) {
    logger.error("Error during Kandji app update process:", error.message);
    throw error;
  }
}

module.exports = {
  verifyConditions,
  prepare,
  publish,
};
