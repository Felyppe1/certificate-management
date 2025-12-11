import { create } from 'zustand'

interface CertificatesStore {
    inputValue: string
    setInputValue: (inputValue: string) => void
}

export const useCertificatesStore = create<CertificatesStore>(set => ({
    inputValue: '',

    setInputValue: (inputValue: string) => set(() => ({ inputValue })),
}))
