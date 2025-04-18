<script setup lang="ts">
import { ref, computed } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ElMessage, ElDialog } from 'element-plus'; // Import ElDialog
import { basename, extname, dirname } from '@tauri-apps/api/path'; // Import path functions

const inputPath = ref<string | null>(null);
const outputPath = ref<string | null>(null); // Added output path state
const selectedOutputFormat = ref<string>("docx");
const selectedInputFormat = ref<string>("auto"); // Restore input format state
const conversionStatus = ref<string>("");
const isSuccess = ref<boolean>(true); // Track if the status is success or error
const isLoading = ref<boolean>(false); // Track loading state
const isPreviewLoading = ref<boolean>(false); // Loading state for preview
const showPreviewDialog = ref<boolean>(false); // Control preview dialog visibility
const previewHtml = ref<string>("");

// Restore input formats list (without ODT)
const availableInputFormats = ["auto", "markdown", "html", "latex", "rst", "docx", "epub"];
const availableOutputFormats = ["docx", "html", "pdf", "tex", "md", "odt", "rst", "epub"];

// Computed property for suggested output filename
const suggestedFilename = computed(async () => {
  if (!inputPath.value) return '';
  try {
    const inputBasename = await basename(inputPath.value);
    const inputExt = await extname(inputPath.value);
    // Handle cases with no extension or leading dot files gracefully
    const nameWithoutExt = inputExt ? inputBasename.substring(0, inputBasename.length - inputExt.length) : inputBasename;
    return `${nameWithoutExt}.${selectedOutputFormat.value}`;
  } catch (e) {
    console.error("生成建议文件名时出错:", e);
    return `输出.${selectedOutputFormat.value}`; // Fallback
  }
});

async function selectFile() {
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "选择输入文件" // Chinese title
    });
    if (typeof selected === 'string') {
      inputPath.value = selected;
      outputPath.value = null;
      conversionStatus.value = '';
      previewHtml.value = '';
      isSuccess.value = true;
    } else if (selected === null) {
      inputPath.value = null;
      // ElMessage.info('已取消选择文件'); // Optional feedback
    } else {
      console.warn('收到意外的选择类型:', selected);
      inputPath.value = null;
    }
  } catch (error) {
    console.error("选择文件时出错:", error);
    inputPath.value = null;
    ElMessage.error(`选择文件时出错: ${error}`);
  }
}

// Function to generate and show preview
async function generatePreview() {
  if (!inputPath.value) {
    ElMessage.warning("请先选择输入文件");
    return;
  }
  isPreviewLoading.value = true;
  previewHtml.value = "";
  ElMessage({ message: "正在生成预览...", type: "info", duration: 0 });

  try {
    // Restore passing input_format
    const options: any = {
      input_path: inputPath.value,
      input_format: selectedInputFormat.value, // Pass selected input format
    };

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
  // 1. Check only for input file
  if (!inputPath.value) {
    ElMessage.warning("请先选择输入文件");
    // conversionStatus.value = "请先选择输入文件"; // No longer needed here
    // isSuccess.value = false;
    return;
  }

  isLoading.value = true; // Set loading early
  conversionStatus.value = ""; // Clear previous status
  isSuccess.value = true;

  let chosenOutputPath: string | null = null;

  try {
    // 2. Show Save Dialog First
    const filename = await suggestedFilename.value;
    const inputDir = await dirname(inputPath.value);
    const defaultSavePath = `${inputDir}/${filename}`;

    chosenOutputPath = await save({
      title: '选择输出文件保存位置',
      defaultPath: defaultSavePath,
      filters: [{
          name: selectedOutputFormat.value.toUpperCase(),
          extensions: [selectedOutputFormat.value]
      }]
    });

    // 3. Check if user cancelled save dialog
    if (!chosenOutputPath) {
      ElMessage.info('已取消转换');
      isLoading.value = false; // Reset loading state
      return;
    }

    // 4. Proceed with conversion using the chosen path
    conversionStatus.value = "开始转换..."; // Set status message now
    ElMessage({ message: "正在转换...", type: "info", duration: 0 });

    const options: any = {
      input_path: inputPath.value,
      output_format: selectedOutputFormat.value,
      output_path: chosenOutputPath, // Use the path from save dialog
      input_format: selectedInputFormat.value,
    };
    const result: string = await invoke("convert_file", { options });
    ElMessage.closeAll("info");
    conversionStatus.value = result;
    isSuccess.value = true;
    ElMessage.success("转换成功"); // Simple success message

  } catch (error) {
    ElMessage.closeAll("info");
    console.error("转换出错:", error);
    const errorMsg = `转换失败: ${error}`;
    conversionStatus.value = errorMsg;
    isSuccess.value = false;
    ElMessage.error(errorMsg);
  } finally {
    isLoading.value = false; // Ensure loading state is reset
  }
}

</script>

<template>
  <el-container style="padding: 20px;">
    <el-main>
      <el-card shadow="never" style="max-width: 600px; margin: auto;">
        <template #header>
          <div style="text-align: center;">
            <!-- Keep title in English or change as desired -->
            <h1 style="margin: 0; font-size: 1.8em; color: #409EFF;">Pandoc GUI</h1>
          </div>
        </template>

        <el-space direction="vertical" alignment="stretch" :size="20" style="width: 100%;">

          <el-button @click="selectFile" :disabled="isLoading || isPreviewLoading" size="large">
            选择输入文件
          </el-button>

          <el-alert
            v-if="inputPath"
            :title="'输入: ' + inputPath"
            type="info"
            :closable="false"
            show-icon
            style="word-break: break-all;"
          />

          <!-- Format Selection -->
          <!-- Restore Input Format Selector -->
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
              :disabled="!inputPath || isLoading || isPreviewLoading" 
              :loading="isPreviewLoading" 
              size="large" 
              style="flex-grow: 1;"
            >
              预览 (HTML)
            </el-button>
            <el-button
              type="primary"
              @click="startConversion"
              :disabled="!inputPath || isLoading || isPreviewLoading"
              :loading="isLoading"
              size="large"
              style="flex-grow: 1; font-weight: bold;"
            >
              {{ isLoading ? '正在转换...' : '转换并保存' }}
            </el-button>
          </div>

          <el-alert
            v-if="conversionStatus && !isLoading && !isPreviewLoading"
            :title="conversionStatus"
            :type="isSuccess ? 'success' : 'error'"
            show-icon
            :closable="true"
            @close="conversionStatus = ''"
            style="margin-top: 15px;"
          />

        </el-space>
      </el-card>

      <!-- Preview Dialog -->
      <el-dialog v-model="showPreviewDialog" title="HTML 预览" width="80%" top="5vh">
        <div style="height: 75vh; overflow-y: auto; border: 1px solid #eee; padding: 10px;">
           <div v-html="previewHtml"></div>
           <!-- Or using iframe for better isolation: -->
           <!-- <iframe :srcdoc="previewHtml" style="width: 100%; height: 100%; border: none;"></iframe> -->
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
/* Remove scoped attribute to apply global styles if needed, or keep it scoped */
/* We removed the custom styles, relying on Element Plus defaults */

/* Optional: Global style adjustments if necessary */
body {
  background-color: #f4f4f5; /* Light gray background for the whole page */
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Center the card vertically and horizontally (can be tricky with Tauri window resizing) */
.el-container {
  /* display: flex; */ /* Can cause issues with height */
  /* align-items: center; */
  /* justify-content: center; */
  min-height: 100vh; /* Try to fill viewport height */
}

h1 {
   /* Ensure h1 doesn't add extra margins causing layout shifts */
   margin-bottom: 0;
}

.el-form-item__label {
    font-weight: 500 !important; /* Make label slightly bolder */
    color: #606266 !important;
}

</style>