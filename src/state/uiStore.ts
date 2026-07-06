import { create } from "zustand";

interface UiState {
  detailTxId: string | null;
  statementCustomerId: string | null;
  withdrawalsCustomerId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  openStatement: (customerId: string) => void;
  closeStatement: () => void;
  openWithdrawals: (customerId: string) => void;
  closeWithdrawals: () => void;
}

export const useUi = create<UiState>((set) => ({
  detailTxId: null,
  statementCustomerId: null,
  withdrawalsCustomerId: null,
  openDetail: (id) => set({ detailTxId: id }),
  closeDetail: () => set({ detailTxId: null }),
  openStatement: (customerId) => set({ statementCustomerId: customerId }),
  closeStatement: () => set({ statementCustomerId: null }),
  openWithdrawals: (customerId) => set({ withdrawalsCustomerId: customerId }),
  closeWithdrawals: () => set({ withdrawalsCustomerId: null }),
}));
