<script lang="ts">
    // Define the structure of a history item
    interface ConversionHistoryEntry {
        path: string;
        status: "pending" | "converting" | "success" | "error";
        message: string;
        isSuccess: boolean;
        outputPath?: string;
    }

    // Props
    export let conversionHistory: ConversionHistoryEntry[] = [];
    export let openConvertedFile: (outputPath: string | undefined) => void;
    export let showInFolder: (outputPath: string | undefined) => void;
    export let deleteHistoryItem: (item: ConversionHistoryEntry) => void;

    let isExpanded = false;

    function getBaseName(path: string | undefined): string {
        if (!path) return "N/A";
        const separator = path.includes("/") ? "/" : "\\";
        const parts = path.split(separator);
        return parts[parts.length - 1] || path;
    }
</script>

<div class="history-container">
    <div
        class="collapse-header"
        role="button"
        tabindex="0"
        on:click={() => (isExpanded = !isExpanded)}
        on:keydown={(e) =>
            e.key === "Enter" || e.key === " "
                ? (isExpanded = !isExpanded)
                : null}
    >
        <span class="collapse-icon" class:expanded={isExpanded}>▶</span>
        <span>历史记录 ({conversionHistory.length} 项)</span>
    </div>

    {#if isExpanded}
        <div class="mt-2">
            {#if conversionHistory.length === 0}
                <div class="empty-state">
                    <p>暂无历史记录</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="table table-zebra">
                        <thead>
                            <tr>
                                <th>输入</th>
                                <th>输出</th>
                                <th>信息</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each conversionHistory as item (item.path + (item.outputPath || ""))}
                                <tr>
                                    <td>
                                        <span
                                            class="file-path"
                                            title={item.path}
                                        >
                                            {getBaseName(item.path)}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            class="file-path"
                                            title={item.outputPath}
                                        >
                                            {getBaseName(item.outputPath)}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="text-success text-xs"
                                            >{item.message}</span
                                        >
                                    </td>
                                    <td>
                                        {#if item.outputPath}
                                            <div class="flex gap-1 flex-wrap">
                                                <button
                                                    class="btn btn-xs btn-primary"
                                                    on:click={() =>
                                                        openConvertedFile(
                                                            item.outputPath,
                                                        )}
                                                    title="打开文件"
                                                >
                                                    📄 打开
                                                </button>
                                                <button
                                                    class="btn btn-xs btn-success"
                                                    on:click={() =>
                                                        showInFolder(
                                                            item.outputPath,
                                                        )}
                                                    title="在文件夹中显示"
                                                >
                                                    📁 文件夹
                                                </button>
                                                <button
                                                    class="btn btn-xs btn-error"
                                                    on:click={() =>
                                                        deleteHistoryItem(item)}
                                                    title="删除历史记录"
                                                >
                                                    🗑️ 删除
                                                </button>
                                            </div>
                                        {:else}
                                            <span
                                                class="text-base-content opacity-50"
                                                >-</span
                                            >
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>
