import { create } from "zustand";

interface UiState {
  sendMoneyOpen: boolean;
  detailTxId: string | null;
  statementCustomerId: string | null;
  openSendMoney: () => void;
  closeSendMoney: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  openStatement: (customerId: string) => void;
  closeStatement: () => void;
}

export const useUi = create<UiState>((set) => ({
  sendMoneyOpen: false,
  detailTxId: null,
  statementCustomerId: null,
  openSendMoney: () => set({ sendMoneyOpen: true }),
  closeSendMoney: () => set({ sendMoneyOpen: false }),
  openDetail: (id) => set({ detailTxId: id }),
  closeDetail: () => set({ detailTxId: null }),
  openStatement: (customerId) => set({ statementCustomerId: customerId }),
  closeStatement: () => set({ statementCustomerId: null }),
}));
