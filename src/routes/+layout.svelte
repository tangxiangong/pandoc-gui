<script lang="ts">
    // SvelteKit root layout
    // This wraps all pages in the application
</script>

<main>
    <slot />
</main>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        padding: 0;
    }

    :global(#app) {
        height: 100vh;
        width: 100vw;
    }

    main {
        height: 100%;
        width: 100%;
    }
</style>
