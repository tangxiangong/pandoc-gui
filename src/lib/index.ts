// Main entry point for the lib module
// Re-export all utilities and types for easy importing

// Type definitions
export type {
  DropPayload,
  ConversionStatus,
  ConversionOptions,
  PreviewOptions,
  InputFormat,
  OutputFormat,
  MessageType,
} from "./types";

export { availableInputFormats, availableOutputFormats } from "./types";

// Command functions for Rust backend
export {
  convertFile,
  previewFile,
  openFileInDefaultApp,
  showInFolder,
  loadHistory,
  saveHistory,
  getAppVersion,
} from "./commands";

// File utility functions
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
  updateConversionProgress,
  findProgressEntry,
} from "./file-utils";

// Message and notification utilities
export {
  showMessage,
  formatConversionResultMessage,
  logError,
  logSuccess,
  logWarning,
} from "./message-utils";

// History management utilities
export {
  loadHistoryFromDisk,
  saveHistoryToDisk,
  addToHistory,
  clearConversionHistory,
  deleteHistoryItem,
  findHistoryItem,
  getHistoryStats,
} from "./history-utils";

// Conversion logic
export {
  generatePreview,
  convertSingleFile,
  convertBatchFiles,
  startConversion,
} from "./conversion-utils";

// Application state management
export {
  type AppState,
  initialAppState,
  appState,
  getHasMultipleFiles,
  getHasFiles,
  getHasInput,
  updateInputPaths,
  updateConversionProgress as updateStateConversionProgress,
  updateSelectedFormats,
  updateLoadingState,
  updatePreviewLoadingState,
  updatePreviewDialog,
  updateConversionHistory as updateStateConversionHistory,
  updateAppVersion,
  updateFileState,
  resetAppState,
  resetFileState,
} from "./app-state";

// Event handlers
export {
  handleFileDrop,
  selectFiles,
  setupDragDropListener,
  navigateToEditor,
  handleKeyDown,
  handleFormatChange,
  handlePreviewDialogClose,
  handleFileRemoval,
  handleClearAllFiles,
} from "./event-handlers";
