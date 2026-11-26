import { useUserStore } from "@/store/user.js";
import { useSettingStore } from "@/store/setting.js";
import { useAccountStore } from "@/store/account.js";
import { loginUserInfo } from "@/request/my.js";
import { permsToRouter } from "@/perm/perm.js";
import router from "@/router";
import { websiteConfig } from "@/request/setting.js";
import i18n from "@/i18n/index.js";

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    if (!settingStore.lang) {
        let lang = (navigator.language || '').split('-')[0];
        settingStore.lang = lang === 'zh' ? 'zh' : 'en';
    }

    i18n.global.locale.value = settingStore.lang;

    const applyConfig = (setting) => {
        if (!setting) return;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList || [];
        document.title = setting.title || 'Cloud Mail';
    };

    try {
        if (token) {
            const userPromise = loginUserInfo().catch(e => {
                console.error(e);
                return null;
            });
            const configPromise = websiteConfig().catch(e => {
                console.error(e);
                return null;
            });

            const [s, user] = await Promise.all([configPromise, userPromise]);
            applyConfig(s);

            if (user) {
                accountStore.currentAccountId = user.account?.accountId || 0;
                accountStore.currentAccount = user.account || {};
                userStore.user = user;

                const routers = permsToRouter(user.permKeys);
                routers.forEach(routerData => {
                    router.addRoute('layout', routerData);
                });
            } else {
                // Token 无效或拉取用户信息失败，清理坏状态避免页面卡死或 v-perm 异常
                localStorage.removeItem('token');
                userStore.user = { permKeys: [] };
            }
        } else {
            const setting = await websiteConfig().catch(e => {
                console.error(e);
                return null;
            });
            applyConfig(setting);
        }
    } catch (e) {
        console.error('Initialization failed:', e);
    }
}
