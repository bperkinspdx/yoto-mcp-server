#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// Configuration
const CONFIG_PATH = join(homedir(), ".yoto-mcp-config.json");
const CLIENT_ID = "sRkOnRmZakNzXnOPFGPT0UdahpdUuyxp";
const AUTH_SERVER = "https://login.yotoplay.com";
const API_SERVER = "https://api.yotoplay.com";

interface YotoConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Load/save configuration
async function loadConfig(): Promise<YotoConfig> {
  try {
    const data = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config: YotoConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Yoto API Authentication
async function authenticate(): Promise<string> {
  const config = await loadConfig();

  // Check if we have a valid token
  if (config.accessToken && config.expiresAt && config.expiresAt > Date.now()) {
    return config.accessToken;
  }

  // Try to refresh
  if (config.refreshToken) {
    try {
      const response = await fetch(`${AUTH_SERVER}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: config.refreshToken,
          client_id: CLIENT_ID,
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const newConfig = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || config.refreshToken,
          expiresAt: Date.now() + data.expires_in * 1000,
        };
        await saveConfig(newConfig);
        return data.access_token;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }

  throw new Error("Authentication required. Please run yoto-auth tool first.");
}

// Yoto API: Device Authorization Flow
async function deviceAuthFlow(): Promise<YotoConfig> {
  const deviceResponse = await fetch(`${AUTH_SERVER}/oauth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: "openid profile offline_access",
      audience: "https://api.yotoplay.com",
    }),
  });

  const deviceData: any = await deviceResponse.json();
  const { device_code, user_code, verification_uri, verification_uri_complete, interval } = deviceData;

  console.error(`\n🔐 Yoto Authentication Required\n`);
  console.error(`Please visit: ${verification_uri_complete}`);
  console.error(`Or go to: ${verification_uri}`);
  console.error(`And enter code: ${user_code}\n`);
  console.error(`Waiting for authorization...`);

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));

    try {
      const tokenResponse = await fetch(`${AUTH_SERVER}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code,
          client_id: CLIENT_ID,
        }),
      });

      if (tokenResponse.ok) {
        const tokenData: any = await tokenResponse.json();
        console.error("✅ Authentication successful!\n");
        
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
        };
      }
    } catch (error) {
      // Continue polling
    }

    attempts++;
  }

  throw new Error("Authentication timed out");
}

// Yoto API: Upload and transcode audio
async function uploadAndTranscodeAudio(
  audioFilePath: string,
  accessToken: string
): Promise<any> {
  const uploadUrlResponse = await fetch(
    `${API_SERVER}/media/transcode/audio/uploadUrl`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const uploadData: any = await uploadUrlResponse.json();
  const { uploadUrl, uploadId } = uploadData.upload;

  const audioBuffer = await readFile(audioFilePath);
  await fetch(uploadUrl, {
    method: "PUT",
    body: audioBuffer,
    headers: { "Content-Type": "audio/mpeg" },
  });

  let transcodedAudio: any = null;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const transcodeResponse = await fetch(
      `${API_SERVER}/media/upload/${uploadId}/transcoded?loudnorm=false`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (transcodeResponse.ok) {
      const data: any = await transcodeResponse.json();
      if (data.transcode.transcodedSha256) {
        transcodedAudio = data.transcode;
        break;
      }
    }
    attempts++;
  }

  if (!transcodedAudio) {
    throw new Error("Transcoding timed out");
  }

  return transcodedAudio;
}

// Yoto API: Upload audio and create card
async function uploadAudioToYoto(
  audioFilePath: string,
  title: string
): Promise<{ cardId: string; title: string }> {
  const accessToken = await authenticate();
  const transcodedAudio = await uploadAndTranscodeAudio(audioFilePath, accessToken);
  const mediaInfo = transcodedAudio.transcodedInfo;

  const content = {
    title,
    content: {
      chapters: [
        {
          key: "01",
          title,
          overlayLabel: "1",
          tracks: [
            {
              key: "01",
              title,
              trackUrl: `yoto:#${transcodedAudio.transcodedSha256}`,
              duration: mediaInfo.duration,
              fileSize: mediaInfo.fileSize,
              channels: mediaInfo.channels,
              format: mediaInfo.format,
              type: "audio",
              overlayLabel: "1",
              display: {
                icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
              },
            },
          ],
          display: {
            icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
          },
        },
      ],
    },
    metadata: {
      media: {
        duration: mediaInfo.duration,
        fileSize: mediaInfo.fileSize,
        readableFileSize: Math.round((mediaInfo.fileSize / 1024 / 1024) * 10) / 10,
      },
    },
  };

  const createResponse = await fetch(`${API_SERVER}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(content),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create card: ${await createResponse.text()}`);
  }

  const result: any = await createResponse.json();
  return {
    cardId: result.card.cardId,
    title: result.card.title,
  };
}

// Yoto API: List cards
async function listCards(): Promise<any[]> {
  const accessToken = await authenticate();
  
  const response = await fetch(`${API_SERVER}/content?type=myo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list cards: ${await response.text()}`);
  }

  const data: any = await response.json();
  return data.cards || [];
}

// Yoto API: Get card details
async function getCard(cardId: string): Promise<any> {
  const accessToken = await authenticate();
  
  const response = await fetch(`${API_SERVER}/content/${cardId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get card: ${await response.text()}`);
  }

  const data: any = await response.json();
  return data.card;
}

// Yoto API: Add track to existing card
async function addTrackToCard(
  cardId: string,
  audioFilePath: string,
  trackTitle: string
): Promise<{ cardId: string; title: string }> {
  const accessToken = await authenticate();
  const card = await getCard(cardId);
  
  const transcodedAudio = await uploadAndTranscodeAudio(audioFilePath, accessToken);
  const mediaInfo = transcodedAudio.transcodedInfo;

  const existingChapters = card.content?.chapters || [];
  const nextChapterNum = existingChapters.length + 1;
  const chapterKey = String(nextChapterNum).padStart(2, '0');

  const newTrack = {
    key: chapterKey,
    title: trackTitle,
    trackUrl: `yoto:#${transcodedAudio.transcodedSha256}`,
    duration: mediaInfo.duration,
    fileSize: mediaInfo.fileSize,
    channels: mediaInfo.channels,
    format: mediaInfo.format,
    type: "audio",
    overlayLabel: String(nextChapterNum),
    display: {
      icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
    },
  };

  const updatedChapters = [
    ...existingChapters,
    {
      key: chapterKey,
      title: trackTitle,
      overlayLabel: String(nextChapterNum),
      tracks: [newTrack],
      display: {
        icon16x16: "yoto:#aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q",
      },
    },
  ];

  const updateResponse = await fetch(`${API_SERVER}/content/${cardId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: card.title,
      content: {
        ...card.content,
        chapters: updatedChapters,
      },
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update card: ${await updateResponse.text()}`);
  }

  const result: any = await updateResponse.json();
  return {
    cardId: result.card.cardId,
    title: result.card.title,
  };
}

// Create MCP server
const server = new Server(
  {
    name: "yoto-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "yoto-auth",
        description: "Authenticate with Yoto API using device authorization flow",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "yoto-upload-audio",
        description: "Upload an audio file to Yoto and create a new MYO card",
        inputSchema: {
          type: "object",
          properties: {
            audioFilePath: {
              type: "string",
              description: "Absolute path to the audio file (MP3)",
            },
            title: {
              type: "string",
              description: "Title for the MYO card",
            },
          },
          required: ["audioFilePath", "title"],
        },
      },
      {
        name: "yoto-add-track",
        description: "Add a track to an existing Yoto MYO card",
        inputSchema: {
          type: "object",
          properties: {
            cardId: {
              type: "string",
              description: "The card ID to add the track to",
            },
            audioFilePath: {
              type: "string",
              description: "Absolute path to the audio file (MP3)",
            },
            trackTitle: {
              type: "string",
              description: "Title for the track",
            },
          },
          required: ["cardId", "audioFilePath", "trackTitle"],
        },
      },
      {
        name: "yoto-list-cards",
        description: "List all MYO cards in your Yoto library",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "yoto-get-card",
        description: "Get details of a specific Yoto MYO card",
        inputSchema: {
          type: "object",
          properties: {
            cardId: {
              type: "string",
              description: "The card ID to retrieve",
            },
          },
          required: ["cardId"],
        },
      },
      {
        name: "yoto-check-auth",
        description: "Check if authenticated with Yoto API",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "yoto-auth": {
        const config = await deviceAuthFlow();
        await saveConfig(config);
        return {
          content: [
            {
              type: "text",
              text: "✅ Successfully authenticated with Yoto API!",
            },
          ],
        };
      }

      case "yoto-check-auth": {
        try {
          const config = await loadConfig();
          if (config.accessToken && config.expiresAt && config.expiresAt > Date.now()) {
            return {
              content: [
                {
                  type: "text",
                  text: "✅ Authenticated with Yoto API",
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Not authenticated. Please run yoto-auth tool.",
                },
              ],
            };
          }
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "❌ Not authenticated. Please run yoto-auth tool.",
              },
            ],
          };
        }
      }

      case "yoto-list-cards": {
        const cards = await listCards();
        
        if (cards.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No MYO cards found in your library.",
              },
            ],
          };
        }

        const cardsList = cards.map((card: any) => 
          `• ${card.title} (ID: ${card.cardId})`
        ).join("\n");

        return {
          content: [
            {
              type: "text",
              text: `📚 Your MYO Cards:\n\n${cardsList}`,
            },
          ],
        };
      }

      case "yoto-get-card": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments");
        }

        const { cardId } = args as { cardId: string };
        const card = await getCard(cardId);

        const chapters = card.content?.chapters || [];
        const trackCount = chapters.reduce((sum: number, ch: any) => 
          sum + (ch.tracks?.length || 0), 0
        );

        return {
          content: [
            {
              type: "text",
              text: `📀 Card Details:\n\nTitle: ${card.title}\nCard ID: ${card.cardId}\nChapters: ${chapters.length}\nTracks: ${trackCount}\nCreated: ${new Date(card.createdAt).toLocaleString()}`,
            },
          ],
        };
      }

      case "yoto-add-track": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments");
        }

        const { cardId, audioFilePath, trackTitle } = args as {
          cardId: string;
          audioFilePath: string;
          trackTitle: string;
        };

        const result = await addTrackToCard(cardId, audioFilePath, trackTitle);

        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully added track to card!\n\nCard ID: ${result.cardId}\nCard Title: ${result.title}\nTrack: ${trackTitle}\n\nThe track has been added to your existing MYO card.`,
            },
          ],
        };
      }

      case "yoto-upload-audio": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments");
        }

        const { audioFilePath, title } = args as {
          audioFilePath: string;
          title: string;
        };

        const result = await uploadAudioToYoto(audioFilePath, title);

        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully uploaded audio to Yoto!\n\nCard ID: ${result.cardId}\nTitle: ${result.title}\n\nYou can now link this card to a physical MYO card using your Yoto app or player.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Yoto MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
