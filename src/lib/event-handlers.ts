import { listen, TauriEvent, type Event } from "@tauri-apps/api/event";
import { goto } from "$app/navigation";
import { open } from "@tauri-apps/plugin-dialog";
import type { DropPayload, InputFormat, OutputFormat, ConversionStatus } from "./types";
import { addFileToProgress } from "./file-utils";
import { showMessage, logError, logWarning } from "./message-utils";
import { isPdfFile } from "./file-utils";

/**
 * Handle file drop events
 */
export function handleFileDrop(
    paths: string[],
    inputPaths: string[],
    conversionProgress: ConversionStatus[]
): { updatedInputPaths: string[]; updatedProgress: ConversionStatus[]; addedCount: number } {
    let updatedInputPaths = [...inputPaths];
    let updatedProgress = [...conversionProgress];
    let addedCount = 0;

    if (paths && paths.length > 0) {
        paths.forEach((filePath) => {
            if (isPdfFile(filePath)) {
                showMessage(`不支持直接转换 PDF 文件: ${filePath}`, "warning");
                return;
            }

            const result = addFileToProgress(filePath, updatedInputPaths, updatedProgress);
            if (result.added) {
                updatedInputPaths = result.updatedInputPaths;
                updatedProgress = result.updatedProgress;
                addedCount++;
                console.log("文件已拖放:", filePath);
            }
        });

        if (addedCount > 0) {
            showMessage(`已添加 ${addedCount} 个文件`, "success");
        }
    } else {
        logWarning("文件拖放", "收到空或无效的路径数组");
    }

    return { updatedInputPaths, updatedProgress, addedCount };
}

/**
 * Handle file selection through dialog
 */
export async function selectFiles(
    inputPaths: string[],
    conversionProgress: ConversionStatus[]
): Promise<{ updatedInputPaths: string[]; updatedProgress: ConversionStatus[]; addedCount: number }> {
    try {
        const selected = await open({
            multiple: true,
            directory: false,
            title: "选择输入文件",
        });

        let updatedInputPaths = [...inputPaths];
        let updatedProgress = [...conversionProgress];
        let addedCount = 0;

        if (Array.isArray(selected)) {
            selected.forEach((path) => {
                if (isPdfFile(path)) {
                    showMessage(`不支持直接转换 PDF 文件: ${path}`, "warning");
                    return;
                }

                const result = addFileToProgress(path, updatedInputPaths, updatedProgress);
                if (result.added) {
                    updatedInputPaths = result.updatedInputPaths;
                    updatedProgress = result.updatedProgress;
                    addedCount++;
                }
            });
        } else if (typeof selected === "string") {
            if (isPdfFile(selected)) {
                showMessage(`不支持直接转换 PDF 文件: ${selected}`, "warning");
            } else {
                const result = addFileToProgress(selected, updatedInputPaths, updatedProgress);
                if (result.added) {
                    updatedInputPaths = result.updatedInputPaths;
                    updatedProgress = result.updatedProgress;
                    addedCount++;
                }
            }
        }

        if (addedCount > 0) {
            showMessage(`已添加 ${addedCount} 个文件`, "success");
        }

        return { updatedInputPaths, updatedProgress, addedCount };

    } catch (error: unknown) {
        logError("选择文件时出错", error);
        showMessage(`选择文件时出错: ${error}`, "error");
        return { updatedInputPaths: inputPaths, updatedProgress: conversionProgress, addedCount: 0 };
    }
}

/**
 * Setup drag and drop event listener
 */
export async function setupDragDropListener(
    onFileDrop: (paths: string[]) => void
): Promise<(() => void) | null> {
    try {
        const unlisten = await listen<DropPayload>(
            TauriEvent.DRAG_DROP,
            (event: Event<DropPayload>) => {
                if (event.payload?.paths?.length > 0) {
                    onFileDrop(event.payload.paths);
                } else {
                    logWarning("文件拖放", "拖放事件没有有效的 paths 数组");
                }
            }
        );
        console.log("文件拖放监听器已设置");
        return unlisten;
    } catch (error: unknown) {
        logError("设置文件拖放监听器时出错", error);
        showMessage(`无法设置文件拖放功能: ${error}`, "error");
        return null;
    }
}

/**
 * Handle navigation to editor
 */
export function navigateToEditor(): void {
    goto("/editor");
}

/**
 * Handle keyboard events
 */
export function handleKeyDown(
    event: KeyboardEvent,
    callback: () => void
): void {
    if (event.key === "Enter") {
        callback();
    }
}

/**
 * Handle format selection change
 */
export function handleFormatChange(
    type: "input" | "output",
    value: string,
    currentInputFormat: InputFormat,
    currentOutputFormat: OutputFormat
): { inputFormat: InputFormat; outputFormat: OutputFormat } {
    if (type === "input") {
        return {
            inputFormat: value as InputFormat,
            outputFormat: currentOutputFormat
        };
    } else {
        return {
            inputFormat: currentInputFormat,
            outputFormat: value as OutputFormat
        };
    }
}

/**
 * Handle preview dialog close
 */
export function handlePreviewDialogClose(): { showDialog: boolean; html: string } {
    return { showDialog: false, html: "" };
}

/**
 * Handle file removal from conversion list
 */
export function handleFileRemoval(
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
 * Handle clear all files action
 */
export function handleClearAllFiles(): { updatedInputPaths: string[]; updatedProgress: ConversionStatus[] } {
    return {
        updatedInputPaths: [],
        updatedProgress: []
    };
}
