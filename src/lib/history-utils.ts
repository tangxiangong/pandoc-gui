import type { ConversionStatus } from "./types";
import { saveHistory, loadHistory } from "./commands";
import { showMessage, logError, logSuccess } from "./message-utils";

/**
 * Load conversion history from disk
 */
export async function loadHistoryFromDisk(): Promise<ConversionStatus[]> {
    try {
        const loadedHistory = await loadHistory();
        const history = loadedHistory || [];
        logSuccess("历史记录加载", `成功加载 ${history.length} 条历史记录`);
        return history;
    } catch (error) {
        logError("加载历史记录失败", error);
        showMessage(`加载历史记录失败: ${error}`, "error");
        return [];
    }
}

/**
 * Save conversion history to disk
 */
export async function saveHistoryToDisk(history: ConversionStatus[]): Promise<void> {
    try {
        await saveHistory(history);
        console.log(`历史记录已保存 (${history.length} 条)。`);
    } catch (error) {
        logError("保存历史记录失败", error);
    }
}

/**
 * Add a successful conversion to history
 */
export function addToHistory(
    conversionHistory: ConversionStatus[],
    newEntry: ConversionStatus
): ConversionStatus[] {
    return [{ ...newEntry }, ...conversionHistory];
}

/**
 * Clear all conversion history
 */
export function clearConversionHistory(): ConversionStatus[] {
    showMessage("历史记录已清空", "success");
    return [];
}

/**
 * Delete a specific history item
 */
export function deleteHistoryItem(
    conversionHistory: ConversionStatus[],
    itemToDelete: ConversionStatus
): { updatedHistory: ConversionStatus[]; deleted: boolean } {
    const index = conversionHistory.findIndex(
        (item) =>
            item.path === itemToDelete.path &&
            item.outputPath === itemToDelete.outputPath
    );

    if (index !== -1) {
        const updatedHistory = conversionHistory.filter((_, i) => i !== index);
        showMessage("已删除历史记录", "success");
        return { updatedHistory, deleted: true };
    } else {
        showMessage("未找到要删除的历史记录", "warning");
        return { updatedHistory: conversionHistory, deleted: false };
    }
}

/**
 * Find a history item by path and output path
 */
export function findHistoryItem(
    conversionHistory: ConversionStatus[],
    path: string,
    outputPath?: string
): ConversionStatus | null {
    return conversionHistory.find(
        (item) => item.path === path && item.outputPath === outputPath
    ) || null;
}

/**
 * Get history statistics
 */
export function getHistoryStats(conversionHistory: ConversionStatus[]): {
    total: number;
    successful: number;
    failed: number;
} {
    const total = conversionHistory.length;
    const successful = conversionHistory.filter(item => item.status === "success").length;
    const failed = conversionHistory.filter(item => item.status === "error").length;

    return { total, successful, failed };
}
