// Эмулятор VK Bridge для тестирования вне VK
if (typeof VK === 'undefined') {
    window.VK = {
        init: function(callback) {
            console.log('VK Bridge инициализирован');
            if (callback) callback();
        },
        
        call: function(method, params) {
            console.log('VK Call:', method, params);
            
            return new Promise((resolve, reject) => {
                // Эмуляция ответов VK API
                switch (method) {
                    case 'storage.get':
                        const stored = JSON.parse(localStorage.getItem('vk_storage') || '{}');
                        const result = {};
                        if (params.keys) {
                            params.keys.forEach(key => {
                                result[key] = stored[key] || null;
                            });
                        }
                        resolve(result);
                        break;
                        
                    case 'storage.set':
                        const current = JSON.parse(localStorage.getItem('vk_storage') || '{}');
                        Object.assign(current, params);
                        localStorage.setItem('vk_storage', JSON.stringify(current));
                        resolve({ result: true });
                        break;
                        
                    case 'showLeaderboardBox':
                        alert(`Рейтинг друзей\nВаш результат: $${params.user_result}`);
                        resolve({});
                        break;
                        
                    case 'wall.post':
                        alert('Результат опубликован на вашей стене!');
                        resolve({});
                        break;
                        
                    default:
                        resolve({});
                }
            });
        }
    };
}
