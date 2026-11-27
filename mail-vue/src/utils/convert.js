import {useSettingStore} from "@/store/setting.js";
export function cvtR2Url(key) {

    if (!key) {
        return ''
    }

    if (key.startsWith('https://') || key.startsWith('http://') || key.startsWith('/')) {
        return key
    }

    const { settings } = useSettingStore();

    let domain = toOssDomain(settings.r2Domain)

    // No public CDN domain: serve via this site's /attachments|/static|/oss proxy
    if (!domain) {
        return '/' + String(key).replace(/^\//, '')
    }

    return domain + '/' + String(key).replace(/^\//, '')
}

export function toOssDomain(domain) {

    if (!domain || typeof domain !== 'string') {
        return ''
    }

    let normalized = domain.trim()
    if (!normalized) {
        return ''
    }

    if (!/^https?:\/\//i.test(normalized)) {
        normalized = 'https://' + normalized
    }

    return normalized.replace(/\/+$/, '')
}
