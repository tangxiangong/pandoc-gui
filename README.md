# Pandoc GUI

一个使用 Tauri (Rust + Vue 3 + TypeScript) 构建的 Pandoc 图形用户界面，用于在不同文档格式之间进行转换。

## ✨ 功能

*   选择本地文件作为输入。
*   支持多种输入格式（Markdown, HTML, LaTeX, RST, DOCX, EPUB），并可选择自动检测。
*   支持多种输出格式（DOCX, HTML, PDF (需要 Pandoc 正确配置引擎), TeX, Markdown, ODT, RST, EPUB）。
*   在转换前选择输出文件的保存位置和名称。
*   提供转换内容的 HTML 预览功能。
*   显示转换状态和结果信息。
*   界面采用 Element Plus 组件库。

## 🛠️ 技术栈

*   **框架**: [Tauri](https://tauri.app/) (v2)
*   **前端**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
*   **UI 库**: [Element Plus](https://element-plus.org/)
*   **后端**: [Rust](https://www.rust-lang.org/)
*   **核心转换**: [Pandoc crate](https://crates.io/crates/pandoc)

## 🚀 快速开始

**环境要求:**

1.  **Rust 环境**: 参考 [Tauri 文档 - 环境设置](https://tauri.app/v1/guides/getting-started/prerequisites) 安装 Rust 和相关依赖。
2.  **Node.js 和 npm**: 参考 [Node.js 官网](https://nodejs.org/) 安装。
3.  **Pandoc**: 确保你的系统中安装了 Pandoc 可执行文件，并且 `pandoc` crate 能够找到它。部分格式（如 PDF）可能需要额外的 Pandoc 依赖（如 LaTeX 发行版）。

**运行步骤:**

1.  克隆仓库:
    ```bash
    git clone <your-repository-url>
    cd pandoc-gui
    ```
2.  安装前端依赖:
    ```bash
    npm install
    # 或者 yarn install / pnpm install
    ```
3.  运行开发环境:
    ```bash
    cargo tauri dev
    # 或者 npm run tauri dev
    ```

## 📝 使用说明

1.  启动应用。
2.  点击"选择输入文件"按钮选择要转换的文档。
3.  （可选）在"输入格式"下拉菜单中指定输入文件的格式，或保留"自动检测"。
4.  在"输出格式"下拉菜单中选择想要转换的目标格式。
5.  （可选）点击"预览 (HTML)"按钮查看内容的 HTML 预览。
6.  点击"转换并保存"按钮。
7.  在弹出的对话框中选择输出文件的保存路径和名称。
8.  转换完成后，界面底部会显示成功或失败的状态信息。

## 📄 许可证

(根据你的选择添加许可证信息，例如 MIT, Apache 2.0 等) 