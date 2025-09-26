<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
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
        if (!browser) return;

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
        if (!browser) return;

        if (!hasInput) {
            showMessage("请先选择文件", "warning");
            return;
        }

        if (hasMultipleFiles) {
            showMessage("预览功能暂不支持多文件操作", "warning");
            return;
        }

        const targetPath = inputPaths[0];
        isPreviewLoading = true;

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
            console.error("预览生成失败:", error);
            showMessage(`预览失败: ${error}`, "error");
        } finally {
            isPreviewLoading = false;
        }
    }

    async function startConversion() {
        if (!browser) return;

        if (!hasInput) {
            showMessage("请先选择输入文件", "warning");
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

    async function openConvertedFile(outputPath?: string) {
        if (!browser) return;

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

    async function showInFolder(outputPath?: string) {
        if (!browser) return;

        if (!outputPath) {
            showMessage("无法获取文件路径", "error");
            return;
        }
        try {
            const dir = await dirname(outputPath);
            console.log(`尝试打开文件夹: ${dir}`);
            await invoke("show_in_folder", { path: dir });
        } catch (error: unknown) {
            console.error(`显示文件夹 ${outputPath} 出错:`, error);
            showMessage(`打开文件夹失败: ${error}`, "error");
        }
    }

    async function loadHistoryFromDisk() {
        if (!browser) return;

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
        if (!browser) return;

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
        if (!browser) return;

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
        if (browser && unlistenDragDrop) {
            unlistenDragDrop();
            console.log("文件拖放监听器已移除");
        }
    });

    // Watch for history changes and save to disk
    $: if (browser && conversionHistory) {
        saveHistoryToDisk();
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
                    class="btn btn-outline btn-block"
                    disabled={isLoading || isPreviewLoading}
                    title="使用 Markdown 编辑器输入内容"
                    on:click={openEditor}
                >
                    ✏️ 使用 Markdown 编辑器输入
                </button>

                {#if hasInput}
                    <div
                        class="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded bg-white"
                    >
                        <div
                            class="flex justify-between items-center px-3 py-2 bg-base-200 border-b border-base-300 flex-shrink-0"
                        >
                            <span class="font-medium text-base-content"
                                >文件列表</span
                            >
                            {#if hasFiles}
                                <button
                                    class="btn btn-sm btn-error"
                                    disabled={isLoading}
                                    on:click={clearAllFiles}
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
                                                    class="badge"
                                                    class:badge-info={item.status ===
                                                        "pending" ||
                                                        item.status ===
                                                            "converting"}
                                                    class:badge-success={item.status ===
                                                        "success"}
                                                    class:badge-error={item.status ===
                                                        "error"}
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
                                                    <div
                                                        class="flex gap-1 flex-wrap"
                                                    >
                                                        <button
                                                            class="btn btn-xs btn-primary"
                                                            disabled={isLoading}
                                                            on:click={() =>
                                                                openConvertedFile(
                                                                    item.outputPath,
                                                                )}
                                                        >
                                                            📄 打开
                                                        </button>
                                                        <button
                                                            class="btn btn-xs btn-success"
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
                                                        class="btn btn-xs btn-error"
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

                    <div class="my-4 text-center border-t border-gray-200 pt-4">
                        <span class="text-base">⚙️</span>
                    </div>
                {/if}

                <div class="flex gap-6 items-end">
                    <div class="flex flex-col gap-1">
                        <label for="input-format" class="label label-text"
                            >输入格式：</label
                        >
                        <select
                            id="input-format"
                            bind:value={selectedInputFormat}
                            disabled={isLoading || isPreviewLoading}
                            class="select select-bordered w-full max-w-xs"
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
                            >输出格式：</label
                        >
                        <select
                            id="output-format"
                            bind:value={selectedOutputFormat}
                            disabled={isLoading || isPreviewLoading}
                            class="select select-bordered w-full max-w-xs"
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
                        class="btn btn-outline flex-1"
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
                        class="btn btn-primary flex-1"
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
            <div class="card bg-base-100 shadow-xl mt-5 flex-shrink-0">
                <div class="card-header bg-base-200 px-6 py-4">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-base-content"
                            >转换历史记录</span
                        >
                        <button
                            class="btn btn-ghost btn-sm text-error"
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
                            class="bg-transparent border-0 text-lg cursor-pointer p-1 text-gray-500 hover:text-gray-600"
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
