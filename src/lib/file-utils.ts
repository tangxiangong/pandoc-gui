import { basename, dirname } from "@tauri-apps/api/path";
import type { ConversionStatus, MessageType } from "./types";

/**
 * Check if a file is a PDF (not supported for direct conversion)
 */
export function isPdfFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".pdf");
}

/**
 * Get the base name of a file path
 */
export function getBaseName(path: string | undefined): string {
    if (!path) return "";
    const separator = path.includes("/") ? "/" : "\\";
    const parts = path.split(separator);
    return parts[parts.length - 1] || path;
}

/**
 * Get file name without extension
 */
export async function getFileNameWithoutExtension(filePath: string): Promise<string> {
    const inputBasename = await basename(filePath);
    const lastDotIndex = inputBasename.lastIndexOf(".");

    if (lastDotIndex > 0) {
        return inputBasename.substring(0, lastDotIndex);
    } else {
        return inputBasename;
    }
}

/**
 * Generate output file path for batch conversion
 */
export async function generateOutputPath(inputPath: string, outputFormat: string): Promise<string> {
    const inputDir = await dirname(inputPath);
    const nameWithoutExt = await getFileNameWithoutExtension(inputPath);
    return `${inputDir}/${nameWithoutExt}.${outputFormat}`;
}

/**
 * Generate suggested filename for single file conversion
 */
export async function generateSuggestedFilename(inputPath: string, outputFormat: string): Promise<string> {
    const nameWithoutExt = await getFileNameWithoutExtension(inputPath);
    return `${nameWithoutExt}.${outputFormat}`;
}

/**
 * Add a file to the conversion progress list
 */
export function addFileToProgress(
    filePath: string,
    inputPaths: string[],
    conversionProgress: ConversionStatus[]
): { updatedInputPaths: string[]; updatedProgress: ConversionStatus[]; added: boolean } {
    if (isPdfFile(filePath)) {
        return {
            updatedInputPaths: inputPaths,
            updatedProgress: conversionProgress,
            added: false
        };
    }

    if (!inputPaths.includes(filePath)) {
        const updatedInputPaths = [...inputPaths, filePath];
        const updatedProgress = [
            ...conversionProgress,
            {
                path: filePath,
                status: "pending" as const,
                message: "待处理",
                isSuccess: true,
            },
        ];
        return { updatedInputPaths, updatedProgress, added: true };
    }

    return {
        updatedInputPaths: inputPaths,
        updatedProgress: conversionProgress,
        added: false
    };
}

/**
 * Remove a file from the conversion progress list
 */
export function removeFileFromProgress(
    filePathToRemove: string,
    inputPaths: string[],
    conversionProgress: ConversionStatus[]
): { updatedInputPaths: string[]; updatedProgress: ConversionStatus[] } {
    const updatedInputPaths = inputPaths.filter((path) => path !== filePathToRemove);
    const updatedProgress = conversionProgress.filter(
        (p) => p.path !== filePathToRemove
    );

    return { updatedInputPaths, updatedProgress };
}

/**
 * Clear all files from the conversion lists
 */
export function clearAllFiles(): { updatedInputPaths: string[]; updatedProgress: ConversionStatus[] } {
    return {
        updatedInputPaths: [],
        updatedProgress: []
    };
}

/**
 * Reset conversion progress status to pending
 */
export function resetProgressToPending(conversionProgress: ConversionStatus[]): ConversionStatus[] {
    return conversionProgress.map((p) => ({
        ...p,
        status: "pending" as const,
        message: "待处理",
        isSuccess: true,
    }));
}

/**
 * Update conversion progress for a specific file
 */
export function updateConversionProgress(
    conversionProgress: ConversionStatus[],
    filePath: string,
    updates: Partial<ConversionStatus>
): ConversionStatus[] {
    const index = conversionProgress.findIndex((p) => p.path === filePath);

    if (index === -1) {
        return conversionProgress;
    }

    const updated = [...conversionProgress];
    updated[index] = { ...updated[index], ...updates };
    return updated;
}

/**
 * Find conversion progress entry for a file
 */
export function findProgressEntry(
    conversionProgress: ConversionStatus[],
    filePath: string
): { entry: ConversionStatus | null; index: number } {
    const index = conversionProgress.findIndex((p) => p.path === filePath);
    return {
        entry: index >= 0 ? conversionProgress[index] : null,
        index
    };
}
