import fs from 'fs';

// Simple PUZ file encoder based on the .puz file format specification
export class Puzzle {
  constructor() {
    this.title = '';
    this.author = '';
    this.copyright = '';
    this.notes = '';
    this.width = 0;
    this.height = 0;
    this.solution = '';
    this.fill = '';
    this.clues = [];
    this.extensions = {};
    this.solutionState = 0;
  }

  toBytes() {
    const buffer = [];

    // Header
    buffer.push(...Buffer.from([0x41, 0x43, 0x52, 0x4F, 0x53, 0x53, 0x26, 0x44, 0x4F, 0x57, 0x4E, 0x00])); // "ACROSS&DOWN\0"
    buffer.push(...Buffer.from([0x00, 0x00])); // Checksum placeholder
    buffer.push(...Buffer.from([0x49, 0x43, 0x48, 0x45, 0x41, 0x54, 0x45, 0x44])); // File magic "ICHEATED"
    buffer.push(...Buffer.from([0x00, 0x00])); // CIB checksum placeholder
    buffer.push(...Buffer.from([0x00, 0x00, 0x00, 0x00])); // Masked checksums

    // Version string
    buffer.push(...Buffer.from('1.3\0'));

    // Reserved
    buffer.push(...Buffer.from([0x00, 0x00]));

    // Scrambled checksum
    buffer.push(...Buffer.from([0x00, 0x00]));

    // Reserved
    for (let i = 0; i < 12; i++) buffer.push(0x00);

    // Width and height
    buffer.push(this.width);
    buffer.push(this.height);

    // Number of clues
    const numClues = this.clues.length;
    buffer.push(numClues & 0xFF);
    buffer.push((numClues >> 8) & 0xFF);

    // Puzzle type (1 = normal)
    buffer.push(...Buffer.from([0x01, 0x00]));

    // Scrambled state
    buffer.push(...Buffer.from([0x00, 0x00]));

    // Solution
    buffer.push(...Buffer.from(this.solution.replace(/\./g, '.')));

    // Player state
    buffer.push(...Buffer.from(this.fill.replace(/-/g, '-')));

    // Strings section (null-terminated)
    buffer.push(...Buffer.from(this.title || ''), 0x00);
    buffer.push(...Buffer.from(this.author || ''), 0x00);
    buffer.push(...Buffer.from(this.copyright || ''), 0x00);

    // Clues
    for (const clue of this.clues) {
      buffer.push(...Buffer.from(clue || ''), 0x00);
    }

    // Notes
    buffer.push(...Buffer.from(this.notes || ''), 0x00);

    return Buffer.from(buffer);
  }

  save(filename) {
    const bytes = this.toBytes();
    fs.writeFileSync(filename, bytes);
  }
}



