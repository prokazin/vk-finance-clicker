class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.balance = 1000;
        this.ownedCoins = 0;
        this.currentPrice = 100;
        this.priceHistory = [];
        this.isHolding = false;
        this.buyPrice = 0;
    }

    init() {
        // Загружаем сохраненные данные
        this.loadGameData();
    }

    create() {
        // Создаем график
        this.createChart();
        
        // Создаем UI
        this.createUI();
        
        // Запускаем изменение цены
        this.time.addEvent({
            delay: 100,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    createChart() {
        // Инициализируем историю цен
        for (let i = 0; i < 100; i++) {
            this.priceHistory.push(this.currentPrice);
        }

        // Создаем график
        this.chart = this.add.graphics();
        this.updateChart();
    }

    createUI() {
        // Создаем элементы UI поверх игры
        const uiContainer = document.createElement('div');
        uiContainer.className = 'ui-overlay';
        
        // Баланс
        const balanceDiv = document.createElement('div');
        balanceDiv.className = 'balance';
        balanceDiv.innerHTML = `
            <div class="balance-amount">$${this.balance.toFixed(2)}</div>
            <div class="balance-change" id="balanceChange"></div>
        `;
        uiContainer.appendChild(balanceDiv);

        // Кнопки управления
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls';
        controlsDiv.innerHTML = `
            <button class="btn btn-buy" id="buyBtn">КУПИТЬ</button>
            <button class="btn btn-sell" id="sellBtn" disabled>ПРОДАТЬ</button>
        `;
        uiContainer.appendChild(controlsDiv);

        // Кнопка рейтинга
        const leaderboardBtn = document.createElement('button');
        leaderboardBtn.className = 'leaderboard-btn';
        leaderboardBtn.innerHTML = '🏆';
        leaderboardBtn.onclick = () => this.showLeaderboard();
        uiContainer.appendChild(leaderboardBtn);

        // Кнопка поделиться
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.innerHTML = '📤';
        shareBtn.onclick = () => this.shareResult();
        uiContainer.appendChild(shareBtn);

        document.body.appendChild(uiContainer);

        // Назначаем обработчики
        this.buyBtn = document.getElementById('buyBtn');
        this.sellBtn = document.getElementById('sellBtn');
        this.balanceChange = document.getElementById('balanceChange');

        this.buyBtn.onclick = () => this.buyCoin();
        this.sellBtn.onclick = () => this.sellCoin();
    }

    updatePrice() {
        // Генерируем случайное изменение цены (-2% до +2%)
        const changePercent = (Math.random() - 0.5) * 4;
        this.currentPrice *= (1 + changePercent / 100);
        
        // Ограничиваем минимальную цену
        this.currentPrice = Math.max(this.currentPrice, 10);
        
        // Добавляем в историю
        this.priceHistory.push(this.currentPrice);
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
        
        this.updateChart();
        this.updateUI();
    }

    updateChart() {
        this.chart.clear();
        
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        
        // Находим мин и макс значения для масштабирования
        const minPrice = Math.min(...this.priceHistory);
        const maxPrice = Math.max(...this.priceHistory);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика
        this.chart.lineStyle(3, 0x3498db, 1);
        
        this.priceHistory.forEach((price, index) => {
            const x = (index / (this.priceHistory.length - 1)) * width;
            const y = height - ((price - minPrice) / range) * height * 0.8 - height * 0.1;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
    }

    updateUI() {
        document.querySelector('.balance-amount').textContent = `$${this.balance.toFixed(2)}`;
        
        if (this.isHolding) {
            const profit = (this.currentPrice - this.buyPrice) * this.ownedCoins;
            const profitPercent = ((this.currentPrice - this.buyPrice) / this.buyPrice) * 100;
            
            this.balanceChange.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`;
            this.balanceChange.className = `balance-change ${profit >= 0 ? 'profit' : 'loss'}`;
        } else {
            this.balanceChange.textContent = '';
        }
    }

    buyCoin() {
        if (this.isHolding) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentPrice);
        if (coinsToBuy > 0) {
            this.ownedCoins = coinsToBuy;
            this.buyPrice = this.currentPrice;
            this.balance -= coinsToBuy * this.currentPrice;
            this.isHolding = true;
            
            this.buyBtn.disabled = true;
            this.sellBtn.disabled = false;
            
            this.saveGameData();
        }
    }

    sellCoin() {
        if (!this.isHolding) return;
        
        this.balance += this.ownedCoins * this.currentPrice;
        this.ownedCoins = 0;
        this.isHolding = false;
        
        this.buyBtn.disabled = false;
        this.sellBtn.disabled = true;
        
        this.saveGameData();
    }

    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { keys: ['balance', 'ownedCoins'] });
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.ownedCoins) this.ownedCoins = parseInt(data.ownedCoins);
                this.isHolding = this.ownedCoins > 0;
            }
        } catch (error) {
            console.log('Не удалось загрузить данные:', error);
        }
    }

    async saveGameData() {
        try {
            if (window.VK) {
                await VK.call('storage.set', {
                    balance: this.balance.toString(),
                    ownedCoins: this.ownedCoins.toString()
                });
            }
        } catch (error) {
            console.log('Не удалось сохранить данные:', error);
        }
    }

    async showLeaderboard() {
        try {
            if (window.VK) {
                // Показываем рейтинг друзей
                VK.call('showLeaderboardBox', { user_result: Math.floor(this.balance) });
            } else {
                alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
            }
        } catch (error) {
            alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
        }
    }

    async shareResult() {
        try {
            if (window.VK) {
                VK.call('wall.post', {
                    message: `Я только что заработал ${this.balance.toFixed(2)} VK-долларов в Крипто-Гонке! Сможешь побить мой рекорд? 🚀`
                });
            } else {
                // Для тестирования вне VK
                const text = `Мой результат: $${this.balance.toFixed(2)} в Крипто-Гонке!`;
                if (navigator.share) {
                    navigator.share({ text });
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                    alert('Результат скопирован в буфер обмена!');
                }
            }
        } catch (error) {
            console.log('Ошибка при публикации:', error);
        }
    }
}

// Конфигурация Phaser
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#f8f9fa',
    scene: GameScene
};

// Запуск игры когда VK Bridge готов
window.addEventListener('DOMContentLoaded', () => {
    if (window.VK) {
        VK.init(() => {
            new Phaser.Game(config);
        });
    } else {
        // Запуск без VK для тестирования
        new Phaser.Game(config);
    }
});
