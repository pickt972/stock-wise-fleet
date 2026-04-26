import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "sidebar:collapsed";
const EVENT_NAME = "sidebar-collapsed-change";

function read(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(() => read());

  useEffect(() => {
    const handler = () => setCollapsedState(read());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [collapsed, setCollapsed];
}
