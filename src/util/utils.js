import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { htmlToText } from 'html-to-text';
import * as chrono from 'chrono-node';

// Configuration path
const CONFIG_DIR = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'xword-dl', 'xword-dl.yaml');

// Ensure config directory exists
if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

// Ensure config file exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, '');
}

export class XWordDLException extends Error {
  constructor(message) {
    super(message);
    this.name = 'XWordDLException';
  }
}

export function savePuzzle(puzzle, filename) {
  if (!fs.existsSync(filename)) {
    puzzle.save(filename);
    const msg = process.stdout.isTTY
      ? `Puzzle downloaded and saved as ${filename}.`
      : filename;
    console.log(msg);
  } else {
    console.error(`Not saving: a file named ${filename} already exists.`);
  }
}

export function joinBylines(bylineList, andWord = '&') {
  if (bylineList.length > 2) {
    return bylineList.slice(0, -1).join(', ') + `, ${andWord} ` + bylineList[bylineList.length - 1];
  }
  return bylineList.join(` ${andWord} `);
}

export function removeInvalidCharsFromFilename(filename) {
  const invalidChars = /[<>:"/\\|?*]/g;
  return filename.replace(invalidChars, '');
}

export function cleanup(field, preserveHtml = false) {
  if (!field) return '';

  let cleaned = field;

  if (preserveHtml) {
    // Remove emojis with regex
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  } else {
    cleaned = htmlToText(cleaned, {
      wordwrap: false,
      preserveNewlines: false
    });
    // Remove emojis with regex
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  }

  // Remove non-ASCII characters similar to unidecode
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return cleaned;
}

export function sanitizeForPuzFile(puzzle, preserveHtml = false) {
  puzzle.title = cleanup(puzzle.title, preserveHtml);
  puzzle.author = cleanup(puzzle.author, preserveHtml);
  puzzle.copyright = cleanup(puzzle.copyright, preserveHtml);
  puzzle.notes = cleanup(puzzle.notes, preserveHtml);
  puzzle.clues = puzzle.clues.map(clue => cleanup(clue, preserveHtml));

  return puzzle;
}

export function parseDate(enteredDate) {
  const results = chrono.parse(enteredDate, new Date(), { forwardDate: false });
  if (results && results.length > 0) {
    return results[0].start.date();
  }
  return null;
}

export function parseDateOrExit(enteredDate) {
  const guessedDate = parseDate(enteredDate);

  if (!guessedDate) {
    throw new XWordDLException(`Unable to determine a date from "${enteredDate}".`);
  }

  return guessedDate;
}

export function updateConfigFile(heading, newValuesDict) {
  let config = {};

  if (fs.existsSync(CONFIG_PATH)) {
    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    if (fileContent.trim()) {
      config = yaml.load(fileContent) || {};
    }
  }

  if (!config[heading]) {
    config[heading] = {};
  }

  Object.assign(config[heading], newValuesDict);

  fs.writeFileSync(CONFIG_PATH, yaml.dump(config));
}

export function readConfigValues(heading) {
  let config = {};

  if (fs.existsSync(CONFIG_PATH)) {
    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    if (fileContent.trim()) {
      config = yaml.load(fileContent) || {};
    }
  }

  const rawSubsettings = config[heading] || {};

  // Convert keys from '-' to '_' for consistency
  const subsettings = {};
  for (const key in rawSubsettings) {
    subsettings[key.replace(/-/g, '_')] = rawSubsettings[key];
  }

  return subsettings;
}
