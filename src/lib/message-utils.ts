import type { MessageType } from "./types";

/**
 * Show a message to the user
 */
export function showMessage(
    message: string,
    type: MessageType = "info"
): void {
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (typeof window !== "undefined") {
        if (type === "error") {
            alert(`错误: ${message}`);
        } else if (type === "warning") {
            alert(`警告: ${message}`);
        } else if (type === "success") {
            console.log(`✅ ${message}`);
        }
    }
}

/**
 * Format conversion results message
 */
export function formatConversionResultMessage(
    successCount: number,
    errorCount: number
): { message: string; type: MessageType } {
    if (errorCount === 0 && successCount > 0) {
        return {
            message: `批量转换完成，${successCount} 个文件成功。`,
            type: "success"
        };
    } else if (errorCount > 0) {
        return {
            message: `批量转换完成，${successCount} 个成功，${errorCount} 个失败。`,
            type: "warning"
        };
    } else if (successCount === 0 && errorCount === 0) {
        return {
            message: "没有文件被转换（可能列表为空或文件在转换前被移除）。",
            type: "info"
        };
    }

    return {
        message: "转换完成",
        type: "info"
    };
}

/**
 * Log error with context
 */
export function logError(context: string, error: unknown): void {
    console.error(`${context}:`, error);
}

/**
 * Log success with context
 */
export function logSuccess(context: string, message?: string): void {
    console.log(`✅ ${context}${message ? `: ${message}` : ""}`);
}

/**
 * Log warning with context
 */
export function logWarning(context: string, message: string): void {
    console.warn(`⚠️ ${context}: ${message}`);
}
