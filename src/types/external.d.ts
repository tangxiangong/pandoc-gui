declare module "cherry-markdown" {
  export interface CherryOptions {
    id: string;
    value?: string;
    editor?: {
      defaultModel?: "edit&preview" | "editOnly" | "previewOnly";
    };
    toolbars?: {
      theme?: "light" | "dark";
      toolbar?: string[];
    };
    engine?: {
      syntax?: {
        codeBlock?: {
          theme?: string;
        };
        table?: {
          enableChart?: boolean;
        };
        mathBlock?: {
          engine?: "MathJax" | "KaTeX";
          src?: string;
        };
        inlineMath?: {
          engine?: "MathJax" | "KaTeX";
        };
      };
    };
    callback?: {
      afterChange?: (markdown: string, html: string) => void;
    };
  }

  export default class Cherry {
    constructor(options: CherryOptions);
    getMarkdown(): string;
    setMarkdown(content: string): void;
    destroy(): void;
    refresh(): void;
    static usePlugin(plugin: any, options?: any): void;
  }
}

declare module "cherry-markdown/dist/cherry-markdown.min.css" {
  const content: string;
  export default content;
}

declare module "mermaid" {
  export interface MermaidConfig {
    startOnLoad?: boolean;
    theme?: "default" | "dark" | "forest" | "neutral";
    themeVariables?: Record<string, string>;
  }

  export function initialize(config: MermaidConfig): void;
  export function render(
    id: string,
    definition: string,
  ): Promise<{ svg: string }>;
}

// MathJax types
declare global {
  interface Window {
    MathJax: {
      tex: {
        inlineMath: string[][];
        displayMath: string[][];
      };
      svg: {
        fontCache: string;
      };
      startup: {
        ready: () => void;
        defaultReady: () => void;
      };
    };
  }
}

// Mathjax module declaration
declare module "mathjax/es5/tex-svg.js" {
  const content: any;
  export default content;
}
