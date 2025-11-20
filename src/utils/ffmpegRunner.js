import { AudioProcessingService } from "../services/AudioProcessingService.js";
import { STORAGE } from "./storage.js";

// Thin wrapper around AudioProcessingService to match utils contract
const audioService = new AudioProcessingService(() => STORAGE.base || process.cwd());

export function buildAudioFilter(preset, durationSec) {
  return audioService.buildAudioFilter(preset, durationSec);
}

export function generateFilename(title, preset, outputDir) {
  return audioService.generateUniqueFilename(title, preset, outputDir);
}

export async function runFfmpeg(inputStream, outputPath, audioFilterStr, durationSec, jobId) {
  return audioService.processAudio(inputStream, outputPath, audioFilterStr, durationSec, jobId);
}
