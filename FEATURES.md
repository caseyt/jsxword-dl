# jsxword-dl Features

## Overview
jsxword-dl is a complete JavaScript port of the Python xword-dl project, enabling crossword puzzle downloads from multiple sources.

## Key Features

### ✅ CLI Usage
- Command-line interface for downloading puzzles
- Support for keyword-based downloads (e.g., `vox`, `usa`, `uni`)
- Support for URL-based downloads
- Date-specific puzzle downloads
- Output to file or base64

### ✅ Library/Importable Package
The entire package can be imported and used in other JavaScript projects:

```javascript
import { downloadAsBase64, downloadAndSave } from 'jsxword-dl';
```

Key library functions:
- `downloadByKeyword(keyword, options)` - Download by outlet keyword
- `downloadByUrl(url, options)` - Download by URL
- `downloadAsBase64(source, options)` - Get puzzle as base64 string
- `downloadAndSave(source, filepath, options)` - Download and save to file
- `getSupportedOutletsList()` - Get list of supported outlets

### ✅ Supported Outlets (No Authentication Required)
- **Vox** (`vox`) - Vox crosswords
- **USA Today** (`usa`) - USA Today puzzles with XML parsing
- **Universal** (`uni`) - Universal Crossword
- **Observer Everyman** (`ever`) - Observer Everyman puzzles
- **Observer Speedy** (`spdy`) - Observer Speedy puzzles

### ✅ Output Formats
1. **File Output** - Save as .puz file
2. **Base64 Output** - Get base64 string for database storage
3. **Stdout Output** - Pipe to other commands

### ✅ Custom Features

#### Custom PUZ Encoder
Built from scratch since no working Node.js library existed. Creates valid AcrossLite-compatible .puz files.

#### AmuseLabs Support
Complete AmuseLabs downloader with:
- Date picker parsing
- Puzzle deobfuscation (rawc decoding)
- Token handling
- Embedded puzzle detection

#### Smart Date Parsing
Uses `chrono-node` for intelligent date parsing:
- "yesterday"
- "2024-01-15"
- "last monday"
- etc.

### ✅ TypeScript Support
Includes TypeScript type definitions (`.d.ts`) for full IDE support.

## Use Cases

### 1. Batch Downloads
```javascript
const outlets = ['vox', 'usa', 'uni'];
for (const outlet of outlets) {
  const { puzzle } = await downloadByKeyword(outlet);
  console.log(`Downloaded: ${puzzle.title}`);
}
```

### 2. API Integration
```javascript
app.get('/api/puzzles/:outlet', async (req, res) => {
  const base64 = await downloadAsBase64(req.params.outlet);
  res.json({ puzzle: base64 });
});
```

### 3. Scheduled Downloads
```javascript
// Daily cron job
cron.schedule('0 0 * * *', async () => {
  const outlets = getSupportedOutletsList();
  for (const outlet of outlets) {
    await downloadAndStore(outlet.command);
  }
});
```

## Technical Details

### Dependencies
- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `commander` - CLI framework
- `chrono-node` - Date parsing
- `html-to-text` - HTML to markdown conversion
- `js-yaml` - Config file parsing
- `xml2js` - XML parsing (USA Today)

### File Structure
```
jsxword-dl/
├── src/
│   ├── index.js              # CLI entry point
│   ├── xword-dl.js           # Library exports
│   ├── xword-dl.d.ts         # TypeScript definitions
│   ├── downloaders/
│   │   ├── BaseDownloader.js
│   │   ├── AmuseLabsDownloader.js
│   │   ├── AMUniversalDownloader.js
│   │   ├── VoxDownloader.js
│   │   ├── ObserverDownloader.js
│   │   └── index.js
│   └── util/
│       ├── Puzzle.js         # Custom PUZ encoder
│       └── utils.js          # Utility functions
├── example-library-usage.js  # Library usage examples
├── example-database-storage.js # Real-world examples
├── package.json
└── README.md
```

## Not Supported
- New York Times (requires authentication)
- Any outlet requiring username/password
- Outlets not in the Python version

## Testing
All core features tested and working:
- ✅ CLI downloads (vox, usa, uni)
- ✅ Base64 output
- ✅ Library imports
- ✅ Date-specific downloads
- ✅ Custom filenames
- ✅ Error handling

## Future Enhancements
Potential additions:
- More downloaders from Python version
- Authentication support
- Puzzle format conversion
- Archive management
- Web interface
