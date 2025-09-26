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
        <div class="history-content">
            {#if conversionHistory.length === 0}
                <div class="empty-state">
                    <p>暂无历史记录</p>
                </div>
            {:else}
                <div class="table-container">
                    <table class="history-table">
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
                                        <span class="success-text"
                                            >{item.message}</span
                                        >
                                    </td>
                                    <td>
                                        {#if item.outputPath}
                                            <div class="action-buttons">
                                                <button
                                                    class="action-button primary"
                                                    on:click={() =>
                                                        openConvertedFile(
                                                            item.outputPath,
                                                        )}
                                                    title="打开文件"
                                                >
                                                    📄 打开
                                                </button>
                                                <button
                                                    class="action-button success"
                                                    on:click={() =>
                                                        showInFolder(
                                                            item.outputPath,
                                                        )}
                                                    title="在文件夹中显示"
                                                >
                                                    📁 文件夹
                                                </button>
                                                <button
                                                    class="action-button danger"
                                                    on:click={() =>
                                                        deleteHistoryItem(item)}
                                                    title="删除历史记录"
                                                >
                                                    🗑️ 删除
                                                </button>
                                            </div>
                                        {:else}
                                            <span class="no-output">-</span>
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
    .history-container {
        width: 100%;
    }

    .collapse-header {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px 0;
        font-weight: 500;
        color: #606266;
        user-select: none;
    }

    .collapse-header:hover {
        color: #409eff;
    }

    .collapse-icon {
        margin-right: 8px;
        transition: transform 0.3s ease;
        font-size: 12px;
    }

    .collapse-icon.expanded {
        transform: rotate(90deg);
    }

    .history-content {
        margin-top: 8px;
    }

    .empty-state {
        text-align: center;
        padding: 20px;
        color: #909399;
    }

    .empty-state p {
        margin: 0;
        font-style: italic;
    }

    .table-container {
        overflow-x: auto;
    }

    .history-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .history-table th {
        background-color: #f5f7fa;
        color: #606266;
        font-weight: 500;
        padding: 12px 8px;
        text-align: left;
        border-bottom: 1px solid #e4e7ed;
        font-size: 13px;
    }

    .history-table td {
        padding: 12px 8px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: middle;
        font-size: 13px;
    }

    .history-table tbody tr:hover {
        background-color: #f5f7fa;
    }

    .history-table tbody tr:last-child td {
        border-bottom: none;
    }

    .file-path {
        display: inline-block;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #606266;
    }

    .success-text {
        color: #67c23a;
        font-size: 12px;
    }

    .no-output {
        color: #c0c4cc;
    }

    .action-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .action-button {
        padding: 4px 8px;
        font-size: 11px;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.3s;
        white-space: nowrap;
    }

    .action-button.primary {
        background: #409eff;
        color: white;
    }

    .action-button.primary:hover {
        background: #66b1ff;
    }

    .action-button.success {
        background: #67c23a;
        color: white;
    }

    .action-button.success:hover {
        background: #85ce61;
    }

    .action-button.danger {
        background: #f56c6c;
        color: white;
    }

    .action-button.danger:hover {
        background: #f78989;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        .collapse-header {
            color: #c0c4cc;
        }

        .collapse-header:hover {
            color: #409eff;
        }

        .empty-state {
            color: #909399;
        }

        .history-table {
            background: #2d2d2d;
        }

        .history-table th {
            background-color: #3a3a3a;
            color: #c0c4cc;
            border-bottom-color: #444;
        }

        .history-table td {
            border-bottom-color: #444;
        }

        .history-table tbody tr:hover {
            background-color: #3a3a3a;
        }

        .file-path {
            color: #c0c4cc;
        }

        .no-output {
            color: #666;
        }
    }
</style>
