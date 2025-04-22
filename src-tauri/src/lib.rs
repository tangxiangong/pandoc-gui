// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use pandoc::{
    InputFormat, InputKind, OutputFormat, OutputKind, Pandoc, PandocOption, PandocOutput,
};
use std::path::PathBuf;

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
    let output_path_str = options.output_path; // No need to clone if options isn't moved

    let output_format_enum = parse_output_format(&options.output_format)?;

    pandoc.set_output(OutputKind::File(output_path));
    pandoc.set_output_format(output_format_enum, vec![]);
    pandoc.add_option(PandocOption::Standalone);

    println!("执行 Pandoc 转换...");
    match pandoc.execute() {
        Ok(_) => {
            println!("Pandoc 转换成功。");
            Ok(format!("转换成功！输出已保存至: {}", output_path_str))
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
    let output_path_str = options.output_path.clone();

    let output_format_enum = parse_output_format(&options.output_format)?;

    pandoc.set_output(OutputKind::File(output_path));
    pandoc.set_output_format(output_format_enum, vec![]);
    pandoc.add_option(PandocOption::Standalone);

    println!("执行 Pandoc 编辑器内容转换...");
    match pandoc.execute() {
        Ok(_) => {
            println!("Pandoc 编辑器内容转换成功。");
            Ok(format!("转换成功！输出已保存至: {}", output_path_str))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            convert_file,
            preview_file,
            convert_content // Re-register the content conversion command
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用程序时出错");
}
