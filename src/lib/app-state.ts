import { writable, type Writable } from "svelte/store";
import type { ConversionStatus, InputFormat, OutputFormat } from "./types";

/**
 * Application state interface
 */
export interface AppState {
    inputPaths: string[];
    conversionProgress: ConversionStatus[];
    selectedOutputFormat: OutputFormat;
    selectedInputFormat: InputFormat;
    isLoading: boolean;
    isPreviewLoading: boolean;
    showPreviewDialog: boolean;
    previewHtml: string;
    conversionHistory: ConversionStatus[];
    appVersion: string;
}

/**
 * Initial application state
 */
export const initialAppState: AppState = {
    inputPaths: [],
    conversionProgress: [],
    selectedOutputFormat: "docx",
    selectedInputFormat: "auto",
    isLoading: false,
    isPreviewLoading: false,
    showPreviewDialog: false,
    previewHtml: "",
    conversionHistory: [],
    appVersion: "N/A"
};

/**
 * Main application state store
 */
export const appState: Writable<AppState> = writable(initialAppState);

/**
 * Derived state getters
 */
export const getHasMultipleFiles = (state: AppState): boolean =>
    state.inputPaths.length > 1;

export const getHasFiles = (state: AppState): boolean =>
    state.inputPaths.length > 0;

export const getHasInput = (state: AppState): boolean =>
    getHasFiles(state);

/**
 * State update functions
 */
export function updateInputPaths(paths: string[]): void {
    appState.update(state => ({
        ...state,
        inputPaths: paths
    }));
}

export function updateConversionProgress(progress: ConversionStatus[]): void {
    appState.update(state => ({
        ...state,
        conversionProgress: progress
    }));
}

export function updateSelectedFormats(inputFormat: InputFormat, outputFormat: OutputFormat): void {
    appState.update(state => ({
        ...state,
        selectedInputFormat: inputFormat,
        selectedOutputFormat: outputFormat
    }));
}

export function updateLoadingState(isLoading: boolean): void {
    appState.update(state => ({
        ...state,
        isLoading
    }));
}

export function updatePreviewLoadingState(isPreviewLoading: boolean): void {
    appState.update(state => ({
        ...state,
        isPreviewLoading
    }));
}

export function updatePreviewDialog(showDialog: boolean, html: string = ""): void {
    appState.update(state => ({
        ...state,
        showPreviewDialog: showDialog,
        previewHtml: html
    }));
}

export function updateConversionHistory(history: ConversionStatus[]): void {
    appState.update(state => ({
        ...state,
        conversionHistory: history
    }));
}

export function updateAppVersion(version: string): void {
    appState.update(state => ({
        ...state,
        appVersion: version
    }));
}

/**
 * Combined state updates for file management
 */
export function updateFileState(inputPaths: string[], conversionProgress: ConversionStatus[]): void {
    appState.update(state => ({
        ...state,
        inputPaths,
        conversionProgress
    }));
}

/**
 * Reset application state to initial values
 */
export function resetAppState(): void {
    appState.set(initialAppState);
}

/**
 * Reset only file-related state
 */
export function resetFileState(): void {
    appState.update(state => ({
        ...state,
        inputPaths: [],
        conversionProgress: [],
        previewHtml: "",
        showPreviewDialog: false
    }));
}
