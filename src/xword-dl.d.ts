// Type definitions for xword-dl-js

export interface Puzzle {
  title: string;
  author: string;
  copyright: string;
  notes: string;
  width: number;
  height: number;
  solution: string;
  fill: string;
  clues: string[];
  extensions: Record<string, any>;
  solutionState: number;
  toBytes(): Buffer;
  save(filename: string): void;
}

export interface DownloadOptions {
  date?: string;
  preserve_html?: boolean;
  filename?: string;
}

export interface DownloadResult {
  puzzle: Puzzle;
  filename: string;
}

export interface OutletInfo {
  command: string;
  outlet: string;
}

/**
 * Download a puzzle by keyword (outlet command)
 * @param keyword - Outlet keyword (e.g., 'vox', 'usa', 'uni')
 * @param options - Download options
 * @returns Promise resolving to puzzle and filename
 */
export function downloadByKeyword(
  keyword: string,
  options?: DownloadOptions
): Promise<DownloadResult>;

/**
 * Download a puzzle by URL
 * @param url - Full URL to puzzle
 * @param options - Download options
 * @returns Promise resolving to puzzle and filename
 */
export function downloadByUrl(
  url: string,
  options?: DownloadOptions
): Promise<DownloadResult>;

/**
 * Download a puzzle and return as base64 string
 * @param source - Keyword or URL
 * @param options - Download options
 * @returns Promise resolving to base64-encoded puzzle data
 */
export function downloadAsBase64(
  source: string,
  options?: DownloadOptions
): Promise<string>;

/**
 * Download a puzzle and save to file
 * @param source - Keyword or URL
 * @param filepath - Path to save puzzle (optional)
 * @param options - Download options
 * @returns Promise resolving to saved filename
 */
export function downloadAndSave(
  source: string,
  filepath?: string,
  options?: DownloadOptions
): Promise<string>;

/**
 * Get list of supported outlets
 * @returns Array of outlet information
 */
export function getSupportedOutletsList(): OutletInfo[];

/**
 * Exception thrown by xword-dl-js
 */
export class XWordDLException extends Error {
  constructor(message: string);
}
