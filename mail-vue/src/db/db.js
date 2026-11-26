import Dexie from "dexie";
import { useUserStore } from "@/store/user.js";
import { watch, shallowRef } from "vue";

const userStore = useUserStore();
let db = shallowRef(null);

function createDB(email) {
    if (db.value?.close) {
        db.value.close();
    }
    if (!email) {
        db.value = null;
        return;
    }
    const instance = new Dexie(email);
    instance.version(1).stores({
        draft: '++draftId,createTime',
        att: 'draftId'
    });
    db.value = instance;
}

createDB(userStore.user?.email);

watch(() => userStore.user?.email, (email) => createDB(email));

export default db;
