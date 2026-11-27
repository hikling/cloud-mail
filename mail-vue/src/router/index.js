import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress';
import { useUiStore } from "@/store/ui.js";
import { clearClientSession } from "@/utils/session.js";
import { clearDynamicRoutes } from "@/perm/perm.js";

const routes = [
    {
        path: '/',
        name: 'layout',
        redirect: '/inbox',
        component: () => import('@/layout/index.vue'),
        children: [
            {
                path: '/inbox',
                name: 'email',
                component: () => import('@/views/email/index.vue'),
                meta: {
                    title: 'inbox',
                    name: 'email',
                    menu: true
                }
            },
            {
                path: '/:mailbox(inbox|starred|sent|all-mail)/messages',
                name: 'content',
                component: () => import('@/views/content/index.vue'),
                meta: {
                    title: 'message',
                    name: 'content',
                    menu: false
                }
            },
            {
                path: '/settings',
                name: 'setting',
                component: () => import('@/views/setting/index.vue'),
                meta: {
                    title: 'settings',
                    name: 'setting',
                    menu: true
                }
            },
            {
                path: '/starred',
                name: 'star',
                component: () => import('@/views/star/index.vue'),
                meta: {
                    title: 'starred',
                    name: 'star',
                    menu: true
                }
            },
        ]

    },
    {
        path: '/messages',
        redirect: '/inbox/messages'
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/login/index.vue')
    },
    {
        path: '/:pathMatch(.*)*',
        name: '404',
        component: () => import('@/views/404/index.vue')
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

NProgress.configure({
    showSpinner: false,
    trickleSpeed: 50,
    minimum: 0.1
});

let timer
let first = true

// 跨标签页同步退出登录状态，避免旧标签页残留前账号数据
window.addEventListener('storage', (event) => {
    if (event.key === 'token' && !event.newValue && localStorage.getItem('token') === null) {
        clearClientSession()
        clearDynamicRoutes(router)
        if (router.currentRoute.value.name !== 'login') {
            router.replace({ name: 'login' })
        }
    }
})

router.beforeEach((to, from, next) => {

    if (timer) {
        clearTimeout(timer)
    }

    if (!first) {
        timer = setTimeout(() => {
            NProgress.start()
        }, 100)
    }

    const token = localStorage.getItem('token')
    const isLoginRoute = to.name === 'login' || to.path === '/login'

    if (!token) {
        clearDynamicRoutes(router)
    }

    if (!token && !isLoginRoute) {
        return next({ name: 'login' })
    }

    if (!token && isLoginRoute) {
        return next()
    }

    if (token && isLoginRoute) {
        const fromIsLogin = from.name === 'login' || from.path === '/login'
        return next(from.path && !fromIsLogin ? from.path : '/')
    }

    next()

})

router.afterEach((to) => {

    clearTimeout(timer)
    if (first) {
        removeLoading()
    } else {
        NProgress.done();
    }

    const uiStore = useUiStore()
    if (to.meta.menu) {
        if (['content', 'email', 'send'].includes(to.meta.name)) {
            uiStore.accountShow = window.innerWidth > 767;
        } else {
            uiStore.accountShow = false
        }
    }

    first = false
})

function removeLoading() {
    const doc = document.getElementById('loading-first');
    if (!doc) {
        return;
    }

    doc.remove()
}

export default router
