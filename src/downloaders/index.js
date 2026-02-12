import VoxDownloader from './VoxDownloader.js';
import { EverymanDownloader, SpeedyDownloader } from './ObserverDownloader.js';
import { USATodayDownloader, UniversalDownloader } from './AMUniversalDownloader.js';

export const plugins = [
  VoxDownloader,
  EverymanDownloader,
  SpeedyDownloader,
  USATodayDownloader,
  UniversalDownloader
];

export function getPlugins() {
  return plugins;
}
