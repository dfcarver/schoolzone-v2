"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (text: string, type?: ToastMessage["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

let globalNextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: ToastMessage["type"] = "info") => {
    const id = ++globalNextId;
    setMessages((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {messages.map((msg) => (
          <ToastItem key={msg.id} message={msg} onDismiss={() => setMessages((p) => p.filter((m) => m.id !== msg.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const bg =
    message.type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : message.type === "error"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-sm text-sm animate-in slide-in-from-right ${bg}`}
    >
      <span className="flex-1">{message.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-xs">
        ✕
      </button>
    </div>
  );
}
