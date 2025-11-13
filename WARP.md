# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
npm install           # Install dependencies
npm run build        # Compile TypeScript to JavaScript
npm link             # Install globally (optional)
```

### Development Workflow
```bash
npm run watch        # Watch mode - auto-recompile on changes
npm run dev          # Build and run the server once
npm start            # Run the already-built server
```

### Testing the Server
Since this is an MCP server, it runs via stdio and is meant to be invoked by Warp. For manual testing:
```bash
node dist/index.js   # Requires MCP client input via stdio
```

Add to Warp''s MCP config (`~/.config/warp/mcp_config.json` or similar):
```json
{
  "mcpServers": {
    "yoto": {
      "command": "node",
      "args": ["/absolute/path/to/yoto-mcp-server/dist/index.js"]
    }
  }
}
```

## Architecture Overview

### Single-File Server Design
The entire server is contained in `src/index.ts` (~650 lines). This monolithic approach works well for this focused use case but consider modularization if adding significant new features.

### MCP Server Pattern
- Uses `@modelcontextprotocol/sdk` for stdio-based communication
- Implements two request handlers:
  - `ListToolsRequestSchema`: Returns available tools
  - `CallToolRequestSchema`: Executes tool calls with error handling
- All responses flow through the MCP protocol as text content

### Authentication Flow
1. **Device Authorization OAuth**: Uses Yoto''s device code flow
2. **Token Storage**: Tokens saved in `~/.yoto-mcp-config.json`
3. **Auto-refresh**: Automatically refreshes expired access tokens using refresh token
4. **Lazy Authentication**: Most tools call `authenticate()` which handles token validation/refresh transparently

Key functions:
- `deviceAuthFlow()`: Interactive OAuth device code flow
- `authenticate()`: Validates/refreshes token, throws if auth required
- `loadConfig()` / `saveConfig()`: Token persistence

### Audio Upload Pipeline
The audio upload process involves multiple steps and is shared between creating cards and adding tracks:

1. **Get Upload URL**: Request transcode URL from Yoto API
2. **Upload Raw Audio**: PUT audio file to S3-style upload URL
3. **Poll for Transcode**: Poll `/media/upload/{id}/transcoded` until complete
4. **Create/Update Card**: Use transcoded SHA256 reference in card content

Shared function: `uploadAndTranscodeAudio()` - reusable for both new cards and adding tracks.

### Card Content Structure
Yoto cards have a specific JSON structure:
- **Chapters**: Top-level organizational units (e.g., "Chapter 1")
- **Tracks**: Audio files within chapters
- Each track references audio via `yoto:#<sha256>` URL scheme
- Overlay labels (physical card button mappings) are sequential numbers

When adding tracks to existing cards, the code:
1. Fetches current card state via `getCard()`
2. Appends new chapter with sequential key/overlayLabel
3. POSTs updated chapter list to `/content/{cardId}`

## Configuration and Constants

### Hardcoded Values
- `CLIENT_ID`: OAuth client ID (currently hardcoded)
- `AUTH_SERVER`: `https://login.yotoplay.com`
- `API_SERVER`: `https://api.yotoplay.com`
- Icon reference: `yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q` (used for all card/track icons)

### User Configuration
- Config file: `~/.yoto-mcp-config.json`
- Contains: `accessToken`, `refreshToken`, `expiresAt` (timestamp)

## MCP Tools Reference

The server exposes 6 tools to Warp Agent Mode:

| Tool | Purpose | Parameters |
|------|---------|------------|
| `yoto-auth` | Initiate OAuth device flow | None |
| `yoto-check-auth` | Check if authenticated | None |
| `yoto-upload-audio` | Upload audio & create new card | `audioFilePath`, `title` |
| `yoto-add-track` | Add track to existing card | `cardId`, `audioFilePath`, `trackTitle` |
| `yoto-list-cards` | List all MYO cards | None |
| `yoto-get-card` | Get card details | `cardId` |

## TypeScript Configuration

- **Target**: ES2022
- **Module System**: Node16 (ESM)
- **Output**: `dist/` directory
- **Declarations**: Generated (`.d.ts` files)
- Strict mode enabled with all type checking

## Adding New Features

### To add a new MCP tool:
1. Add the tool definition in `ListToolsRequestSchema` handler
2. Add a case in the `CallToolRequestSchema` switch statement
3. If needed, create a helper function for the Yoto API call
4. Follow the error handling pattern (try/catch with MCP error response)
5. Return content as `{ content: [{ type: "text", text: "..." }] }`

### To add a new Yoto API endpoint:
1. Create an async function that calls `authenticate()` first
2. Use `node-fetch` for HTTP requests with Bearer token
3. Handle errors with descriptive messages
4. Return typed data (consider adding interfaces)

## Important Patterns

### Error Handling
All tool calls wrap logic in try/catch and return errors as:
```typescript
{
  content: [{ type: "text", text: `Error: ${error.message}` }],
  isError: true
}
```

### Polling Pattern
Both transcoding and device auth use polling with:
- Maximum attempt limits (30 for transcode, 60 for auth)
- Delays between attempts (500ms for transcode, `interval` seconds for auth)
- Break on success, throw on timeout

### File I/O
- All file reads use `fs/promises` with `readFile()`
- Audio files are read as buffers for upload
- Config files are JSON serialized/deserialized

## Dependencies

### Runtime
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `node-fetch`: HTTP client (v3, ESM)

### Development
- `typescript`: Compiler
- `@types/node`: Node.js type definitions

No testing framework or linting tools are currently configured.

## Known Limitations

- No automated tests
- No input validation (file existence, format checking)
- Hardcoded CLIENT_ID (should be configurable)
- Transcoding timeout is fixed at 15 seconds (30 × 500ms)
- No progress reporting during long uploads
- Error messages are sent to Warp but not logged server-side
