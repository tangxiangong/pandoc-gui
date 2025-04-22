<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Cherry from 'cherry-markdown/dist/cherry-markdown.core';
import 'cherry-markdown/dist/cherry-markdown.css';
// 动态导入 Mermaid 支持 (推荐)
import CherryMermaidPlugin from 'cherry-markdown/dist/addons/cherry-code-block-mermaid-plugin';
import mermaid from 'mermaid';

// Declare MathJax on window type for TypeScript
declare global {
    interface Window { MathJax: any; }
}

// Define the event this component can emit
const emit = defineEmits<{ 
  (e: 'submit-content', content: string): void;
  (e: 'cancel'): void; // Add cancel event
}>();

// Define props
interface Props {
  showCancelButton?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showCancelButton: false,
});

const registerMermaidPlugin = async () => {
  Cherry.usePlugin(CherryMermaidPlugin, {
    mermaid, // pass in mermaid object
    // 可选：配置 mermaid 行为，参考 mermaid 官方文档
    // theme: 'neutral',
    // sequence: { useMaxWidth: false, showSequenceNumbers: true }
  });
  console.log('Mermaid plugin registered.');
};

async function setupMathJax() {
  // Set configuration BEFORE loading MathJax core
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    svg: {
      fontCache: 'global'
    },
    startup: {
      ready: () => {
        console.log('MathJax is ready (offline).');
        // Tell MathJax to start processing the page
        window.MathJax.startup.defaultReady();
        // Optional: Sometimes a redraw/update is needed after MathJax is fully ready
        // cherryInstance.value?.refresh(); 
      }
    }
  };

  // Dynamically import MathJax core script
  try {
    await import('mathjax/es5/tex-svg.js');
    console.log('MathJax script loaded (offline).');
  } catch (error) {
    console.error('Failed to load MathJax offline:', error);
  }
}

const editorRef = ref<HTMLDivElement | null>(null);
const cherryInstance = ref<Cherry | null>(null);
const markdownContent = ref<string>('');

onMounted(async () => {
  // Setup MathJax first
  await setupMathJax();

  // Register plugins before initializing Cherry
  await registerMermaidPlugin();

  if (editorRef.value) {
    cherryInstance.value = new Cherry({
      id: 'markdown-editor-container',
      value: '', // Clear initial content
      // 其他 Cherry 配置项...
      // 例如，设置编辑器模式、工具栏等
      // See https://github.com/Tencent/cherry-markdown/wiki/Configuration
      engine: {
        syntax: {
          mathBlock: {
            engine: 'MathJax', // KaTeX 或 MathJax
            // 可选：配置 MathJax 或 KaTeX 的参数，例如 macros
          },
          inlineMath: {
            engine: 'MathJax', // KaTeX 或 MathJax
          },
          // 添加默认的 table 配置以解决类型错误
          table: {
             enableChart: false, // 默认禁用 echarts 图表
          },
          // 保留其他默认语法配置...
          list: { 
             listNested: true, // 默认允许列表嵌套
             indentSpace: 2, // 默认缩进
          }
          // ...根据需要添加其他语法默认值以匹配 CherryOptions 类型
        }
      },
      toolbars: {
        theme: 'light', // default 'dark'
      },
      // fileUpload: async (file: File, callback: (url: string, params?: Record<string, any>) => void) => {
      //   // Handle file uploads if needed
      //   console.warn('File upload not implemented');
      //   // Example: upload file then call callback(url)
      // },
      callback: {
        // Fired when content changes
        afterChange: (markdown: string, _html: string) => {
          markdownContent.value = markdown;
        },
      },
    });
  }
});

onUnmounted(() => {
  cherryInstance.value?.destroy();
});

// Function to emit content to the parent component
function submitContent() {
  if (cherryInstance.value) {
    const currentContent = cherryInstance.value.getMarkdown();
    // Use the Vue emit defined earlier
    emit('submit-content', currentContent);
    // No need to close window here, parent controls visibility
  }
}

// Function to emit cancel event
function cancelEdit() {
  emit('cancel');
}

</script>

<template>
  <div class="editor-page">
    <div id="markdown-editor-container" ref="editorRef" style="height: 500px; border: 1px solid #dcdfe6;"></div>
    <div class="editor-actions">
      <!-- Add Cancel button -->
      <button v-if="props.showCancelButton" @click="cancelEdit" class="button-cancel">返回</button>
      <button @click="submitContent" class="button-submit">使用编辑器内容</button>
    </div>
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent body scroll if editor container itself scrolls */
}

#markdown-editor-container {
  flex-grow: 1;
}

.editor-actions {
  padding: 10px;
  text-align: right;
  background-color: #f8f9fa;
  border-top: 1px solid #dcdfe6;
}

/* Style the button */
.editor-actions button { /* Common styles */
  padding: 8px 15px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px; /* Add some space between buttons */
}

.button-submit {
  background-color: #409EFF;
}

.button-submit:hover {
  background-color: #66b1ff;
}

.button-cancel {
  background-color: #909399; /* Grey color for cancel */
}

.button-cancel:hover {
  background-color: #a6a9ad;
}

/* Ensure Cherry editor takes full height/width within its container */
:deep(.cherry-markdown) {
  height: 100%;
  width: 100%;
  box-shadow: none; /* Remove default shadow if needed */
}
:deep(.cherry-editor) {
    height: 100%;
}
:deep(.cherry-previewer) {
    height: 100%;
}

</style> 