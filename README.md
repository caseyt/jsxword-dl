# jsxword-dl

JavaScript CLI download tool for online crossword puzzles.

This is a JavaScript port of the Python [xword-dl](https://github.com/thisisparker/xword-dl) project.

## Installation

```bash
npm install
```

## Usage

Download the latest puzzle from a supported outlet:

```bash
npm run dl vox
```

Download a puzzle by URL:

```bash
npm run dl https://www.vox.com/crossword
```

Download a puzzle for a specific date:

```bash
npm run dl vox -- --date 2024-01-15
```

Specify output filename:

```bash
npm run dl vox -- -o my-puzzle.puz
```

Output as base64 (for database storage):

```bash
npm run dl vox -- --base64
```

Note: When using `npm run dl` with additional flags, you need to use `--` before the flags to pass them to the script.

### Examples

```bash
# Download latest Vox puzzle
npm run dl vox

# Download USA Today puzzle
npm run dl usa

# Download Universal puzzle
npm run dl uni

# Download Observer Everyman
npm run dl ever

# Download Observer Speedy
npm run dl spdy

# Get puzzle as base64 for database storage
npm run dl vox -- --base64
```

## Supported Outlets

Currently supported outlets (without authentication):

- `vox` - Vox
- `ever` - Observer (Everyman)
- `spdy` - Observer (Speedy)
- `usa` - USA Today
- `uni` - Universal

## Library Usage (Importable)

jsxword-dl can be imported and used as a library in your JavaScript/TypeScript projects.

### Installation

```bash
# Install from local path
npm install /path/to/jsxword-dl

# Or if published to npm
npm install jsxword-dl

# Or add to package.json
{
  "dependencies": {
    "jsxword-dl": "file:../jsxword-dl"
  }
}
```

### Import and Use

```javascript
import {
  downloadAsBase64,
  downloadAndSave,
  downloadByKeyword,
  downloadByUrl,
  getSupportedOutletsList,
  XWordDLException
} from 'jsxword-dl';

// Download as base64 for database storage
const base64Data = await downloadAsBase64('vox');
await db.puzzles.insert({ outlet: 'vox', data: base64Data });

// Download and save to file
await downloadAndSave('usa', 'my-puzzle.puz');

// Get puzzle object for custom processing
const { puzzle, filename } = await downloadByKeyword('uni');
console.log(`Title: ${puzzle.title}`);
console.log(`Size: ${puzzle.width}x${puzzle.height}`);
console.log(`Clues: ${puzzle.clues.length}`);

// Download with specific date
const result = await downloadByKeyword('usa', { date: '2024-01-15' });

// Download by URL
const { puzzle } = await downloadByUrl('https://www.vox.com/crossword');

// List all supported outlets
const outlets = getSupportedOutletsList();
// [{ command: 'vox', outlet: 'Vox' }, ...]

// Error handling
try {
  await downloadAsBase64('invalid');
} catch (error) {
  if (error instanceof XWordDLException) {
    console.error('Download error:', error.message);
  }
}
```

### API Reference

#### `downloadAsBase64(source, options)`
Download a puzzle and return as base64 string.
- `source`: Outlet keyword (e.g., 'vox') or URL
- `options`: `{ date?, preserve_html?, filename? }`
- Returns: `Promise<string>` - Base64-encoded puzzle data

#### `downloadAndSave(source, filepath, options)`
Download a puzzle and save to file.
- `source`: Outlet keyword or URL
- `filepath`: Path to save puzzle (optional, uses default naming if not provided)
- `options`: `{ date?, preserve_html? }`
- Returns: `Promise<string>` - Saved filename

#### `downloadByKeyword(keyword, options)`
Download a puzzle by outlet keyword.
- `keyword`: Outlet keyword (e.g., 'vox', 'usa', 'uni')
- `options`: `{ date?, preserve_html?, filename? }`
- Returns: `Promise<{ puzzle, filename }>`

#### `downloadByUrl(url, options)`
Download a puzzle by URL.
- `url`: Full URL to puzzle
- `options`: `{ preserve_html?, filename? }`
- Returns: `Promise<{ puzzle, filename }>`

#### `getSupportedOutletsList()`
Get list of all supported outlets.
- Returns: `Array<{ command, outlet }>`

See `example-library-usage.js` for complete usage examples.

## Notes

This JavaScript version does not currently support:
- New York Times downloader (requires authentication)
- Any downloaders that require username/password authentication

## License

MIT
