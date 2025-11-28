class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.ownedCoins = 0;
        this.isHolding = false;
        this.buyPrice = 0;
        this.stopLoss = 0;
        this.takeProfit = 0;
        
        this.currencies = [
            { name: 'VKoin', price: 100, history: [], color: 0x3498db, volatility: 0.8 },
            { name: 'Memecoin', price: 50, history: [], color: 0xe74c3c, volatility: 1.5 },
            { name: 'Social Token', price: 200, history: [], color: 0x9b59b6, volatility: 0.5 }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };
        
        this.uiElements = {};
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        this.loadGameData();
        this.createChart();
        this.createCompactUI();
        this.setupEventListeners();
        
        // Еще более медленное обновление
        this.time.addEvent({
            delay: 300,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    createChart() {
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 40; i++) {
                currency.history.push(currency.price);
            }
        });
        
        this.chart = this.add.graphics();
        this.updateChart();
    }

    createCompactUI() {
        const centerX = this.cameras.main.centerX;
        
        // Верхняя строка - валюта и баланс
        this.uiElements.currencyText = this.add.text(centerX, 15, this.currentCurrency.name, {
            fontSize: '20px',
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.uiElements.balanceText = this.add.text(centerX, 40, `$${this.balance.toFixed(0)}`, {
            fontSize: '18px',
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопки переключения валют (меньше)
        this.uiElements.prevButton = this.add.text(30, 28, '←', {
            fontSize: '20px',
            fill: '#3498db',
            fontFamily: 'Arial'
        }).setInteractive();

        this.uiElements.nextButton = this.add.text(370, 28, '→', {
            fontSize: '20px',
            fill: '#3498db',
            fontFamily: 'Arial'
        }).setInteractive();

        // Статистика в одну строку (компактнее)
        this.uiElements.statsText = this.add.text(centerX, 65, this.getCompactStats(), {
            fontSize: '12px',
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.uiElements.profitText = this.add.text(centerX, 85, '', {
            fontSize: '14px',
            fill: '#27ae60',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопки управления (меньше)
        this.uiElements.buyButton = this.add.rectangle(centerX - 70, 520, 120, 40, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - 70, 520, 'КУПИТЬ', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.uiElements.sellButton = this.add.rectangle(centerX + 70, 520, 120, 40, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + 70, 520, 'ПРОДАТЬ', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопка стоп-ордеров
        this.uiElements.stopButton = this.add.rectangle(centerX, 470, 140, 35, 0xf39c12)
            .setInteractive();
        this.add.text(centerX, 470, 'СТОП-ОРДЕР', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Отображение стоп-ордеров
        this.uiElements.stopInfo = this.add.text(centerX, 440, '', {
            fontSize: '12px',
            fill: '#e67e22',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    setupEventListeners() {
        this.uiElements.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.uiElements.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.uiElements.buyButton.on('pointerdown', () => this.buyCoin());
        this.uiElements.sellButton.on('pointerdown', () => this.sellCoin());
        this.uiElements.stopButton.on('pointerdown', () => this.setStopOrder());
    }

    switchCurrency(direction) {
        if (this.isHolding) return;
        
        this.currentCurrencyIndex += direction;
        if (this.currentCurrencyIndex < 0) {
            this.currentCurrencyIndex = this.currencies.length - 1;
        } else if (this.currentCurrencyIndex >= this.currencies.length) {
            this.currentCurrencyIndex = 0;
        }
        
        this.uiElements.currencyText.setText(this.currentCurrency.name);
        this.updateChart();
        this.updateUI();
    }

    updatePrice() {
        const currency = this.currentCurrency;
        
        // Еще более плавное изменение цены
        const changePercent = (Math.random() - 0.5) * currency.volatility * 0.7;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 40) {
            currency.history.shift();
        }
        
        // Проверка стоп-ордеров
        this.checkStopOrders();
        
        this.updateChart();
        this.updateUI();
    }

    checkStopOrders() {
        if (this.isHolding && this.stopLoss > 0) {
            if (this.currentCurrency.price <= this.stopLoss) {
                this.sellCoin();
                this.add.text(this.cameras.main.centerX, 300, 'СТОП-ЛОСС СРАБОТАЛ!', {
                    fontSize: '16px',
                    fill: '#e74c3c',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
            }
        }
        
        if (this.isHolding && this.takeProfit > 0) {
            if (this.currentCurrency.price >= this.takeProfit) {
                this.sellCoin();
                this.add.text(this.cameras.main.centerX, 300, 'ТЕЙК-ПРОФИТ СРАБОТАЛ!', {
                    fontSize: '16px',
                    fill: '#27ae60',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);
            }
        }
    }

    updateChart() {
        this.chart.clear();
        
        const history = this.currentCurrency.history;
        const width = 380;
        const height = 280; // Увеличили высоту графика
        const startY = 100; // Сдвинули график выше
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика
        this.chart.lineStyle(2, this.currentCurrency.color, 1);
        
        // Более плавное отображение
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = 10 + (i / (history.length - 1)) * width;
            const y1 = startY + height - ((history[i] - minPrice) / range) * height;
            const x2 = 10 + ((i + 1) / (history.length - 1)) * width;
            const y2 = startY + height - ((history[i + 1] - minPrice) / range) * height;
            
            this.chart.lineBetween(x1, y1, x2, y2);
        }
        
        // Рисуем линии стоп-ордеров если они установлены
        if (this.isHolding) {
            if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
                const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
                this.chart.lineStyle(1, 0xe74c3c, 0.7);
                this.chart.lineBetween(10, stopY, width + 10, stopY);
                this.add.text(20, stopY - 10, 'STOP', { fontSize: '10px', fill: '#e74c3c' });
            }
            
            if (this.takeProfit > 0 && this.takeProfit >= minPrice && this.takeProfit <= maxPrice) {
                const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
                this.chart.lineStyle(1, 0x27ae60, 0.7);
                this.chart.lineBetween(10, profitY, width + 10, profitY);
                this.add.text(20, profitY - 10, 'PROFIT', { fontSize: '10px', fill: '#27ae60' });
            }
        }
    }

    updateUI() {
        this.uiElements.balanceText.setText(`$${this.balance.toFixed(0)}`);
        this.uiElements.statsText.setText(this.getCompactStats());
        
        if (this.isHolding) {
            const profit = (this.currentCurrency.price - this.buyPrice) * this.ownedCoins;
            const profitPercent = ((this.currentCurrency.price - this.buyPrice) / this.buyPrice) * 100;
            
            this.uiElements.profitText.setText(`${profit >= 0 ? '+' : ''}${profit.toFixed(0)} (${profitPercent.toFixed(1)}%)`);
            this.uiElements.profitText.setFill(profit >= 0 ? '#27ae60' : '#e74c3c');
        } else {
            this.uiElements.profitText.setText('');
        }
        
        this.updateButtonStates();
        this.updateStopInfo();
    }

    updateButtonStates() {
        this.uiElements.buyButton.setAlpha(this.isHolding ? 0.5 : 1);
        this.uiElements.sellButton.setAlpha(this.isHolding ? 1 : 0.5);
        this.uiElements.stopButton.setAlpha(this.isHolding ? 1 : 0.5);
    }

    updateStopInfo() {
        if (this.isHolding) {
            let info = '';
            if (this.stopLoss > 0) info += `STOP: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `PROFIT: $${this.takeProfit.toFixed(1)}`;
            this.uiElements.stopInfo.setText(info);
        } else {
            this.uiElements.stopInfo.setText('');
        }
    }

    getCompactStats() {
        return `Сделки:${this.stats.totalTrades} Успешные:${this.stats.successfulTrades} Прибыль:$${this.stats.totalProfit.toFixed(0)}`;
    }

    buyCoin() {
        if (this.isHolding) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentCurrency.price);
        if (coinsToBuy > 0) {
            this.ownedCoins = coinsToBuy;
            this.buyPrice = this.currentCurrency.price;
            this.balance -= coinsToBuy * this.currentCurrency.price;
            this.isHolding = true;
            // Сбрасываем стоп-ордера при новой покупке
            this.stopLoss = 0;
            this.takeProfit = 0;
            
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
        this.stopLoss = 0;
        this.takeProfit = 0;
        
        this.updateUI();
        this.saveGameData();
    }

    setStopOrder() {
        if (!this.isHolding) return;
        
        // Простая реализация - устанавливаем стоп-лосс на 5% ниже и тейк-профит на 10% выше
        this.stopLoss = this.buyPrice * 0.95;
        this.takeProfit = this.buyPrice * 1.10;
        
        this.updateUI();
        this.saveGameData();
        
        // Временное сообщение
        const message = this.add.text(this.cameras.main.centerX, 400, 'Стоп-ордера установлены!', {
            fontSize: '14px',
            fill: '#f39c12',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
        });
    }

    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { 
                    keys: ['balance', 'ownedCoins', 'stats', 'stopLoss', 'takeProfit'] 
                });
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.ownedCoins) this.ownedCoins = parseInt(data.ownedCoins);
                if (data.stats) this.stats = JSON.parse(data.stats);
                if (data.stopLoss) this.stopLoss = parseFloat(data.stopLoss);
                if (data.takeProfit) this.takeProfit = parseFloat(data.takeProfit);
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
                    stats: JSON.stringify(this.stats),
                    stopLoss: this.stopLoss.toString(),
                    takeProfit: this.takeProfit.toString()
                });
            }
        } catch (error) {
            console.log('Не удалось сохранить данные:', error);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 570, // Уменьшили высоту для телефонов
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