# Yoto MCP Server

A Model Context Protocol (MCP) server that bridges Warp AI and the Yoto API, enabling seamless audio uploads and MYO card creation directly from your terminal.

## Features

- 🔐 **OAuth Device Flow Authentication** - Secure authentication with Yoto API
- 🎵 **Audio Upload** - Upload MP3 files to Yoto with automatic transcoding
- 📦 **MYO Card Creation** - Automatically create Make Your Own cards
- 🔄 **Token Management** - Automatic token refresh and storage
- 🚀 **Native Warp Integration** - Use Yoto tools directly in Warp Agent Mode

## Prerequisites

- Node.js 18+ 
- A Yoto account
- Warp terminal with Agent Mode enabled

## Installation

1. Clone or download this repository:
```bash
cd yoto-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Add to Warp MCP Settings

Add this server to your Warp MCP configuration file (usually `~/.config/warp/mcp_config.json` or similar):

```json
{
  "mcpServers": {
    "yoto": {
      "command": "node",
      "args": [
        "/absolute/path/to/yoto-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Or for global installation:

```bash
npm link
```

Then in your Warp MCP config:

```json
{
  "mcpServers": {
    "yoto": {
      "command": "yoto-mcp-server"
    }
  }
}
```

## Usage

Once configured, restart Warp and you'll have access to three new tools in Agent Mode:

### 1. Authenticate with Yoto

First, authenticate with your Yoto account:

**In Warp Agent Mode:**
```
Please authenticate with Yoto
```

Or explicitly:
```
Use the yoto-auth tool
```

The server will display a URL and code. Visit the URL in your browser, enter the code, and approve the connection.

### 2. Check Authentication Status

**In Warp Agent Mode:**
```
Check if I'm authenticated with Yoto
```

### 3. Upload Audio to Yoto

**In Warp Agent Mode:**
```
Upload the file /path/to/audio.mp3 to my Yoto player with title "My Audio Track"
```

The server will:
1. Upload the audio file to Yoto
2. Wait for transcoding (automatic conversion to Yoto-compatible format)
3. Create a new MYO card with the audio
4. Return the card ID

You can then link the card to a physical MYO card using your Yoto app or player.

### 4. List Your MYO Cards

**In Warp Agent Mode:**
```
List all my Yoto cards
```

Returns a list of all your MYO cards with their IDs and titles.

### 5. Get Card Details

**In Warp Agent Mode:**
```
Get details for Yoto card dyp9b
```

Returns detailed information about a specific card including chapter and track counts.

### 6. Add Track to Existing Card

**In Warp Agent Mode:**
```
Add /path/to/track2.mp3 to Yoto card dyp9b with title "Track 2"
```

Adds a new audio track to an existing MYO card as an additional chapter.

## Example Workflow

```
User: Please authenticate with Yoto

[Server displays URL and code]
[User visits URL and approves]

✅ Successfully authenticated with Yoto API!

---

User: Upload hop-little-bunnies.mp3 to Yoto with title "Hop Little Bunnies"

[Server uploads and transcodes]

✅ Successfully uploaded audio to Yoto!

Card ID: dyp9b
Title: Hop Little Bunnies

You can now link this card to a physical MYO card using your Yoto app or player.
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `yoto-auth` | Authenticate with Yoto API | None |
| `yoto-check-auth` | Check authentication status | None |
| `yoto-upload-audio` | Upload audio and create MYO card | `audioFilePath`, `title` |
| `yoto-list-cards` | List all MYO cards | None |
| `yoto-get-card` | Get details of a specific card | `cardId` |
| `yoto-add-track` | Add audio track to existing card | `cardId`, `audioFilePath`, `trackTitle` |

## Configuration Storage

Authentication tokens are stored securely in `~/.yoto-mcp-config.json`. The server automatically handles token refresh.

## Development

### Build
```bash
npm run build
```

### Watch mode
```bash
npm run watch
```

### Run directly
```bash
npm run dev
```

## Troubleshooting

### Authentication Issues
- Ensure you're visiting the correct URL and entering the code within the time limit
- Check that your Yoto account is active
- Try re-authenticating: the old token will be replaced

### Upload Failures
- Verify the audio file path is absolute and accessible
- Ensure the file is in MP3 format
- Check file size (very large files may timeout during transcoding)

### Token Expiry
- Tokens automatically refresh when expired
- If refresh fails, re-authenticate using `yoto-auth`

## API Reference

This server uses the Yoto Developer API. For more information:
- Documentation: https://yoto.dev/api/
- MYO Cards Guide: https://yoto.dev/myo/uploading-to-cards/

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by the [Yoto API](https://yoto.dev/)
- Designed for [Warp Terminal](https://www.warp.dev/)
