<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { open, save } from "@tauri-apps/plugin-dialog";
    import { invoke } from "@tauri-apps/api/core";
    import { getVersion } from "@tauri-apps/api/app";
    import { basename, dirname } from "@tauri-apps/api/path";
    import { listen, TauriEvent, type Event } from "@tauri-apps/api/event";
    import type { PhysicalPosition } from "@tauri-apps/api/window";
    import ConversionHistory from "../components/ConversionHistory.svelte";

    // Define interfaces
    interface DropPayload {
        paths: string[];
        position: PhysicalPosition;
    }

    interface ConversionStatus {
        path: string;
        status: "pending" | "converting" | "success" | "error";
        message: string;
        isSuccess: boolean;
        outputPath?: string;
    }

    // State variables
    let inputPaths: string[] = [];
    let conversionProgress: ConversionStatus[] = [];
    let selectedOutputFormat: string = "docx";
    let selectedInputFormat: string = "auto";
    let isLoading: boolean = false;
    let isPreviewLoading: boolean = false;
    let showPreviewDialog: boolean = false;
    let previewHtml: string = "";
    let conversionHistory: ConversionStatus[] = [];
    let appVersion: string = "N/A";

    const availableInputFormats = [
        "auto",
        "markdown",
        "html",
        "latex",
        "rst",
        "docx",
        "epub",
    ];
    const availableOutputFormats = [
        "docx",
        "html",
        "tex",
        "md",
        "odt",
        "rst",
        "epub",
    ];

    // Computed properties
    $: hasMultipleFiles = inputPaths.length > 1;
    $: hasFiles = inputPaths.length > 0;
    $: hasInput = hasFiles;

    // Helper functions
    function addFileAndProgress(filePath: string): boolean {
        const isPdf = filePath.toLowerCase().endsWith(".pdf");
        if (isPdf) {
            showMessage(`不支持直接转换 PDF 文件: ${filePath}`, "warning");
            return false;
        }

        if (!inputPaths.includes(filePath)) {
            inputPaths = [...inputPaths, filePath];
            conversionProgress = [
                ...conversionProgress,
                {
                    path: filePath,
                    status: "pending",
                    message: "待处理",
                    isSuccess: true,
                },
            ];
            return true;
        }
        return false;
    }

    function removeFileByPath(filePathToRemove: string) {
        inputPaths = inputPaths.filter((path) => path !== filePathToRemove);
        conversionProgress = conversionProgress.filter(
            (p) => p.path !== filePathToRemove,
        );
    }

    function clearAllFiles() {
        inputPaths = [];
        conversionProgress = [];
    }

    function showMessage(
        message: string,
        type: "success" | "error" | "warning" | "info" = "info",
    ) {
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

    function openEditor() {
        goto("/editor");
    }

    async function selectFile() {
        try {
            const selected = await open({
                multiple: true,
                directory: false,
                title: "选择输入文件",
            });
            let addedCount = 0;
            if (Array.isArray(selected)) {
                selected.forEach((path) => {
                    if (addFileAndProgress(path)) {
                        addedCount++;
                    }
                });
            } else if (typeof selected === "string") {
                if (addFileAndProgress(selected)) {
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                previewHtml = "";
                showMessage(`已添加 ${addedCount} 个文件`, "success");
            }
        } catch (error: unknown) {
            console.error("选择文件时出错:", error);
            showMessage(`选择文件时出错: ${error}`, "error");
        }
    }

    function handleFileDrop(paths: string[]) {
        let addedCount = 0;
        if (paths && paths.length > 0) {
            paths.forEach((filePath) => {
                if (addFileAndProgress(filePath)) {
                    console.log("文件已拖放:", filePath);
                    addedCount++;
                }
            });
            if (addedCount > 0) {
                previewHtml = "";
                showMessage(`已添加 ${addedCount} 个文件`, "success");
            }
        } else {
            console.warn("handleFileDrop 收到空或无效的路径数组:", paths);
        }
    }

    async function generatePreview() {
        if (!hasInput) {
            showMessage("请先选择输入文件", "warning");
            return;
        }
        if (hasMultipleFiles) {
            showMessage("预览功能当前仅支持单个文件", "warning");
            return;
        }
        const targetPath = inputPaths[0];

        isPreviewLoading = true;
        previewHtml = "";

        try {
            const options = {
                input_path: targetPath,
                input_format: selectedInputFormat,
            };
            const htmlResult: string = await invoke("preview_file", {
                options,
            });
            previewHtml = htmlResult;
            showPreviewDialog = true;
            showMessage("预览生成成功", "success");
        } catch (error: unknown) {
            console.error("预览生成出错:", error);
            showMessage(`预览生成失败: ${error}`, "error");
        } finally {
            isPreviewLoading = false;
        }
    }

    async function startConversion() {
        if (!hasInput) {
            showMessage("请先选择或拖拽文件", "warning");
            return;
        }

        isLoading = true;

        // Reset status of existing files to pending before starting
        conversionProgress = conversionProgress.map((p) => ({
            ...p,
            status: "pending" as const,
            message: "待处理",
            isSuccess: true,
        }));

        let successCount = 0;
        let errorCount = 0;

        const pathsToConvert = [...inputPaths];
        const isSingleFile = pathsToConvert.length === 1;

        for (const currentPath of pathsToConvert) {
            const progressIndex = conversionProgress.findIndex(
                (p) => p.path === currentPath,
            );

            if (progressIndex === -1 || !inputPaths.includes(currentPath)) {
                console.warn(
                    `Skipping file ${currentPath}, removed before conversion started or missing progress entry.`,
                );
                continue;
            }

            conversionProgress[progressIndex].status = "converting";
            conversionProgress[progressIndex].message = "正在转换...";
            conversionProgress = [...conversionProgress]; // Trigger reactivity

            try {
                const inputBasename = await basename(currentPath);
                const inputDir = await dirname(currentPath);

                const lastDotIndex = inputBasename.lastIndexOf(".");
                let nameWithoutExt: string;
                if (lastDotIndex > 0) {
                    nameWithoutExt = inputBasename.substring(0, lastDotIndex);
                } else {
                    nameWithoutExt = inputBasename;
                }

                let outputPath: string | null;

                if (isSingleFile) {
                    const suggestedFilename = `${nameWithoutExt}.${selectedOutputFormat}`;
                    outputPath = await save({
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
                        showMessage(
                            `文件 "${inputBasename}" 的转换已取消`,
                            "info",
                        );
                        if (progressIndex !== -1) {
                            conversionProgress[progressIndex].status =
                                "pending";
                            conversionProgress[progressIndex].message =
                                "已取消";
                            conversionProgress[progressIndex].isSuccess = true;
                            conversionProgress = [...conversionProgress];
                        }
                        continue;
                    }
                    console.log("User selected Output Path:", outputPath);
                } else {
                    outputPath = `${inputDir}/${nameWithoutExt}.${selectedOutputFormat}`;
                    console.log("Generated Output Path (batch):", outputPath);
                }

                if (!outputPath) {
                    console.error("Unexpected null outputPath after check.");
                    if (progressIndex !== -1) {
                        conversionProgress[progressIndex].status = "pending";
                        conversionProgress[progressIndex].message =
                            "输出路径错误";
                        conversionProgress[progressIndex].isSuccess = false;
                        conversionProgress = [...conversionProgress];
                    }
                    continue;
                }

                const options = {
                    input_path: currentPath,
                    output_format: selectedOutputFormat,
                    output_path: outputPath,
                    input_format: selectedInputFormat,
                };

                const result: string = await invoke("convert_file", {
                    options,
                });

                const currentIndex = conversionProgress.findIndex(
                    (p) => p.path === currentPath,
                );
                if (currentIndex !== -1) {
                    conversionProgress[currentIndex].status = "success";
                    conversionProgress[currentIndex].message =
                        result || "转换成功";
                    conversionProgress[currentIndex].isSuccess = true;
                    conversionProgress[currentIndex].outputPath = outputPath;
                    conversionHistory = [
                        { ...conversionProgress[currentIndex] },
                        ...conversionHistory,
                    ];
                    successCount++;
                    conversionProgress = [...conversionProgress];
                } else {
                    console.warn(
                        `File ${currentPath} conversion succeeded but entry was removed.`,
                    );
                }
            } catch (error: unknown) {
                console.error(`文件 "${currentPath}" 转换出错:`, error);
                const errorMsg = `转换失败: ${error}`;
                const currentIndex = conversionProgress.findIndex(
                    (p) => p.path === currentPath,
                );
                if (currentIndex !== -1) {
                    conversionProgress[currentIndex].status = "error";
                    conversionProgress[currentIndex].message = errorMsg;
                    conversionProgress[currentIndex].isSuccess = false;
                    errorCount++;
                    conversionProgress = [...conversionProgress];
                } else {
                    console.warn(
                        `File ${currentPath} conversion failed but entry was removed.`,
                    );
                }
            }
        }

        isLoading = false;

        if (errorCount === 0 && successCount > 0) {
            showMessage(
                `批量转换完成，${successCount} 个文件成功。`,
                "success",
            );
        } else if (errorCount > 0) {
            showMessage(
                `批量转换完成，${successCount} 个成功，${errorCount} 个失败。`,
                "warning",
            );
        } else if (successCount === 0 && errorCount === 0) {
            showMessage(
                "没有文件被转换（可能列表为空或文件在转换前被移除）。",
                "info",
            );
        }
    }

    async function openConvertedFile(outputPath: string | undefined) {
        if (!outputPath) {
            showMessage("无法获取文件路径", "error");
            return;
        }
        try {
            console.log(`尝试打开文件: ${outputPath}`);
            await invoke("open_file_in_default_app", { path: outputPath });
        } catch (error: unknown) {
            console.error(`打开文件 ${outputPath} 出错:`, error);
            showMessage(`打开文件失败: ${error}`, "error");
        }
    }

    async function showInFolder(outputPath: string | undefined) {
        if (!outputPath) {
            showMessage("无法获取文件路径", "error");
            return;
        }
        try {
            const dir = await dirname(outputPath);
            console.log(`尝试打开文件夹: ${dir}`);
            await invoke("show_in_folder", { path: dir });
        } catch (error: unknown) {
            console.error(`打开文件夹 ${outputPath} 出错:`, error);
            showMessage(`打开文件夹失败: ${error}`, "error");
        }
    }

    async function loadHistoryFromDisk() {
        try {
            const loadedHistory: ConversionStatus[] =
                await invoke("load_history");
            conversionHistory = loadedHistory || [];
            console.log(`成功加载 ${conversionHistory.length} 条历史记录。`);
        } catch (error: unknown) {
            console.error("加载历史记录失败:", error);
            showMessage(`加载历史记录失败: ${error}`, "error");
            conversionHistory = [];
        }
    }

    async function saveHistoryToDisk() {
        try {
            await invoke("save_history", { history: conversionHistory });
            console.log(`历史记录已保存 (${conversionHistory.length} 条)。`);
        } catch (error: unknown) {
            console.error("保存历史记录失败:", error);
        }
    }

    function clearHistory() {
        if (conversionHistory.length > 0) {
            conversionHistory = [];
            showMessage("历史记录已清空", "success");
            saveHistoryToDisk();
        } else {
            showMessage("历史记录已经是空的", "info");
        }
    }

    function deleteHistoryItem(itemToDelete: ConversionStatus) {
        const index = conversionHistory.findIndex(
            (item) =>
                item.path === itemToDelete.path &&
                item.outputPath === itemToDelete.outputPath,
        );
        if (index !== -1) {
            conversionHistory = conversionHistory.filter((_, i) => i !== index);
            showMessage("已删除历史记录", "success");
            saveHistoryToDisk();
        } else {
            showMessage("未找到要删除的历史记录", "warning");
        }
    }

    function getBaseName(path: string | undefined): string {
        if (!path) return "";
        const separator = path.includes("/") ? "/" : "\\";
        const parts = path.split(separator);
        return parts[parts.length - 1] || path;
    }

    // Setup drag and drop listener
    let unlistenDragDrop: (() => void) | null = null;

    onMount(async () => {
        // Get app version
        try {
            appVersion = await getVersion();
        } catch (error: unknown) {
            console.error("Failed to get app version:", error);
            appVersion = "Error";
        }

        // Load history when component mounts
        await loadHistoryFromDisk();

        try {
            unlistenDragDrop = await listen<DropPayload>(
                TauriEvent.DRAG_DROP,
                (event: Event<DropPayload>) => {
                    if (event.payload?.paths?.length > 0) {
                        handleFileDrop(event.payload.paths);
                    } else {
                        console.warn("拖放事件没有有效的 paths 数组:", event);
                    }
                },
            );
            console.log("文件拖放监听器已设置");
        } catch (error: unknown) {
            console.error("设置文件拖放监听器时出错:", error);
            showMessage(`无法设置文件拖放功能: ${error}`, "error");
        }
    });

    onDestroy(() => {
        if (unlistenDragDrop) {
            unlistenDragDrop();
            console.log("文件拖放监听器已移除");
        }
    });

    // Watch for history changes and save to disk
    $: if (conversionHistory) {
        saveHistoryToDisk();
    }
</script>

<div class="home-container">
    <div class="main-content">
        <div class="card main-card">
            <div class="card-header">
                <h1 class="app-title">Pandoc GUI</h1>
            </div>

            <div class="card-body">
                <!-- Combined Dropzone and Select Area -->
                <div
                    class="dropzone-hint"
                    class:is-disabled={isLoading || isPreviewLoading}
                    role="button"
                    tabindex="0"
                    title="点击选择或拖拽文件到此处"
                    on:click={() =>
                        !isLoading && !isPreviewLoading && selectFile()}
                    on:keydown={(e) =>
                        e.key === "Enter" &&
                        !isLoading &&
                        !isPreviewLoading &&
                        selectFile()}
                >
                    <div class="icon">📁</div>
                    <p class="hint-text">点击选择或拖拽文件到此处</p>
                    <p class="hint-subtext">支持单个或多个文件</p>
                </div>

                <button
                    class="editor-button"
                    disabled={isLoading || isPreviewLoading}
                    title="使用 Markdown 编辑器输入内容"
                    on:click={openEditor}
                >
                    ✏️ 使用 Markdown 编辑器输入
                </button>

                {#if hasInput}
                    <div class="file-status-table-container">
                        <div class="file-status-header">
                            <span class="header-text">文件列表 & 状态</span>
                            {#if hasFiles}
                                <button
                                    class="clear-button"
                                    disabled={isLoading}
                                    on:click={clearAllFiles}
                                >
                                    清空列表
                                </button>
                            {/if}
                        </div>
                        <div class="table-container">
                            <table class="file-table">
                                <thead>
                                    <tr>
                                        <th>文件名</th>
                                        <th>状态</th>
                                        <th>信息 / 输出</th>
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
                                                    class="status-tag status-{item.status}"
                                                >
                                                    {#if item.status === "pending"}
                                                        待处理
                                                    {:else if item.status === "converting"}
                                                        ⏳ 转换中
                                                    {:else if item.status === "success"}
                                                        ✅ 成功
                                                    {:else if item.status === "error"}
                                                        ❌ 失败
                                                    {:else if item.message === "已取消"}
                                                        ⚠️ 已取消
                                                    {/if}
                                                </span>
                                            </td>
                                            <td>
                                                {#if item.status === "success" && item.outputPath}
                                                    <span
                                                        class="success-text"
                                                        title={item.outputPath}
                                                    >
                                                        输出: {getBaseName(
                                                            item.outputPath,
                                                        )}
                                                    </span>
                                                {:else if item.status === "error"}
                                                    <span class="error-text"
                                                        >{item.message}</span
                                                    >
                                                {:else if item.message === "已取消"}
                                                    <span class="warning-text"
                                                        >已取消</span
                                                    >
                                                {:else}
                                                    <span class="info-text"
                                                        >-</span
                                                    >
                                                {/if}
                                            </td>
                                            <td>
                                                {#if item.status === "success" && item.outputPath}
                                                    <div class="action-buttons">
                                                        <button
                                                            class="action-button primary"
                                                            disabled={isLoading}
                                                            on:click={() =>
                                                                openConvertedFile(
                                                                    item.outputPath,
                                                                )}
                                                        >
                                                            📄 打开
                                                        </button>
                                                        <button
                                                            class="action-button success"
                                                            disabled={isLoading}
                                                            on:click={() =>
                                                                showInFolder(
                                                                    item.outputPath,
                                                                )}
                                                        >
                                                            📁 文件夹
                                                        </button>
                                                    </div>
                                                {:else if item.status !== "converting" && item.status !== "success"}
                                                    <button
                                                        class="action-button danger"
                                                        disabled={isLoading}
                                                        on:click={() =>
                                                            removeFileByPath(
                                                                item.path,
                                                            )}
                                                    >
                                                        ❌ 移除
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

                    <div class="divider">
                        <span class="divider-icon">📄</span>
                    </div>
                {/if}

                <div class="format-selectors">
                    <div class="form-item">
                        <label for="input-format">输入格式:</label>
                        <select
                            id="input-format"
                            bind:value={selectedInputFormat}
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

                    <div class="form-item">
                        <label for="output-format">输出格式:</label>
                        <select
                            id="output-format"
                            bind:value={selectedOutputFormat}
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

                <div class="button-group">
                    <button
                        class="preview-button"
                        disabled={!hasInput ||
                            hasMultipleFiles ||
                            isLoading ||
                            isPreviewLoading}
                        class:loading={isPreviewLoading}
                        title={hasMultipleFiles
                            ? "预览仅支持单个文件"
                            : "预览 HTML"}
                        on:click={generatePreview}
                    >
                        {#if isPreviewLoading}
                            ⏳ 生成中...
                        {:else}
                            👁️ 预览 (HTML)
                        {/if}
                    </button>
                    <button
                        class="convert-button"
                        disabled={!hasInput || isLoading || isPreviewLoading}
                        class:loading={isLoading}
                        on:click={startConversion}
                    >
                        {#if isLoading}
                            ⏳ 正在转换...
                        {:else if hasMultipleFiles}
                            🔄 开始批量转换
                        {:else}
                            🔄 转换选定文件
                        {/if}
                    </button>
                </div>
            </div>
        </div>

        {#if conversionHistory.length > 0}
            <div class="card history-card">
                <div class="card-header">
                    <div class="history-header">
                        <span class="header-text">转换历史记录</span>
                        <button
                            class="clear-history-button"
                            on:click={clearHistory}
                        >
                            清空历史记录
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <ConversionHistory
                        {conversionHistory}
                        {openConvertedFile}
                        {showInFolder}
                        {deleteHistoryItem}
                    />
                </div>
            </div>
        {/if}

        {#if showPreviewDialog}
            <div
                class="modal-overlay"
                role="presentation"
                on:click={() => (showPreviewDialog = false)}
                on:keydown={(e) =>
                    e.key === "Escape" ? (showPreviewDialog = false) : null}
            >
                <div
                    class="modal"
                    role="dialog"
                    tabindex="-1"
                    on:click|stopPropagation
                    on:keydown={(e) =>
                        e.key === "Escape" ? (showPreviewDialog = false) : null}
                >
                    <div class="modal-header">
                        <h2>HTML 预览</h2>
                        <button
                            class="close-button"
                            on:click={() => (showPreviewDialog = false)}
                            >✕</button
                        >
                    </div>
                    <div class="modal-body">
                        <div class="preview-container">
                            {@html previewHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button on:click={() => (showPreviewDialog = false)}
                            >关闭预览</button
                        >
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <footer class="app-footer">
        <div class="footer-content">
            <span class="footer-text"
                >Pandoc GUI - 一个简单的 Pandoc 图形界面</span
            >
            <span class="footer-separator">|</span>
            <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                title="使用 MIT 许可证开源">MIT</a
            >
            <span class="footer-separator">/</span>
            <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                title="使用 Apache 2.0 许可证开源">Apache 2.0</a
            >
            <span class="footer-separator">|</span>
            <span class="footer-version">v{appVersion}</span>
        </div>
    </footer>
</div>

<style>
    .home-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: #f7f8fa;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
            Arial, sans-serif;
    }

    .main-content {
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
    }

    .card {
        background: white;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
        transition: box-shadow 0.3s ease-in-out;
    }

    .card:hover {
        box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
    }

    .main-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-bottom: 20px;
    }

    .card-header {
        background-color: #fafafa;
        border-bottom: 1px solid #e4e7ed;
        padding: 15px 25px;
    }

    .card-body {
        padding: 25px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .app-title {
        margin: 0;
        font-size: 1.6em;
        font-weight: 600;
        color: #303133;
        text-align: center;
    }

    .dropzone-hint {
        cursor: pointer;
        text-align: center;
        padding: 25px 15px;
        border: 2px dashed #dcdfe6;
        border-radius: 8px;
        color: #a8abb2;
        font-size: 14px;
        background-color: #fcfcfc;
        transition:
            background-color 0.3s,
            border-color 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 120px;
    }

    .dropzone-hint:hover {
        background-color: #f5f7fa;
        border-color: #c0c4cc;
    }

    .dropzone-hint.is-disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .icon {
        font-size: 40px;
        margin-bottom: 10px;
    }

    .hint-text {
        margin: 0;
        font-size: 1.1em;
        font-weight: 500;
    }

    .hint-subtext {
        margin: 5px 0 0;
        font-size: 0.9em;
        color: #909399;
    }

    .editor-button {
        width: 100%;
        padding: 15px 20px;
        font-size: 14px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        transition: all 0.3s;
    }

    .editor-button:hover:not(:disabled) {
        border-color: #409eff;
        color: #409eff;
    }

    .editor-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .file-status-table-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        background-color: #fff;
    }

    .file-status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background-color: #fafafa;
        border-bottom: 1px solid #e4e7ed;
        flex-shrink: 0;
    }

    .header-text {
        font-weight: 500;
        color: #303133;
    }

    .clear-button {
        padding: 4px 8px;
        font-size: 12px;
        color: #f56c6c;
        border: 1px solid #f56c6c;
        background: white;
        border-radius: 4px;
        cursor: pointer;
    }

    .clear-button:hover:not(:disabled) {
        background: #f56c6c;
        color: white;
    }

    .table-container {
        flex: 1;
        overflow-y: auto;
    }

    .file-table {
        width: 100%;
        border-collapse: collapse;
    }

    .file-table th {
        background-color: #f5f7fa;
        font-weight: 500;
        color: #606266;
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #e4e7ed;
    }

    .file-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: middle;
    }

    .file-table tbody tr:hover {
        background-color: #f5f7fa;
    }

    .status-tag {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }

    .status-pending {
        background-color: #e1f3ff;
        color: #409eff;
    }

    .status-converting {
        background-color: #e1f3ff;
        color: #409eff;
    }

    .status-success {
        background-color: #f0f9ff;
        color: #67c23a;
    }

    .status-error {
        background-color: #fef0f0;
        color: #f56c6c;
    }

    .success-text {
        color: #67c23a;
        font-size: 12px;
    }

    .error-text {
        color: #f56c6c;
        font-size: 12px;
    }

    .warning-text {
        color: #e6a23c;
        font-size: 12px;
    }

    .info-text {
        color: #909399;
        font-size: 12px;
    }

    .action-buttons {
        display: flex;
        gap: 4px;
    }

    .action-button {
        padding: 4px 8px;
        font-size: 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .action-button.primary {
        background: #409eff;
        color: white;
    }

    .action-button.primary:hover:not(:disabled) {
        background: #66b1ff;
    }

    .action-button.success {
        background: #67c23a;
        color: white;
    }

    .action-button.success:hover:not(:disabled) {
        background: #85ce61;
    }

    .action-button.danger {
        background: #f56c6c;
        color: white;
    }

    .action-button.danger:hover:not(:disabled) {
        background: #f78989;
    }

    .action-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .divider {
        margin: 15px 0;
        text-align: center;
        border-top: 1px solid #e4e7ed;
        padding-top: 15px;
    }

    .divider-icon {
        font-size: 16px;
    }

    .format-selectors {
        display: flex;
        gap: 25px;
        align-items: flex-end;
    }

    .form-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .form-item label {
        font-weight: 500;
        color: #606266;
        font-size: 14px;
    }

    .form-item select {
        padding: 8px 12px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        background: white;
        min-width: 180px;
        font-size: 14px;
    }

    .form-item select:focus {
        border-color: #409eff;
        outline: none;
    }

    .form-item select:disabled {
        background: #f5f7fa;
        color: #c0c4cc;
        cursor: not-allowed;
    }

    .button-group {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }

    .preview-button,
    .convert-button {
        flex: 1;
        padding: 15px 20px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .preview-button {
        background: #f7f7f7;
        border: 1px solid #dcdfe6;
        color: #606266;
    }

    .preview-button:hover:not(:disabled) {
        background: #ecf5ff;
        border-color: #b3d8ff;
        color: #409eff;
    }

    .convert-button {
        background: #409eff;
        color: white;
        font-weight: bold;
    }

    .convert-button:hover:not(:disabled) {
        background: #66b1ff;
    }

    .preview-button:disabled,
    .convert-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .history-card {
        margin-top: 20px;
        flex-shrink: 0;
    }

    .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .clear-history-button {
        padding: 4px 8px;
        font-size: 12px;
        color: #f56c6c;
        background: none;
        border: none;
        cursor: pointer;
        text-decoration: underline;
    }

    .clear-history-button:hover {
        color: #f78989;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal {
        background: white;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e4e7ed;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }

    .close-button {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        color: #909399;
    }

    .close-button:hover {
        color: #606266;
    }

    .modal-body {
        flex: 1;
        overflow: hidden;
    }

    .preview-container {
        height: 75vh;
        overflow-y: auto;
        border: 1px solid #eee;
        padding: 15px;
        background-color: #fff;
        border-radius: 4px;
        margin: 20px;
    }

    .modal-footer {
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e4e7ed;
    }

    .modal-footer button {
        padding: 8px 20px;
        background: #409eff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .modal-footer button:hover {
        background: #66b1ff;
    }

    .app-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: 1px solid #eeeeee;
        background-color: #ffffff;
        flex-shrink: 0;
        padding: 8px 20px;
    }

    .footer-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #909399;
    }

    .footer-text {
        color: #606266;
    }

    .footer-separator {
        color: #c0c4cc;
    }

    .footer-content a {
        color: #409eff;
        text-decoration: none;
    }

    .footer-content a:hover {
        text-decoration: underline;
    }

    .footer-version {
        color: #606266;
    }

    @media (prefers-color-scheme: dark) {
        .home-container {
            background-color: #1a1a1a;
            color: #e4e7ed;
        }

        .card {
            background: #2d2d2d;
            border-color: #444;
        }

        .card-header {
            background-color: #3a3a3a;
            border-bottom-color: #444;
        }

        .app-title {
            color: #e4e7ed;
        }

        .dropzone-hint {
            background-color: #2d2d2d;
            border-color: #444;
            color: #909399;
        }

        .dropzone-hint:hover {
            background-color: #3a3a3a;
            border-color: #606266;
        }

        .editor-button {
            background: #2d2d2d;
            color: #e4e7ed;
            border-color: #444;
        }

        .file-status-table-container {
            background-color: #2d2d2d;
            border-color: #444;
        }

        .file-status-header {
            background-color: #3a3a3a;
            border-bottom-color: #444;
        }

        .file-table th {
            background-color: #3a3a3a;
            color: #c0c4cc;
            border-bottom-color: #444;
        }

        .file-table td {
            border-bottom-color: #444;
        }

        .file-table tbody tr:hover {
            background-color: #3a3a3a;
        }

        .form-item select {
            background: #2d2d2d;
            color: #e4e7ed;
            border-color: #444;
        }

        .form-item select:disabled {
            background: #1a1a1a;
            color: #666;
        }

        .preview-button {
            background: #2d2d2d;
            border-color: #444;
            color: #c0c4cc;
        }

        .modal {
            background: #2d2d2d;
            color: #e4e7ed;
        }

        .modal-header {
            border-bottom-color: #444;
        }

        .modal-footer {
            border-top-color: #444;
        }

        .preview-container {
            background-color: #2d2d2d;
            border-color: #444;
            color: #e4e7ed;
        }

        .app-footer {
            background-color: #2d2d2d;
            border-top-color: #444;
        }
    }
</style>
