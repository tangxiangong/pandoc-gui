// Re-export all utilities from centralized modules
export * from "./types.js";
export * from "./commands.js";
export * from "./message-utils.js";
export * from "./history-utils.js";
export * from "./conversion-utils.js";
export * from "./app-state.js";
export * from "./event-handlers.js";
export * from "./editor-utils.js";

// File utils - explicit exports to avoid conflicts
export {
  isPdfFile,
  getBaseName,
  getFileNameWithoutExtension,
  generateOutputPath,
  generateSuggestedFilename,
  addFileToProgress,
  removeFileFromProgress,
  clearAllFiles,
  resetProgressToPending,
  updateConversionProgress as updateFileConversionProgress,
  findProgressEntry,
} from "./file-utils.js";

// Legacy exports for backward compatibility
export type {
  DropPayload,
  ConversionStatus,
  ConversionOptions,
  PreviewOptions,
  InputFormat,
  OutputFormat,
  MessageType,
} from "./types.js";

export { availableInputFormats, availableOutputFormats } from "./types.js";
