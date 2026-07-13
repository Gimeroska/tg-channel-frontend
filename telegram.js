// telegram.js - Сначала бот, потом прокси
(function() {
    // 👇 ЭТО АДРЕС ТВОЕГО СЕРВЕРА (сейчас локальный, потом поменяешь)
    const BACKEND_URL = 'https://tg-channel-backend.onrender.com/api/subscribers';

    // Запасные прокси (если бот не сработал)
    const proxies = [
        (ch) => `https://api.allorigins.win/get?url=${encodeURIComponent('https://t.me/s/' + ch)}`,
        (ch) => `https://corsproxy.io/?url=${encodeURIComponent('https://t.me/s/' + ch)}`,
        (ch) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://t.me/s/' + ch)}`
    ];

    // Функция, которая пробует сначала бота
    async function getStats(channel) {
        // 1. Пытаемся через бота (твой сервер)
        try {
            const resp = await fetch(`${BACKEND_URL}?channel=${encodeURIComponent(channel)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data.subscribers && data.subscribers > 0) {
                    return data.subscribers; // Успех!
                }
            }
        } catch (e) {
            console.log('Бот не сработал, пробуем прокси...');
        }

        // 2. Если бот не сработал, идём через прокси
        for (let proxy of proxies) {
            try {
                const url = proxy(channel);
                const res = await fetch(url);
                if (!res.ok) continue;
                
                const data = await res.json();
                let html = data.contents || data || '';
                if (typeof html === 'object') html = JSON.stringify(html);
                
                // Ищем "подписчики" или "subscribers"
                const match = html.match(/([\d\s]+)\s*(?:subscribers?|подписчиков?|подписчик)/i);
                if (match) {
                    const num = parseInt(match[1].replace(/\s/g, ''));
                    if (num > 0) return num;
                }
            } catch (e) {}
        }

        return null; // Ничего не вышло
    }

    // Запускаем для всех элементов на странице
    document.querySelectorAll('.telegram-stats').forEach(async (el) => {
        const channel = el.getAttribute('data-channel');
        if (!channel) {
            el.textContent = 'error';
            return;
        }

        const count = await getStats(channel);
        if (count !== null && count > 0) {
            el.textContent = count.toLocaleString('ru-RU');
        } else {
            el.textContent = 'error';
        }
    });
})();


document.addEventListener('DOMContentLoaded', function() {
    // Определяем, мобильное ли устройство
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    document.querySelectorAll('.tg-img').forEach(img => {
        let src = img.getAttribute('src');
        if (!src || !src.includes('t.me/i/userpic')) return;

        if (isMobile) {
            // На телефонах – через прокси (обход блокировки)
            src = 'https://images.weserv.nl/?url=' + encodeURIComponent(src);
            // Сбрасываем кэш раз в день (чтобы не грузить сеть)
            const dayStamp = Math.floor(Date.now() / 86400000);
            img.src = src + '&v=' + dayStamp;
        } else {
            // На ПК – прямая ссылка, но с кэшем раз в день (чтобы обновлять аватарки, если поменяются)
            const dayStamp = Math.floor(Date.now() / 86400000);
            img.src = src + (src.includes('?') ? '&' : '?') + 'v=' + dayStamp;
        }
    });
});
