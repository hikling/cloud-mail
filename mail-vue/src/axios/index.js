import axios from "axios";
import router from "@/router";
import i18n from "@/i18n/index.js";
import { useSettingStore } from "@/store/setting.js";
import { clearClientSession } from "@/utils/session.js";
import { clearDynamicRoutes } from "@/perm/perm.js";

let http = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    timeout: 20000
});

http.interceptors.request.use(config => {
    const { lang } = useSettingStore();
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = token;
    } else {
        delete config.headers.Authorization;
    }
    config.headers['accept-language'] = lang;
    return config;
});

function formatServerMessage(msg) {
    return String(msg || '').replace(/<br\s*\/?>/gi, ' · ');
}

http.interceptors.response.use(
    (res) => {
        return new Promise((resolve, reject) => {
            const noMsg = res.config?.noMsg;
            const data = res.data;

            if (noMsg) {
                data.code === 200 ? resolve(data.data) : reject(data);
                return;
            }

            if (data.code === 401) {
                ElMessage({
                    message: data.message,
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                });
                clearClientSession();
                clearDynamicRoutes(router);
                if (router.currentRoute.value.name !== 'login') {
                    router.replace('/login');
                }
                reject(data);
                return;
            }

            if (data.code === 403) {
                ElMessage({
                    message: data.message,
                    type: 'warning',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                });
                reject(data);
                return;
            }

            if (data.code === 502) {
                ElMessage({
                    message: formatServerMessage(data.message),
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                });
                reject(data);
                return;
            }

            if (data.code !== 200) {
                ElMessage({
                    message: data.message,
                    type: 'error',
                    plain: true,
                    grouping: true,
                    repeatNum: -4,
                });
                reject(data);
                return;
            }

            resolve(data.data);
        });
    },
    (error) => {
        const noMsg = error?.config?.noMsg;

        if (noMsg) {
            return Promise.reject(error);
        }

        if (error?.response?.status === 403 || error?.status === 403) {
            ElMessage({
                message: i18n.global.t('serverBusyErrorMsg'),
                type: 'warning',
                plain: true,
                grouping: true,
                repeatNum: -4,
            });
            return Promise.reject(error);
        }

        if (error?.message?.includes('Network Error')) {
            ElMessage({
                message: i18n.global.t('networkErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            });
        } else if (error?.code === 'ECONNABORTED') {
            ElMessage({
                message: i18n.global.t('timeoutErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true
            });
        } else if (error?.response) {
            ElMessage({
                message: i18n.global.t('serverBusyErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            });
        } else {
            ElMessage({
                message: i18n.global.t('reqFailErrorMsg'),
                type: 'error',
                plain: true,
                grouping: true,
                repeatNum: -4,
            });
        }
        return Promise.reject(error);
    }
);

export default http;
