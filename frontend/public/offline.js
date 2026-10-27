try {
    const dark = localStorage.getItem('minhas-financas.theme') === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151f33' : '#ffffff';
} catch { /* The connection message also works when storage is unavailable. */ }
