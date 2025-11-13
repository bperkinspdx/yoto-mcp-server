# Yoto MCP Server - Enhancement Summary

## Version 1.1 - Card Management Features

### New Features Added

#### 1. **List Cards** (`yoto-list-cards`)
- Lists all MYO cards in your Yoto library
- Returns card titles and IDs
- Helps you discover which cards you have

**Example:**
```
User: "List all my Yoto cards"
Response: 📚 Your MYO Cards:
• Hop Little Bunnies (ID: dyp9b)
• Bedtime Stories (ID: abc123)
```

#### 2. **Get Card Details** (`yoto-get-card`)
- Retrieves detailed information about a specific card
- Shows chapters, tracks, and creation date
- Useful for checking card contents before adding tracks

**Example:**
```
User: "Get details for Yoto card dyp9b"
Response: 📀 Card Details:
Title: Hop Little Bunnies
Card ID: dyp9b
Chapters: 1
Tracks: 1
Created: 11/12/2025, 8:14:26 PM
```

#### 3. **Add Track to Existing Card** (`yoto-add-track`)
- Add new audio tracks to existing MYO cards
- Automatically uploads and transcodes audio
- Appends as a new chapter to the card
- Perfect for building playlists or albums over time

**Example:**
```
User: "Add track2.mp3 to Yoto card dyp9b with title 'Song 2'"
Response: ✅ Successfully added track to card!
Card ID: dyp9b
Track: Song 2
The track has been added to your existing MYO card.
```

### Technical Improvements

1. **Refactored Upload Logic**
   - Extracted `uploadAndTranscodeAudio()` function
   - Reusable for both new cards and adding tracks
   - Consistent transcoding handling

2. **Robust Error Handling**
   - Clear error messages for authentication issues
   - Helpful guidance when auth is required
   - Proper error propagation from Yoto API

3. **Chapter Management**
   - Automatic chapter numbering
   - Preserves existing card structure
   - Maintains proper chapter keys and overlay labels

### API Endpoints Used

- `GET /content?type=myo` - List MYO cards
- `GET /content/{cardId}` - Get card details
- `POST /content/{cardId}` - Update card with new track
- `POST /media/transcode/audio/uploadUrl` - Get upload URL
- `GET /media/upload/{uploadId}/transcoded` - Poll for transcode status

### Workflow Examples

#### Building a Playlist
```
1. Create initial card: "Upload song1.mp3 with title 'My Playlist'"
2. List cards: "List all my Yoto cards" → Get card ID
3. Add more tracks: 
   - "Add song2.mp3 to card {ID} with title 'Song 2'"
   - "Add song3.mp3 to card {ID} with title 'Song 3'"
4. Check progress: "Get details for card {ID}"
```

#### Managing Existing Content
```
1. List all cards: "List all my Yoto cards"
2. Pick a card: "Get details for card {ID}"
3. Add content: "Add new-track.mp3 to card {ID} with title 'Bonus Track'"
```

### Configuration

No additional configuration needed! The enhancements use the same authentication system as the original tools.

### Compatibility

- ✅ Backward compatible with existing `yoto-upload-audio` tool
- ✅ Works with existing authentication tokens
- ✅ No breaking changes to existing functionality

### Future Enhancement Ideas

- Reorder tracks within a card
- Delete specific tracks from a card
- Bulk upload multiple tracks at once
- Custom card artwork upload
- Export card metadata

---

Built with ❤️ for the Yoto community
