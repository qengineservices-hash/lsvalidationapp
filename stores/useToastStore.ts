import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface ToastState {
  message: string | null;
  type: ToastType;
  isVisible: boolean;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: "success",
  isVisible: false,
  showToast: (message, type = "success") => {
    set({ message, type, isVisible: true });
    setTimeout(() => {
      set({ isVisible: false });
    }, 4000);
  },
  hideToast: () => set({ isVisible: false }),
}));
