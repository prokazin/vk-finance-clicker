class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.ownedCoins = 0;
        this.isHolding = false;
        this.buyPrice = 0;
        
        this.currencies = [
            { name: 'VKoin', price: 100, history: [], color: 0x3498db, volatility: 1.5 },
            { name: 'Memecoin', price: 50, history: [], color: 0xe74c3c, volatility: 3.0 },
            { name: 'Social Token', price: 200, history: [], color: 0x9b59b6, volatility: 0.8 }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };
        
        // UI элементы
        this.balanceText = null;
        this.currencyText = null;
        this.profitText = null;
        this.statsText = null;
        this.buyButton = null;
        this.sellButton = null;
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        this.loadGameData();
        this.createChart();
        this.createUI();
        this.setupEventListeners();
        
        // Запускаем обновление цены
        this.time.addEvent({
            delay: 200,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    createChart() {
        // Инициализируем историю цен
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });
        
        this.chart = this.add.graphics();
        this.updateChart();
    }

    createUI() {
        const centerX = this.cameras.main.centerX;
        
        // Верхняя панель - название валюты
        this.currencyText = this.add.text(centerX, 20, this.currentCurrency.name, {
            fontSize: '24px',
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        this.prevButton = this.add.text(50, 20, '←', {
            fontSize: '24px',
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        this.nextButton = this.add.text(350, 20, '→', {
            fontSize: '24px',
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        // Баланс
        this.balanceText = this.add.text(centerX, 60, `Баланс: $${this.balance.toFixed(2)}`, {
            fontSize: '20px',
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, 85, '', {
            fontSize: '16px',
            fill: '#27ae60',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Статистика
        this.statsText = this.add.text(centerX, 110, this.getStatsString(), {
            fontSize: '14px',
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопка покупки
        this.buyButton = this.add.rectangle(centerX - 80, 500, 140, 50, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - 80, 500, 'КУПИТЬ', {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка продажи
        this.sellButton = this.add.rectangle(centerX + 80, 500, 140, 50, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + 80, 500, 'ПРОДАТЬ', {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка таблицы лидеров
        this.leaderboardButton = this.add.rectangle(centerX, 560, 300, 40, 0x3498db)
            .setInteractive();
        this.add.text(centerX, 560, '🏆 ТАБЛИЦА ЛИДЕРОВ', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.updateButtonStates();
    }

    setupEventListeners() {
        // Переключение валют
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));

        // Кнопки покупки/продажи
        this.buyButton.on('pointerdown', () => this.buyCoin());
        this.sellButton.on('pointerdown', () => this.sellCoin());

        // Таблица лидеров
        this.leaderboardButton.on('pointerdown', () => this.showLeaderboard());
    }

    switchCurrency(direction) {
        if (this.isHolding) return;
        
        this.currentCurrencyIndex += direction;
        if (this.currentCurrencyIndex < 0) {
            this.currentCurrencyIndex = this.currencies.length - 1;
        } else if (this.currentCurrencyIndex >= this.currencies.length) {
            this.currentCurrencyIndex = 0;
        }
        
        this.currencyText.setText(this.currentCurrency.name);
        this.updateChart();
        this.updateUI();
    }

    updatePrice() {
        const currency = this.currentCurrency;
        const changePercent = (Math.random() - 0.5) * currency.volatility;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 50) {
            currency.history.shift();
        }
        
        this.updateChart();
        this.updateUI();
    }

    updateChart() {
        this.chart.clear();
        
        const history = this.currentCurrency.history;
        const width = 380;
        const height = 250;
        const startY = 150;
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        history.forEach((price, index) => {
            const x = 10 + (index / (history.length - 1)) * width;
            const y = startY + height - ((price - minPrice) / range) * height;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
    }

    updateUI() {
        this.balanceText.setText(`Баланс: $${this.balance.toFixed(2)}`);
        this.statsText.setText(this.getStatsString());
        
        if (this.isHolding) {
            const profit = (this.currentCurrency.price - this.buyPrice) * this.ownedCoins;
            const profitPercent = ((this.currentCurrency.price - this.buyPrice) / this.buyPrice) * 100;
            
            this.profitText.setText(`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
            this.profitText.setFill(profit >= 0 ? '#27ae60' : '#e74c3c');
        } else {
            this.profitText.setText('');
        }
        
        this.updateButtonStates();
    }

    updateButtonStates() {
        // Визуальное отключение кнопок
        this.buyButton.setAlpha(this.isHolding ? 0.5 : 1);
        this.sellButton.setAlpha(this.isHolding ? 1 : 0.5);
    }

    getStatsString() {
        return `Сделки: ${this.stats.totalTrades} | Успешные: ${this.stats.successfulTrades} | Прибыль: $${this.stats.totalProfit.toFixed(2)} | Монет: ${this.ownedCoins}`;
    }

    buyCoin() {
        if (this.isHolding) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentCurrency.price);
        if (coinsToBuy > 0) {
            this.ownedCoins = coinsToBuy;
            this.buyPrice = this.currentCurrency.price;
            this.balance -= coinsToBuy * this.currentCurrency.price;
            this.isHolding = true;
            
            this.updateUI();
            this.saveGameData();
        }
    }

    sellCoin() {
        if (!this.isHolding) return;
        
        const profit = (this.currentCurrency.price - this.buyPrice) * this.ownedCoins;
        
        this.stats.totalTrades++;
        if (profit > 0) {
            this.stats.successfulTrades++;
        }
        this.stats.totalProfit += profit;
        
        this.balance += this.ownedCoins * this.currentCurrency.price;
        this.ownedCoins = 0;
        this.isHolding = false;
        
        this.updateUI();
        this.saveGameData();
    }

    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { 
                    keys: ['balance', 'ownedCoins', 'stats'] 
                });
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.ownedCoins) this.ownedCoins = parseInt(data.ownedCoins);
                if (data.stats) this.stats = JSON.parse(data.stats);
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
                    ownedCoins: this.ownedCoins.toString(),
                    stats: JSON.stringify(this.stats)
                });
            }
        } catch (error) {
            console.log('Не удалось сохранить данные:', error);
        }
    }

    async showLeaderboard() {
        try {
            if (window.VK) {
                VK.call('showLeaderboardBox', { user_result: Math.floor(this.balance) });
            } else {
                alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
            }
        } catch (error) {
            alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#f8f9fa',
    scene: GameScene
};

window.addEventListener('DOMContentLoaded', () => {
    if (window.VK) {
        VK.init(() => {
            new Phaser.Game(config);
        });
    } else {
        new Phaser.Game(config);
    }
});