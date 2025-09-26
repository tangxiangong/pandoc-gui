<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { goto } from "$app/navigation";
    import { save } from "@tauri-apps/plugin-dialog";
    import { invoke } from "@tauri-apps/api/core";

    const dispatch = createEventDispatcher<{
        "content-ready": string;
    }>();

    let textareaContent: string = "";
    let isSaving: boolean = false;
    let isSubmitting: boolean = false;

    const availableOutputFormats = [
        { value: "docx", label: "Word Document" },
        { value: "html", label: "HTML" },
        { value: "pdf", label: "PDF" },
        { value: "tex", label: "LaTeX" },
        { value: "md", label: "Markdown" },
        { value: "odt", label: "OpenDocument" },
        { value: "rst", label: "reStructuredText" },
        { value: "epub", label: "EPUB" },
    ];

    let selectedOutputFormat = "docx";

    function goBack() {
        goto("/");
    }

    function insertText(text: string) {
        const textarea = document.querySelector("textarea");
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = textareaContent.substring(0, start);
            const after = textareaContent.substring(end);
            textareaContent = before + text + after;

            // Set cursor position after inserted text
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(
                    start + text.length,
                    start + text.length,
                );
            }, 0);
        } else {
            textareaContent += text;
        }
    }

    function insertBold() {
        insertText("**粗体文本**");
    }

    function insertItalic() {
        insertText("*斜体文本*");
    }

    function insertHeader() {
        insertText("\n# 标题\n");
    }

    function insertList() {
        insertText("\n- 列表项\n- 另一项\n");
    }

    function insertLink() {
        insertText("[链接文本](https://example.com)");
    }

    function insertCode() {
        insertText("`代码`");
    }

    function insertCodeBlock() {
        insertText("\n```\n代码块\n```\n");
    }

    function insertTable() {
        insertText(
            "\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据 | 数据 | 数据 |\n",
        );
    }

    async function saveContent() {
        if (!textareaContent.trim()) {
            alert("编辑器内容为空，无法保存。");
            return;
        }

        isSaving = true;

        try {
            const outputPath = await save({
                title: "保存 Markdown 文件",
                defaultPath: "untitled.md",
                filters: [{ name: "Markdown", extensions: ["md"] }],
            });

            if (!outputPath) {
                return;
            }

            await invoke("save_raw_content", {
                path: outputPath,
                content: textareaContent,
            });

            alert(`Markdown 文件已保存到: ${outputPath}`);
        } catch (error: unknown) {
            console.error("保存 Markdown 文件出错:", error);
            alert(`保存文件失败: ${error}`);
        } finally {
            isSaving = false;
        }
    }

    async function submitContent() {
        if (!textareaContent.trim()) {
            alert("请先输入一些内容");
            return;
        }

        isSubmitting = true;

        try {
            const defaultSaveName = `output.${selectedOutputFormat}`;
            const outputPath = await save({
                title: "选择保存位置",
                defaultPath: defaultSaveName,
                filters: [
                    {
                        name: selectedOutputFormat.toUpperCase(),
                        extensions: [selectedOutputFormat],
                    },
                ],
            });

            if (!outputPath) {
                isSubmitting = false;
                return;
            }

            const options = {
                input_content: textareaContent,
                output_format: selectedOutputFormat,
                output_path: outputPath,
            };

            const result: string = await invoke("convert_content", {
                options,
            });

            alert(`转换成功！\n${result}\n文件已保存到: ${outputPath}`);

            // Optionally clear content after successful conversion
            // textareaContent = "";
        } catch (error: unknown) {
            console.error("转换失败:", error);
            alert(`转换失败: ${error}`);
        } finally {
            isSubmitting = false;
        }
    }

    // Keyboard shortcuts
    function handleKeyDown(event: KeyboardEvent) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case "s":
                    event.preventDefault();
                    saveContent();
                    break;
                case "b":
                    event.preventDefault();
                    insertBold();
                    break;
                case "i":
                    event.preventDefault();
                    insertItalic();
                    break;
                case "Enter":
                    if (event.shiftKey) {
                        event.preventDefault();
                        submitContent();
                    }
                    break;
            }
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="editor-page">
    <div class="editor-header">
        <div class="header-left">
            <button class="back-button" on:click={goBack}> ← 返回主页 </button>
            <h1>Markdown 编辑器</h1>
        </div>
        <div class="header-right">
            <div class="format-selector">
                <label for="output-format">输出格式:</label>
                <select id="output-format" bind:value={selectedOutputFormat}>
                    {#each availableOutputFormats as format}
                        <option value={format.value}>{format.label}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <div class="editor-toolbar">
        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                title="粗体 (Ctrl+B)"
                on:click={insertBold}
            >
                <strong>B</strong>
            </button>
            <button
                class="toolbar-btn"
                title="斜体 (Ctrl+I)"
                on:click={insertItalic}
            >
                <em>I</em>
            </button>
            <button class="toolbar-btn" title="标题" on:click={insertHeader}>
                H
            </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
            <button class="toolbar-btn" title="无序列表" on:click={insertList}>
                •
            </button>
            <button class="toolbar-btn" title="链接" on:click={insertLink}>
                🔗
            </button>
            <button class="toolbar-btn" title="内联代码" on:click={insertCode}>
                `
            </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                title="代码块"
                on:click={insertCodeBlock}
            >
                {"{}"}
            </button>
            <button class="toolbar-btn" title="表格" on:click={insertTable}>
                ⊞
            </button>
        </div>
    </div>

    <div class="editor-container">
        <div class="editor-main">
            <div class="editor-panel">
                <div class="panel-header">
                    <h3>编辑</h3>
                    <div class="word-count">
                        {textareaContent.length} 字符 | {textareaContent
                            .split(/\s+/)
                            .filter((w) => w.length > 0).length} 单词
                    </div>
                </div>
                <textarea
                    bind:value={textareaContent}
                    placeholder="在此输入 Markdown 内容...

# 标题示例

这是一段**粗体**和*斜体*文本。

- 列表项 1
- 列表项 2

[链接示例](https://example.com)

`行内代码`

```
代码块示例
```"
                    spellcheck="false"
                ></textarea>
            </div>

            <div class="preview-panel">
                <div class="panel-header">
                    <h3>预览</h3>
                    <div class="preview-info">实时预览</div>
                </div>
                <div class="preview-content">
                    {#if textareaContent.trim()}
                        <div class="markdown-preview">
                            <!-- Simple markdown preview - in a real app you'd use a markdown parser -->
                            {#each textareaContent.split("\n") as line}
                                {#if line.startsWith("# ")}
                                    <h1>{line.slice(2)}</h1>
                                {:else if line.startsWith("## ")}
                                    <h2>{line.slice(3)}</h2>
                                {:else if line.startsWith("### ")}
                                    <h3>{line.slice(4)}</h3>
                                {:else if line.startsWith("- ")}
                                    <li>{line.slice(2)}</li>
                                {:else if line.trim() === ""}
                                    <br />
                                {:else}
                                    <p>{line}</p>
                                {/if}
                            {/each}
                        </div>
                    {:else}
                        <div class="empty-preview">
                            <p>在左侧编辑器中输入内容，这里会显示预览</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <div class="editor-footer">
        <div class="footer-left">
            <div class="shortcuts-info">
                快捷键: Ctrl+S 保存 | Ctrl+B 粗体 | Ctrl+I 斜体 |
                Ctrl+Shift+Enter 转换
            </div>
        </div>
        <div class="footer-right">
            <button
                class="save-btn"
                on:click={saveContent}
                disabled={isSaving || !textareaContent.trim()}
            >
                {#if isSaving}
                    💾 保存中...
                {:else}
                    💾 保存 Markdown
                {/if}
            </button>
            <button
                class="submit-btn"
                on:click={submitContent}
                disabled={isSubmitting || !textareaContent.trim()}
            >
                {#if isSubmitting}
                    🔄 转换中...
                {:else}
                    🔄 转换并保存
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .editor-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #f5f5f5;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial,
            sans-serif;
    }

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: white;
        border-bottom: 1px solid #e1e4e8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .back-button {
        padding: 0.5rem 1rem;
        background: #f6f8fa;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        color: #24292f;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    }

    .back-button:hover {
        background: #e1e4e8;
        border-color: #c1c8cd;
    }

    .editor-header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #24292f;
        font-weight: 600;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .format-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .format-selector label {
        font-size: 14px;
        color: #656d76;
        font-weight: 500;
    }

    .format-selector select {
        padding: 0.5rem;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        background: white;
        color: #24292f;
        font-size: 14px;
    }

    .editor-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: white;
        border-bottom: 1px solid #e1e4e8;
    }

    .toolbar-group {
        display: flex;
        gap: 0.25rem;
    }

    .toolbar-btn {
        padding: 0.5rem;
        background: white;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        color: #24292f;
        transition: all 0.2s;
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toolbar-btn:hover {
        background: #f6f8fa;
        border-color: #c1c8cd;
    }

    .toolbar-btn:active {
        background: #e1e4e8;
    }

    .toolbar-separator {
        width: 1px;
        height: 24px;
        background: #d1d5da;
        margin: 0 0.5rem;
    }

    .editor-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .editor-main {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    .editor-panel,
    .preview-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: white;
        border-right: 1px solid #e1e4e8;
    }

    .preview-panel {
        border-right: none;
        border-left: 1px solid #e1e4e8;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #f6f8fa;
        border-bottom: 1px solid #e1e4e8;
    }

    .panel-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #24292f;
    }

    .word-count,
    .preview-info {
        font-size: 12px;
        color: #656d76;
    }

    textarea {
        flex: 1;
        padding: 1rem;
        border: none;
        resize: none;
        font-family:
            "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Consolas",
            monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #24292f;
        background: white;
        outline: none;
        tab-size: 2;
    }

    textarea::placeholder {
        color: #8c959f;
    }

    .preview-content {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        background: white;
    }

    .markdown-preview {
        max-width: none;
        color: #24292f;
        line-height: 1.6;
    }

    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3 {
        margin: 1.5rem 0 1rem 0;
        font-weight: 600;
        color: #24292f;
    }

    .markdown-preview h1 {
        font-size: 2rem;
        border-bottom: 1px solid #e1e4e8;
        padding-bottom: 0.3rem;
    }

    .markdown-preview h2 {
        font-size: 1.5rem;
    }

    .markdown-preview h3 {
        font-size: 1.25rem;
    }

    .markdown-preview p {
        margin: 1rem 0;
    }

    .markdown-preview li {
        margin: 0.25rem 0;
        list-style-type: disc;
        margin-left: 1.5rem;
    }

    .empty-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #8c959f;
        font-style: italic;
    }

    .editor-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: white;
        border-top: 1px solid #e1e4e8;
        box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
    }

    .footer-left {
        display: flex;
        align-items: center;
    }

    .shortcuts-info {
        font-size: 12px;
        color: #656d76;
    }

    .footer-right {
        display: flex;
        gap: 0.75rem;
    }

    .save-btn,
    .submit-btn {
        padding: 0.75rem 1.25rem;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .save-btn {
        background: #f6f8fa;
        color: #24292f;
    }

    .save-btn:hover:not(:disabled) {
        background: #e1e4e8;
        border-color: #c1c8cd;
    }

    .submit-btn {
        background: #2da44e;
        color: white;
        border-color: #2da44e;
    }

    .submit-btn:hover:not(:disabled) {
        background: #2c974b;
        border-color: #2c974b;
    }

    .save-btn:disabled,
    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    @media (prefers-color-scheme: dark) {
        .editor-page {
            background: #0d1117;
        }

        .editor-header,
        .editor-toolbar,
        .editor-footer {
            background: #161b22;
            border-color: #30363d;
        }

        .editor-header h1,
        .panel-header h3 {
            color: #f0f6fc;
        }

        .back-button,
        .toolbar-btn {
            background: #21262d;
            border-color: #30363d;
            color: #f0f6fc;
        }

        .back-button:hover,
        .toolbar-btn:hover {
            background: #30363d;
            border-color: #484f58;
        }

        .format-selector select {
            background: #21262d;
            border-color: #30363d;
            color: #f0f6fc;
        }

        .editor-panel,
        .preview-panel {
            background: #0d1117;
            border-color: #30363d;
        }

        .panel-header {
            background: #161b22;
            border-color: #30363d;
        }

        textarea {
            background: #0d1117;
            color: #f0f6fc;
        }

        .preview-content {
            background: #0d1117;
        }

        .markdown-preview {
            color: #f0f6fc;
        }

        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3 {
            color: #f0f6fc;
        }

        .markdown-preview h1 {
            border-bottom-color: #30363d;
        }

        .save-btn {
            background: #21262d;
            border-color: #30363d;
            color: #f0f6fc;
        }

        .save-btn:hover:not(:disabled) {
            background: #30363d;
            border-color: #484f58;
        }

        .word-count,
        .preview-info,
        .shortcuts-info {
            color: #7d8590;
        }

        .empty-preview {
            color: #7d8590;
        }

        textarea::placeholder {
            color: #484f58;
        }
    }

    @media (max-width: 768px) {
        .editor-main {
            flex-direction: column;
        }

        .preview-panel {
            border-left: none;
            border-top: 1px solid #e1e4e8;
        }

        .editor-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .header-left,
        .header-right {
            justify-content: center;
        }

        .toolbar-group {
            justify-content: center;
        }
    }
</style>
