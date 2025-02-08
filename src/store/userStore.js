import { create } from "zustand";

export const useUser = create((set) => ({
  user: null,
  // Set the user object
  setUser: (value) => set(() => ({ user: value })),
}));
