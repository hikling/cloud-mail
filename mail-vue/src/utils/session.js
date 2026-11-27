import { useEmailStore } from '@/store/email.js'
import { useAccountStore } from '@/store/account.js'
import { useUserStore } from '@/store/user.js'
import { useAllEmailStore } from '@/store/all-email.js'
import { useSendStore } from '@/store/send.js'
import { useWriterStore } from '@/store/writer.js'
import { userDraftStore } from '@/store/draft.js'
import { allEmailWs, inboxWs } from '@/websocket/client.js'

export function clearClientSession() {
    inboxWs.stopAll?.()
    allEmailWs.stopAll?.()
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    sessionStorage.removeItem('oauthState')
    sessionStorage.removeItem('oauthProvider')
    useEmailStore().resetSession()
    const accountStore = useAccountStore()
    accountStore.currentAccountId = 0
    accountStore.currentAccount = {}
    accountStore.changeUserAccountName = ''
    useUserStore().user = { permKeys: [] }
    useWriterStore().sendRecipientRecord = []
    const draftStore = userDraftStore()
    draftStore.refreshList = 0
    draftStore.setDraft = {}
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
