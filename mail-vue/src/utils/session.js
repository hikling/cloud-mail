import { useEmailStore } from '@/store/email.js'
import { useAccountStore } from '@/store/account.js'
import { useUserStore } from '@/store/user.js'
import { useAllEmailStore } from '@/store/all-email.js'
import { useSendStore } from '@/store/send.js'
import { allEmailWs, inboxWs } from '@/websocket/client.js'

export function clearClientSession() {
    inboxWs.stopAll?.()
    allEmailWs.stopAll?.()
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    useEmailStore().resetSession()
    const accountStore = useAccountStore()
    accountStore.currentAccountId = 0
    accountStore.currentAccount = {}
    accountStore.changeUserAccountName = ''
    useUserStore().user = { permKeys: [] }
    useAllEmailStore().setSearchParams({
        text: '',
        type: 'subject',
        startDate: '',
        endDate: '',
        status: 'all',
    })
    useSendStore().setSearchParams({
        text: '',
        type: 'subject',
        startDate: '',
        endDate: '',
    })
}
