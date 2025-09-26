<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        "submit-content": string;
        "save-content": string;
        cancel: void;
    }>();

    // Props
    export let showCancelButton: boolean = false;
    export let hasFiles: boolean = false;

    let textareaContent: string = "";

    // Function to emit content to the parent component
    function submitContent() {
        if (hasFiles) {
            console.warn(
                "Submit button clicked while file list is present, should be disabled.",
            );
            return;
        }
        if (textareaContent.trim()) {
            dispatch("submit-content", textareaContent);
        }
    }

    // Function to emit cancel event
    function cancelEdit() {
        dispatch("cancel");
    }

    // Function to emit save event
    function saveContent() {
        if (textareaContent.trim()) {
            dispatch("save-content", textareaContent);
        }
    }
</script>

<div class="editor-page">
    <div class="editor-container">
        <div class="editor-toolbar">
            <h3>Markdown 编辑器</h3>
            <div class="toolbar-buttons">
                <button
                    on:click={() => (textareaContent += "**粗体**")}
                    class="toolbar-btn">B</button
                >
                <button
                    on:click={() => (textareaContent += "*斜体*")}
                    class="toolbar-btn">I</button
                >
                <button
                    on:click={() => (textareaContent += "\n# 标题\n")}
                    class="toolbar-btn">H</button
                >
                <button
                    on:click={() => (textareaContent += "\n- 列表项\n")}
                    class="toolbar-btn">•</button
                >
            </div>
        </div>

        <textarea
            bind:value={textareaContent}
            placeholder="在此输入 Markdown 内容..."
            rows="20"
        ></textarea>
    </div>

    <div class="editor-actions">
        <!-- Add Cancel button -->
        {#if showCancelButton}
            <button on:click={cancelEdit} class="button-cancel">返回</button>
        {/if}
        <button on:click={saveContent} class="button-save">保存 Markdown</button
        >
        <button
            on:click={submitContent}
            class="button-submit"
            disabled={hasFiles}
            title={hasFiles
                ? "文件列表不为空，无法提交编辑器内容"
                : "使用此内容进行转换"}
        >
            使用编辑器内容
        </button>
    </div>
</div>

<style>
    .editor-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .editor-container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        overflow: hidden;
    }

    .editor-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #dcdfe6;
    }

    .editor-toolbar h3 {
        margin: 0;
        color: #303133;
        font-size: 16px;
    }

    .toolbar-buttons {
        display: flex;
        gap: 5px;
    }

    .toolbar-btn {
        padding: 5px 10px;
        border: 1px solid #dcdfe6;
        background: white;
        border-radius: 3px;
        cursor: pointer;
        font-weight: bold;
        color: #606266;
        transition: all 0.2s;
    }

    .toolbar-btn:hover {
        background: #ecf5ff;
        border-color: #409eff;
        color: #409eff;
    }

    textarea {
        flex-grow: 1;
        width: 100%;
        padding: 15px;
        border: none;
        resize: none;
        font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
        font-size: 14px;
        line-height: 1.6;
        outline: none;
        background: white;
    }

    .editor-actions {
        padding: 10px;
        text-align: right;
        background-color: #f8f9fa;
        border-top: 1px solid #dcdfe6;
        flex-shrink: 0;
    }

    .editor-actions button {
        padding: 8px 15px;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
        transition: background-color 0.2s;
    }

    .button-submit {
        background-color: #409eff;
    }

    .button-submit:hover:not(:disabled) {
        background-color: #66b1ff;
    }

    .button-submit:disabled {
        background-color: #a0cfff;
        cursor: not-allowed;
    }

    .button-cancel {
        background-color: #909399;
    }

    .button-cancel:hover {
        background-color: #a6a9ad;
    }

    .button-save {
        background-color: #67c23a;
    }

    .button-save:hover {
        background-color: #85ce61;
    }

    @media (prefers-color-scheme: dark) {
        .editor-container {
            border-color: #444;
        }

        .editor-toolbar {
            background-color: #2d2d2d;
            border-bottom-color: #444;
        }

        .editor-toolbar h3 {
            color: #e4e7ed;
        }

        .toolbar-btn {
            background: #3a3a3a;
            color: #c0c4cc;
            border-color: #555;
        }

        .toolbar-btn:hover {
            background: #404040;
            border-color: #409eff;
        }

        textarea {
            background: #2d2d2d;
            color: #e4e7ed;
        }

        .editor-actions {
            background-color: #2d2d2d;
            border-top-color: #444;
        }
    }
</style>
