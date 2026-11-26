import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => ({
        accountShow: false,
        writerRef: null,
        dark: false,
        auroraTheme: 'arctic',
    }),
    persist: {
        pick: ['accountShow', 'dark', 'auroraTheme'],
    },
})
