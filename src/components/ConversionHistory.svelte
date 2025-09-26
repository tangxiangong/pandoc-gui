<script lang="ts">
    import type { ConversionStatus } from "../lib/types.js";
    import { getBaseName } from "../lib/file-utils.js";

    // Props
    export let history: ConversionStatus[] = [];
    export let onDeleteItem: (item: ConversionStatus) => void;
    export let onOpenFile: (outputPath: string | undefined) => void;
    export let onShowInFolder: (outputPath: string | undefined) => void;

    let isExpanded = false;
</script>

<div class="history-container">
    <div
        class="collapse-header cursor-pointer flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
        role="button"
        tabindex="0"
        on:click={() => (isExpanded = !isExpanded)}
        on:keydown={(e) =>
            (e.key === "Enter" || e.key === " ") && (isExpanded = !isExpanded)}
    >
        <span
            class="collapse-icon transition-transform"
            class:rotate-90={isExpanded}
        >
            ▶
        </span>
        <span class="font-medium">历史记录 ({history.length} 项)</span>
    </div>

    {#if isExpanded}
        <div class="mt-3">
            {#if history.length === 0}
                <div class="empty-state text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📄</div>
                    <p>暂无转换历史记录</p>
                </div>
            {:else}
                <div class="overflow-x-auto bg-base-100 rounded-lg border">
                    <table class="table table-zebra table-compact w-full">
                        <thead>
                            <tr class="bg-base-200">
                                <th class="font-medium">输入文件</th>
                                <th class="font-medium">输出文件</th>
                                <th class="font-medium">状态</th>
                                <th class="font-medium text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each history as item (item.path + (item.outputPath || ""))}
                                <tr class="hover:bg-base-50">
                                    <td class="max-w-0">
                                        <div
                                            class="file-path truncate"
                                            title={item.path}
                                        >
                                            {getBaseName(item.path)}
                                        </div>
                                    </td>
                                    <td class="max-w-0">
                                        {#if item.outputPath}
                                            <div
                                                class="file-path truncate text-success"
                                                title={item.outputPath}
                                            >
                                                {getBaseName(item.outputPath)}
                                            </div>
                                        {:else}
                                            <span class="text-gray-400">-</span>
                                        {/if}
                                    </td>
                                    <td>
                                        <span
                                            class="badge badge-sm"
                                            class:badge-success={item.status ===
                                                "success"}
                                            class:badge-error={item.status ===
                                                "error"}
                                            class:badge-warning={item.status ===
                                                "pending" ||
                                                item.message === "已取消"}
                                            class:badge-info={item.status ===
                                                "converting"}
                                        >
                                            {#if item.status === "success"}
                                                ✅ 成功
                                            {:else if item.status === "error"}
                                                ❌ 失败
                                            {:else if item.message === "已取消"}
                                                ⚠️ 已取消
                                            {:else}
                                                ℹ️ {item.message}
                                            {/if}
                                        </span>
                                    </td>
                                    <td>
                                        {#if item.outputPath && item.status === "success"}
                                            <div
                                                class="flex gap-1 justify-center items-center"
                                            >
                                                <button
                                                    class="btn btn-xs btn-outline"
                                                    on:click={() =>
                                                        onOpenFile(
                                                            item.outputPath,
                                                        )}
                                                    title="打开文件"
                                                >
                                                    📂
                                                </button>
                                                <button
                                                    class="btn btn-xs btn-outline"
                                                    on:click={() =>
                                                        onShowInFolder(
                                                            item.outputPath,
                                                        )}
                                                    title="在文件夹中显示"
                                                >
                                                    📁
                                                </button>
                                                <button
                                                    class="btn btn-xs btn-outline btn-error"
                                                    on:click={() =>
                                                        onDeleteItem(item)}
                                                    title="删除历史记录"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        {:else}
                                            <div class="flex justify-center">
                                                <button
                                                    class="btn btn-xs btn-outline btn-error"
                                                    on:click={() =>
                                                        onDeleteItem(item)}
                                                    title="删除历史记录"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
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

<style>
    .collapse-icon {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .file-path {
        font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
        font-size: 0.875rem;
    }

    .empty-state {
        min-height: 120px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
</style>
