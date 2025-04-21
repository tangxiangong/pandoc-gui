# Pandoc GUI

<img src="app-icon.png?raw=true" alt="App Icon" width="128"/>

一个使用 Tauri (Rust + Vue 3 + TypeScript) 构建的 Pandoc 图形用户界面，用于在不同文档格式之间进行转换。

## ✨ 功能

*   选择本地文件作为输入。
*   支持多种输入格式（Markdown, HTML, LaTeX, RST, DOCX, EPUB），并可选择自动检测。
*   支持多种输出格式（DOCX, HTML, PDF (需要 Pandoc 正确配置引擎), TeX, Markdown, ODT, RST, EPUB）。

## 📸 截图

![Application Screenshot](screenshots/gui.png?raw=true)

![Application Screenshot](screenshots/video.gif?raw=true)

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
    git clone https://github.com/tangxiangong/pandoc-gui.git
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
2.  点击"选择输入文件"按钮选择要转换的文档，**或直接将文件拖拽到应用窗口中**。可以添加多个文件进行批量处理。
3.  （可选）在"输入格式"下拉菜单中指定输入文件的格式，或保留"自动检测"。
4.  在"输出格式"下拉菜单中选择想要转换的目标格式。
5.  （可选）点击"预览 (HTML)"按钮查看内容的 HTML 预览 (**注意：** 预览功能仅在选择单个文件时可用)。
6.  点击转换按钮：
    *   如果只添加了**一个文件**，会弹出**保存对话框**，让您选择输出文件的保存位置和名称。
    *   如果添加了**多个文件**，将**自动开始批量转换**，输出文件将默认保存在与对应输入文件相同的目录下，文件名与输入文件相同（仅扩展名更改为所选输出格式）。
7.  转换完成后，文件列表会显示每个文件的成功或失败状态信息。

## 📄 许可证

本软件根据以下两种许可证发布，您可以任选其一：

*   [MIT 许可证](LICENSE-MIT)
*   [Apache 许可证 2.0 版本](LICENSE-APACHE) 