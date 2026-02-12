import * as cheerio from 'cheerio';
import { URL } from 'url';
import AmuseLabsDownloader from './AmuseLabsDownloader.js';
import { XWordDLException } from '../util/utils.js';

class ObserverDownloader extends AmuseLabsDownloader {
  constructor(kwargs = {}) {
    super(kwargs);
    this.landingPageUrl = '';
    this.articleUrlString = '';
  }

  async findLatest() {
    const res = await this.session.get(this.landingPageUrl);
    const $ = cheerio.load(res.data);

    const links = [];
    $('a').each((i, link) => {
      const href = $(link).attr('href');
      if (href) links.push(href);
    });

    const latestLink = links.find(link => link.includes(this.articleUrlString));
    if (!latestLink) {
      throw new XWordDLException('Unable to find latest puzzle link');
    }

    const latestAbsUrl = new URL(latestLink, 'https://observer.co.uk').href;
    return latestAbsUrl;
  }

  async findSolver(url) {
    const solverUrl = await this.constructor.matchesEmbedPattern(url);
    if (!solverUrl) {
      throw new XWordDLException(`Unable to find a puzzle at ${url}`);
    }
    return solverUrl;
  }

  async parseXword(xwData) {
    const puzzle = await super.parseXword(xwData);

    const guessedDateMatch = puzzle.title.match(/\((.+)\)/);
    if (guessedDateMatch) {
      this.date = new Date(guessedDateMatch[1]);
    }

    return puzzle;
  }
}

export class EverymanDownloader extends ObserverDownloader {
  static command = 'ever';
  static outlet = 'Observer';
  static outletPrefix = 'Observer';

  constructor(kwargs = {}) {
    super(kwargs);
    this.landingPageUrl = 'https://observer.co.uk/topics/everyman';
    this.articleUrlString = '/puzzles/everyman/article';
  }

  static matchesUrl(urlComponents) {
    return (
      urlComponents.hostname.includes('observer.co.uk') &&
      urlComponents.pathname.includes('/puzzles/everyman/article')
    );
  }
}

export class SpeedyDownloader extends ObserverDownloader {
  static command = 'spdy';
  static outlet = 'Observer';
  static outletPrefix = 'Observer';

  constructor(kwargs = {}) {
    super(kwargs);
    this.landingPageUrl = 'https://observer.co.uk/topics/speedy';
    this.articleUrlString = '/puzzles/speedy/article';
  }

  static matchesUrl(urlComponents) {
    return (
      urlComponents.hostname.includes('observer.co.uk') &&
      urlComponents.pathname.includes('/puzzles/speedy/article')
    );
  }
}
