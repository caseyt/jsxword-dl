import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import BaseDownloader from './BaseDownloader.js';
import { XWordDLException } from '../util/utils.js';
import { Puzzle } from '../util/Puzzle.js';

const parseXml = promisify(parseString);

class AMUniversalDownloader extends BaseDownloader {
  constructor(kwargs = {}) {
    super(kwargs);
    this.urlBlob = null;
  }

  async findByDate(dt) {
    if (!this.urlBlob) {
      throw new XWordDLException('Blob URL was not set by AMUniversal subclass.');
    }

    this.date = dt;

    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const urlFormat = `${year}-${month}-${day}`;

    return this.urlBlob + urlFormat + '/data.json';
  }

  async findLatest() {
    const dt = new Date();
    return this.findByDate(dt);
  }

  async findSolver(url) {
    return url;
  }

  async fetchData(solverUrl) {
    let attempts = 3;
    let xwordData;

    while (attempts > 0) {
      try {
        const res = await axios.get(solverUrl);
        xwordData = res.data;
        break;
      } catch (error) {
        console.error('Unable to download puzzle data. Trying again.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts--;
      }
    }

    if (!xwordData) {
      throw new XWordDLException('Unable to download puzzle data.');
    }

    return xwordData;
  }

  processClues(clueList) {
    return clueList;
  }

  async parseXword(xwData) {
    const fetched = {};
    for (const field of ['Title', 'Author', 'Editor', 'Copyright']) {
      fetched[field] = decodeURIComponent(xwData[field] || '').trim();
    }

    const puzzle = new Puzzle();
    puzzle.title = fetched.Title || '';
    puzzle.author = `${fetched.Author || ''} / Ed. ${fetched.Editor || ''}`;
    puzzle.copyright = fetched.Copyright || '';
    puzzle.width = parseInt(xwData.Width);
    puzzle.height = parseInt(xwData.Height);

    const solution = xwData.AllAnswer.replace(/-/g, '.');
    puzzle.solution = solution;

    let fill = '';
    for (const letter of solution) {
      fill += letter === '.' ? '.' : '-';
    }
    puzzle.fill = fill;

    const acrossClues = xwData.AcrossClue.split('\n');
    const downClues = this.processClues(xwData.DownClue.split('\n'));

    const cluesList = [...acrossClues, ...downClues];

    const cluesListStripped = cluesList.map(clue => {
      const parts = clue.split('|');
      return {
        number: parts[0],
        clue: parts[1]
      };
    });

    const cluesSorted = cluesListStripped.sort((a, b) => {
      return parseInt(a.number) - parseInt(b.number);
    });

    puzzle.clues = cluesSorted.map(c => c.clue);

    return puzzle;
  }
}

export class USATodayDownloader extends BaseDownloader {
  static command = 'usa';
  static outlet = 'USA Today';
  static outletPrefix = 'USA Today';

  constructor(kwargs = {}) {
    super(kwargs);
  }

  async findByDate(dt) {
    this.date = dt;

    const year = String(dt.getFullYear()).slice(-2);
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');

    const url = `http://picayune.uclick.com/comics/usaon/data/usaon${year}${month}${day}-data.xml`;

    try {
      await axios.head(url);
    } catch (error) {
      throw new XWordDLException('Unable to find puzzle for date provided.');
    }

    return url;
  }

  async findLatest() {
    let checkDate = new Date();
    let daysToCheck = 3;

    while (daysToCheck > 0) {
      try {
        const url = await this.findByDate(checkDate);
        return url;
      } catch (error) {
        daysToCheck--;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    throw new XWordDLException('Unable to find latest puzzle.');
  }

  async findSolver(url) {
    return url;
  }

  async fetchData(solverUrl) {
    const res = await axios.get(solverUrl);
    return res.data;
  }

  async parseXword(xwData) {
    let xw;
    try {
      const parsed = await parseXml(xwData);
      xw = parsed.crossword;
    } catch (error) {
      throw new XWordDLException('Puzzle data malformed, cannot parse.');
    }

    const puzzle = new Puzzle();

    puzzle.title = decodeURIComponent(xw.Title?.[0]?.$.v || '');
    puzzle.author = decodeURIComponent(xw.Author?.[0]?.$.v || '');
    puzzle.copyright = decodeURIComponent(xw.Copyright?.[0]?.$.v || '');

    puzzle.width = parseInt(xw.Width[0].$.v);
    puzzle.height = parseInt(xw.Height[0].$.v);

    puzzle.solution = xw.AllAnswer[0].$.v.replace(/-/g, '.');
    puzzle.fill = puzzle.solution.split('').map(c => c === '.' ? '.' : '-').join('');

    const acrossClues = Object.values(xw.across[0]).filter(c => c.$ && c.$.cn);
    const downClues = Object.values(xw.down[0]).filter(c => c.$ && c.$.cn);
    const allClues = [...acrossClues, ...downClues];

    const xwClues = allClues.sort((a, b) => {
      return parseInt(a.$.cn) - parseInt(b.$.cn);
    });

    puzzle.clues = xwClues.map(c => decodeURIComponent(c.$.c || ''));

    return puzzle;
  }
}

export class UniversalDownloader extends AMUniversalDownloader {
  static command = 'uni';
  static outlet = 'Universal';
  static outletPrefix = 'Universal';

  constructor(kwargs = {}) {
    super(kwargs);
    this.urlBlob = 'https://gamedata.services.amuniversal.com/c/uucom/l/U2FsdGVkX18YuMv20%2B8cekf85%2Friz1H%2FzlWW4bn0cizt8yclLsp7UYv34S77X0aX%0Axa513fPTc5RoN2wa0h4ED9QWuBURjkqWgHEZey0WFL8%3D/g/fcx/d/';
  }
}
