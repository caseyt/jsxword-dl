#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import { URL } from 'url';
import fs from 'fs';
import { getPlugins } from './downloaders/index.js';
import { XWordDLException, parseDateOrExit, savePuzzle } from './util/utils.js';

const VERSION = '0.0.1';
const plugins = getPlugins();

async function byKeyword(keyword, options = {}) {
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

async function byUrl(url, options = {}) {
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
      // Check if the class has implemented matchesUrl
      const hasMatchesUrl = plugin.matchesUrl &&
        plugin.matchesUrl.toString() !== plugin.prototype?.constructor?.matchesUrl?.toString();
      if (!hasMatchesUrl) continue;
    }

    if (matchesEmbedPattern) {
      // Check if the class has implemented matchesEmbedPattern
      const hasMatchesEmbedPattern = plugin.matchesEmbedPattern &&
        plugin.matchesEmbedPattern.toString() !== plugin.prototype?.constructor?.matchesEmbedPattern?.toString();
      if (!hasMatchesEmbedPattern) continue;
    }

    matchedPlugins.push(plugin);
  }

  return matchedPlugins;
}

function getHelpTextFormattedList() {
  let text = '';
  const outlets = getSupportedOutlets({ commandOnly: true })
    .sort((a, b) => a.outlet.toLowerCase().localeCompare(b.outlet.toLowerCase()));

  for (const d of outlets) {
    text += `${d.command.padEnd(5)} ${d.outlet}\n`;
  }

  return text;
}

async function main() {
  const program = new Command();

  program
    .name('jsxword-dl')
    .description(`jsxword-dl is a tool to download online crossword puzzles and save them
locally as AcrossLite-compatible .puz files. It works with supported
sites, a list of which can be found below.

By default, jsxword-dl will download the most recent puzzle available at
a given outlet, and some outlets support searching by date.`)
    .version(VERSION)
    .argument('[source]', `specify a URL or a keyword to select an outlet from which to download a puzzle.

Supported outlet keywords are:
${getHelpTextFormattedList()}`)
    .option('-l, --latest', 'select most recent available puzzle (this is the default behavior)', true)
    .option('-d, --date <date>', 'a specific puzzle date to select')
    .option('--preserve-html', 'preserves any HTML present in scraped puzzle (by default, HTML is converted into plain markdown)', false)
    .option('-o, --output <filename>', 'filename (or filename template) for the saved puzzle')
    .option('--base64', 'output puzzle as base64 string instead of saving to file', false)
    .action(async (source, options) => {
      if (!source) {
        program.help();
        return;
      }

      const downloadOptions = {};
      if (options.preserveHtml) downloadOptions.preserve_html = true;
      if (options.output) downloadOptions.filename = options.output;
      if (options.date) downloadOptions.date = options.date;

      try {
        let puzzle, filename;

        if (source.startsWith('http')) {
          const result = await byUrl(source, downloadOptions);
          puzzle = result.puzzle;
          filename = result.filename;
        } else {
          const result = await byKeyword(source, downloadOptions);
          puzzle = result.puzzle;
          filename = result.filename;
        }

        // Handle output formats
        if (options.base64) {
          // Output as base64
          const bytes = puzzle.toBytes();
          const base64 = bytes.toString('base64');
          console.log(base64);
        } else if (options.output === '-') {
          // Output to stdout
          process.stdout.write(puzzle.toBytes());
        } else {
          // Save to file
          if (!filename.endsWith('.puz')) {
            filename = filename + '.puz';
          }
          savePuzzle(puzzle, filename);
        }
      } catch (error) {
        if (error instanceof XWordDLException) {
          console.error(error.message);
          process.exit(1);
        } else {
          throw error;
        }
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
