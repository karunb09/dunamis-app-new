// Lightweight navigation history backed by localStorage.
// Survives full page reloads (where the in-memory router history is lost),
// so a "Back" control can still return the user to the previous screen.

const KEY = "dunamis_nav_history";
const MAX_ENTRIES = 25;

const read = () => {
    try {
        const raw = window.localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const write = (entries) => {
    try {
        window.localStorage.setItem(
            KEY,
            JSON.stringify(entries.slice(-MAX_ENTRIES))
        );
    } catch {
        /* ignore quota / serialization errors */
    }
};

export const getHistory = () => {
    if (typeof window === "undefined") return [];
    return read();
};

// Record a visited path. Consecutive duplicates are ignored.
export const pushPath = (path) => {
    if (typeof window === "undefined" || !path) return;
    const history = read();
    if (history[history.length - 1] === path) return;
    history.push(path);
    write(history);
};

// Pop the current entry and return the previous path (or null).
export const goBackPath = () => {
    if (typeof window === "undefined") return null;
    const history = read();
    history.pop(); // drop current
    const previous = history[history.length - 1] || null;
    write(history);
    return previous;
};

export const clearHistory = () => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
};
