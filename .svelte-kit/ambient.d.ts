
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const NVM_INC: string;
	export const LDFLAGS: string;
	export const STARSHIP_SHELL: string;
	export const TERM_PROGRAM: string;
	export const npm_package_scripts_tauri: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const NVM_CD_FLAGS: string;
	export const npm_config_version_git_tag: string;
	export const npm_package_devDependencies_typescript: string;
	export const SHELL: string;
	export const TERM: string;
	export const npm_package_devDependencies_vite: string;
	export const CPPFLAGS: string;
	export const HOMEBREW_REPOSITORY: string;
	export const TMPDIR: string;
	export const npm_package_dependencies_mathjax: string;
	export const npm_config_init_license: string;
	export const npm_config_global_prefix: string;
	export const TERM_PROGRAM_VERSION: string;
	export const npm_package_dependencies_cherry_markdown: string;
	export const WINDOWID: string;
	export const npm_package_scripts_dev: string;
	export const TAURI_CLI_VERBOSITY: string;
	export const TAURI_ENV_DEBUG: string;
	export const TERM_SESSION_ID: string;
	export const npm_package_dependencies__tauri_apps_api: string;
	export const COLOR: string;
	export const npm_config_registry: string;
	export const npm_package_devDependencies__sveltejs_kit: string;
	export const npm_package_private: string;
	export const npm_config_noproxy: string;
	export const ZSH: string;
	export const npm_config_local_prefix: string;
	export const npm_package_readmeFilename: string;
	export const NVM_DIR: string;
	export const USER: string;
	export const npm_package_description: string;
	export const LS_COLORS: string;
	export const TAURI_ENV_TARGET_TRIPLE: string;
	export const npm_package_license: string;
	export const npm_package_scripts_check_watch: string;
	export const COMMAND_MODE: string;
	export const npm_package_devDependencies__sveltejs_adapter_static: string;
	export const npm_config_globalconfig: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const TERM_FEATURES: string;
	export const npm_execpath: string;
	export const GOOGLE_CLOUD_PROJECT: string;
	export const PAGER: string;
	export const TAURI_ENV_PLATFORM: string;
	export const LSCOLORS: string;
	export const ZED_ENVIRONMENT: string;
	export const PATH: string;
	export const TERMINFO_DIRS: string;
	export const npm_config_argv: string;
	export const LaunchInstanceID: string;
	export const _: string;
	export const npm_package_json: string;
	export const TAURI_ENV_FAMILY: string;
	export const TAURI_ENV_PLATFORM_VERSION: string;
	export const __CFBundleIdentifier: string;
	export const npm_config_init_module: string;
	export const npm_config_userconfig: string;
	export const PWD: string;
	export const npm_command: string;
	export const npm_package_scripts_preview: string;
	export const npm_lifecycle_event: string;
	export const EDITOR: string;
	export const LANG: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_devDependencies__tsconfig_svelte: string;
	export const npm_package_name: string;
	export const ITERM_PROFILE: string;
	export const npm_config_version_commit_hooks: string;
	export const npm_package_dependencies_mermaid: string;
	export const npm_package_scripts_build: string;
	export const XPC_FLAGS: string;
	export const npm_config_npm_version: string;
	export const TAURI_ENV_ARCH: string;
	export const npm_config_bin_links: string;
	export const npm_config_node_gyp: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_package_version: string;
	export const npm_package_devDependencies_svelte_check: string;
	export const COLORFGBG: string;
	export const HOME: string;
	export const SHLVL: string;
	export const npm_package_type: string;
	export const ANTHROPIC_BASE_URL: string;
	export const LC_TERMINAL_VERSION: string;
	export const npm_config_save_prefix: string;
	export const npm_config_strict_ssl: string;
	export const HOMEBREW_PREFIX: string;
	export const npm_config_version_git_message: string;
	export const npm_package_dependencies__tauri_apps_plugin_opener: string;
	export const npm_package_dependencies_echarts: string;
	export const ITERM_SESSION_ID: string;
	export const ANTHROPIC_AUTH_TOKEN: string;
	export const LESS: string;
	export const LOGNAME: string;
	export const MACOSX_DEPLOYMENT_TARGET: string;
	export const STARSHIP_SESSION_KEY: string;
	export const YARN_WRAP_OUTPUT: string;
	export const npm_config_cache: string;
	export const ALACRITTY_WINDOW_ID: string;
	export const npm_lifecycle_script: string;
	export const npm_package_dependencies_svelte: string;
	export const npm_package_devDependencies__tauri_apps_cli: string;
	export const ZED_TERM: string;
	export const BUN_INSTALL: string;
	export const NVM_BIN: string;
	export const PKG_CONFIG_PATH: string;
	export const npm_config_ignore_scripts: string;
	export const npm_config_user_agent: string;
	export const npm_config_version_git_sign: string;
	export const HOMEBREW_CELLAR: string;
	export const INFOPATH: string;
	export const npm_package_dependencies__tauri_apps_plugin_dialog: string;
	export const LC_TERMINAL: string;
	export const GITHUB_PERSONAL_ACCESS_TOKEN: string;
	export const OSLogRateLimit: string;
	export const npm_config_ignore_optional: string;
	export const npm_config_init_version: string;
	export const SECURITYSESSIONID: string;
	export const npm_package_scripts_check: string;
	export const COLORTERM: string;
	export const npm_config_version_tag_prefix: string;
	export const npm_node_execpath: string;
	export const npm_config_prefix: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		NVM_INC: string;
		LDFLAGS: string;
		STARSHIP_SHELL: string;
		TERM_PROGRAM: string;
		npm_package_scripts_tauri: string;
		NODE: string;
		INIT_CWD: string;
		NVM_CD_FLAGS: string;
		npm_config_version_git_tag: string;
		npm_package_devDependencies_typescript: string;
		SHELL: string;
		TERM: string;
		npm_package_devDependencies_vite: string;
		CPPFLAGS: string;
		HOMEBREW_REPOSITORY: string;
		TMPDIR: string;
		npm_package_dependencies_mathjax: string;
		npm_config_init_license: string;
		npm_config_global_prefix: string;
		TERM_PROGRAM_VERSION: string;
		npm_package_dependencies_cherry_markdown: string;
		WINDOWID: string;
		npm_package_scripts_dev: string;
		TAURI_CLI_VERBOSITY: string;
		TAURI_ENV_DEBUG: string;
		TERM_SESSION_ID: string;
		npm_package_dependencies__tauri_apps_api: string;
		COLOR: string;
		npm_config_registry: string;
		npm_package_devDependencies__sveltejs_kit: string;
		npm_package_private: string;
		npm_config_noproxy: string;
		ZSH: string;
		npm_config_local_prefix: string;
		npm_package_readmeFilename: string;
		NVM_DIR: string;
		USER: string;
		npm_package_description: string;
		LS_COLORS: string;
		TAURI_ENV_TARGET_TRIPLE: string;
		npm_package_license: string;
		npm_package_scripts_check_watch: string;
		COMMAND_MODE: string;
		npm_package_devDependencies__sveltejs_adapter_static: string;
		npm_config_globalconfig: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		TERM_FEATURES: string;
		npm_execpath: string;
		GOOGLE_CLOUD_PROJECT: string;
		PAGER: string;
		TAURI_ENV_PLATFORM: string;
		LSCOLORS: string;
		ZED_ENVIRONMENT: string;
		PATH: string;
		TERMINFO_DIRS: string;
		npm_config_argv: string;
		LaunchInstanceID: string;
		_: string;
		npm_package_json: string;
		TAURI_ENV_FAMILY: string;
		TAURI_ENV_PLATFORM_VERSION: string;
		__CFBundleIdentifier: string;
		npm_config_init_module: string;
		npm_config_userconfig: string;
		PWD: string;
		npm_command: string;
		npm_package_scripts_preview: string;
		npm_lifecycle_event: string;
		EDITOR: string;
		LANG: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_devDependencies__tsconfig_svelte: string;
		npm_package_name: string;
		ITERM_PROFILE: string;
		npm_config_version_commit_hooks: string;
		npm_package_dependencies_mermaid: string;
		npm_package_scripts_build: string;
		XPC_FLAGS: string;
		npm_config_npm_version: string;
		TAURI_ENV_ARCH: string;
		npm_config_bin_links: string;
		npm_config_node_gyp: string;
		XPC_SERVICE_NAME: string;
		npm_package_version: string;
		npm_package_devDependencies_svelte_check: string;
		COLORFGBG: string;
		HOME: string;
		SHLVL: string;
		npm_package_type: string;
		ANTHROPIC_BASE_URL: string;
		LC_TERMINAL_VERSION: string;
		npm_config_save_prefix: string;
		npm_config_strict_ssl: string;
		HOMEBREW_PREFIX: string;
		npm_config_version_git_message: string;
		npm_package_dependencies__tauri_apps_plugin_opener: string;
		npm_package_dependencies_echarts: string;
		ITERM_SESSION_ID: string;
		ANTHROPIC_AUTH_TOKEN: string;
		LESS: string;
		LOGNAME: string;
		MACOSX_DEPLOYMENT_TARGET: string;
		STARSHIP_SESSION_KEY: string;
		YARN_WRAP_OUTPUT: string;
		npm_config_cache: string;
		ALACRITTY_WINDOW_ID: string;
		npm_lifecycle_script: string;
		npm_package_dependencies_svelte: string;
		npm_package_devDependencies__tauri_apps_cli: string;
		ZED_TERM: string;
		BUN_INSTALL: string;
		NVM_BIN: string;
		PKG_CONFIG_PATH: string;
		npm_config_ignore_scripts: string;
		npm_config_user_agent: string;
		npm_config_version_git_sign: string;
		HOMEBREW_CELLAR: string;
		INFOPATH: string;
		npm_package_dependencies__tauri_apps_plugin_dialog: string;
		LC_TERMINAL: string;
		GITHUB_PERSONAL_ACCESS_TOKEN: string;
		OSLogRateLimit: string;
		npm_config_ignore_optional: string;
		npm_config_init_version: string;
		SECURITYSESSIONID: string;
		npm_package_scripts_check: string;
		COLORTERM: string;
		npm_config_version_tag_prefix: string;
		npm_node_execpath: string;
		npm_config_prefix: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
