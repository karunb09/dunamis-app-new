import { useEffect, useState } from "react";

export default function usePersistedState(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            /* storage unavailable */
        }
    }, [key, value]);

    return [value, setValue];
}
