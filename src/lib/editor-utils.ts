import { goto } from "$app/navigation";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { OutputFormat } from "./types.js";
import { showMessage, logError } from "./message-utils.js";

export interface EditorOptions {
    input_content: string;
    output_format: string;
    output_path: string;
}

/**
 * Available output formats for the editor
 */
export const editorOutputFormats = [
    { value: "docx", label: "Word Document" },
    { value: "html", label: "HTML" },
    { value: "pdf", label: "PDF" },
    { value: "tex", label: "LaTeX" },
    { value: "md", label: "Markdown" },
    { value: "odt", label: "OpenDocument" },
    { value: "rst", label: "reStructuredText" },
    { value: "epub", label: "EPUB" },
] as const;

/**
 * Navigate back to main page
 */
export function navigateToMain(): void {
    goto("/");
}

/**
 * Insert text at cursor position or append to content
 */
export function insertTextAtCursor(
    currentContent: string,
    textToInsert: string,
    textareaElement?: HTMLTextAreaElement
): string {
    if (textareaElement) {
        const start = textareaElement.selectionStart;
        const end = textareaElement.selectionEnd;
        const before = currentContent.substring(0, start);
        const after = currentContent.substring(end);
        const newContent = before + textToInsert + after;

        // Set cursor position after inserted text
        setTimeout(() => {
            textareaElement.focus();
            textareaElement.setSelectionRange(
                start + textToInsert.length,
                start + textToInsert.length
            );
        }, 0);

        return newContent;
    } else {
        return currentContent + textToInsert;
    }
}

/**
 * Insert bold text formatting
 */
export function insertBold(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "**粗体文本**", textarea);
}

/**
 * Insert italic text formatting
 */
export function insertItalic(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "*斜体文本*", textarea);
}

/**
 * Insert header formatting
 */
export function insertHeader(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "\n# 标题\n", textarea);
}

/**
 * Insert list formatting
 */
export function insertList(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "\n- 列表项\n- 另一项\n", textarea);
}

/**
 * Insert link formatting
 */
export function insertLink(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "[链接文本](https://example.com)", textarea);
}

/**
 * Insert inline code formatting
 */
export function insertCode(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "`代码`", textarea);
}

/**
 * Insert code block formatting
 */
export function insertCodeBlock(content: string, textarea?: HTMLTextAreaElement): string {
    return insertTextAtCursor(content, "\n```\n代码块\n```\n", textarea);
}

/**
 * Insert table formatting
 */
export function insertTable(content: string, textarea?: HTMLTextAreaElement): string {
    const tableText = "\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据 | 数据 | 数据 |\n";
    return insertTextAtCursor(content, tableText, textarea);
}

/**
 * Save content as Markdown file
 */
export async function saveMarkdownFile(content: string): Promise<boolean> {
    if (!content.trim()) {
        showMessage("编辑器内容为空，无法保存", "warning");
        return false;
    }

    try {
        const outputPath = await save({
            title: "保存 Markdown 文件",
            defaultPath: "untitled.md",
            filters: [{ name: "Markdown", extensions: ["md"] }],
        });

        if (!outputPath) {
            return false;
        }

        await invoke("save_raw_content", {
            path: outputPath,
            content: content,
        });

        showMessage(`Markdown 文件已保存到: ${outputPath}`, "success");
        return true;
    } catch (error: unknown) {
        logError("保存 Markdown 文件出错", error);
        showMessage(`保存文件失败: ${error}`, "error");
        return false;
    }
}

/**
 * Convert content to selected format and save
 */
export async function convertAndSaveContent(
    content: string,
    outputFormat: OutputFormat
): Promise<boolean> {
    if (!content.trim()) {
        showMessage("请先输入一些内容", "warning");
        return false;
    }

    try {
        const defaultSaveName = `output.${outputFormat}`;
        const outputPath = await save({
            title: "选择保存位置",
            defaultPath: defaultSaveName,
            filters: [
                {
                    name: outputFormat.toUpperCase(),
                    extensions: [outputFormat],
                },
            ],
        });

        if (!outputPath) {
            return false;
        }

        const options: EditorOptions = {
            input_content: content,
            output_format: outputFormat,
            output_path: outputPath,
        };

        const result: string = await invoke("convert_content", { options });

        showMessage(
            `转换成功！\n${result}\n文件已保存到: ${outputPath}`,
            "success"
        );
        return true;
    } catch (error: unknown) {
        logError("转换失败", error);
        showMessage(`转换失败: ${error}`, "error");
        return false;
    }
}

/**
 * Handle keyboard shortcuts
 */
export function handleEditorKeyDown(
    event: KeyboardEvent,
    callbacks: {
        onSave: () => void;
        onBold: () => void;
        onItalic: () => void;
        onSubmit: () => void;
    }
): void {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case "s":
                event.preventDefault();
                callbacks.onSave();
                break;
            case "b":
                event.preventDefault();
                callbacks.onBold();
                break;
            case "i":
                event.preventDefault();
                callbacks.onItalic();
                break;
            case "Enter":
                if (event.shiftKey) {
                    event.preventDefault();
                    callbacks.onSubmit();
                }
                break;
        }
    }
}

/**
 * Validate content before operations
 */
export function validateContent(content: string): { isValid: boolean; message?: string } {
    if (!content.trim()) {
        return { isValid: false, message: "内容不能为空" };
    }

    if (content.length > 1000000) {
        return { isValid: false, message: "内容过长，请减少内容" };
    }

    return { isValid: true };
}

/**
 * Get textarea element safely
 */
export function getTextareaElement(): HTMLTextAreaElement | null {
    return document.querySelector("textarea");
}
