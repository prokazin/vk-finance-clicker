class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.ownedCoins = 0;
        this.isHolding = false;
        this.buyPrice = 0;
        this.stopLoss = 0;
        this.takeProfit = 0;
        this.showStopMenu = false;
        this.activeEvent = null;
        this.eventEndTime = 0;
        
        this.currencies = [
            { name: 'VKoin', price: 100, history: [], color: 0x3498db, volatility: 0.3 },
            { name: 'Memecoin', price: 50, history: [], color: 0xe74c3c, volatility: 0.6 },
            { name: 'Social Token', price: 200, history: [], color: 0x9b59b6, volatility: 0.2 }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };

        // Система новостей и событий
        this.eventsSystem = {
            news: [
                {
                    id: 1,
                    title: "📈 Бычий рынок!",
                    description: "Инвесторы активно покупают",
                    effect: { multiplier: 1.5, duration: 10000 },
                    color: 0x27ae60
                },
                {
                    id: 2,
                    title: "📉 Медвежий тренд!",
                    description: "Продажи на всех рынках",
                    effect: { multiplier: 0.6, duration: 8000 },
                    color: 0xe74c3c
                },
                {
                    id: 3,
                    title: "⚡ Волатильность!",
                    description: "Резкие скачки цен",
                    effect: { multiplier: 2.0, duration: 6000 },
                    color: 0xf39c12
                },
                {
                    id: 4,
                    title: "🛡️ Стабильность!",
                    description: "Рынок успокаивается",
                    effect: { multiplier: 0.3, duration: 12000 },
                    color: 0x3498db
                },
                {
                    id: 5,
                    title: "🎯 Технологический прорыв!",
                    description: "Новые технологии в блокчейне",
                    effect: { multiplier: 1.8, duration: 7000 },
                    color: 0x9b59b6
                }
            ],
            getRandomEvent: function() {
                return this.news[Math.floor(Math.random() * this.news.length)];
            }
        };
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        console.log('Сцена создается');
        
        // Инициализация данных
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });

        this.createChart();
        this.createUI();
        this.setupEventListeners();
        
        // Запуск обновления цены
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });

        // Запуск случайных событий каждые 20-30 секунд
        this.time.addEvent({
            delay: 20000,
            callback: this.triggerRandomEvent,
            callbackScope: this,
            loop: true
        });

        console.log('Игра запущена успешно');
    }

    createChart() {
        this.chart = this.add.graphics();
        this.ordersGraphics = this.add.graphics(); // Отдельная графика для ордеров
        this.updateChart();
    }

    createUI() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Верхняя панель - валюта и баланс
        this.currencyText = this.add.text(centerX, 20, this.currentCurrency.name, {
            fontSize: '24px',
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.balanceText = this.add.text(centerX, 50, `Баланс: $${this.balance.toFixed(2)}`, {
            fontSize: '20px',
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        this.prevButton = this.add.text(50, 35, '←', {
            fontSize: '24px',
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        this.nextButton = this.add.text(350, 35, '→', {
            fontSize: '24px',
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        // Статистика
        this.statsText = this.add.text(centerX, 80, this.getStatsString(), {
            fontSize: '14px',
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, 105, '', {
            fontSize: '16px',
            fill: '#27ae60',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Панель события (изначально скрыта)
        this.eventPanel = this.add.rectangle(centerX, 135, 380, 30, 0x2c3e50, 0)
            .setVisible(false);
        this.eventText = this.add.text(centerX, 135, '', {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setVisible(false);

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

        // Кнопка стоп-ордеров
        this.stopButton = this.add.rectangle(centerX, 560, 200, 40, 0xf39c12)
            .setInteractive();
        this.add.text(centerX, 560, 'СТОП-ОРДЕР', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Информация о стоп-ордерах
        this.stopInfo = this.add.text(centerX, 530, '', {
            fontSize: '12px',
            fill: '#e67e22',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.buyButton.on('pointerdown', () => this.buyCoin());
        this.sellButton.on('pointerdown', () => this.sellCoin());
        this.stopButton.on('pointerdown', () => this.setStopOrder());
    }

    // Система событий и новостей
    triggerRandomEvent() {
        if (this.activeEvent) return; // Не запускаем новое событие, если текущее активно
        
        const event = this.eventsSystem.getRandomEvent();
        this.activeEvent = event;
        this.eventEndTime = Date.now() + event.effect.duration;
        
        // Показываем панель события
        this.eventPanel.setFillStyle(event.color, 0.9).setVisible(true);
        this.eventText.setText(`${event.title} - ${event.description}`).setVisible(true);
        
        // Анимация появления
        this.tweens.add({
            targets: [this.eventPanel, this.eventText],
            alpha: { from: 0, to: 1 },
            duration: 500
        });
        
        // Запускаем таймер завершения события
        this.time.delayedCall(event.effect.duration, () => {
            this.endEvent();
        });
        
        console.log(`Событие активировано: ${event.title}`);
    }

    endEvent() {
        if (this.activeEvent) {
            // Анимация исчезновения
            this.tweens.add({
                targets: [this.eventPanel, this.eventText],
                alpha: { from: 1, to: 0 },
                duration: 500,
                onComplete: () => {
                    this.eventPanel.setVisible(false);
                    this.eventText.setVisible(false);
                    this.activeEvent = null;
                }
            });
        }
    }

    getCurrentVolatility() {
        let baseVolatility = this.currentCurrency.volatility;
        
        // Учитываем активное событие
        if (this.activeEvent) {
            baseVolatility *= this.activeEvent.effect.multiplier;
        }
        
        return baseVolatility;
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
        const volatility = this.getCurrentVolatility();
        const changePercent = (Math.random() - 0.5) * volatility;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 50) {
            currency.history.shift();
        }
        
        this.checkStopOrders();
        this.updateChart();
        this.updateUI();
    }

    checkStopOrders() {
        if (this.isHolding && this.stopLoss > 0) {
            if (this.currentCurrency.price <= this.stopLoss) {
                this.sellCoin();
                this.showMessage('СТОП-ЛОСС СРАБОТАЛ!');
            }
        }
        
        if (this.isHolding && this.takeProfit > 0) {
            if (this.currentCurrency.price >= this.takeProfit) {
                this.sellCoin();
                this.showMessage('ТЕЙК-ПРОФИТ СРАБОТАЛ!');
            }
        }
    }

    updateChart() {
        this.chart.clear();
        this.ordersGraphics.clear();
        
        const history = this.currentCurrency.history;
        const width = 380;
        const height = 250;
        const startY = this.activeEvent ? 170 : 150; // Сдвигаем график если есть событие
        
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
        
        // ВИЗУАЛИЗАЦИЯ ОРДЕРОВ НА ГРАФИКЕ
        if (this.isHolding) {
            this.drawOrderLines(minPrice, maxPrice, startY, height, range, width);
            this.drawBuyMarker(startY, height, range, width);
        }
    }

    // Рисуем линии стоп-лосса и тейк-профита
    drawOrderLines(minPrice, maxPrice, startY, height, range, width) {
        // Стоп-лосс (красная пунктирная линия)
        if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(2, 0xe74c3c, 0.8);
            this.ordersGraphics.setLineDash([5, 5]);
            this.ordersGraphics.lineBetween(10, stopY, width + 10, stopY);
            this.ordersGraphics.setLineDash([]);
            
            // Подпись стоп-лосса
            this.add.text(15, stopY - 8, `SL: $${this.stopLoss.toFixed(2)}`, { 
                fontSize: '10px', 
                fill: '#e74c3c',
                fontFamily: 'Arial',
                backgroundColor: '#ffffff',
                padding: { left: 3, right: 3, top: 1, bottom: 1 }
            });
        }
        
        // Тейк-профит (зеленая пунктирная линия)
        if (this.takeProfit > 0 && this.takeProfit >= minPrice && this.takeProfit <= maxPrice) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(2, 0x27ae60, 0.8);
            this.ordersGraphics.setLineDash([5, 5]);
            this.ordersGraphics.lineBetween(10, profitY, width + 10, profitY);
            this.ordersGraphics.setLineDash([]);
            
            // Подпись тейк-профита
            this.add.text(15, profitY - 8, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: '10px', 
                fill: '#27ae60',
                fontFamily: 'Arial',
                backgroundColor: '#ffffff',
                padding: { left: 3, right: 3, top: 1, bottom: 1 }
            });
        }
    }

    // Рисуем маркер точки покупки
    drawBuyMarker(startY, height, range, width) {
        if (this.buyPrice > 0) {
            const minPrice = Math.min(...this.currentCurrency.history);
            const buyY = startY + height - ((this.buyPrice - minPrice) / range) * height;
            const currentX = width + 5; // Правая граница графика
            
            // Вертикальная линия от текущей цены до цены покупки
            const currentPrice = this.currentCurrency.price;
            const currentY = startY + height - ((currentPrice - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(1, 0x3498db, 0.6);
            this.ordersGraphics.lineBetween(currentX, currentY, currentX, buyY);
            
            // Маркер цены покупки
            this.ordersGraphics.fillStyle(0x3498db, 1);
            this.ordersGraphics.fillCircle(currentX, buyY, 4);
            
            // Подпись цены покупки
            this.add.text(currentX + 8, buyY - 6, `BUY: $${this.buyPrice.toFixed(2)}`, { 
                fontSize: '9px', 
                fill: '#3498db',
                fontFamily: 'Arial',
                backgroundColor: '#ffffff',
                padding: { left: 2, right: 2, top: 1, bottom: 1 }
            });
        }
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
        this.updateStopInfo();
    }

    updateButtonStates() {
        this.buyButton.setAlpha(this.isHolding ? 0.5 : 1);
        this.sellButton.setAlpha(this.isHolding ? 1 : 0.5);
        this.stopButton.setAlpha(this.isHolding ? 1 : 0.5);
    }

    updateStopInfo() {
        if (this.isHolding) {
            let info = '';
            if (this.stopLoss > 0) info += `STOP: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `PROFIT: $${this.takeProfit.toFixed(1)}`;
            this.stopInfo.setText(info);
        } else {
            this.stopInfo.setText('');
        }
    }

    getStatsString() {
        return `Сделки: ${this.stats.totalTrades} | Успешные: ${this.stats.successfulTrades} | Прибыль: $${this.stats.totalProfit.toFixed(2)}`;
    }

    buyCoin() {
        if (this.isHolding) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentCurrency.price);
        if (coinsToBuy > 0) {
            this.ownedCoins = coinsToBuy;
            this.buyPrice = this.currentCurrency.price;
            this.balance -= coinsToBuy * this.currentCurrency.price;
            this.isHolding = true;
            this.stopLoss = 0;
            this.takeProfit = 0;
            
            this.updateUI();
            this.updateChart();
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
        this.updateChart();
        this.saveGameData();
    }

    setStopOrder() {
        if (!this.isHolding) return;
        
        // Простая установка стоп-ордеров
        this.stopLoss = this.buyPrice * 0.95;
        this.takeProfit = this.buyPrice * 1.10;
        
        this.updateUI();
        this.updateChart();
        this.saveGameData();
        
        this.showMessage('Стоп-ордера установлены!');
    }

    showMessage(text) {
        const message = this.add.text(this.cameras.main.centerX, 400, text, {
            fontSize: '16px',
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

// Добавляем метод setLineDash для Graphics (если не поддерживается)
Phaser.GameObjects.Graphics.prototype.setLineDash = function(dashArray) {
    if (this.context.setLineDash) {
        this.context.setLineDash(dashArray);
    }
};

// Конфигурация Phaser - ФИКСИРОВАННЫЕ РАЗМЕРЫ для надежности
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#f8f9fa',
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Запуск игры при полной загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запускаем игру...');
    
    // Ждем немного чтобы все точно загрузилось
    setTimeout(() => {
        try {
            const game = new Phaser.Game(config);
            console.log('Phaser игра создана успешно');
        } catch (error) {
            console.error('Ошибка при создании игры:', error);
        }
    }, 100);
});