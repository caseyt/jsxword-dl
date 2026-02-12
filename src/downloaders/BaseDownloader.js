import axios from 'axios';
import { URL } from 'url';
import { readConfigValues, removeInvalidCharsFromFilename, sanitizeForPuzFile } from '../util/utils.js';

const VERSION = '0.0.1';

export default class BaseDownloader {
  static command = '';
  static outlet = '';
  static outletPrefix = null;

  constructor(kwargs = {}) {
    this.date = kwargs.date || null;
    const urlObj = kwargs.url ? new URL(kwargs.url) : null;
    this.netloc = urlObj ? urlObj.hostname : '';

    this.settings = {};
    this.settings.headers = { 'User-Agent': `xword-dl-js/${VERSION}` };

    // Load config values
    Object.assign(this.settings, readConfigValues('general'));

    if (kwargs.inherit_settings) {
      Object.assign(this.settings, readConfigValues(kwargs.inherit_settings));
    }

    if (this.constructor.command) {
      Object.assign(this.settings, readConfigValues(this.constructor.command));
    } else if (kwargs.url) {
      Object.assign(this.settings, readConfigValues('url'));
      Object.assign(this.settings, readConfigValues(this.netloc));
    }

    Object.assign(this.settings, kwargs);

    // Create axios instance with settings
    this.session = axios.create({
      headers: this.settings.headers || {},
      // Note: axios doesn't have a direct cookies interface like requests.Session
      // For cookies, you'd need to use a cookie jar library
    });
  }

  pickFilename(puzzle, kwargs = {}) {
    const tokens = {
      outlet: this.constructor.outlet || '',
      prefix: this.constructor.outletPrefix || '',
      title: puzzle.title || '',
      author: puzzle.author || '',
      cmd: this.constructor.command || this.netloc || '',
      netloc: this.netloc || ''
    };

    // Override with kwargs if provided
    for (const key in tokens) {
      if (kwargs[key] !== undefined) {
        tokens[key] = kwargs[key];
      }
    }

    const date = kwargs.date || this.date;

    let template = this.settings.filename || '';

    if (!template) {
      template += tokens.prefix ? '%prefix' : '%author';
      template += date ? ' - %Y%m%d' : '';
      template += tokens.title ? ' - %title' : '';
    }

    // Replace tokens
    for (const token in tokens) {
      const replacement = kwargs[token] || tokens[token];
      const cleaned = removeInvalidCharsFromFilename(replacement);
      template = template.replace(`%${token}`, cleaned);
    }

    // Format date if present
    if (date) {
      template = this.formatDateInTemplate(template, date);
    }

    if (!template.endsWith('.puz')) {
      template += '.puz';
    }

    // Clean up multiple spaces
    template = template.replace(/\s+/g, ' ').trim();

    return template;
  }

  formatDateInTemplate(template, date) {
    // Simple date formatting - replace common strftime patterns
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return template
      .replace('%Y', year)
      .replace('%m', month)
      .replace('%d', day);
  }

  async download(url) {
    const solverUrl = await this.findSolver(url);
    const xwordData = await this.fetchData(solverUrl);
    let puzzle = await this.parseXword(xwordData);

    puzzle = sanitizeForPuzFile(
      puzzle,
      this.settings.preserve_html || false
    );

    return puzzle;
  }

  async findSolver(url) {
    throw new Error('findSolver must be implemented by subclass');
  }

  async fetchData(solverUrl) {
    throw new Error('fetchData must be implemented by subclass');
  }

  async parseXword(xwData) {
    throw new Error('parseXword must be implemented by subclass');
  }

  async findLatest() {
    throw new Error('findLatest must be implemented by subclass');
  }

  async findByDate(dt) {
    throw new Error('findByDate must be implemented by subclass');
  }

  static matchesUrl(urlComponents) {
    throw new Error('matchesUrl must be implemented by subclass');
  }

  static matchesEmbedPattern(url, pageSource) {
    throw new Error('matchesEmbedPattern must be implemented by subclass');
  }

  static async authenticate(username, password) {
    throw new Error('authenticate must be implemented by subclass');
  }
}
