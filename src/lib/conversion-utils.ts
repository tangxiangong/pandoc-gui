import { open, save } from "@tauri-apps/plugin-dialog";
import { basename, dirname } from "@tauri-apps/api/path";
import type { ConversionStatus, InputFormat, OutputFormat } from "./types";
import { convertFile, previewFile, type ConversionOptions, type PreviewOptions } from "./commands";
import {
    generateOutputPath,
    generateSuggestedFilename,
    updateConversionProgress,
    findProgressEntry
} from "./file-utils";
import { showMessage, formatConversionResultMessage, logError } from "./message-utils";
import { addToHistory } from "./history-utils";

/**
 * Generate preview HTML for a file
 */
export async function generatePreview(
    inputPaths: string[],
    selectedInputFormat: InputFormat,
    hasMultipleFiles: boolean
): Promise<string> {
    if (inputPaths.length === 0) {
        showMessage("请先选择文件", "warning");
        throw new Error("No input files selected");
    }

    if (hasMultipleFiles) {
        showMessage("预览功能暂不支持多文件操作", "warning");
        throw new Error("Preview not supported for multiple files");
    }

    const targetPath = inputPaths[0];

    try {
        const options: PreviewOptions = {
            input_path: targetPath,
            input_format: selectedInputFormat,
        };

        const htmlResult = await previewFile(options);
        showMessage("预览生成成功", "success");
        return htmlResult;
    } catch (error) {
        logError("预览生成失败", error);
        showMessage(`预览失败: ${error}`, "error");
        throw error;
    }
}

/**
 * Convert a single file
 */
export async function convertSingleFile(
    inputPath: string,
    selectedInputFormat: InputFormat,
    selectedOutputFormat: OutputFormat,
    conversionProgress: ConversionStatus[]
): Promise<{
    success: boolean;
    outputPath?: string;
    updatedProgress: ConversionStatus[];
    message: string;
}> {
    const { entry, index: progressIndex } = findProgressEntry(conversionProgress, inputPath);

    if (progressIndex === -1) {
        return {
            success: false,
            updatedProgress: conversionProgress,
            message: "文件未在转换列表中找到"
        };
    }

    // Update status to converting
    let updatedProgress = updateConversionProgress(
        conversionProgress,
        inputPath,
        { status: "converting", message: "正在转换..." }
    );

    try {
        const inputBasename = await basename(inputPath);
        const inputDir = await dirname(inputPath);
        const suggestedFilename = await generateSuggestedFilename(inputPath, selectedOutputFormat);

        // Ask user for output path
        const outputPath = await save({
            title: "选择保存位置",
            defaultPath: `${inputDir}/${suggestedFilename}`,
            filters: [
                {
                    name: selectedOutputFormat.toUpperCase(),
                    extensions: [selectedOutputFormat],
                },
            ],
        });

        if (!outputPath) {
            // User cancelled
            updatedProgress = updateConversionProgress(
                updatedProgress,
                inputPath,
                { status: "pending", message: "已取消", isSuccess: true }
            );

            return {
                success: false,
                updatedProgress,
                message: `文件 "${inputBasename}" 的转换已取消`
            };
        }

        const options: ConversionOptions = {
            input_path: inputPath,
            output_format: selectedOutputFormat,
            output_path: outputPath,
            input_format: selectedInputFormat,
        };

        const result = await convertFile(options);

        // Update progress with success
        updatedProgress = updateConversionProgress(
            updatedProgress,
            inputPath,
            {
                status: "success",
                message: result || "转换成功",
                isSuccess: true,
                outputPath: outputPath
            }
        );

        return {
            success: true,
            outputPath,
            updatedProgress,
            message: result || "转换成功"
        };

    } catch (error) {
        logError(`文件 "${inputPath}" 转换出错`, error);

        updatedProgress = updateConversionProgress(
            updatedProgress,
            inputPath,
            {
                status: "error",
                message: `转换失败: ${error}`,
                isSuccess: false
            }
        );

        return {
            success: false,
            updatedProgress,
            message: `转换失败: ${error}`
        };
    }
}

/**
 * Convert multiple files in batch
 */
export async function convertBatchFiles(
    inputPaths: string[],
    selectedInputFormat: InputFormat,
    selectedOutputFormat: OutputFormat,
    conversionProgress: ConversionStatus[]
): Promise<{
    successCount: number;
    errorCount: number;
    updatedProgress: ConversionStatus[];
    updatedHistory: ConversionStatus[];
}> {
    let updatedProgress = [...conversionProgress];
    let updatedHistory: ConversionStatus[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const currentPath of inputPaths) {
        const { entry, index: progressIndex } = findProgressEntry(updatedProgress, currentPath);

        if (progressIndex === -1) {
            console.warn(`Skipping file ${currentPath}, not found in progress list.`);
            continue;
        }

        // Update status to converting
        updatedProgress = updateConversionProgress(
            updatedProgress,
            currentPath,
            { status: "converting", message: "正在转换..." }
        );

        try {
            const outputPath = await generateOutputPath(currentPath, selectedOutputFormat);

            const options: ConversionOptions = {
                input_path: currentPath,
                output_format: selectedOutputFormat,
                output_path: outputPath,
                input_format: selectedInputFormat,
            };

            const result = await convertFile(options);

            // Update progress with success
            updatedProgress = updateConversionProgress(
                updatedProgress,
                currentPath,
                {
                    status: "success",
                    message: result || "转换成功",
                    isSuccess: true,
                    outputPath: outputPath
                }
            );

            // Add to history
            const { entry: successEntry } = findProgressEntry(updatedProgress, currentPath);
            if (successEntry) {
                updatedHistory = addToHistory(updatedHistory, successEntry);
            }

            successCount++;

        } catch (error) {
            logError(`文件 "${currentPath}" 转换出错`, error);

            updatedProgress = updateConversionProgress(
                updatedProgress,
                currentPath,
                {
                    status: "error",
                    message: `转换失败: ${error}`,
                    isSuccess: false
                }
            );

            errorCount++;
        }
    }

    return {
        successCount,
        errorCount,
        updatedProgress,
        updatedHistory
    };
}

/**
 * Main conversion function that handles both single and batch conversion
 */
export async function startConversion(
    inputPaths: string[],
    selectedInputFormat: InputFormat,
    selectedOutputFormat: OutputFormat,
    conversionProgress: ConversionStatus[],
    conversionHistory: ConversionStatus[]
): Promise<{
    updatedProgress: ConversionStatus[];
    updatedHistory: ConversionStatus[];
    resultMessage: { message: string; type: "success" | "error" | "warning" | "info" };
}> {
    if (inputPaths.length === 0) {
        showMessage("请先选择输入文件", "warning");
        return {
            updatedProgress: conversionProgress,
            updatedHistory: conversionHistory,
            resultMessage: { message: "请先选择输入文件", type: "warning" }
        };
    }

    const isSingleFile = inputPaths.length === 1;

    if (isSingleFile) {
        const result = await convertSingleFile(
            inputPaths[0],
            selectedInputFormat,
            selectedOutputFormat,
            conversionProgress
        );

        let updatedHistory = conversionHistory;
        if (result.success && result.outputPath) {
            const { entry } = findProgressEntry(result.updatedProgress, inputPaths[0]);
            if (entry) {
                updatedHistory = addToHistory(conversionHistory, entry);
            }
        }

        return {
            updatedProgress: result.updatedProgress,
            updatedHistory,
            resultMessage: {
                message: result.message,
                type: result.success ? "success" : "info"
            }
        };
    } else {
        const result = await convertBatchFiles(
            inputPaths,
            selectedInputFormat,
            selectedOutputFormat,
            conversionProgress
        );

        const resultMessage = formatConversionResultMessage(
            result.successCount,
            result.errorCount
        );

        return {
            updatedProgress: result.updatedProgress,
            updatedHistory: [...result.updatedHistory, ...conversionHistory],
            resultMessage
        };
    }
}
