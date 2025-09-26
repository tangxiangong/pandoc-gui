import type { PhysicalPosition } from "@tauri-apps/api/window";

export interface DropPayload {
    paths: string[];
    position: PhysicalPosition;
}

export interface ConversionStatus {
    path: string;
    status: "pending" | "converting" | "success" | "error";
    message: string;
    isSuccess: boolean;
    outputPath?: string;
}

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

export const availableInputFormats = [
    "auto",
    "markdown",
    "html",
    "latex",
    "rst",
    "docx",
    "epub",
] as const;

export const availableOutputFormats = [
    "docx",
    "html",
    "tex",
    "md",
    "odt",
    "rst",
    "epub",
] as const;

export type InputFormat = typeof availableInputFormats[number];
export type OutputFormat = typeof availableOutputFormats[number];

export type MessageType = "success" | "error" | "warning" | "info";
