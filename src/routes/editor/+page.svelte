<script lang="ts">
    import { browser } from "$app/environment";
    import type { OutputFormat } from "../../lib/types.js";
    import {
        editorOutputFormats,
        navigateToMain,
        insertBold,
        insertItalic,
        insertHeader,
        insertList,
        insertLink,
        insertCode,
        insertCodeBlock,
        insertTable,
        saveMarkdownFile,
        convertAndSaveContent,
        handleEditorKeyDown,
        validateContent,
        getTextareaElement,
    } from "../../lib/editor-utils.js";

    // State variables
    let textareaContent: string = "";
    let isSaving: boolean = false;
    let isSubmitting: boolean = false;
    let selectedOutputFormat: OutputFormat = "docx";

    // Event handlers
    async function onSave() {
        if (!browser) return;
        isSaving = true;
        try {
            await saveMarkdownFile(textareaContent);
        } finally {
            isSaving = false;
        }
    }

    async function onSubmit() {
        if (!browser) return;
        isSubmitting = true;
        try {
            await convertAndSaveContent(textareaContent, selectedOutputFormat);
        } finally {
            isSubmitting = false;
        }
    }

    function onInsertBold() {
        textareaContent = insertBold(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertItalic() {
        textareaContent = insertItalic(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertHeader() {
        textareaContent = insertHeader(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertList() {
        textareaContent = insertList(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertLink() {
        textareaContent = insertLink(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertCode() {
        textareaContent = insertCode(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertCodeBlock() {
        textareaContent = insertCodeBlock(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onInsertTable() {
        textareaContent = insertTable(
            textareaContent,
            getTextareaElement() || undefined,
        );
    }

    function onKeyDown(event: KeyboardEvent) {
        handleEditorKeyDown(event, {
            onSave,
            onBold: onInsertBold,
            onItalic: onInsertItalic,
            onSubmit,
        });
    }

    // Computed properties
    $: validation = validateContent(textareaContent);
    $: canSave = validation.isValid && !isSaving && !isSubmitting;
    $: canSubmit = validation.isValid && !isSaving && !isSubmitting;
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="flex flex-col h-screen bg-base-200 font-sans">
    <div class="navbar bg-base-100 shadow-lg">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={navigateToMain}>
                ← 返回主页
            </button>
        </div>
        <div class="navbar-center">
            <h1 class="text-xl font-bold">Markdown 编辑器</h1>
        </div>
        <div class="navbar-end">
            <div class="flex gap-2">
                <button
                    class="btn btn-outline"
                    on:click={onSave}
                    disabled={!canSave}
                >
                    {#if isSaving}
                        <span class="loading loading-spinner loading-sm"></span>
                        保存中...
                    {:else}
                        💾 保存 (Ctrl+S)
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
        <!-- Toolbar -->
        <div
            class="bg-base-100 border-r border-base-300 p-4 w-64 overflow-y-auto"
        >
            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold mb-2">格式工具</h3>
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertBold}
                            title="粗体 (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertItalic}
                            title="斜体 (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertHeader}
                            title="标题"
                        >
                            H1
                        </button>
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertList}
                            title="列表"
                        >
                            📋
                        </button>
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertLink}
                            title="链接"
                        >
                            🔗
                        </button>
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onInsertCode}
                            title="行内代码"
                        >
                            &lt;/&gt;
                        </button>
                        <button
                            class="btn btn-outline btn-sm col-span-2"
                            on:click={onInsertCodeBlock}
                            title="代码块"
                        >
                            📝 代码块
                        </button>
                        <button
                            class="btn btn-outline btn-sm col-span-2"
                            on:click={onInsertTable}
                            title="表格"
                        >
                            📊 表格
                        </button>
                    </div>
                </div>

                <div class="divider"></div>

                <div>
                    <h3 class="font-semibold mb-2">转换设置</h3>
                    <div class="form-control">
                        <label class="label" for="output-format">
                            <span class="label-text">输出格式</span>
                        </label>
                        <select
                            id="output-format"
                            class="select select-bordered select-sm w-full"
                            bind:value={selectedOutputFormat}
                        >
                            {#each editorOutputFormats as format}
                                <option value={format.value}>
                                    {format.label}
                                </option>
                            {/each}
                        </select>
                    </div>

                    <button
                        class="btn btn-primary btn-block mt-4"
                        on:click={onSubmit}
                        disabled={!canSubmit}
                    >
                        {#if isSubmitting}
                            <span class="loading loading-spinner loading-sm"
                            ></span>
                            转换中...
                        {:else}
                            🚀 转换并保存 (Ctrl+Shift+Enter)
                        {/if}
                    </button>
                </div>

                <div class="divider"></div>

                <div class="text-sm text-base-content opacity-70">
                    <h4 class="font-semibold mb-1">快捷键</h4>
                    <ul class="space-y-1">
                        <li>Ctrl+S: 保存</li>
                        <li>Ctrl+B: 粗体</li>
                        <li>Ctrl+I: 斜体</li>
                        <li>Ctrl+Shift+Enter: 转换</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <div class="bg-base-100 border-b border-base-300 px-4 py-2">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-base-content opacity-70">
                        字符数: {textareaContent.length}
                    </span>
                    {#if !validation.isValid}
                        <span class="text-error text-sm">
                            {validation.message}
                        </span>
                    {/if}
                </div>
            </div>

            <div class="flex-1 overflow-hidden">
                <textarea
                    class="textarea textarea-ghost w-full h-full resize-none border-0 rounded-none text-base leading-relaxed p-6 focus:outline-none"
                    placeholder="在此输入您的 Markdown 内容...

例如：
# 这是标题

这是一段**粗体文本**和*斜体文本*。

- 列表项目 1
- 列表项目 2

```javascript
console.log('Hello, World!');
```

[这是一个链接](https://example.com)"
                    bind:value={textareaContent}
                    spellcheck="false"
                ></textarea>
            </div>
        </div>
    </div>

    <!-- Status bar -->
    <div class="bg-base-200 border-t border-base-300 px-4 py-2">
        <div
            class="flex justify-between items-center text-sm text-base-content opacity-70"
        >
            <span>
                {#if textareaContent.trim()}
                    内容已就绪
                {:else}
                    等待输入...
                {/if}
            </span>
            <span>
                行数: {textareaContent.split("\n").length}
            </span>
        </div>
    </div>
</div>

<style>
    textarea {
        font-family:
            "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro",
            monospace;
    }

    textarea::placeholder {
        color: #9ca3af;
        opacity: 0.6;
    }
</style>
