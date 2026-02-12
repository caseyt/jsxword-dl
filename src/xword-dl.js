// Main library export for programmatic usage

import axios from 'axios';
import { URL } from 'url';
import { getPlugins } from './downloaders/index.js';
import { XWordDLException, parseDateOrExit } from './util/utils.js';

const plugins = getPlugins();

/**
 * Download a puzzle by keyword (outlet command)
 * @param {string} keyword - Outlet keyword (e.g., 'vox', 'usa', 'uni')
 * @param {Object} options - Download options
 * @param {string} [options.date] - Specific date to download
 * @param {boolean} [options.preserve_html] - Preserve HTML in clues
 * @param {string} [options.filename] - Custom filename template
 * @returns {Promise<{puzzle: Puzzle, filename: string}>}
 */
export async function downloadByKeyword(keyword, options = {}) {
  const selectedDownloader = getSupportedOutlets({ commandOnly: true })
    .find(d => d.command === keyword);

  if (!selectedDownloader) {
    throw new XWordDLException(`Keyword ${keyword} not recognized.`);
  }

  const dl = new selectedDownloader(options);
  const date = options.date;

  let puzzleUrl;

  if (!date) {
    puzzleUrl = await dl.findLatest();
  } else if (date && typeof dl.findByDate === 'function') {
    const parsedDate = parseDateOrExit(date);
    dl.date = parsedDate;
    puzzleUrl = await dl.findByDate(parsedDate);
  } else {
    throw new XWordDLException(`Selection by date not available for ${dl.constructor.outlet}.`);
  }

  const puzzle = await dl.download(puzzleUrl);
  const filename = dl.pickFilename(puzzle);

  return { puzzle, filename };
}

/**
 * Download a puzzle by URL
 * @param {string} url - Full URL to puzzle
 * @param {Object} options - Download options
 * @param {boolean} [options.preserve_html] - Preserve HTML in clues
 * @param {string} [options.filename] - Custom filename template
 * @returns {Promise<{puzzle: Puzzle, filename: string}>}
 */
export async function downloadByUrl(url, options = {}) {
  const supportedDownloaders = getSupportedOutlets({ matchesUrl: true });

  let dl = null;
  let puzzleUrl = url;

  for (const DownloaderClass of supportedDownloaders) {
    const urlComponents = new URL(url);

    if (DownloaderClass.matchesUrl(urlComponents)) {
      dl = new DownloaderClass({ url, ...options });
      break;
    }
  }

  if (!dl) {
    const result = await parseForEmbeddedPuzzle(url, options);
    dl = result.dl;
    puzzleUrl = result.puzzleUrl;
  }

  if (dl && puzzleUrl) {
    const puzzle = await dl.download(puzzleUrl);
    const filename = dl.pickFilename(puzzle);
    return { puzzle, filename };
  } else {
    throw new XWordDLException(`Unable to find a puzzle at ${url}.`);
  }
}

/**
 * Download a puzzle and return as base64 string
 * @param {string} source - Keyword or URL
 * @param {Object} options - Download options
 * @returns {Promise<string>} Base64-encoded puzzle data
 */
export async function downloadAsBase64(source, options = {}) {
  let result;

  if (source.startsWith('http')) {
    result = await downloadByUrl(source, options);
  } else {
    result = await downloadByKeyword(source, options);
  }

  const bytes = result.puzzle.toBytes();
  return bytes.toString('base64');
}

/**
 * Download a puzzle and save to file
 * @param {string} source - Keyword or URL
 * @param {string} filepath - Path to save puzzle
 * @param {Object} options - Download options
 * @returns {Promise<string>} Saved filename
 */
export async function downloadAndSave(source, filepath, options = {}) {
  let result;

  if (source.startsWith('http')) {
    result = await downloadByUrl(source, options);
  } else {
    result = await downloadByKeyword(source, options);
  }

  const filename = filepath || result.filename;
  result.puzzle.save(filename.endsWith('.puz') ? filename : filename + '.puz');

  return filename;
}

/**
 * Get list of supported outlets
 * @returns {Array<{command: string, outlet: string}>}
 */
export function getSupportedOutletsList() {
  return getSupportedOutlets({ commandOnly: true })
    .map(d => ({
      command: d.command,
      outlet: d.outlet
    }))
    .sort((a, b) => a.outlet.toLowerCase().localeCompare(b.outlet.toLowerCase()));
}

// Internal helper functions
async function parseForEmbeddedPuzzle(url, options = {}) {
  const supportedDownloaders = getSupportedOutlets({ matchesEmbedPattern: true });

  const res = await axios.get(url, { headers: { 'User-Agent': 'xword-dl-js' } });
  const pageSource = res.data;

  for (const DownloaderClass of supportedDownloaders) {
    const puzzleUrl = await DownloaderClass.matchesEmbedPattern(url, pageSource);
    if (puzzleUrl) {
      return {
        dl: new DownloaderClass({ url, ...options }),
        puzzleUrl
      };
    }
  }

  return { dl: null, puzzleUrl: null };
}

function getSupportedOutlets(options = {}) {
  const { commandOnly = false, matchesUrl = false, matchesEmbedPattern = false } = options;
  const matchedPlugins = [];

  for (const plugin of plugins) {
    if (commandOnly && !plugin.command) {
      continue;
    }

    if (matchesUrl) {
      const hasMatchesUrl = plugin.matchesUrl &&
        plugin.matchesUrl.toString() !== plugin.prototype?.constructor?.matchesUrl?.toString();
      if (!hasMatchesUrl) continue;
    }

    if (matchesEmbedPattern) {
      const hasMatchesEmbedPattern = plugin.matchesEmbedPattern &&
        plugin.matchesEmbedPattern.toString() !== plugin.prototype?.constructor?.matchesEmbedPattern?.toString();
      if (!hasMatchesEmbedPattern) continue;
    }

    matchedPlugins.push(plugin);
  }

  return matchedPlugins;
}

// Export exception for error handling
export { XWordDLException };
