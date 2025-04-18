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
        "html4" => Err("Html4 output format variant name uncertain or potentially unsupported directly. Try Html5 or check pandoc crate documentation.".to_string()),
        "pdf" => Err("Direct PDF output via crate requires specific engine setup. Use intermediate format like LaTeX or HTML.".to_string()),
        "tex" | "latex" => Ok(OutputFormat::Latex),
        "md" | "markdown" => Ok(OutputFormat::Markdown),
        "rst" => Ok(OutputFormat::Rst),
        "odt" => Ok(OutputFormat::OpenDocument),
        "epub" | "epub3" | "epub2" => Ok(OutputFormat::Epub),
        // Add more formats as needed based on pandoc::OutputFormat enum
        _ => Err(format!("Unsupported output format: {}", format_str)),
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
        _ => Err(format!("Unsupported input format: {}", format_str)),
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ConversionOptions {
    input_path: String,
    output_format: String,
    output_path: String,
    input_format: Option<String>, // Restore input format field
}

// Define options specific to preview
#[derive(serde::Serialize, serde::Deserialize)]
struct PreviewOptions {
    input_path: String,
    input_format: Option<String>, // Restore input format field
}

#[tauri::command]
fn convert_file(options: ConversionOptions) -> Result<String, String> {
    println!("Received conversion request:");
    println!("  Input Path: {}", options.input_path);
    println!("  Output Format: {}", options.output_format);
    println!("  Output Path: {}", options.output_path);
    // Restore input format logging
    if let Some(ref infmt) = options.input_format {
        println!("  Input Format: {}", infmt);
    }

    let input_path = PathBuf::from(&options.input_path);
    if !input_path.exists() {
        return Err(format!("Input file not found: {}", options.input_path));
    }

    let output_path = PathBuf::from(&options.output_path);
    let output_path_str = options.output_path;

    let output_format_enum = parse_output_format(&options.output_format)?;

    let mut pandoc = Pandoc::new();

    pandoc.set_input(InputKind::Files(vec![input_path]));

    // Restore input format setting logic
    if let Some(ref input_format_str) = options.input_format {
        if !input_format_str.eq_ignore_ascii_case("auto") {
            let input_format_enum = parse_input_format(input_format_str)?;
            pandoc.set_input_format(input_format_enum, vec![]);
            println!("Explicitly setting input format to: {}", input_format_str);
        } else {
            println!("Input format set to auto-detect.");
        }
    } else {
        println!("Input format not specified, using auto-detect.");
    }

    pandoc.set_output(OutputKind::File(output_path));
    pandoc.set_output_format(output_format_enum, vec![]);

    pandoc.add_option(PandocOption::Standalone);

    println!("Executing Pandoc conversion...");
    match pandoc.execute() {
        Ok(_) => {
            println!("Pandoc conversion successful.");
            Ok(format!("转换成功！输出已保存至: {}", output_path_str)) // Keep Chinese success message
        }
        Err(e) => {
            println!("Pandoc conversion failed: {:?}", e);
            Err(format!("Pandoc conversion failed: {}", e))
        }
    }
}

// New command for generating HTML preview
#[tauri::command]
fn preview_file(options: PreviewOptions) -> Result<String, String> {
    println!("Received preview request:");
    println!("  Input Path: {}", options.input_path);
    // Restore input format logging
    if let Some(ref infmt) = options.input_format {
        println!("  Input Format: {}", infmt);
    }

    let input_path = PathBuf::from(&options.input_path);
    if !input_path.exists() {
        return Err(format!("Input file not found: {}", options.input_path));
    }

    let mut pandoc = Pandoc::new();
    pandoc.set_input(InputKind::Files(vec![input_path]));

    // Restore input format setting logic
    if let Some(ref input_format_str) = options.input_format {
        if !input_format_str.eq_ignore_ascii_case("auto") {
            let input_format_enum = parse_input_format(input_format_str)?;
            pandoc.set_input_format(input_format_enum, vec![]);
            println!(
                "Preview: Explicitly setting input format to: {}",
                input_format_str
            );
        }
    }

    pandoc.set_output_format(OutputFormat::Html5, vec![]);
    pandoc.set_output(OutputKind::Pipe);
    pandoc.add_option(PandocOption::Standalone);

    println!("Executing Pandoc preview generation (HTML)...");
    match pandoc.execute() {
        Ok(pandoc_output) => {
            // Match the PandocOutput enum variant
            match pandoc_output {
                PandocOutput::ToBuffer(buffer) => {
                    println!("Pandoc preview generation successful.");
                    // Convert Vec<u8> buffer to String
                    String::from_utf8(buffer.into())
                        .map_err(|e| format!("Failed to decode preview output as UTF-8: {}", e))
                }
                _ => {
                    // Should not happen with OutputKind::Pipe
                    println!("Unexpected PandocOutput variant for Pipe.");
                    Err("Unexpected preview output type.".to_string())
                }
            }
        }
        Err(e) => {
            println!("Pandoc preview generation failed: {:?}", e);
            Err(format!("Pandoc preview generation failed: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Register both commands
        .invoke_handler(tauri::generate_handler![convert_file, preview_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
