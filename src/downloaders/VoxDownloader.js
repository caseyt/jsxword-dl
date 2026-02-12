import AmuseLabsDownloader from './AmuseLabsDownloader.js';

export default class VoxDownloader extends AmuseLabsDownloader {
  static command = 'vox';
  static outlet = 'Vox';
  static outletPrefix = 'Vox';

  constructor(kwargs = {}) {
    super(kwargs);

    this.pickerUrl = 'https://cdn3.amuselabs.com/vox/date-picker?set=vox';
    this.urlFromId = 'https://cdn3.amuselabs.com/vox/crossword?id={puzzle_id}&set=vox';
  }

  guessDateFromId(puzzleId) {
    const dateStr = puzzleId.split('_')[1];
    if (dateStr) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      this.date = new Date(`${year}-${month}-${day}`);
    }
  }
}
