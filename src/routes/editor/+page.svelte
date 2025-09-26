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

<div class="flex flex-col h-screen bg-base-200 font-sans">
    <div class="navbar bg-base-100 shadow-lg">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={goBack}>
                ← 返回主页
            </button>
            <h1 class="text-xl font-bold">Markdown 编辑器</h1>
        </div>
        <div class="navbar-end">
            <div class="form-control">
                <label for="output-format" class="label label-text"
                    >输出格式:</label
                >
                <select
                    id="output-format"
                    bind:value={selectedOutputFormat}
                    class="select select-bordered select-sm"
                >
                    {#each availableOutputFormats as format}
                        <option value={format.value}>{format.label}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <div class="flex items-center gap-2 px-6 py-3 bg-base-100 border-b">
        <div class="btn-group">
            <button
                class="btn btn-sm btn-outline"
                title="粗体 (Ctrl+B)"
                on:click={insertBold}
            >
                <strong>B</strong>
            </button>
            <button
                class="btn btn-sm btn-outline"
                title="斜体 (Ctrl+I)"
                on:click={insertItalic}
            >
                <em>I</em>
            </button>
            <button
                class="btn btn-sm btn-outline"
                title="标题"
                on:click={insertHeader}
            >
                H
            </button>
        </div>

        <div class="divider divider-horizontal"></div>

        <div class="btn-group">
            <button
                class="btn btn-sm btn-outline"
                title="无序列表"
                on:click={insertList}
            >
                •
            </button>
            <button
                class="btn btn-sm btn-outline"
                title="链接"
                on:click={insertLink}
            >
                🔗
            </button>
            <button
                class="btn btn-sm btn-outline"
                title="内联代码"
                on:click={insertCode}
            >
                `
            </button>
        </div>

        <div class="divider divider-horizontal"></div>

        <div class="btn-group">
            <button
                class="btn btn-sm btn-outline"
                title="代码块"
                on:click={insertCodeBlock}
            >
                {"{}"}
            </button>
            <button
                class="btn btn-sm btn-outline"
                title="表格"
                on:click={insertTable}
            >
                ⊞
            </button>
        </div>
    </div>

    <div class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 flex overflow-hidden">
            <div class="flex-1 flex flex-col bg-base-100 border-r">
                <div
                    class="flex justify-between items-center px-4 py-3 bg-base-200 border-b"
                >
                    <h3 class="text-sm font-semibold">编辑</h3>
                    <div class="text-xs opacity-70">
                        {textareaContent.length} 字符 | {textareaContent
                            .split(/\s+/)
                            .filter((w) => w.length > 0).length} 单词
                    </div>
                </div>
                <textarea
                    bind:value={textareaContent}
                    class="textarea textarea-bordered flex-1 rounded-none border-0 font-mono resize-none"
                    style="tab-size: 2;"
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

            <div class="flex-1 flex flex-col bg-base-100 border-l">
                <div
                    class="flex justify-between items-center px-4 py-3 bg-base-200 border-b"
                >
                    <h3 class="text-sm font-semibold">预览</h3>
                    <div class="text-xs opacity-70">实时预览</div>
                </div>
                <div class="flex-1 p-4 overflow-y-auto bg-base-100">
                    {#if textareaContent.trim()}
                        <div class="prose max-w-none">
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
                        <div
                            class="flex items-center justify-center h-full text-base-content opacity-50 italic"
                        >
                            <p>在左侧编辑器中输入内容，这里会显示预览</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <div class="navbar bg-base-100 border-t">
        <div class="navbar-start">
            <div class="text-xs opacity-70">
                快捷键: Ctrl+S 保存 | Ctrl+B 粗体 | Ctrl+I 斜体 |
                Ctrl+Shift+Enter 转换
            </div>
        </div>
        <div class="navbar-end gap-2">
            <button
                class="btn btn-outline"
                on:click={saveContent}
                disabled={isSaving || !textareaContent.trim()}
            >
                {#if isSaving}
                    <span class="loading loading-spinner loading-sm"></span>
                    保存中...
                {:else}
                    💾 保存 Markdown
                {/if}
            </button>
            <button
                class="btn btn-success"
                on:click={submitContent}
                disabled={isSubmitting || !textareaContent.trim()}
            >
                {#if isSubmitting}
                    <span class="loading loading-spinner loading-sm"></span>
                    转换中...
                {:else}
                    🔄 转换并保存
                {/if}
            </button>
        </div>
    </div>
</div>
