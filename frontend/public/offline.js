try {
    const dark = localStorage.getItem("minhas-financas.theme") === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]').content = dark
        ? "#0b1221"
        : "#f6f9ff";
} catch {
    /* The connection message also works when storage is unavailable. */
}
