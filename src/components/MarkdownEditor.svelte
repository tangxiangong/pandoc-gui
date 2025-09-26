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

<div class="flex flex-col h-full overflow-hidden">
    <div
        class="card bg-base-100 shadow-xl flex-grow flex flex-col overflow-hidden"
    >
        <div class="card-header bg-base-200 border-b px-4 py-3">
            <div class="flex justify-between items-center">
                <h3 class="card-title text-base">Markdown 编辑器</h3>
                <div class="btn-group">
                    <button
                        on:click={() => (textareaContent += "**粗体**")}
                        class="btn btn-sm btn-outline"
                        ><strong>B</strong></button
                    >
                    <button
                        on:click={() => (textareaContent += "*斜体*")}
                        class="btn btn-sm btn-outline"><em>I</em></button
                    >
                    <button
                        on:click={() => (textareaContent += "\n# 标题\n")}
                        class="btn btn-sm btn-outline">H</button
                    >
                    <button
                        on:click={() => (textareaContent += "\n- 列表项\n")}
                        class="btn btn-sm btn-outline">•</button
                    >
                </div>
            </div>
        </div>

        <div class="card-body flex-grow p-0">
            <textarea
                bind:value={textareaContent}
                placeholder="在此输入 Markdown 内容..."
                rows="20"
                class="textarea textarea-bordered flex-grow w-full rounded-none border-0 font-mono resize-none"
            ></textarea>
        </div>
    </div>

    <div class="flex justify-end gap-2 p-3 bg-base-200 border-t">
        <!-- Add Cancel button -->
        {#if showCancelButton}
            <button on:click={cancelEdit} class="btn btn-ghost">返回</button>
        {/if}
        <button on:click={saveContent} class="btn btn-success">
            保存 Markdown
        </button>
        <button
            on:click={submitContent}
            class="btn btn-primary"
            disabled={hasFiles}
            title={hasFiles
                ? "文件列表不为空，无法提交编辑器内容"
                : "使用此内容进行转换"}
        >
            使用编辑器内容
        </button>
    </div>
</div>
