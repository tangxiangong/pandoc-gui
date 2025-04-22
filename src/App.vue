<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import {
  ElMessage, ElDialog, ElTable, ElTableColumn, ElButton, ElSpace, ElText, ElCard,
  ElContainer, ElMain, ElFormItem, ElSelect, ElOption, ElDivider, ElIcon,
  ElLink, ElTooltip, ElFooter, ElScrollbar, ElTag
} from 'element-plus';
import { Loading, Close, EditPen, FolderOpened, Document } from '@element-plus/icons-vue';
import { basename, dirname } from '@tauri-apps/api/path';
import { listen, TauriEvent, Event } from '@tauri-apps/api/event';
import type { PhysicalPosition } from '@tauri-apps/api/window';
import MarkdownEditor from './components/MarkdownEditor.vue'; // Import the editor component
import ConversionHistory from './components/ConversionHistory.vue'; // Import history component

// Define an interface for the expected drop payload structure
interface DropPayload {
  paths: string[];
  position: PhysicalPosition;
}

// State for individual file conversion progress/status
interface ConversionStatus {
  path: string;
  status: 'pending' | 'converting' | 'success' | 'error';
  message: string;
  isSuccess: boolean; // Kept for easier conditional styling
  outputPath?: string; // Add optional outputPath for successful conversions
}

// --- State Updates ---
const inputPaths = ref<string[]>([]); // Keep this to easily check which paths are selected
const conversionProgress = ref<ConversionStatus[]>([]); // This will be the source for the table
const selectedOutputFormat = ref<string>("docx");
const selectedInputFormat = ref<string>("auto");
const isLoading = ref<boolean>(false); // Loading state for the whole batch
const isPreviewLoading = ref<boolean>(false);
const showPreviewDialog = ref<boolean>(false);
const previewHtml = ref<string>("");
const showEditor = ref<boolean>(false); // State to toggle editor visibility
const editorContent = ref<string | null>(null); // Re-introduce state for editor content (local)
const conversionHistory = ref<ConversionStatus[]>([]); // State for history
const appVersion = ref<string>('N/A'); // State for app version

const availableInputFormats = ["auto", "markdown", "html", "latex", "rst", "docx", "epub"];
const availableOutputFormats = ["docx", "html", /*"pdf",*/ "tex", "md", "odt", "rst", "epub"];

// Computed properties
const hasMultipleFiles = computed(() => inputPaths.value.length > 1);
const hasFiles = computed(() => inputPaths.value.length > 0);
const hasEditorContent = computed(() => editorContent.value !== null && editorContent.value.length > 0); // Computed property for editor content
const hasInput = computed(() => hasFiles.value || hasEditorContent.value); // Combined check
const isUsingEditorContent = computed(() => !hasFiles.value && hasEditorContent.value); // True if only editor content is present

// --- Function Updates ---

// Helper to add a file and its initial progress state
function addFileAndProgress(filePath: string): boolean {
    // --- PDF Check --- 
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    if (isPdf) {
        ElMessage.warning(`不支持直接转换 PDF 文件: ${filePath}`);
        return false; // Indicate file was *not* added
    }
    // --- End PDF Check --- 

    // If editor content exists, clear it when adding files
    if (hasEditorContent.value) {
        editorContent.value = null;
        conversionProgress.value = []; // Clear progress table too
    }
    if (!inputPaths.value.includes(filePath)) {
        inputPaths.value.push(filePath);
        conversionProgress.value.push({
            path: filePath,
            status: 'pending',
            message: '待处理',
            isSuccess: true, // Default to true until error
        });
        return true; // Indicate file was added
    }
    return false; // Indicate file was already present
}

// Function to remove a file from both lists using its path
function removeFileByPath(filePathToRemove: string) {
    const indexInPaths = inputPaths.value.indexOf(filePathToRemove);
    if (indexInPaths !== -1) {
        inputPaths.value.splice(indexInPaths, 1);
    }
    // Find index in progress by path and remove
    const indexInProgress = conversionProgress.value.findIndex(p => p.path === filePathToRemove);
    if (indexInProgress !== -1) {
        conversionProgress.value.splice(indexInProgress, 1);
    }
}

function clearAllFiles() {
  inputPaths.value = [];
  conversionProgress.value = [];
}

// Function to handle editor content submission
function handleEditorSubmit(content: string) {
  console.log('Received content from local editor component:', content);
  // Clear existing file list and progress
  inputPaths.value = [];
  conversionProgress.value = [];
  // Set the editor content
  editorContent.value = content;
  selectedInputFormat.value = "markdown"; // Force input format to markdown
  // Add a placeholder entry to conversionProgress to indicate editor input
  conversionProgress.value.push({
      path: '[编辑器内容]', // Placeholder path
      status: 'pending',
      message: '待处理 (来自编辑器)',
      isSuccess: true,
  });
  showEditor.value = false; // Hide editor after submission
  ElMessage.success('已从编辑器加载内容');
}

async function selectFile() {
  try {
    const selected = await open({
      multiple: true,
      directory: false,
      title: "选择输入文件"
    });
    let addedCount = 0;
    if (Array.isArray(selected)) {
      selected.forEach(path => {
        if (addFileAndProgress(path)) {
            addedCount++;
        }
      });
    } else if (typeof selected === 'string') {
      if (addFileAndProgress(selected)) {
          addedCount++;
      }
    } // Ignore null (cancel)

    if (addedCount > 0) {
        previewHtml.value = ''; // Clear preview if new files are added
        ElMessage.success(`已添加 ${addedCount} 个文件`);
    }

  } catch (error) {
    console.error("选择文件时出错:", error);
    ElMessage.error(`选择文件时出错: ${error}`);
  }
}

function handleFileDrop(paths: string[]) {
  let addedCount = 0;
  if (paths && paths.length > 0) {
    paths.forEach(filePath => {
       if (addFileAndProgress(filePath)) {
           console.log('文件已拖放:', filePath);
           addedCount++;
           // Also clear editor content if files are dropped
           if (hasEditorContent.value) {
               editorContent.value = null;
           }
       }
    });
    if (addedCount > 0) {
      previewHtml.value = ''; // Clear preview if new files are added
      ElMessage.success(`已添加 ${addedCount} 个文件`);
    }
  } else {
    console.warn('handleFileDrop 收到空或无效的路径数组:', paths);
  }
}

async function generatePreview() {
  if (!hasInput.value) {
    ElMessage.warning("请先选择输入文件或使用编辑器");
    return;
  }
  if (hasMultipleFiles.value || isUsingEditorContent.value) { // Can't preview editor content either for now
    ElMessage.warning("预览功能当前仅支持单个文件输入");
    return;
  }
  const targetPath = inputPaths.value[0];

  isPreviewLoading.value = true;
  previewHtml.value = "";
  ElMessage({ message: "正在生成预览...", type: "info", duration: 0 });

  try {
    const options = { input_path: targetPath, input_format: selectedInputFormat.value };
    const htmlResult: string = await invoke("preview_file", { options });
    ElMessage.closeAll("info");
    previewHtml.value = htmlResult;
    showPreviewDialog.value = true;
    ElMessage.success("预览生成成功");
  } catch (error) {
    ElMessage.closeAll("info");
    console.error("预览生成出错:", error);
    ElMessage.error(`预览生成失败: ${error}`);
  } finally {
    isPreviewLoading.value = false;
  }
}

async function startConversion() {
  if (!hasInput.value) {
    ElMessage.warning("请先选择或拖拽文件，或使用编辑器");
    return;
  }

  isLoading.value = true;

  // Handle Editor Content Conversion (Re-introduced logic)
  if (isUsingEditorContent.value && editorContent.value) {
    ElMessage({ message: "开始从编辑器内容转换...", type: "info", duration: 0 });
    // Since it's editor content, there's only one 'item'
    conversionProgress.value = [{ path: "[编辑器内容]", status: 'converting', message: '正在转换...', isSuccess: true }];

    try {
        const defaultSaveName = `output.${selectedOutputFormat.value}`;
        const outputPath = await save({
            title: '选择保存位置',
            defaultPath: defaultSaveName,
            filters: [{ name: selectedOutputFormat.value.toUpperCase(), extensions: [selectedOutputFormat.value] }]
        });

        if (!outputPath) {
            ElMessage.info("转换已取消");
            conversionProgress.value[0].status = 'pending';
            conversionProgress.value[0].message = '已取消';
            conversionProgress.value[0].isSuccess = true; // Or maybe false? Depends on desired UI
            isLoading.value = false;
            return; // Exit if cancelled
        }

        // Define options specifically for convert_content
        const options = {
            input_content: editorContent.value, // Pass content directly
            output_format: selectedOutputFormat.value,
            output_path: outputPath,
            // input_format is not needed for convert_content as it assumes markdown
        };

        // Actually invoke the backend command
        const result: string = await invoke("convert_content", { options }); 

        conversionProgress.value[0].status = 'success';
        conversionProgress.value[0].message = result || '转换成功';
        conversionProgress.value[0].isSuccess = true;
        conversionProgress.value[0].outputPath = outputPath;
        conversionHistory.value.unshift({ ...conversionProgress.value[0] }); // Add to history
        ElMessage.success("编辑器内容转换成功！");

    } catch (error: any) {
        console.error("编辑器内容转换出错:", error);
        conversionProgress.value[0].status = 'error';
        conversionProgress.value[0].message = `转换失败: ${error}`;
        conversionProgress.value[0].isSuccess = false;
        ElMessage.error(`编辑器内容转换失败: ${error}`);
    } finally {
        ElMessage.closeAll("info");
        isLoading.value = false;
    }
    return; // Exit after handling editor content
  }

  // Reset status of existing files to pending before starting
  conversionProgress.value.forEach(p => {
    p.status = 'pending';
    p.message = '待处理';
    p.isSuccess = true; // Reset status to pending
  });

  let successCount = 0;
  let errorCount = 0;

  // Use a copy of inputPaths for iteration in case it's modified during async operations
  const pathsToConvert = [...inputPaths.value];
  const isSingleFile = pathsToConvert.length === 1; // Check if it's a single file conversion

  for (const currentPath of pathsToConvert) {
    const progressIndex = conversionProgress.value.findIndex(p => p.path === currentPath);

    // Check if the file still exists in the main list and has a progress entry
    if (progressIndex === -1 || !inputPaths.value.includes(currentPath)) {
        console.warn(`Skipping file ${currentPath}, removed before conversion started or missing progress entry.`);
        continue;
    }

    conversionProgress.value[progressIndex].status = 'converting';
    conversionProgress.value[progressIndex].message = '正在转换...';

    try {
      const inputBasename = await basename(currentPath);
      const inputDir = await dirname(currentPath);

      // Revised logic to get name without extension
      const lastDotIndex = inputBasename.lastIndexOf('.');
      let nameWithoutExt: string;
      if (lastDotIndex > 0) { // Check if dot exists and is not the first character
          nameWithoutExt = inputBasename.substring(0, lastDotIndex);
      } else {
          // Use the full basename if no extension dot or it's a hidden file (dot is first char)
          nameWithoutExt = inputBasename;
      }
      
      let outputPath: string | null; // Declare outputPath, may be null if user cancels

      if (isSingleFile) {
        // Single file: Prompt user to save
        const suggestedFilename = `${nameWithoutExt}.${selectedOutputFormat.value}`;
        outputPath = await save({
          title: '选择保存位置',
          defaultPath: `${inputDir}/${suggestedFilename}`, // Suggest default path/filename
          filters: [{ // Optional: Filter by selected output format
            name: selectedOutputFormat.value.toUpperCase(),
            extensions: [selectedOutputFormat.value]
          }]
        });

        if (!outputPath) {
          // User cancelled the save dialog
          ElMessage.info(`文件 "${inputBasename}" 的转换已取消`);
          // Reset status or remove? Let's reset for now.
          if (progressIndex !== -1) {
              conversionProgress.value[progressIndex].status = 'pending';
              conversionProgress.value[progressIndex].message = '已取消';
              conversionProgress.value[progressIndex].isSuccess = true; // Or maybe false? Depends on desired UI
          }
          continue; // Skip to the next file (though there's only one)
        }
        console.log('User selected Output Path:', outputPath);
      } else {
        // Multiple files: Use automatic path generation
        outputPath = `${inputDir}/${nameWithoutExt}.${selectedOutputFormat.value}`;
        console.log('Generated Output Path (batch):', outputPath);
      }

      // Ensure outputPath is not null before proceeding (handled by continue above for single file)
      if (!outputPath) {
          console.error("Unexpected null outputPath after check."); // Should not happen
          // Also reset status if something went wrong before invoke
          if (progressIndex !== -1) {
            conversionProgress.value[progressIndex].status = 'pending';
            conversionProgress.value[progressIndex].message = '输出路径错误';
            conversionProgress.value[progressIndex].isSuccess = false; // Mark as error
          }
          continue;
      }

      const options = { // This options is used by invoke below
          input_path: currentPath,
          output_format: selectedOutputFormat.value,
          output_path: outputPath, // Use the determined path (user-selected or automatic)
          input_format: selectedInputFormat.value,
      };

      const result: string = await invoke("convert_file", { options });

      // Double-check index in case array was modified
      const currentIndex = conversionProgress.value.findIndex(p => p.path === currentPath);
      if (currentIndex !== -1) {
          conversionProgress.value[currentIndex].status = 'success';
          conversionProgress.value[currentIndex].message = result || '转换成功';
          conversionProgress.value[currentIndex].isSuccess = true;
          conversionProgress.value[currentIndex].outputPath = outputPath;
          conversionHistory.value.unshift({ ...conversionProgress.value[currentIndex] }); // Add to history
          successCount++;
      } else {
          console.warn(`File ${currentPath} conversion succeeded but entry was removed.`);
      }

    } catch (error: any) {
      console.error(`文件 "${currentPath}" 转换出错:`, error);
      const errorMsg = `转换失败: ${error}`;
       // Double-check index in case array was modified
      const currentIndex = conversionProgress.value.findIndex(p => p.path === currentPath);
      if (currentIndex !== -1) {
          conversionProgress.value[currentIndex].status = 'error';
          conversionProgress.value[currentIndex].message = errorMsg;
          conversionProgress.value[currentIndex].isSuccess = false;
          errorCount++;
      } else {
           console.warn(`File ${currentPath} conversion failed but entry was removed.`);
      }
    }
  }

  ElMessage.closeAll("info");
  isLoading.value = false;

  if (errorCount === 0 && successCount > 0) {
    ElMessage.success(`批量转换完成，${successCount} 个文件成功。`);
  } else if (errorCount > 0) {
    ElMessage.warning(`批量转换完成，${successCount} 个成功，${errorCount} 个失败。`);
  } else if (successCount === 0 && errorCount === 0) {
      ElMessage.info('没有文件被转换（可能列表为空或文件在转换前被移除）。');
  }
}

// --- New functions to handle opening file/folder ---
async function openConvertedFile(outputPath: string | undefined) {
    if (!outputPath) {
        ElMessage.error("无法获取文件路径");
        return;
    }
    try {
        console.log(`尝试打开文件: ${outputPath}`);
        await invoke('open_file_in_default_app', { path: outputPath });
    } catch (error) {
        console.error(`打开文件 ${outputPath} 出错:`, error);
        ElMessage.error(`打开文件失败: ${error}`);
    }
}

async function showInFolder(outputPath: string | undefined) {
    if (!outputPath) {
        ElMessage.error("无法获取文件路径");
        return;
    }
    try {
        const dir = await dirname(outputPath);
        console.log(`尝试打开文件夹: ${dir}`);
        await invoke('show_in_folder', { path: dir });
    } catch (error) {
        console.error(`打开文件夹 ${outputPath} 出错:`, error);
        ElMessage.error(`打开文件夹失败: ${error}`);
    }
}

// Setup drag and drop listener
let unlistenDragDrop: (() => void) | null = null;

onMounted(async () => {
  // Get app version
  try {
    appVersion.value = await getVersion();
  } catch (error) {
    console.error("Failed to get app version:", error);
    appVersion.value = 'Error';
  }

  // Load history when component mounts
  await loadHistoryFromDisk();

  try {
    unlistenDragDrop = await listen<DropPayload>(TauriEvent.DRAG_DROP, (event: Event<DropPayload>) => {
      if (event.payload?.paths?.length > 0) {
        handleFileDrop(event.payload.paths);
      } else {
        console.warn('拖放事件没有有效的 paths 数组:', event);
      }
    });
    console.log('文件拖放监听器已设置');
  } catch (error) {
    console.error('设置文件拖放监听器时出错:', error);
    ElMessage.error(`无法设置文件拖放功能: ${error}`);
  }
});

onUnmounted(() => {
  if (unlistenDragDrop) {
    unlistenDragDrop();
    console.log('文件拖放监听器已移除');
  }
});

// --- History Persistence ---

// Function to load history from Rust backend
async function loadHistoryFromDisk() {
  try {
    // Use the existing ConversionStatus interface for the expected type from backend
    const loadedHistory: ConversionStatus[] = await invoke('load_history'); 
    conversionHistory.value = loadedHistory || []; // Update state, ensure it's an array
    console.log(`成功加载 ${conversionHistory.value.length} 条历史记录。`);
  } catch (error) {
    console.error("加载历史记录失败:", error);
    ElMessage.error(`加载历史记录失败: ${error}`);
    conversionHistory.value = []; // Reset to empty on error
  }
}

// Watch for changes in history and save to disk
watch(conversionHistory, async (newHistory) => {
  try {
    await invoke('save_history', { history: newHistory });
    console.log(`历史记录已保存 (${newHistory.length} 条)。`);
  } catch (error) {
    console.error("保存历史记录失败:", error);
    // Optionally notify user, but might be too noisy
    // ElMessage.error(`保存历史记录失败: ${error}`); 
  }
}, { deep: true }); // Use deep watch as we modify items within the array indirectly

// --- Function to clear history ---
function clearHistory() {
  if (conversionHistory.value.length > 0) {
    conversionHistory.value = [];
    ElMessage.success('历史记录已清空');
    // The watch effect will automatically call save_history
  } else {
    ElMessage.info('历史记录已经是空的');
  }
}

// --- Helper function for template ---
function getBaseName(path: string | undefined): string {
    if (!path) return '';
    // Basic basename logic for display
    const separator = path.includes('/') ? '/' : '\\';
    const parts = path.split(separator);
    return parts[parts.length - 1] || path; // Return last part or original if split fails
}

</script>

<template>
  <el-container style="height: 100vh; display: flex; flex-direction: column;">
    <el-main style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
      <div style="width: 100%; flex-grow: 1; display: flex; flex-direction: column;">
        <div v-show="!showEditor" style="flex-grow: 1; display: flex; flex-direction: column;">
          <el-card shadow="never" class="main-card" :body-style="{ padding: '0', flexGrow: 1, display: 'flex', flexDirection: 'column' }">
            <template #header>
              <h1 class="app-title">Pandoc GUI</h1>
            </template>

            <div style="padding: 25px; flex-grow: 1; display: flex; flex-direction: column;">
              <el-space direction="vertical" alignment="stretch" :size="18" style="width: 100%; flex-grow: 1; display: flex; flex-direction: column;">

                <!-- Combined Dropzone and Select Area -->
                <div
                  class="dropzone-hint"
                  @click="() => !isLoading && !isPreviewLoading && selectFile()"
                  :class="{ 'is-disabled': isLoading || isPreviewLoading }"
                  role="button"
                  tabindex="0"
                  @keydown.enter="() => !isLoading && !isPreviewLoading && selectFile()"
                >
                  <el-icon :size="40" style="margin-bottom: 10px;"><FolderOpened /></el-icon>
                  <p style="margin: 0; font-size: 1.1em; font-weight: 500;">点击选择或拖拽文件到此处</p>
                  <p style="margin: 5px 0 0; font-size: 0.9em; color: #909399;">支持单个或多个文件</p>
                </div>

                <el-button @click="showEditor = true" :disabled="isLoading || isPreviewLoading" size="large" style="width: 100%;">
                    <el-icon style="margin-right: 8px;"><EditPen /></el-icon> 使用 Markdown 编辑器输入
                </el-button>

                <div v-if="hasInput" class="file-status-table-container" style="flex-grow: 1; display: flex; flex-direction: column; overflow: hidden;">
                     <div class="file-status-header">
                        <el-text size="default" style="font-weight: 500;">{{ isUsingEditorContent ? '编辑器内容状态' : '文件列表 & 状态' }}</el-text>
                         <el-button v-if="hasFiles"
                             type="danger"
                             link
                             size="small"
                             @click="clearAllFiles"
                             :disabled="isLoading"
                          >
                             清空列表
                           </el-button>
                     </div>
                    <el-scrollbar style="flex-grow: 1;">
                        <el-table :data="conversionProgress" stripe style="width: 100%" size="small" height="100%">
                           <el-table-column prop="path" label="文件 / 输入源" show-overflow-tooltip min-width="150">
                               <template #default="scope">
                                  <el-tooltip :content="scope.row.path" placement="top" :show-after="500">
                                     <el-text size="small" truncated>{{ getBaseName(scope.row.path) }}</el-text>
                                  </el-tooltip>
                               </template>
                           </el-table-column>
                          <el-table-column prop="status" label="状态" width="90" align="center">
                               <template #default="scope">
                                   <el-tag
                                      v-if="scope.row.status === 'pending'"
                                      type="info" size="small" effect="light">待处理</el-tag>
                                   <el-tag
                                      v-else-if="scope.row.status === 'converting'"
                                      type="primary" size="small" effect="light">
                                        <el-icon class="is-loading" style="vertical-align: middle; margin-right: 4px;"><Loading /></el-icon>转换中
                                    </el-tag>
                                   <el-tag
                                      v-else-if="scope.row.status === 'success'"
                                      type="success" size="small" effect="light">成功</el-tag>
                                   <el-tag
                                      v-else-if="scope.row.status === 'error'"
                                      type="danger" size="small" effect="light">失败</el-tag>
                                   <el-tag
                                       v-else-if="scope.row.message === '已取消'"
                                       type="warning" size="small" effect="light">已取消</el-tag>
                              </template>
                          </el-table-column>
                          <el-table-column prop="message" label="信息 / 输出" show-overflow-tooltip min-width="150">
                               <template #default="scope">
                                    <el-tooltip v-if="scope.row.status === 'success' && scope.row.outputPath" :content="scope.row.outputPath" placement="top" :show-after="500">
                                       <el-text size="small" type="success" truncated>输出: {{ getBaseName(scope.row.outputPath) }}</el-text>
                                   </el-tooltip>
                                   <el-text v-else-if="scope.row.status === 'error'" size="small" type="danger" truncated>{{ scope.row.message }}</el-text>
                                   <el-text v-else-if="scope.row.message === '已取消'" size="small" type="warning">已取消</el-text>
                                   <el-text v-else size="small" type="info">-</el-text>
                               </template>
                          </el-table-column>
                           <el-table-column label="操作" width="150" align="center" class-name="action-column">
                              <template #default="scope">
                                  <el-space v-if="scope.row.status === 'success' && scope.row.outputPath" :size="4">
                                       <el-button
                                            type="primary"
                                            :icon="Document"
                                            link
                                            size="small"
                                            @click="openConvertedFile(scope.row.outputPath)"
                                            :disabled="isLoading"
                                            title="打开文件"
                                        />
                                        <el-button
                                            type="success"
                                            :icon="FolderOpened"
                                            link
                                            size="small"
                                            @click="showInFolder(scope.row.outputPath)"
                                            :disabled="isLoading"
                                            title="打开所在文件夹"
                                        />
                                  </el-space>
                                  <el-space :size="2" v-if="!isUsingEditorContent && (scope.row.status !== 'success' || !scope.row.outputPath) && scope.row.status !== 'converting'">
                                      <el-button
                                          type="danger"
                                          :icon="Close"
                                          link
                                          size="small"
                                          @click="removeFileByPath(scope.row.path)"
                                          :disabled="isLoading"
                                          title="移除此文件"
                                      />
                                      <el-text type="danger" size="small">移除</el-text>
                                  </el-space>
                                  <span v-else-if="isUsingEditorContent || (scope.row.status !== 'success' && !scope.row.outputPath && scope.row.status !== 'converting')">-</span>
                              </template>
                          </el-table-column>
                       </el-table>
                    </el-scrollbar>
               </div>

              <el-divider v-if="hasInput" style="margin: 15px 0; flex-shrink: 0;">
                 <el-text v-if="isUsingEditorContent" type="primary" size="small">当前使用编辑器内容</el-text>
                 <el-icon v-else><Document /></el-icon>
              </el-divider>

               <div style="display: flex; gap: 25px; flex-shrink: 0; margin-bottom: 10px; align-items: flex-end;">
                   <el-form-item label="输入格式:" style="margin-bottom: 0;">
                    <el-select v-model="selectedInputFormat" placeholder="自动检测" :disabled="isLoading || isPreviewLoading || isUsingEditorContent" style="width: 100%; min-width: 180px;">
                       <el-option
                         v-for="format in availableInputFormats"
                         :key="'in-' + format"
                         :label="format === 'auto' ? '自动检测' : format.toUpperCase()"
                         :value="format"
                       />
                    </el-select>
                   </el-form-item>

                   <el-form-item label="输出格式:" style="margin-bottom: 0;">
                     <el-select
                       v-model="selectedOutputFormat"
                       placeholder="选择输出格式"
                       :disabled="isLoading || isPreviewLoading"
                       style="width: 100%; min-width: 180px;"
                     >
                       <el-option
                         v-for="format in availableOutputFormats"
                         :key="'out-' + format"
                         :label="format.toUpperCase()"
                         :value="format"
                       />
                     </el-select>
                   </el-form-item>
                </div>

               <div style="display: flex; gap: 10px; flex-shrink: 0; margin-top: 10px;">
                 <el-button
                   @click="generatePreview"
                   :disabled="!hasInput || hasMultipleFiles || isUsingEditorContent || isLoading || isPreviewLoading"
                   :loading="isPreviewLoading"
                   size="large"
                   style="flex-grow: 1;"
                   :title="isUsingEditorContent ? '编辑器内容不支持预览' : (hasMultipleFiles ? '预览仅支持单个文件' : '预览 HTML')"
                   plain
                 >
                   预览 (HTML)
                 </el-button>
                 <el-button
                   type="primary"
                   @click="startConversion"
                   :disabled="!hasInput || isLoading || isPreviewLoading"
                   :loading="isLoading"
                   size="large"
                   style="flex-grow: 1; font-weight: bold;"
                 >
                   {{ isLoading ? '正在转换...' : (isUsingEditorContent ? '转换编辑器内容' : (hasMultipleFiles ? '开始批量转换' : '转换选定文件')) }}
                 </el-button>
               </div>

              </el-space>
            </div>
          </el-card>

          <el-card v-if="conversionHistory.length > 0" shadow="never" class="history-card" :body-style="{ padding: '15px' }">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500; color: #303133;">转换历史记录</span>
                <el-button type="danger" link @click="clearHistory" size="small">
                  清空历史记录
                </el-button>
              </div>
            </template>
            <conversion-history
              :history="conversionHistory"
              :on-open-file="openConvertedFile"
              :on-show-folder="showInFolder"
            />
          </el-card>

          <el-dialog v-model="showPreviewDialog" title="HTML 预览" width="80%" top="5vh" destroy-on-close>
             <div class="preview-container">
              <div v-html="previewHtml"></div>
            </div>
            <template #footer>
              <span class="dialog-footer">
                <el-button @click="showPreviewDialog = false">关闭预览</el-button>
              </span>
            </template>
          </el-dialog>

        </div>

        <div v-show="showEditor" class="editor-view">
          <div class="editor-wrapper">
              <markdown-editor
                  @submit-content="handleEditorSubmit"
                  @cancel="showEditor = false"
                  :show-cancel-button="true"
                  style="flex-grow: 1; height: 100%; border: 1px solid #dcdfe6; border-radius: 4px;"
              />
          </div>
        </div>

      </div>
    </el-main>

    <!-- Added Footer -->
    <el-footer class="app-footer">
      <el-space :size="10" spacer="|">
        <el-space :size="5">
            <el-text size="small" type="info">Pandoc GUI</el-text>
            <el-text size="small" type="secondary">- 一个简单的 Pandoc 图形界面</el-text>
        </el-space>
        <el-space :size="5">
            <el-tooltip content="使用 MIT 许可证开源" placement="top">
                <el-link href="https://opensource.org/licenses/MIT" target="_blank" :underline="false" type="info" size="small">MIT</el-link>
            </el-tooltip>
            <el-text size="small" type="info">/</el-text>
            <el-tooltip content="使用 Apache 2.0 许可证开源" placement="top">
                 <el-link href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" :underline="false" type="info" size="small">Apache 2.0</el-link>
             </el-tooltip>
        </el-space>
        <el-text size="small" type="info">v{{ appVersion }}</el-text>
      </el-space>
    </el-footer>

  </el-container>
</template>

<style>
/* Global style adjustments */
body {
  /* Use a softer background color */
  background-color: #f7f8fa; /* Slightly off-white */
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Ensure #app fills the body */
#app {
  height: 100vh;
  display: flex; /* Helps center content if needed */
}

/* Main container adjustments */
.el-container {
  /* max-width: 1000px; /* Optional: Limit max width for very large screens */
  /* margin: 0 auto; /* Center the container if max-width is set */
}

/* Main card styling */
.main-card {
  margin-bottom: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed; /* Softer border */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06); /* Subtle shadow */
  transition: box-shadow 0.3s ease-in-out; /* Smooth transition */
}
.main-card:hover {
   box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1); /* Slightly larger shadow on hover */
}

/* Card header */
.el-card__header {
  background-color: #fafafa; /* Light background for header */
  border-bottom: 1px solid #e4e7ed;
  padding: 15px 25px; /* Adjust padding */
}

/* Title styling */
.app-title {
  margin: 0;
  font-size: 1.6em; /* Slightly smaller, adjust as needed */
  font-weight: 600; /* Bolder */
  color: #303133; /* Darker text */
  text-align: center;
}

/* Card body */
.el-card__body {
  padding: 30px; /* Increase padding */
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

/* Button styling */
.el-button--large {
  padding: 15px 20px; /* Adjust padding for large buttons */
  font-size: 14px;
}

/* Dropzone hint styling - Updated for combined functionality */
.dropzone-hint {
  cursor: pointer;
  text-align: center;
  padding: 25px 15px; /* More padding */
  margin-top: 15px; /* Adjust margin */
  border: 2px dashed #dcdfe6;
  border-radius: 8px; /* More rounded corners */
  color: #a8abb2; /* Slightly darker hint text */
  font-size: 14px;
  background-color: #fcfcfc; /* Very light background */
  transition: background-color 0.3s, border-color 0.3s;
  display: flex; /* Use flexbox for centering content */
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px; /* Give it some minimum height */
}
.dropzone-hint:hover {
    background-color: #f5f7fa;
    border-color: #c0c4cc;
}
.dropzone-hint.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

/* File status table container */
.file-status-table-container {
  margin-top: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Hide outer scrollbar, let table handle its own */
  border: 1px solid #e4e7ed; /* Add border */
  border-radius: 4px; /* Match table */
  background-color: #fff; /* White background for table area */
}

.file-status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px; /* Add padding */
    background-color: #fafafa; /* Light header background */
    border-bottom: 1px solid #e4e7ed;
    flex-shrink: 0;
}

.el-table {
    flex-grow: 1; /* Allow table to take available space */
    /* Remove table border as container has one */
    --el-table-border-color: transparent;
}

.el-table th {
    background-color: #f5f7fa !important; /* Ensure header background */
    font-weight: 500;
    color: #606266;
}

.el-table td, .el-table th {
    padding: 8px 0; /* Adjust cell padding */
}

/* Form item labels */
.el-form-item__label {
    font-weight: 500;
    color: #606266;
    padding-right: 8px; /* Slightly reduce padding */
}

/* Style for spinner in table */
.el-icon.is-loading {
    animation: rotating 2s linear infinite;
}

/* Ensure dialog content has padding */
.el-dialog__body .el-scrollbar__view {
    padding: 10px 20px;
}

/* Preview container */
.preview-container {
    height: 75vh;
    overflow-y: auto;
    border: 1px solid #eee;
    padding: 15px;
    background-color: #fff;
    border-radius: 4px;
}

/* History Card */
.history-card {
    margin-top: 20px;
    flex-shrink: 0;
    border: 1px solid #e4e7ed;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Center align buttons in action column */
.el-table .el-table__cell.action-column {
    text-align: center;
}
.el-table .action-column .cell {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Adjustments for editor view */
.editor-view {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    height: 100%; /* Ensure it tries to take full height */
}
.editor-wrapper {
    width: 100%;
    flex-grow: 1;
    display: flex; /* Let editor component grow */
}

/* Footer Styles */
.app-footer {
  /* height: 25px; */ /* Remove fixed height */
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #eeeeee; /* Lighter border */
  background-color: #ffffff; /* Cleaner white background */
  flex-shrink: 0; /* Prevent footer from shrinking */
  padding: 4px 20px; /* Slightly increased vertical padding */
  /* line-height: 25px; */ /* Remove fixed line-height */
  overflow: hidden; /* Prevent content overflow from increasing height */
}

</style>