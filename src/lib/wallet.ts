import { useEffect, useState } from "react";

const KEY = "zenkai:wallet";
const EVENT = "zenkai:wallet-change";

export function getWallet(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function connectWallet(name: string) {
  window.localStorage.setItem(KEY, name);
  window.dispatchEvent(new Event(EVENT));
}

export function disconnectWallet() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Returns the connected wallet name, or null. `ready` is false until hydrated. */
export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setWallet(getWallet());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { wallet, connected: Boolean(wallet), ready };
}
