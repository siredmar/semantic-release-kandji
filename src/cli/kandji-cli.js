#!/usr/bin/env node

const { Command } = require("commander");
const KandjiClient = require("../kandji-client.js");
const fs = require("fs/promises");
const path = require("path");

// Define the CLI tool
const program = new Command();

program
  .name("kandji-cli")
  .description("CLI tool to interact with Kandji custom apps")
  .version("1.0.0");

// Utility to load configuration from a JSON file
async function loadConfig(configPath) {
  try {
    const absolutePath = path.resolve(configPath);
    const content = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load configuration file: ${error.message}`);
  }
}

program
  .command("get-app")
  .description("Get detailed information about a specific custom app")
  .requiredOption(
    "-c, --config <path>",
    "Path to the configuration file (JSON format)"
  )
  .requiredOption("-i, --id <id>", "Library item ID of the custom app")
  .option(
    "-o, --output <type>",
    'Output format: "json" or "std" (default: std)',
    "std"
  )
  .action(async (options) => {
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      console.debug("Configuration loaded:", config);
      const client = new KandjiClient(config.uri, config.token);

      // Fetch the custom app details
      const app = await client.getCustomAppById(options.id);

      // Handle output format
      if (options.output === "json") {
        console.log(JSON.stringify(app, null, 2));
      } else if (options.output === "std") {
        console.log("Custom App Details:");
        console.log(`- Name: ${app.name || "Unknown"}`);
        console.log(`- ID: ${app.id}`);
        console.log(`- Version: ${app.version || "Unknown"}`);
        console.log(
          `- Description: ${app.description || "No description available"}`
        );
        console.log(`- Created: ${app.created || "Unknown"}`);
        console.log(`- Last Modified: ${app.modified || "Unknown"}`);
        console.log(`- Platform: ${app.platform || "Unknown"}`);
      } else {
        console.error(
          `Error: Invalid output format "${options.output}". Use "json" or "std".`
        );
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  });

program
  .command("list-apps")
  .description("List all custom apps or details of a specific custom app by ID")
  .requiredOption(
    "-c, --config <path>",
    "Path to the configuration file (JSON format)"
  )
  .option("-i, --id <id>", "ID of the custom app to fetch")
  .action(async (options) => {
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      const client = new KandjiClient(config.uri, config.token);

      if (options.id) {
        // Fetch a specific custom app
        const app = await client.getCustomAppById(options.id);
        console.log("Custom App Details:");
        console.log(`- Name: ${app.name || "Unknown"}`);
        console.log(`- ID: ${app.id}`);
        console.log(`- Version: ${app.version || "Unknown"}`);
        console.log(
          `- Description: ${app.description || "No description available"}`
        );
      } else {
        // Fetch and display all custom apps
        const apps = await client.listApps();
        if (apps.length > 0) {
          console.log(`Found ${apps.length} custom apps:\n`);
          apps.forEach((app, index) => {
            console.log(`App ${index + 1}:`);
            console.log(`- Name: ${app.name || "Unknown"}`);
            console.log(`- ID: ${app.id}`);
            console.log(`- Version: ${app.version || "Unknown"}`);
            console.log(
              `- Description: ${app.description || "No description available"}`
            );
            console.log("");
          });
        } else {
          console.log("No custom apps found.");
        }
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  });

program
  .command("update-app")
  .description("Upload a file and update a custom app")
  .requiredOption(
    "-c, --config <path>",
    "Path to the configuration file (JSON format)"
  )
  .requiredOption("-i, --id <libraryItemId>", "ID of the custom app")
  .requiredOption("-f, --file <filePath>", "Path to the file to upload")
  .action(async (options) => {
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      const client = new KandjiClient(config.uri, config.token);

      // Perform the full process
      await client.upload(options.file, options.id);
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  });
// Parse CLI arguments
program.parse(process.argv);
