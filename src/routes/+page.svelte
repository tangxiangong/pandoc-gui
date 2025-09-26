<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import ConversionHistory from "../components/ConversionHistory.svelte";

    // Import all utilities from lib
    import {
        type ConversionStatus,
        type DropPayload,
        type InputFormat,
        type OutputFormat,
        availableInputFormats,
        availableOutputFormats,

        // Commands
        getAppVersion,
        openFileInDefaultApp,
        showInFolder,

        // File operations
        removeFileFromProgress,
        clearAllFiles,
        getBaseName,
        resetProgressToPending,

        // Message handling
        showMessage,

        // History management
        loadHistoryFromDisk,
        saveHistoryToDisk,
        clearConversionHistory,
        deleteHistoryItem,

        // Conversion logic
        generatePreview,
        startConversion,

        // Event handlers
        handleFileDrop,
        selectFiles,
        setupDragDropListener,
        navigateToEditor,
        handleKeyDown,
        handlePreviewDialogClose,
    } from "../lib/utils";

    // State variables
    let inputPaths: string[] = [];
    let conversionProgress: ConversionStatus[] = [];
    let selectedOutputFormat: OutputFormat = "docx";
    let selectedInputFormat: InputFormat = "auto";
    let isLoading: boolean = false;
    let isPreviewLoading: boolean = false;
    let showPreviewDialog: boolean = false;
    let previewHtml: string = "";
    let conversionHistory: ConversionStatus[] = [];
    let appVersion: string = "N/A";

    // Computed properties
    $: hasMultipleFiles = inputPaths.length > 1;
    $: hasFiles = inputPaths.length > 0;
    $: hasInput = hasFiles;

    // Event handlers
    function onFileDrop(paths: string[]) {
        const result = handleFileDrop(paths, inputPaths, conversionProgress);
        inputPaths = result.updatedInputPaths;
        conversionProgress = result.updatedProgress;
        if (result.addedCount > 0) {
            previewHtml = "";
        }
    }

    async function onSelectFile() {
        if (!browser) return;
        const result = await selectFiles(inputPaths, conversionProgress);
        inputPaths = result.updatedInputPaths;
        conversionProgress = result.updatedProgress;
        if (result.addedCount > 0) {
            previewHtml = "";
        }
    }

    function onRemoveFile(filePathToRemove: string) {
        const result = removeFileFromProgress(
            filePathToRemove,
            inputPaths,
            conversionProgress,
        );
        inputPaths = result.updatedInputPaths;
        conversionProgress = result.updatedProgress;
    }

    function onClearAllFiles() {
        const result = clearAllFiles();
        inputPaths = result.updatedInputPaths;
        conversionProgress = result.updatedProgress;
    }

    async function onGeneratePreview() {
        if (!browser) return;
        isPreviewLoading = true;
        try {
            previewHtml = await generatePreview(
                inputPaths,
                selectedInputFormat,
                hasMultipleFiles,
            );
            showPreviewDialog = true;
        } catch (error) {
            // Error already handled in generatePreview
        } finally {
            isPreviewLoading = false;
        }
    }

    async function onStartConversion() {
        if (!browser) return;
        isLoading = true;
        conversionProgress = resetProgressToPending(conversionProgress);

        try {
            const result = await startConversion(
                inputPaths,
                selectedInputFormat,
                selectedOutputFormat,
                conversionProgress,
                conversionHistory,
            );
            conversionProgress = result.updatedProgress;
            conversionHistory = result.updatedHistory;
            showMessage(
                result.resultMessage.message,
                result.resultMessage.type,
            );
        } catch (error) {
            showMessage(`转换过程中出现错误: ${error}`, "error");
        } finally {
            isLoading = false;
        }
    }

    async function onOpenFile(outputPath?: string) {
        if (!browser || !outputPath) {
            showMessage("无法获取文件路径", "error");
            return;
        }
        try {
            await openFileInDefaultApp(outputPath);
        } catch (error: unknown) {
            showMessage(`打开文件失败: ${error}`, "error");
        }
    }

    async function onShowInFolder(outputPath?: string) {
        if (!browser || !outputPath) {
            showMessage("无法获取文件路径", "error");
            return;
        }
        try {
            await showInFolder(outputPath);
        } catch (error: unknown) {
            showMessage(`打开文件夹失败: ${error}`, "error");
        }
    }

    function onClearHistory() {
        if (conversionHistory.length > 0) {
            conversionHistory = clearConversionHistory();
            saveHistoryToDisk(conversionHistory);
        } else {
            showMessage("历史记录已经是空的", "info");
        }
    }

    function onDeleteHistoryItem(itemToDelete: ConversionStatus) {
        const result = deleteHistoryItem(conversionHistory, itemToDelete);
        if (result.deleted) {
            conversionHistory = result.updatedHistory;
            saveHistoryToDisk(conversionHistory);
        }
    }

    // Setup drag and drop listener
    let unlistenDragDrop: (() => void) | null = null;

    onMount(async () => {
        if (!browser) return;

        // Get app version
        appVersion = await getAppVersion();

        // Load history when component mounts
        conversionHistory = await loadHistoryFromDisk();

        // Setup drag and drop
        unlistenDragDrop = await setupDragDropListener(onFileDrop);
    });

    onDestroy(() => {
        if (browser && unlistenDragDrop) {
            unlistenDragDrop();
            console.log("文件拖放监听器已移除");
        }
    });

    // Watch for history changes and save to disk
    $: if (browser && conversionHistory) {
        saveHistoryToDisk(conversionHistory);
    }
</script>

<div class="min-h-screen flex flex-col bg-gray-50 font-sans">
    <div class="flex-1 p-5 flex flex-col">
        <div
            class="bg-white border border-gray-200 rounded-lg shadow-light hover:shadow-base transition-shadow flex-1 flex flex-col mb-5"
        >
            <div class="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h1
                    class="m-0 text-2xl font-semibold text-gray-800 text-center"
                >
                    Pandoc GUI
                </h1>
            </div>

            <div class="p-6 flex flex-col gap-5 flex-1">
                <!-- Combined Dropzone and Select Area -->
                <div
                    class="cursor-pointer text-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 bg-gray-50 transition-colors hover:bg-gray-100 hover:border-gray-400 flex flex-col items-center justify-center min-h-32"
                    class:opacity-60={isLoading || isPreviewLoading}
                    class:cursor-not-allowed={isLoading || isPreviewLoading}
                    role="button"
                    tabindex="0"
                    title="点击选择或拖拽文件到此处"
                    on:click={() =>
                        !isLoading && !isPreviewLoading && onSelectFile()}
                    on:keydown={(e) =>
                        !isLoading &&
                        !isPreviewLoading &&
                        handleKeyDown(e, onSelectFile)}
                >
                    <div class="icon">📄</div>
                    <p class="hint-text">拖拽文件到此处或点击选择文件</p>
                    <p class="hint-subtext">
                        支持多种格式: Markdown、HTML、LaTeX、Word 等
                    </p>
                </div>

                <button
                    class="btn btn-primary btn-sm self-end no-print"
                    on:click={navigateToEditor}
                    disabled={isLoading || isPreviewLoading}
                >
                    文本编辑器
                </button>

                {#if hasInput}
                    <div
                        class="bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col gap-3 max-h-80 overflow-y-auto"
                    >
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-base-content"
                                >已选择 {inputPaths.length} 个文件</span
                            >
                            {#if hasFiles}
                                <button
                                    class="btn btn-outline btn-sm"
                                    on:click={onClearAllFiles}
                                    disabled={isLoading || isPreviewLoading}
                                >
                                    清空列表
                                </button>
                            {/if}
                        </div>
                        <div class="flex-1 overflow-y-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th>文件名</th>
                                        <th>状态</th>
                                        <th>输出路径</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each conversionProgress as item (item.path)}
                                        <tr>
                                            <td>
                                                <span title={item.path}>
                                                    {getBaseName(item.path)}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    class="status-badge"
                                                    class:success={item.status ===
                                                        "success"}
                                                    class:error={item.status ===
                                                        "error"}
                                                    class:converting={item.status ===
                                                        "converting"}
                                                    class:pending={item.status ===
                                                        "pending"}
                                                    class:cancelled={item.message ===
                                                        "已取消"}
                                                >
                                                    {#if item.status === "pending"}
                                                        ⏳ {item.message}
                                                    {:else if item.status === "converting"}
                                                        🔄 {item.message}
                                                    {:else if item.status === "success"}
                                                        ✅ {item.message}
                                                    {:else if item.status === "error"}
                                                        ❌ {item.message}
                                                    {:else if item.message === "已取消"}
                                                        ⚠️ {item.message}
                                                    {/if}
                                                </span>
                                            </td>
                                            <td>
                                                {#if item.status === "success" && item.outputPath}
                                                    <span
                                                        title={item.outputPath}
                                                        class="text-success text-sm truncate max-w-48 inline-block"
                                                    >
                                                        {getBaseName(
                                                            item.outputPath,
                                                        )}
                                                    </span>
                                                {:else if item.status === "error"}
                                                    <span class="error-text"
                                                        >转换失败</span
                                                    >
                                                {:else if item.message === "已取消"}
                                                    <span class="warning-text"
                                                        >用户取消</span
                                                    >
                                                {:else}
                                                    <span class="info-text"
                                                        >-</span
                                                    >
                                                {/if}
                                            </td>
                                            <td>
                                                {#if item.status === "success" && item.outputPath}
                                                    <div
                                                        class="flex gap-1 justify-center items-center"
                                                    >
                                                        <button
                                                            class="btn btn-outline btn-xs"
                                                            title="打开文件"
                                                            on:click={() =>
                                                                onOpenFile(
                                                                    item.outputPath,
                                                                )}
                                                        >
                                                            📂 打开
                                                        </button>
                                                        <button
                                                            class="btn btn-outline btn-xs"
                                                            title="显示文件夹"
                                                            on:click={() =>
                                                                onShowInFolder(
                                                                    item.outputPath,
                                                                )}
                                                        >
                                                            📁 显示
                                                        </button>
                                                    </div>
                                                {:else if item.status !== "converting" && item.status !== "success"}
                                                    <button
                                                        class="btn btn-outline btn-xs"
                                                        title="移除文件"
                                                        on:click={() =>
                                                            onRemoveFile(
                                                                item.path,
                                                            )}
                                                        disabled={isLoading ||
                                                            isPreviewLoading}
                                                    >
                                                        移除
                                                    </button>
                                                {:else}
                                                    <span>-</span>
                                                {/if}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="my-4 text-center border-t border-gray-200 pt-4">
                        <span class="text-base">转换设置</span>
                    </div>
                {/if}

                <div class="flex gap-6 items-end">
                    <div class="flex flex-col gap-1">
                        <label for="input-format" class="label label-text"
                            >输入格式</label
                        >
                        <select
                            id="input-format"
                            bind:value={selectedInputFormat}
                            class="select select-bordered w-full max-w-xs"
                            disabled={isLoading || isPreviewLoading}
                        >
                            {#each availableInputFormats as format}
                                <option value={format}>
                                    {format === "auto"
                                        ? "自动检测"
                                        : format.toUpperCase()}
                                </option>
                            {/each}
                        </select>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label for="output-format" class="label label-text"
                            >输出格式</label
                        >
                        <select
                            id="output-format"
                            bind:value={selectedOutputFormat}
                            class="select select-bordered w-full max-w-xs"
                            disabled={isLoading || isPreviewLoading}
                        >
                            {#each availableOutputFormats as format}
                                <option value={format}>
                                    {format.toUpperCase()}
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="flex gap-2 mt-2">
                    <button
                        class="btn btn-outline"
                        on:click={onGeneratePreview}
                        disabled={!hasInput ||
                            hasMultipleFiles ||
                            isLoading ||
                            isPreviewLoading}
                    >
                        {#if isPreviewLoading}
                            <span class="loading loading-spinner"></span>
                            预览中...
                        {:else}
                            🔍 预览
                        {/if}
                    </button>
                    <button
                        class="btn btn-primary flex-1"
                        on:click={onStartConversion}
                        disabled={!hasInput || isLoading || isPreviewLoading}
                    >
                        {#if isLoading}
                            <span class="loading loading-spinner"></span>
                            转换中...
                        {:else if hasMultipleFiles}
                            🚀 批量转换
                        {:else}
                            🚀 开始转换
                        {/if}
                    </button>
                </div>
            </div>
        </div>

        {#if conversionHistory.length > 0}
            <div class="card bg-base-100 shadow-xl mt-5 flex-shrink-0">
                <div class="card-header bg-base-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-base-content"
                            >转换历史 ({conversionHistory.length})</span
                        >
                        <button
                            class="btn btn-outline btn-sm"
                            on:click={onClearHistory}
                        >
                            清空历史
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <ConversionHistory
                        history={conversionHistory}
                        onDeleteItem={onDeleteHistoryItem}
                        {onOpenFile}
                        {onShowInFolder}
                    />
                </div>
            </div>
        {/if}

        {#if showPreviewDialog}
            <div
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                on:click={() => (showPreviewDialog = false)}
                on:keydown={(e) =>
                    e.key === "Escape" && (showPreviewDialog = false)}
                role="dialog"
                aria-modal="true"
                tabindex="-1"
            >
                <div
                    class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
                    on:click={(e) => e.stopPropagation()}
                    role="document"
                >
                    <div class="modal-header">
                        <h2>文档预览</h2>
                        <button
                            class="btn btn-sm btn-circle"
                            on:click={() => (showPreviewDialog = false)}
                            aria-label="关闭预览"
                        >
                            ✕
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="preview-container">
                            {@html previewHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button
                            on:click={() => (showPreviewDialog = false)}
                            class="btn"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <footer class="footer footer-center p-4 bg-base-200">
        <div class="footer-content">
            <span class="footer-text"
                >Pandoc GUI - 一个简单的 Pandoc 图形界面</span
            >
            <span class="footer-separator text-gray-400">|</span>
            <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                title="使用 MIT 许可证开源"
                class="text-blue-600 hover:text-blue-800">MIT</a
            >
            <span class="footer-separator text-gray-400">|</span>
            <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                title="使用 Apache 2.0 许可证开源"
                class="text-blue-600 hover:text-blue-800">Apache 2.0</a
            >
            <span class="footer-separator text-gray-400">|</span>
            <span class="text-gray-600">v{appVersion}</span>
        </div>
    </footer>
</div>
