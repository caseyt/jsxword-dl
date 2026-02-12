# jsxword-dl Quick Start Guide

## Installation
```bash
npm install
```

## CLI Usage

### Basic Downloads
```bash
# Download latest Vox puzzle
npm run dl vox

# Download USA Today
npm run dl usa

# Download Universal
npm run dl uni
```

### Advanced Options
```bash
# Specific date
npm run dl vox -- --date 2024-01-15

# Custom filename
npm run dl usa -- -o my-puzzle.puz

# Base64 output (no file)
npm run dl vox -- --base64
```

## Library Usage

### Import
```javascript
import {
  downloadAsBase64,
  downloadAndSave,
  downloadByKeyword,
  getSupportedOutletsList
} from 'jsxword-dl';
```

### Quick Examples
```javascript
// Download as base64
const base64 = await downloadAsBase64('vox');

// Download and save
await downloadAndSave('usa', 'puzzle.puz');

// Get puzzle object
const { puzzle } = await downloadByKeyword('uni');
console.log(puzzle.title, puzzle.width, puzzle.height);

// List outlets
const outlets = getSupportedOutletsList();
// [{ command: 'vox', outlet: 'Vox' }, ...]
```

## Supported Outlets
| Command | Outlet |
|---------|--------|
| `vox` | Vox |
| `usa` | USA Today |
| `uni` | Universal |
| `ever` | Observer (Everyman) |
| `spdy` | Observer (Speedy) |

## Common Use Cases

### Store in Database
```javascript
const base64 = await downloadAsBase64('vox');
await db.insert({ outlet: 'vox', data: base64 });
```

### Download All Daily Puzzles
```javascript
const outlets = ['vox', 'usa', 'uni'];
for (const outlet of outlets) {
  await downloadAndSave(outlet);
}
```

### Get Specific Date
```javascript
const { puzzle } = await downloadByKeyword('usa', {
  date: '2024-01-15'
});
```

## Files Created
- CLI saves to: `{Outlet} - {Date} - {Title}.puz`
- Example: `USA Today - 20260212 - Spinning Tops.puz`

## Need Help?
- Run `npm run dl -- --help`
- See `example-library-usage.js` for code examples
- See `README.md` for full documentation
