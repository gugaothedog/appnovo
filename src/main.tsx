import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Script de compatibilidade de contingência em memória caso localStorage esteja bloqueado pelo iframe ou WebView
try {
  const testKey = "__local_storage_sandbox_test__";
  window.localStorage.setItem(testKey, "1");
  window.localStorage.removeItem(testKey);
} catch (e) {
  console.warn("Aviso: localStorage bloqueado pelas restrições de segurança do iframe. Ativando fallback em memória automático!", e);
  const memoryCache: Record<string, string> = {};
  const mockedStorage = {
    getItem: (key: string) => (key in memoryCache ? memoryCache[key] : null),
    setItem: (key: string, value: string) => { memoryCache[key] = String(value); },
    removeItem: (key: string) => { delete memoryCache[key]; },
    clear: () => { for (const k in memoryCache) delete memoryCache[k]; },
    key: (idx: number) => Object.keys(memoryCache)[idx] || null,
    get length() { return Object.keys(memoryCache).length; }
  };
  try {
    Object.defineProperty(window, "localStorage", {
      value: mockedStorage,
      writable: true,
      configurable: true
    });
  } catch (err) {
    console.error("Falha ao injetar polyfill de localStorage:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
