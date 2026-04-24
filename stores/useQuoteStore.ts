import { create } from "zustand";

export interface Quote {
  id: string;
  quote_number: string;
  validation_request_id: string;
  project_id: string;
  city_id: string; // Adjusted to string
  stage: string;
  status: string;
  mrc_subtotal: number;
  non_mrc_subtotal: number;
  total: number;
  non_mrc_percentage: number;
  vm_id: string;
  created_by: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  room_name: string;
  elevation_code?: string;
  service_on?: string;
  item_type: "mrc" | "non_mrc";
  mrc_item_id?: string;
  item_name: string;
  description?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  remarks?: string;
  is_auto_calculated: boolean;
  display_order: number;
}

interface QuoteState {
  currentQuote: Quote | null;
  lineItems: QuoteLineItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchQuote: (quoteId: string) => Promise<void>;
  addLineItem: (item: Partial<QuoteLineItem>) => Promise<void>;
  updateLineItem: (itemId: string, updates: Partial<QuoteLineItem>) => Promise<void>;
  deleteLineItem: (itemId: string) => Promise<void>;
  submitForReview: (quoteId: string) => Promise<void>;
  
  // Local optimistic update without immediate DB sync (for debounce)
  optimisticUpdateLineItem: (itemId: string, updates: Partial<QuoteLineItem>) => void;
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  currentQuote: null,
  lineItems: [],
  loading: false,
  error: null,

  fetchQuote: async (quoteId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/quotation/${quoteId}`);
      if (!res.ok) throw new Error("Failed to load quote");
      const data = await res.json();
      set({ currentQuote: data.quote, lineItems: data.lineItems });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addLineItem: async (item: Partial<QuoteLineItem>) => {
    try {
      const res = await fetch("/api/quotation/line-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const newItem = await res.json();
      
      // Update local state and trigger a refetch of the quote to get updated totals from DB triggers
      set((state) => ({ lineItems: [...state.lineItems, newItem] }));
      
      if (newItem.quote_id) {
         // Auto-fetch to sync totals from backend trigger
         get().fetchQuote(newItem.quote_id);
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  optimisticUpdateLineItem: (itemId, updates) => {
    set((state) => ({
      lineItems: state.lineItems.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          // Optimistically calculate amount
          if (updates.quantity !== undefined || updates.unit_price !== undefined) {
             updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.unit_price || 0);
          }
          return updatedItem;
        }
        return item;
      })
    }));
  },

  updateLineItem: async (itemId: string, updates: Partial<QuoteLineItem>) => {
    try {
      // Set optimistically first
      get().optimisticUpdateLineItem(itemId, updates);

      const res = await fetch(`/api/quotation/line-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error("Failed to update item");
      const updatedItem = await res.json();

      if (updatedItem.quote_id && (updates.quantity !== undefined || updates.unit_price !== undefined)) {
         get().fetchQuote(updatedItem.quote_id);
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  deleteLineItem: async (itemId: string) => {
    try {
      const itemToDelete = get().lineItems.find(i => i.id === itemId);
      
      set((state) => ({
        lineItems: state.lineItems.filter((item) => item.id !== itemId),
      }));

      const res = await fetch(`/api/quotation/line-items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");

      if (itemToDelete?.quote_id) {
         get().fetchQuote(itemToDelete.quote_id);
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  submitForReview: async (quoteId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/quotation/${quoteId}/submit-for-review`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to submit");
      const updatedQuote = await res.json();
      set({ currentQuote: updatedQuote });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  }
}));
