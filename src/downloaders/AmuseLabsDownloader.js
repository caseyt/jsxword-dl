import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import BaseDownloader from './BaseDownloader.js';
import { XWordDLException } from '../util/utils.js';
import { Puzzle } from '../util/Puzzle.js';

export default class AmuseLabsDownloader extends BaseDownloader {
  constructor(kwargs = {}) {
    super(kwargs);
    this.id = null;
    this.pickerUrl = null;
    this.urlFromId = null;
  }

  static matchesUrl(urlComponents) {
    return urlComponents.hostname.includes('amuselabs.com');
  }

  static async matchesEmbedPattern(url = '', pageSource = '') {
    if (url && !pageSource) {
      const res = await axios.get(url);
      pageSource = res.data;
    }

    if (!pageSource) {
      return null;
    }

    const $ = cheerio.load(pageSource);

    // Find iframes with crossword sources
    const sources = [];
    $('iframe').each((i, iframe) => {
      const src = $(iframe).attr('data-crossword-url') ||
                  $(iframe).attr('data-src') ||
                  $(iframe).attr('src');
      if (src && src !== 'about:blank') {
        const absoluteUrl = new URL(src, url).href;
        sources.push(absoluteUrl);
      }
    });

    for (const embedSrc of sources) {
      const parsedUrl = new URL(embedSrc);
      if (parsedUrl.hostname.includes('amuselabs.com')) {
        if (parsedUrl.pathname.includes('crossword')) {
          return embedSrc;
        } else if (parsedUrl.pathname.endsWith('date-picker')) {
          const queries = new URLSearchParams(parsedUrl.search);
          if (queries.has('idx')) {
            const res = await axios.get(embedSrc);
            const index = parseInt(queries.get('idx')) - 1;
            const puzzleId = AmuseLabsDownloader._selectPuzzleAtIndexFromDatePicker(res.data, index);
            const puzzleUrl = `${embedSrc.replace('date-picker', 'crossword')}&id=${puzzleId}`;
            return puzzleUrl;
          }
        }
      }
    }

    // Check for puzzleme embed
    const scriptSources = [];
    $('script').each((i, script) => {
      const src = $(script).attr('src');
      if (src) scriptSources.push(src);
    });

    if (scriptSources.some(s => s.endsWith('puzzleme-embed.js'))) {
      let basePath = '';
      let puzzleId = '';
      let puzzleSet = '';

      const basePathMatch = pageSource.match(/PM_BasePath\s*=\s*"(.*)"/);
      if (basePathMatch) {
        basePath = basePathMatch[1];
      }

      const embedDiv = $('.pm-embed-div');
      if (embedDiv.length) {
        puzzleId = embedDiv.attr('data-id');
        puzzleSet = embedDiv.attr('data-set');
      }

      if (basePath && puzzleId && puzzleSet) {
        return `${basePath}crossword?id=${puzzleId}&set=${puzzleSet}`;
      }
    }

    return null;
  }

  async findLatest() {
    if (!this.pickerUrl || !this.urlFromId) {
      throw new XWordDLException('This outlet does not support finding the latest crossword.');
    }

    const res = await axios.get(this.pickerUrl);

    this.id = AmuseLabsDownloader._selectPuzzleAtIndexFromDatePicker(res.data, 0);
    this.getAndAddPickerToken(res.data);

    return this.findPuzzleUrlFromId(this.id);
  }

  static _selectPuzzleAtIndexFromDatePicker(pickerSrc, index = 0) {
    if (!pickerSrc) {
      throw new XWordDLException('Bad call to puzzle selection function. Report this as a bug.');
    }

    const $ = cheerio.load(pickerSrc);
    const paramTag = $('#params');

    if (!paramTag.length) {
      throw new XWordDLException('Unable to find params script tag.');
    }

    const paramObj = JSON.parse(paramTag.html() || '{}');
    const puzzles = paramObj.streakInfo || [];

    if (!puzzles.length) {
      throw new XWordDLException('Unable to find puzzles data from picker page.');
    }

    const selectedId = puzzles[index]?.puzzleDetails?.puzzleId;

    if (!selectedId) {
      throw new XWordDLException('Unexpected puzzle metadata format. Please report this as a bug.');
    }

    return selectedId;
  }

  getAndAddPickerToken(pickerSource) {
    if (!this.pickerUrl) {
      throw new XWordDLException('No picker URL was available. Please report this as a bug.');
    }

    let rawsps;

    if (pickerSource.includes('pickerParams.rawsps')) {
      const lines = pickerSource.split('\n');
      for (const line of lines) {
        if (line.includes('pickerParams.rawsps')) {
          rawsps = line.trim().split("'")[1];
          break;
        }
      }
    } else {
      const $ = cheerio.load(pickerSource);
      const paramTag = $('#params');
      const paramObj = paramTag.length ? JSON.parse(paramTag.html() || '{}') : {};
      rawsps = paramObj.rawsps;
    }

    if (rawsps) {
      const pickerParams = JSON.parse(Buffer.from(rawsps, 'base64').toString('utf-8'));
      const token = pickerParams.loadToken;
      if (token) {
        this.urlFromId += '&loadToken=' + token;
      }
    }
  }

  findPuzzleUrlFromId(puzzleId) {
    if (!this.urlFromId) {
      throw new XWordDLException('No URL for puzzle IDs was available. Please report this as a bug.');
    }
    return this.urlFromId.replace('{puzzle_id}', puzzleId);
  }

  guessDateFromId(puzzleId) {
    // Subclass method to set date from an AmuseLabs id, if possible
  }

  async findSolver(url) {
    return url;
  }

  async fetchData(solverUrl) {
    const res = await this.session.get(solverUrl);

    if (!res.status === 200 || res.data.includes('The puzzle you are trying to access was not found')) {
      throw new XWordDLException(`Could not fetch solver at ${solverUrl}`);
    }

    let rawc;

    if (res.data.includes('window.rawc') || res.data.includes('window.puzzleEnv.rawc')) {
      const lines = res.data.split('\n');
      for (const line of lines) {
        if (line.includes('window.rawc') || line.includes('window.puzzleEnv.rawc')) {
          rawc = line.trim().split("'")[1];
          break;
        }
      }
    } else {
      const $ = cheerio.load(res.data);
      const scriptTag = $('#params');

      if (!scriptTag.length) {
        throw new XWordDLException('Crossword puzzle not found. Could not find script tag.');
      }

      const paramObj = JSON.parse(scriptTag.html() || '{}');
      rawc = paramObj.rawc || '';
    }

    if (!rawc) {
      throw new XWordDLException('Unable to find rawc object in AmuseLabs page');
    }

    const xwordData = JSON.parse(deobfuscateRawc(rawc));

    if (!xwordData) {
      throw new XWordDLException('Unable to decode AmuseLabs rawc object');
    }

    return xwordData;
  }

  async parseXword(xwData) {
    const puzzle = new Puzzle();
    puzzle.title = (xwData.title || '').trim();
    puzzle.author = (xwData.author || '').trim();
    puzzle.copyright = (xwData.copyright || '').trim();
    puzzle.width = xwData.w;
    puzzle.height = xwData.h;

    const timestamp = Math.floor((xwData.publishTime || 0) / 1000);
    if (timestamp && !this.date) {
      this.date = new Date(timestamp * 1000);
    }

    const markupData = xwData.cellInfos || [];
    const circled = markupData
      .filter(square => square.isCircled)
      .map(square => [square.x, square.y]);

    let solution = '';
    let fill = '';
    let markup = Buffer.alloc(0);
    const rebusBoard = [];
    let rebusIndex = 0;
    let rebusTable = '';

    const box = xwData.box;
    for (let rowNum = 0; rowNum < xwData.h; rowNum++) {
      for (let colNum = 0; colNum < box.length; colNum++) {
        const cell = box[colNum][rowNum];
        if (cell === '\x00') {
          solution += '.';
          fill += '.';
          markup = Buffer.concat([markup, Buffer.from([0x00])]);
          rebusBoard.push(0);
        } else if (cell.length === 1) {
          solution += cell;
          fill += '-';
          const isCircled = circled.some(([x, y]) => x === colNum && y === rowNum);
          markup = Buffer.concat([markup, Buffer.from([isCircled ? 0x80 : 0x00])]);
          rebusBoard.push(0);
        } else if (!cell) {
          solution += 'X';
          fill += '-';
          markup = Buffer.concat([markup, Buffer.from([0x00])]);
          rebusBoard.push(0);
        } else {
          solution += cell[0];
          fill += '-';
          rebusBoard.push(rebusIndex + 1);
          rebusTable += `${rebusIndex.toString().padStart(2, ' ')}:${cell};`;
          rebusIndex++;
        }
      }
    }

    puzzle.solution = solution;
    puzzle.fill = fill;

    if (solution.split('').every(c => c === '.' || c === 'X')) {
      puzzle.solutionState = 0x0002;
      puzzle.title += ' - no solution provided';
    }

    const placedWords = xwData.placedWords;
    const sortedWords = placedWords.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return !a.acrossNotDown ? -1 : 1;
    });

    const clues = sortedWords.map(word => word.clue?.clue || '');
    puzzle.clues = clues;

    const hasMarkup = markup.includes(0x80);
    const hasRebus = rebusBoard.some(v => v !== 0);

    if (hasMarkup) {
      puzzle.extensions = puzzle.extensions || {};
      puzzle.extensions.GEXT = markup;
    }

    if (hasRebus) {
      puzzle.extensions = puzzle.extensions || {};
      puzzle.extensions.GRBS = Buffer.from(rebusBoard);
      puzzle.extensions.RTBL = Buffer.from(rebusTable, 'latin1');
    }

    return puzzle;
  }

  pickFilename(puzzle, kwargs = {}) {
    if (!this.date && this.id) {
      this.guessDateFromId(this.id);
    }
    return super.pickFilename(puzzle, kwargs);
  }
}

// Helper functions for rawc deobfuscation
function isValidKeyPrefix(rawc, keyPrefix, spacing) {
  try {
    let pos = 0;
    let chunk = [];

    while (pos < rawc.length) {
      const startPos = pos;
      let keyIndex = 0;

      while (keyIndex < keyPrefix.length && pos < rawc.length) {
        const chunkLength = Math.min(keyPrefix[keyIndex], rawc.length - pos);
        const segment = rawc.substring(pos, pos + chunkLength).split('').reverse().join('');
        chunk.push(segment);
        pos += chunkLength;
        keyIndex++;
      }

      const chunkStr = chunk.join('');

      const base64Start = Math.floor((startPos + 3) / 4) * 4 - startPos;
      const base64End = Math.floor(pos / 4) * 4 - startPos;

      if (base64Start >= chunkStr.length || base64End <= base64Start) {
        chunk = [];
        pos += spacing;
        continue;
      }

      const b64Chunk = chunkStr.substring(base64Start, base64End);

      try {
        const decoded = Buffer.from(b64Chunk, 'base64');

        for (const byte of decoded) {
          if ((byte < 32 && ![0x09, 0x0A, 0x0D].includes(byte)) ||
              byte === 0xC0 || byte === 0xC1 || byte >= 0xF5) {
            return false;
          }
        }
      } catch (e) {
        return false;
      }

      pos += spacing;
      chunk = [];
    }

    return true;
  } catch (e) {
    return false;
  }
}

function deobfuscateRawcWithKey(rawc, key) {
  try {
    const buffer = rawc.split('');
    let i = 0;
    let segmentCount = 0;

    while (i < buffer.length - 1) {
      const segmentLength = Math.min(key[segmentCount % key.length], buffer.length - i);
      segmentCount++;

      let left = i;
      let right = i + segmentLength - 1;

      while (left < right) {
        [buffer[left], buffer[right]] = [buffer[right], buffer[left]];
        left++;
        right--;
      }

      i += segmentLength;
    }

    const reversedStr = buffer.join('');
    const decodedBytes = Buffer.from(reversedStr, 'base64');
    return decodedBytes.toString('utf-8');
  } catch (e) {
    return '';
  }
}

function deobfuscateRawc(rawc) {
  const yePos = rawc.indexOf('ye');
  const wePos = rawc.indexOf('we');

  const firstKeyDigit = Math.min(
    yePos !== -1 ? yePos : rawc.length,
    wePos !== -1 ? wePos : rawc.length
  ) + 2;

  const candidateQueue = firstKeyDigit > 20 ? [[]] : [[firstKeyDigit]];

  while (candidateQueue.length > 0) {
    const candidateKeyPrefix = candidateQueue.shift();

    if (candidateKeyPrefix.length === 7) {
      const deobfuscated = deobfuscateRawcWithKey(rawc, candidateKeyPrefix);
      try {
        JSON.parse(deobfuscated);
        return deobfuscated;
      } catch (e) {
        continue;
      }
    }

    for (let nextDigit = 2; nextDigit <= 20; nextDigit++) {
      const newCandidate = [...candidateKeyPrefix, nextDigit];

      const remainingDigits = 7 - newCandidate.length;
      const minSpacing = 2 * remainingDigits;
      const maxSpacing = 20 * remainingDigits;

      let valid = false;
      for (let spacing = minSpacing; spacing <= maxSpacing; spacing++) {
        if (isValidKeyPrefix(rawc, newCandidate, spacing)) {
          valid = true;
          break;
        }
      }

      if (valid) {
        candidateQueue.push(newCandidate);
      }
    }
  }

  return '{}';
}
