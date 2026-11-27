import { useUserStore } from "@/store/user.js";

export default {
    mounted(el, binding) {
        const userStore = useUserStore();
        const permKeys = userStore.user?.permKeys || [];
        const value = binding.value;

        if (permKeys.includes('*')) {
            return;
        }

        const hasPermission = Array.isArray(value)
            ? value.some(key => permKeys.includes(key))
            : permKeys.includes(value);

        if (!hasPermission) {
            el.parentNode && el.parentNode.removeChild(el);
        }
    }
};

export function hasPerm(permKey) {
    const permKeys = useUserStore().user?.permKeys || [];
    return permKeys.includes('*') || permKeys.includes(permKey);
}

export function permsToRouter(permKeys) {
    const keys = Array.isArray(permKeys) ? permKeys : [];
    const routerList = [];
    Object.keys(routers).forEach(perm => {
        if (keys.includes(perm) || keys.includes('*')) {
            routerList.push(...routers[perm]);
        }
    });
    return routerList;
}

export function clearDynamicRoutes(router) {
    Object.values(routers).flat().forEach(route => {
        if (route?.name && router.hasRoute(route.name)) {
            router.removeRoute(route.name);
        }
    });
}

export function syncDynamicRoutes(router, permKeys) {
    clearDynamicRoutes(router);
    permsToRouter(permKeys).forEach(routerData => {
        router.addRoute('layout', routerData);
    });
}

const routers = {
    'email:send': [
        {
            path: '/sent',
            name: 'send',
            component: () => import('@/views/send/index.vue'),
            meta: {
                title: 'sent',
                name: 'send',
                menu: true
            }
        },
        {
            path: '/drafts',
            name: 'draft',
            component: () => import('@/views/draft/index.vue'),
            meta: {
                title: 'drafts',
                name: 'draft',
                menu: true
            }
        }
    ],
    'setting:query': [{
        path: '/system-settings',
        name: 'sys-setting',
        component: () => import('@/views/sys-setting/index.vue'),
        meta: {
            title: 'SystemSettings',
            name: 'sys-setting',
            menu: true
        }
    }],
    'all-email:query': [{
        path: '/all-mail',
        name: 'all-email',
        component: () => import('@/views/all-email/index.vue'),
        meta: {
            title: 'allMail',
            name: 'all-email',
            menu: true
        }
    }],
    'analysis:query': [{
        path: '/dashboard',
        name: 'analysis',
        component: () => import('@/views/analysis/index.vue'),
        meta: {
            title: 'analytics',
            name: 'analysis',
            menu: true
        }
    }]
};
