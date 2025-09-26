import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import type { ConversionStatus } from "./types.js";

export interface ConversionOptions {
  input_path: string;
  output_format: string;
  output_path: string;
  input_format: string;
}

export interface PreviewOptions {
  input_path: string;
  input_format: string;
}

/**
 * Convert a file using pandoc
 */
export async function convertFile(options: ConversionOptions): Promise<string> {
  return await invoke("convert_file", { options });
}

/**
 * Preview a file as HTML
 */
export async function previewFile(options: PreviewOptions): Promise<string> {
  return await invoke("preview_file", { options });
}

/**
 * Open a file with the default system application
 */
export async function openFileInDefaultApp(path: string): Promise<void> {
  return await invoke("open_file_in_default_app", { path });
}

/**
 * Show a file in its containing folder
 */
export async function showInFolder(path: string): Promise<void> {
  return await invoke("show_in_folder", { path });
}

/**
 * Load conversion history from disk
 */
export async function loadHistory(): Promise<ConversionStatus[]> {
  return await invoke("load_history");
}

/**
 * Save conversion history to disk
 */
export async function saveHistory(history: ConversionStatus[]): Promise<void> {
  return await invoke("save_history", { history });
}

/**
 * Get the application version
 */
export async function getAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch (error) {
    console.error("Failed to get app version:", error);
    return "Error";
  }
}
