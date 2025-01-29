# semantic-release-kandji

A **semantic-release** plugin for managing custom apps in **Kandji**, allowing you to automate the upload of assets and updating of custom app configurations during the release process.

## Features
- Upload assets (e.g., binaries, zip files) to Kandji custom apps.
- Update the `postinstall_script` of a custom app if provided.
- Supports both pre-releases and full releases, configurable via plugin options.

## Requirements
- **Node.js**: Ensure you have Node.js installed.
- **Environment Variables**:
  - `KANDJI_BASE_URL`: The base URL for the Kandji API.
  - `KANDJI_API_TOKEN`: The API token for authenticating with Kandji.

## Installation
Install the plugin from npm:

```bash
npm install --save-dev @siredmar/semantic-release-kandji
```

## Configuration
Add the plugin to your `.releaserc.json` file with the required options:

```json
{
  "branches": ["main"],
  "plugins": [
    [
      "@siredmar/semantic-release-kandji",
      {
        "appID": "myappid",
        "asset": "/path/to/asset.zip",
        "preRelease": true,
        "release": true,
        "postinstall_script": [
          "#!/bin/bash",
          "cp /usr/local/bin/myconf.conf $HOME/.myapp/myconf.conf"
        ]
      }
    ]
  ]
}
```

### Options
| Option               | Type       | Required | Description                                                                 |
|----------------------|------------|----------|-----------------------------------------------------------------------------|
| `appID`              | `string`   | Yes      | The ID of the custom app to update in Kandji.                              |
| `asset`              | `string`   | Yes      | The path to the asset file to upload.                                      |
| `preRelease`         | `boolean`  | No       | Indicates whether the plugin should run on pre-releases. Default: `false`. |
| `release`            | `boolean`  | No       | Indicates whether the plugin should run on full releases. Default: `true`. |
| `postinstall_script` | `string[]` | No       | An optional post-install script to add to the custom app configuration.    |

## Usage
When semantic-release runs, the plugin will:
1. Validate the plugin configuration and required environment variables.
2. Check if the asset file exists.
3. Upload the asset to Kandji using the Kandji API.
4. Update the custom app configuration, including the `postinstall_script` (if provided).

### Example Workflow
1. Add the plugin to `.releaserc.json`.
2. Ensure the environment variables `KANDJI_BASE_URL` and `KANDJI_API_TOKEN` are set.
3. Push a release commit.
4. Semantic-release will automatically upload the asset and update the app in Kandji.

## Environment Variables
Ensure the following environment variables are set:

- `KANDJI_BASE_URL`: Your Kandji API base URL (e.g., `https://your-instance.api.kandji.io`).
- `KANDJI_API_TOKEN`: Your API token for Kandji.

You can use a `.env` file for local development:

```plaintext
KANDJI_BASE_URL=https://your-instance.api.kandji.io
KANDJI_API_TOKEN=your_api_token
```

## Debugging
To enable detailed debugging logs, set the `DEBUG` environment variable:

```bash
DEBUG=semantic-release:kandji
```

## Testing
You can run the plugin locally with a simulated context:

```javascript
(async () => {
  const config = {
    appID: "your-app-id",
    asset: "/path/to/asset.zip",
    preRelease: false,
    release: true,
    postinstall_script: [
      "#!/bin/bash",
      "cp /usr/local/bin/myconf.conf $HOME/.myapp/myconf.conf"
    ]
  };

  const context = {
    branch: { prerelease: false },
    logger: console
  };

  try {
    await kandjiSemanticReleasePlugin(config, context);
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
```

## License
This project is licensed under the MIT License.

