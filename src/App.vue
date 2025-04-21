<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  ElMessage, ElDialog, ElTable, ElTableColumn, ElButton, ElSpace, ElText, ElCard,
  ElContainer, ElMain, ElFormItem, ElSelect, ElOption, ElDivider, ElIcon
} from 'element-plus';
import { Loading, Close } from '@element-plus/icons-vue';
import { basename, dirname } from '@tauri-apps/api/path';
import { listen, TauriEvent, Event } from '@tauri-apps/api/event';
import type { PhysicalPosition } from '@tauri-apps/api/window';

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

const availableInputFormats = ["auto", "markdown", "html", "latex", "rst", "docx", "epub"];
const availableOutputFormats = ["docx", "html", "pdf", "tex", "md", "odt", "rst", "epub"];

// Computed properties
const hasMultipleFiles = computed(() => inputPaths.value.length > 1);
const hasFiles = computed(() => inputPaths.value.length > 0);

// --- Function Updates ---

// Helper to add a file and its initial progress state
function addFileAndProgress(filePath: string) {
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
  if (!hasFiles.value) {
    ElMessage.warning("请先选择输入文件");
    return;
  }
  if (hasMultipleFiles.value) {
    ElMessage.warning("预览功能仅支持单个文件");
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
  if (!hasFiles.value) {
    ElMessage.warning("请先选择或拖拽文件");
    return;
  }

  isLoading.value = true;
  // Reset status of existing files to pending before starting
  conversionProgress.value.forEach(p => {
      p.status = 'pending';
      p.message = '等待转换';
      p.isSuccess = true;
  });

  ElMessage({ message: "开始批量转换...", type: "info", duration: 0 });
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
          continue;
      }

      const options = {
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

// Setup drag and drop listener
let unlistenDragDrop: (() => void) | null = null;

onMounted(async () => {
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

</script>

<template>
  <el-container style="padding: 20px;">
    <el-main>
      <el-card shadow="never" style="max-width: 800px; margin: auto;">
        <template #header>
          <div style="text-align: center;">
            <h1 style="margin: 0; font-size: 1.8em; color: #409EFF;">Pandoc GUI</h1>
          </div>
        </template>

        <el-space direction="vertical" alignment="stretch" :size="15" style="width: 100%;">

          <el-button @click="selectFile" :disabled="isLoading || isPreviewLoading" size="large" style="width: 100%;">
             选择输入文件 (可多选)
          </el-button>

          <el-text type="info" size="small" style="text-align: center; display: block;">
            或将文件拖拽到此处
          </el-text>

          <!-- Combined File List & Status Table -->
          <div v-if="hasFiles" class="file-status-table-container" style="margin-top: 10px;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                 <el-text size="default">文件列表 & 状态:</el-text>
                 <el-button
                    type="warning"
                    link
                    size="small"
                    @click="clearAllFiles"
                    :disabled="isLoading"
                 >
                    清空列表
                </el-button>
            </div>
             <el-table :data="conversionProgress" stripe style="width: 100%" size="small">
                 <!-- File Path Column -->
                <el-table-column prop="path" label="文件" show-overflow-tooltip>
                     <template #default="scope">
                        <el-text size="small" truncated>{{ scope.row.path }}</el-text>
                    </template>
                </el-table-column>
                <!-- Status Column -->
                <el-table-column prop="status" label="状态" width="100">
                     <template #default="scope">
                         <el-icon v-if="scope.row.status === 'converting'" class="is-loading">
                             <Loading />
                         </el-icon>
                        <el-text v-else size="small" :type="scope.row.status === 'success' ? 'success' : scope.row.status === 'error' ? 'danger' : 'info'">
                          {{ scope.row.status === 'success' ? '成功' : scope.row.status === 'error' ? '失败' : '待处理' }}
                        </el-text>
                    </template>
                </el-table-column>
                <!-- Message Column -->
                <el-table-column prop="message" label="信息" show-overflow-tooltip>
                     <template #default="scope">
                        <el-text size="small" :type="scope.row.isSuccess ? '' : 'danger'" truncated>{{ scope.row.message }}</el-text>
                    </template>
                </el-table-column>
                 <!-- Actions Column -->
                <el-table-column label="操作" width="80" align="center">
                    <template #default="scope">
                         <el-button
                          type="danger"
                          :icon="Close"
                          link
                          size="small"
                          @click="removeFileByPath(scope.row.path)"
                          :disabled="isLoading"
                          title="移除此文件"
                     >
                          移除
                         </el-button>
                    </template>
                </el-table-column>
             </el-table>
          </div>

          <el-divider v-if="hasFiles" style="margin: 10px 0;" />

          <!-- Format Selection -->
          <el-form-item label="输入格式:" style="margin-bottom: 0;">
             <el-select v-model="selectedInputFormat" placeholder="选择输入格式 (默认自动)" :disabled="isLoading || isPreviewLoading" style="width: 100%;">
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
              style="width: 100%;"
            >
              <el-option
                v-for="format in availableOutputFormats"
                :key="'out-' + format"
                :label="format.toUpperCase()"
                :value="format"
              />
            </el-select>
          </el-form-item>

          <div style="display: flex; gap: 10px;">
            <el-button
              @click="generatePreview"
              :disabled="!hasFiles || hasMultipleFiles || isLoading || isPreviewLoading"
              :loading="isPreviewLoading"
              size="large"
              style="flex-grow: 1;"
              title="预览仅支持单个文件"
            >
              预览 (HTML)
            </el-button>
            <el-button
              type="primary"
              @click="startConversion"
              :disabled="!hasFiles || isLoading || isPreviewLoading"
              :loading="isLoading"
              size="large"
              style="flex-grow: 1; font-weight: bold;"
            >
              {{ isLoading ? '正在转换...' : (hasMultipleFiles ? '开始批量转换' : '转换选定文件') }}
            </el-button>
          </div>

        </el-space>
      </el-card>

      <!-- Preview Dialog -->
      <el-dialog v-model="showPreviewDialog" title="HTML 预览" width="80%" top="5vh">
        <div style="height: 75vh; overflow-y: auto; border: 1px solid #eee; padding: 10px;">
           <div v-html="previewHtml"></div>
        </div>
         <template #footer>
          <span class="dialog-footer">
            <el-button @click="showPreviewDialog = false">关闭预览</el-button>
          </span>
        </template>
      </el-dialog>

    </el-main>
  </el-container>
</template>

<style>
/* Optional: Global style adjustments */
body {
  background-color: #f4f4f5;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.el-container {
  min-height: 100vh;
}

h1 {
   margin-bottom: 0;
}

.el-form-item__label {
    font-weight: 500 !important;
    color: #606266 !important;
}

/* Style for spinner in table */
.el-icon.is-loading {
    animation: rotating 2s linear infinite;
}
</style>