// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use pandoc::{
    InputFormat, InputKind, OutputFormat, OutputKind, Pandoc, PandocOption, PandocOutput,
};
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use tauri::AppHandle;
use std::{fs, io::ErrorKind};

// Helper function to parse output format string
fn parse_output_format(format_str: &str) -> Result<OutputFormat, String> {
    match format_str.to_lowercase().as_str() {
        "docx" => Ok(OutputFormat::Docx),
        "html" | "html5" => Ok(OutputFormat::Html5),
        "html4" => Err(
            "Html4 输出格式名称不确定或可能不直接支持。请尝试 Html5 或检查 pandoc crate 文档。"
                .to_string(),
        ),
        "pdf" => Err(
            "直接通过 crate 输出 PDF 需要特定引擎设置。请使用中间格式（如 LaTeX 或 HTML）。"
                .to_string(),
        ),
        "tex" | "latex" => Ok(OutputFormat::Latex),
        "md" | "markdown" => Ok(OutputFormat::Markdown),
        "rst" => Ok(OutputFormat::Rst),
        "odt" => Ok(OutputFormat::OpenDocument),
        "epub" | "epub3" | "epub2" => Ok(OutputFormat::Epub),
        // Add more formats as needed based on pandoc::OutputFormat enum
        _ => Err(format!("未支持的输出格式: {}", format_str)),
    }
}

// Restore parse_input_format function (without ODT)
fn parse_input_format(format_str: &str) -> Result<InputFormat, String> {
    if format_str.eq_ignore_ascii_case("auto") {
        return Ok(InputFormat::Markdown); // Dummy value, won't be used directly for auto
    }
    match format_str.to_lowercase().as_str() {
        "markdown" | "md" => Ok(InputFormat::Markdown),
        "html" | "html5" => Ok(InputFormat::Html),
        "latex" | "tex" => Ok(InputFormat::Latex),
        "rst" => Ok(InputFormat::Rst),
        "docx" => Ok(InputFormat::Docx),
        // "odt" is intentionally left out based on previous error
        "epub" => Ok(InputFormat::Epub),
        _ => Err(format!("未支持的输入格式: {}", format_str)),
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ConversionOptions {
    input_path: String,
    output_format: String,
    output_path: String,
    input_format: Option<String>,
}

// Options for converting directly from content string
#[derive(serde::Serialize, serde::Deserialize)]
struct ConversionContentOptions {
    input_content: String,
    output_format: String,
    output_path: String,
    // input_format is assumed to be markdown for editor content
}

// Define options specific to preview
#[derive(serde::Serialize, serde::Deserialize)]
struct PreviewOptions {
    input_path: String,
    input_format: Option<String>, // Restore input format field
}

// Add the command attribute back
#[tauri::command]
fn convert_file(options: ConversionOptions) -> Result<String, String> {
    println!("收到转换请求:");
    println!("  输入路径: {}", options.input_path);
    println!("  输出格式: {}", options.output_format);
    println!("  输出路径: {}", options.output_path);
    if let Some(ref infmt) = options.input_format {
        println!("  输入格式: {}", infmt);
    }

    let mut pandoc = Pandoc::new();

    // Input is always a file path now
    let input_path = PathBuf::from(&options.input_path);
    if !input_path.exists() {
        return Err(format!("输入文件未找到: {}", options.input_path));
    }
    pandoc.set_input(InputKind::Files(vec![input_path]));

    // Set input format if provided and not auto
    if let Some(ref input_format_str) = options.input_format {
        if !input_format_str.eq_ignore_ascii_case("auto") {
            let input_format_enum = parse_input_format(input_format_str)?;
            pandoc.set_input_format(input_format_enum, vec![]);
            println!("显式设置输入格式为: {}", input_format_str);
        } else {
            println!("输入格式设置为自动检测。");
        }
    } else {
        println!("未指定输入格式，使用自动检测。");
    }

    // Output details
    let output_path = PathBuf::from(&options.output_path);
    let _output_path_str = options.output_path; // No need to clone if options isn't moved

    let output_format_enum = parse_output_format(&options.output_format)?;

    pandoc.set_output(OutputKind::File(output_path));
    pandoc.set_output_format(output_format_enum, vec![]);
    pandoc.add_option(PandocOption::Standalone);

    println!("执行 Pandoc 转换...");
    match pandoc.execute() {
        Ok(_) => {
            println!("Pandoc 转换成功。");
            Ok("转换成功!".to_string())
        }
        Err(e) => {
            println!("Pandoc 转换失败: {:?}", e);
            Err(format!("Pandoc 转换失败: {}", e))
        }
    }
}

// New command for converting content directly
#[tauri::command]
fn convert_content(options: ConversionContentOptions) -> Result<String, String> {
    println!("收到编辑器内容转换请求:");
    println!("  输出格式: {}", options.output_format);
    println!("  输出路径: {}", options.output_path);

    let mut pandoc = Pandoc::new();

    // Set input from string
    pandoc.set_input(InputKind::Pipe(options.input_content));
    // Editor content is always treated as Markdown
    pandoc.set_input_format(InputFormat::Markdown, vec![]);
    println!("  输入格式: Markdown (来自编辑器)");

    // Output details
    let output_path = PathBuf::from(&options.output_path);
    
    let output_format_enum = parse_output_format(&options.output_format)?;

    pandoc.set_output(OutputKind::File(output_path));
    pandoc.set_output_format(output_format_enum, vec![]);
    pandoc.add_option(PandocOption::Standalone);

    println!("执行 Pandoc 编辑器内容转换...");
    match pandoc.execute() {
        Ok(_) => {
            println!("Pandoc 编辑器内容转换成功。");
            Ok("转换成功!".to_string())
        }
        Err(e) => {
            println!("Pandoc 编辑器内容转换失败: {:?}", e);
            Err(format!("Pandoc 编辑器内容转换失败: {}", e))
        }
    }
}

// 生成 HTML 预览的新命令
#[tauri::command]
fn preview_file(options: PreviewOptions) -> Result<String, String> {
    println!("收到预览请求:");
    println!("  输入路径: {}", options.input_path);
    // 恢复输入格式日志记录
    if let Some(ref infmt) = options.input_format {
        println!("  输入格式: {}", infmt);
    }

    let input_path = PathBuf::from(&options.input_path);
    if !input_path.exists() {
        return Err(format!("输入文件未找到: {}", options.input_path));
    }

    let mut pandoc = Pandoc::new();
    pandoc.set_input(InputKind::Files(vec![input_path]));

    // Restore input format setting logic
    if let Some(ref input_format_str) = options.input_format {
        if !input_format_str.eq_ignore_ascii_case("auto") {
            let input_format_enum = parse_input_format(input_format_str)?;
            pandoc.set_input_format(input_format_enum, vec![]);
            println!("预览: 显式设置输入格式为: {}", input_format_str);
        }
    }

    pandoc.set_output_format(OutputFormat::Html5, vec![]);
    pandoc.set_output(OutputKind::Pipe);
    pandoc.add_option(PandocOption::Standalone);

    println!("执行 Pandoc 预览生成 (HTML)...");
    match pandoc.execute() {
        Ok(pandoc_output) => {
            // Match the PandocOutput enum variant
            match pandoc_output {
                PandocOutput::ToBuffer(buffer) => {
                    println!("Pandoc 预览生成成功。");
                    // Convert Vec<u8> buffer to String
                    String::from_utf8(buffer.into())
                        .map_err(|e| format!("Failed to 解码预览输出为 UTF-8: {}", e))
                }
                _ => {
                    // Should not happen with OutputKind::Pipe
                    println!("意外的 PandocOutput 变体用于 Pipe。");
                    Err("意外的预览输出类型。".to_string())
                }
            }
        }
        Err(e) => {
            println!("Pandoc 预览生成失败: {:?}", e);
            Err(format!("Pandoc 预览生成失败: {}", e))
        }
    }
}

// --- 新命令：打开文件和文件夹 ---

#[tauri::command]
fn open_file_in_default_app(path: String) -> Result<(), String> {
    println!("尝试使用默认应用打开文件: {}", path);
    match open::that(&path) {
        Ok(_) => {
            println!("文件打开成功: {}", path);
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("无法打开文件 '{}': {}", path, e);
            println!("文件打开失败: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
fn show_in_folder(path: String) -> Result<(), String> {
    println!("尝试在文件管理器中显示路径: {}", path);
    // `open::that` 在大多数系统上也可以打开目录。
    // 如果需要更精确的行为（例如，在 Windows/macOS 上选中文件），
    // 可能需要使用如 `opener` crate 或平台特定的 API。
    match open::that(&path) {
        Ok(_) => {
             println!("成功打开文件夹/路径: {}", path);
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("无法打开文件夹 '{}': {}", path, e);
            println!("打开文件夹失败: {}", error_msg);
            Err(error_msg)
        }
    }
}

// --- 历史记录结构体 ---
// 注意：这里的字段名和类型需要与前端 App.vue 中的 ConversionStatus 精确匹配
// 并且需要与 save_history 命令接收的类型一致
#[derive(Serialize, Deserialize, Debug, Clone)] // 添加 Clone
struct HistoryEntry {
    path: String,         // 输入路径或占位符
    status: String,       // 状态 ("success")
    message: String,      // 消息 ("转换成功")
    #[serde(rename = "isSuccess")] // 匹配 JS 的 camelCase
    is_success: bool,     // 是否成功 (true)
    #[serde(rename = "outputPath")] // 匹配 JS 的 camelCase
    output_path: Option<String>, // 输出路径 (应该是 Some)
}

const HISTORY_FILE_NAME: &str = "conversion_history.json";

// --- 获取历史文件路径的辅助函数 (使用 dirs crate) ---
fn get_history_file_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let bundle_identifier = app_handle
        .config()
        .identifier
        .to_string();

    dirs::data_local_dir()
        .ok_or_else(|| "无法获取基础本地数据目录 (dirs crate)".to_string())
        .map(|dir| dir.join(bundle_identifier).join(HISTORY_FILE_NAME))
}

// --- 新命令：加载和保存历史记录 ---

#[tauri::command]
fn load_history(app_handle: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let file_path = get_history_file_path(&app_handle)?;
    println!("尝试从以下路径加载历史记录: {:?}", file_path);

    match fs::read_to_string(&file_path) {
        Ok(json_content) => {
            serde_json::from_str(&json_content).map_err(|e| {
                let err_msg = format!("解析历史记录文件失败: {}", e);
                println!("{}", err_msg);
                 // 如果解析失败，可能文件已损坏，返回空列表而不是错误
                 // 也可以选择删除损坏的文件
                 // fs::remove_file(&file_path).ok(); 
                err_msg // 或者返回错误: format!("解析历史记录文件失败: {}", e)
            })
             // 如果解析失败，返回空Vec而不是错误，以允许程序继续
            .or_else(|_err| Ok(Vec::new())) 
        }
        Err(e) if e.kind() == ErrorKind::NotFound => {
            println!("历史记录文件未找到，返回空列表。");
            Ok(Vec::new()) // 文件不存在是正常情况，返回空列表
        }
        Err(e) => {
             let err_msg = format!("读取历史记录文件失败: {}", e);
             println!("{}", err_msg);
             Err(err_msg)
        }
    }
}

#[tauri::command]
fn save_history(app_handle: AppHandle, history: Vec<HistoryEntry>) -> Result<(), String> {
    let file_path = get_history_file_path(&app_handle)?;
    println!("尝试保存历史记录到: {:?}", file_path);

    // 确保目录存在
    if let Some(parent_dir) = file_path.parent() {
        fs::create_dir_all(parent_dir).map_err(|e| {
            let err_msg = format!("创建历史记录目录失败: {}", e);
            println!("{}", err_msg);
            err_msg
        })?;
    }

    // 序列化历史记录为 JSON
    let json_content = serde_json::to_string_pretty(&history).map_err(|e| {
        let err_msg = format!("序列化历史记录失败: {}", e);
        println!("{}", err_msg);
        err_msg
    })?;

    // 写入文件
    fs::write(&file_path, json_content).map_err(|e| {
        let err_msg = format!("写入历史记录文件失败: {}", e);
        println!("{}", err_msg);
        err_msg
    })?;

    println!("历史记录已成功保存。");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            convert_file,
            preview_file,
            convert_content, // Re-register the content conversion command
            open_file_in_default_app, // 注册新命令
            show_in_folder,          // 注册新命令
            load_history,            // 注册加载历史记录命令
            save_history             // 注册保存历史记录命令
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用程序时出错");
}
