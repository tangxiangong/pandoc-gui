<script setup lang="ts">
import { ref } from 'vue';
import {
  ElCollapse, ElCollapseItem,
  ElTable, ElTableColumn, ElButton, ElSpace, ElText} from 'element-plus';
import { FolderOpened, Document, Delete } from '@element-plus/icons-vue';
import type { PropType } from 'vue';

// Define the structure of a history item (same as ConversionStatus in App.vue)
interface HistoryEntry {
  path: string;
  status: 'pending' | 'converting' | 'success' | 'error'; // Should always be 'success' here
  message: string;
  isSuccess: boolean; // Should always be true here
  outputPath?: string;
}

// Define props
const props = defineProps({
  history: {
    type: Array as PropType<HistoryEntry[]>,
    required: true,
  },
  onOpenFile: {
    type: Function as PropType<(outputPath: string | undefined) => void>,
    required: true,
  },
  onShowFolder: {
    type: Function as PropType<(outputPath: string | undefined) => void>,
    required: true,
  },
  onDeleteItem: {
    type: Function as PropType<(item: HistoryEntry) => void>,
    required: true,
  },
});

const activeNames = ref<string[]>([]);

</script>

<template>
  <el-collapse v-model="activeNames">
    <el-collapse-item title="" name="1">
      <el-table :data="history" stripe style="width: 100%" size="small">
        <!-- File Path Column -->
        <el-table-column prop="path" label="输入" show-overflow-tooltip>
          <template #default="scope">
            <el-text size="small" truncated>{{ scope.row.path }}</el-text>
          </template>
        </el-table-column>
         <!-- Output Path Column (Added) -->
         <el-table-column prop="outputPath" label="输出" show-overflow-tooltip>
           <template #default="scope">
             <el-text size="small" truncated>{{ scope.row.outputPath || 'N/A' }}</el-text>
           </template>
         </el-table-column>
        <!-- Message Column -->
        <el-table-column prop="message" label="信息" width="120">
          <template #default="scope">
            <el-text size="small" type="success">{{ scope.row.message }}</el-text>
          </template>
        </el-table-column>
        <!-- Actions Column -->
        <el-table-column label="操作" width="280" align="center">
          <template #default="scope">
            <el-space v-if="scope.row.outputPath" :size="4">
              <el-button
                type="primary"
                :icon="Document"
                size="default"
                @click="() => props.onOpenFile(scope.row.outputPath)"
              >
                打开
              </el-button>
              <el-button
                type="success"
                :icon="FolderOpened"
                size="default"
                @click="() => props.onShowFolder(scope.row.outputPath)"
              >
                文件夹
              </el-button>
              <el-button
                type="danger"
                :icon="Delete"
                size="default"
                @click="() => props.onDeleteItem(scope.row)"
              >
                删除
              </el-button>
            </el-space>
            <el-text v-else size="small" type="info">-</el-text>
          </template>
        </el-table-column>
      </el-table>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
/* Styles for Collapse are no longer needed */
/* .el-collapse-item__header {
  font-weight: 500;
} */

/* Ensure vertical alignment in table cells */
.el-table :deep(td) {
  vertical-align: middle;
}
</style> 