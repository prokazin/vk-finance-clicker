class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
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

        this.eventsSystem = {
            news: [
                {
                    id: 1,
                    title: "🚀 Космический рост!",
                    description: "Институциональные инвесторы входят в рынок",
                    effect: { multiplier: 2.2, duration: 15000 },
                    color: 0x27ae60,
                    icon: "🚀"
                },
                {
                    id: 2,
                    title: "📈 Бычий прорыв!",
                    description: "Цены обновляют годовые максимумы",
                    effect: { multiplier: 1.8, duration: 12000 },
                    color: 0x2ecc71,
                    icon: "📈"
                },
                {
                    id: 6,
                    title: "📉 Обвал рынка!",
                    description: "Паника на глобальных биржах",
                    effect: { multiplier: 0.4, duration: 14000 },
                    color: 0xe74c3c,
                    icon: "📉"
                },
                {
                    id: 7,
                    title: "🐻 Медвежья ловушка!",
                    description: "Крупные игроки открывают шорты",
                    effect: { multiplier: 0.6, duration: 12000 },
                    color: 0xc0392b,
                    icon: "🐻"
                }
            ],
            getRandomEvent: function() {
                return this.news[Math.floor(Math.random() * this.news.length)];
            }
        };

        this.layout = {
            padding: 20,
            headerHeight: 0,
            chartHeight: 0,
            buttonHeight: 0
        };
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    get hasPosition() {
        return this.position !== null;
    }

    create() {
        console.log('Сцена создается');
        
        this.calculateLayout();
        
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });

        this.createChart();
        this.createUI();
        this.setupEventListeners();
        
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 90000,
            callback: this.triggerRandomEvent,
            callbackScope: this,
            loop: true
        });

        console.log('Игра запущена успешно');
    }

    calculateLayout() {
        const { width, height } = this.cameras.main;
        this.layout.padding = Math.min(width * 0.05, 25);
        this.layout.headerHeight = height * 0.25;
        this.layout.chartHeight = height * 0.50;
        this.layout.buttonHeight = height * 0.25;
    }

    createChart() {
        this.chart = this.add.graphics();
        this.ordersGraphics = this.add.graphics();
        this.updateChart();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        
        const headerY = this.layout.headerHeight / 2;
        const chartY = this.layout.headerHeight + this.layout.chartHeight / 2;
        const buttonY = this.layout.headerHeight + this.layout.chartHeight + this.layout.buttonHeight / 2;

        // Верхняя панель
        this.currencyText = this.add.text(centerX, headerY - 25, this.currentCurrency.name, {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.balanceText = this.add.text(centerX, headerY, `Баланс: $${this.balance.toFixed(2)}`, {
            fontSize: this.getAdaptiveFontSize(20),
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        this.prevButton = this.add.text(this.layout.padding + 25, headerY - 10, '←', {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        this.nextButton = this.add.text(width - this.layout.padding - 25, headerY - 10, '→', {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        // Статистика
        this.statsText = this.add.text(centerX, headerY + 25, this.getStatsString(), {
            fontSize: this.getAdaptiveFontSize(14),
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, headerY + 45, '', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#27ae60',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Панель события
        this.eventPanel = this.add.rectangle(centerX, headerY + 70, width - this.layout.padding * 2, 35, 0x2c3e50, 0)
            .setVisible(false);
        this.eventText = this.add.text(centerX, headerY + 70, '', {
            fontSize: this.getAdaptiveFontSize(13),
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // ОСНОВНЫЕ КНОПКИ С ОТСТУПАМИ
        const buttonWidth = this.getAdaptiveSize(140);
        const buttonHeight = this.getAdaptiveSize(50);
        const buttonSpacing = 20;
        
        // Кнопка LONG (слева)
        this.longButton = this.add.rectangle(centerX - buttonWidth - buttonSpacing/2, buttonY - 25, buttonWidth, buttonHeight, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - buttonWidth - buttonSpacing/2, buttonY - 25, 'LONG', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка SHORT (справа)
        this.shortButton = this.add.rectangle(centerX + buttonWidth + buttonSpacing/2, buttonY - 25, buttonWidth, buttonHeight, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + buttonWidth + buttonSpacing/2, buttonY - 25, 'SHORT', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка закрытия позиции (по центру между LONG и SHORT)
        this.closeButton = this.add.rectangle(centerX, buttonY - 25, buttonWidth * 1.2, buttonHeight, 0xf39c12)
            .setInteractive();
        this.add.text(centerX, buttonY - 25, 'ЗАКРЫТЬ', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка стоп-ордеров (ниже основных кнопок)
        const stopButtonWidth = this.getAdaptiveSize(200);
        const stopButtonHeight = this.getAdaptiveSize(40);
        this.stopButton = this.add.rectangle(centerX, buttonY + 15, stopButtonWidth, stopButtonHeight, 0x9b59b6)
            .setInteractive();
        this.add.text(centerX, buttonY + 15, 'СТОП-ОРДЕР', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Информация о позиции (над кнопками)
        this.positionInfo = this.add.text(centerX, buttonY - 55, '', {
            fontSize: this.getAdaptiveFontSize(12),
            fill: '#2c3e50',
            fontFamily: 'Arial',
            backgroundColor: '#ecf0f1',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updatePositionInfo();
    }

    getAdaptiveFontSize(baseSize) {
        const { height } = this.cameras.main;
        if (height < 600) return baseSize * 0.8 + 'px';
        if (height > 800) return baseSize * 1.2 + 'px';
        return baseSize + 'px';
    }

    getAdaptiveSize(baseSize) {
        const { height } = this.cameras.main;
        if (height < 600) return baseSize * 0.8;
        if (height > 800) return baseSize * 1.2;
        return baseSize;
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.longButton.on('pointerdown', () => this.openLong());
        this.shortButton.on('pointerdown', () => this.openShort());
        this.closeButton.on('pointerdown', () => this.closePosition());
        this.stopButton.on('pointerdown', () => this.setStopOrder());
    }

    openLong() {
        if (this.hasPosition) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentCurrency.price);
        if (coinsToBuy > 0) {
            this.position = {
                type: 'long',
                entryPrice: this.currentCurrency.price,
                coins: coinsToBuy
            };
            this.balance -= coinsToBuy * this.currentCurrency.price;
            
            this.updateUI();
            this.updateChart();
            this.saveGameData();
            this.showMessage(`LONG позиция открыта! Покупка по $${this.position.entryPrice.toFixed(2)}`);
        }
    }

    openShort() {
        if (this.hasPosition) return;
        
        const coinsToSell = Math.floor(this.balance / this.currentCurrency.price);
        if (coinsToSell > 0) {
            this.position = {
                type: 'short',
                entryPrice: this.currentCurrency.price,
                coins: coinsToSell
            };
            this.balance += coinsToSell * this.currentCurrency.price;
            
            this.updateUI();
            this.updateChart();
            this.saveGameData();
            this.showMessage(`SHORT позиция открыта! Продажа по $${this.position.entryPrice.toFixed(2)}`);
        }
    }

    closePosition() {
        if (!this.hasPosition) return;
        
        let profit = 0;
        
        if (this.position.type === 'long') {
            profit = (this.currentCurrency.price - this.position.entryPrice) * this.position.coins;
            this.balance += this.position.coins * this.currentCurrency.price;
        } else {
            profit = (this.position.entryPrice - this.currentCurrency.price) * this.position.coins;
            this.balance -= this.position.coins * this.currentCurrency.price;
        }
        
        this.stats.totalTrades++;
        if (profit > 0) {
            this.stats.successfulTrades++;
        }
        this.stats.totalProfit += profit;
        
        const positionType = this.position.type.toUpperCase();
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
        
        this.updateUI();
        this.updateChart();
        this.saveGameData();
        
        this.showMessage(`${positionType} позиция закрыта! Прибыль: $${profit.toFixed(2)}`);
    }

    calculateCurrentProfit() {
        if (!this.hasPosition) return 0;
        
        if (this.position.type === 'long') {
            return (this.currentCurrency.price - this.position.entryPrice) * this.position.coins;
        } else {
            return (this.position.entryPrice - this.currentCurrency.price) * this.position.coins;
        }
    }

    calculateProfitPercent() {
        if (!this.hasPosition) return 0;
        
        if (this.position.type === 'long') {
            return ((this.currentCurrency.price - this.position.entryPrice) / this.position.entryPrice) * 100;
        } else {
            return ((this.position.entryPrice - this.currentCurrency.price) / this.position.entryPrice) * 100;
        }
    }

    setStopOrder() {
        if (!this.hasPosition) return;
        
        if (this.position.type === 'long') {
            this.stopLoss = this.position.entryPrice * 0.95;
            this.takeProfit = this.position.entryPrice * 1.10;
        } else {
            this.stopLoss = this.position.entryPrice * 1.05;
            this.takeProfit = this.position.entryPrice * 0.90;
        }
        
        this.updateUI();
        this.updateChart();
        this.saveGameData();
        
        this.showMessage('Стоп-ордера установлены!');
    }

    checkStopOrders() {
        if (!this.hasPosition) return;
        
        const currentPrice = this.currentCurrency.price;
        
        if (this.position.type === 'long') {
            if (this.stopLoss > 0 && currentPrice <= this.stopLoss) {
                this.closePosition();
                this.showMessage('СТОП-ЛОСС СРАБОТАЛ!');
            }
            if (this.takeProfit > 0 && currentPrice >= this.takeProfit) {
                this.closePosition();
                this.showMessage('ТЕЙК-ПРОФИТ СРАБОТАЛ!');
            }
        } else {
            if (this.stopLoss > 0 && currentPrice >= this.stopLoss) {
                this.closePosition();
                this.showMessage('СТОП-ЛОСС СРАБОТАЛ!');
            }
            if (this.takeProfit > 0 && currentPrice <= this.takeProfit) {
                this.closePosition();
                this.showMessage('ТЕЙК-ПРОФИТ СРАБОТАЛ!');
            }
        }
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

    updateChart() {
        this.chart.clear();
        this.ordersGraphics.clear();
        
        const { width, height } = this.cameras.main;
        const chartWidth = width - this.layout.padding * 2;
        const chartHeight = this.layout.chartHeight - 40;
        const startY = this.layout.headerHeight + 20;
        
        const history = this.currentCurrency.history;
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        history.forEach((price, index) => {
            const x = this.layout.padding + (index / (history.length - 1)) * chartWidth;
            const y = startY + chartHeight - ((price - minPrice) / range) * chartHeight;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
        
        // ВИЗУАЛИЗАЦИЯ ПОЗИЦИЙ И ОРДЕРОВ (ВЕРНУЛИ ИНДИКАТОРЫ)
        if (this.hasPosition) {
            this.drawPositionMarkers(minPrice, maxPrice, startY, chartHeight, range, chartWidth);
        }
    }

    drawPositionMarkers(minPrice, maxPrice, startY, height, range, width) {
        // Маркер цены входа
        const entryY = startY + height - ((this.position.entryPrice - minPrice) / range) * height;
        
        const positionColor = this.position.type === 'long' ? 0x27ae60 : 0xe74c3c;
        
        // Пунктирная линия цены входа через весь график
        this.ordersGraphics.lineStyle(2, positionColor, 0.6);
        this.drawDashedLine(this.ordersGraphics, 
            this.layout.padding, entryY, 
            this.layout.padding + width, entryY, 8, 4);
        
        // Маркер точки входа
        this.ordersGraphics.fillStyle(positionColor, 1);
        this.ordersGraphics.fillCircle(this.layout.padding + width + 3, entryY, 6);
        
        this.ordersGraphics.lineStyle(2, 0xffffff, 1);
        this.ordersGraphics.strokeCircle(this.layout.padding + width + 3, entryY, 6);
        
        // Подпись позиции
        this.ordersGraphics.fillStyle(positionColor, 0.9);
        this.ordersGraphics.fillRect(this.layout.padding + width + 10, entryY - 10, 85, 16);
        
        const positionText = this.position.type === 'long' ? 'LONG' : 'SHORT';
        this.add.text(this.layout.padding + width + 13, entryY - 8, `${positionText}: $${this.position.entryPrice.toFixed(2)}`, { 
            fontSize: this.getAdaptiveFontSize(9),
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });

        // Стоп-лосс и тейк-профит
        if (this.stopLoss > 0) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            const stopColor = 0xe74c3c;
            
            this.ordersGraphics.lineStyle(3, stopColor, 0.9);
            this.ordersGraphics.lineBetween(this.layout.padding, stopY, this.layout.padding + width, stopY);
            
            this.ordersGraphics.fillStyle(stopColor, 0.9);
            this.ordersGraphics.fillRect(this.layout.padding + 5, stopY - 12, 60, 16);
            
            this.add.text(this.layout.padding + 10, stopY - 10, `SL: $${this.stopLoss.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(10),
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
        }
        
        if (this.takeProfit > 0) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            const profitColor = 0x27ae60;
            
            this.ordersGraphics.lineStyle(3, profitColor, 0.9);
            this.ordersGraphics.lineBetween(this.layout.padding, profitY, this.layout.padding + width, profitY);
            
            this.ordersGraphics.fillStyle(profitColor, 0.9);
            this.ordersGraphics.fillRect(this.layout.padding + 5, profitY - 12, 65, 16);
            
            this.add.text(this.layout.padding + 10, profitY - 10, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(10),
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
        }
    }

    // Функция для рисования пунктирных линий
    drawDashedLine(graphics, x1, y1, x2, y2, dashLength, gapLength) {
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const dashTotal = dashLength + gapLength;
        const dashes = Math.floor(distance / dashTotal);
        const remainder = distance % dashTotal;
        
        let currentX = x1;
        let currentY = y1;
        
        for (let i = 0; i < dashes; i++) {
            const dashProgress = (i * dashTotal) / distance;
            const nextDashProgress = ((i * dashTotal) + dashLength) / distance;
            
            const dashX1 = Phaser.Math.Interpolation.Linear([x1, x2], dashProgress);
            const dashY1 = Phaser.Math.Interpolation.Linear([y1, y2], dashProgress);
            const dashX2 = Phaser.Math.Interpolation.Linear([x1, x2], nextDashProgress);
            const dashY2 = Phaser.Math.Interpolation.Linear([y1, y2], nextDashProgress);
            
            graphics.lineBetween(dashX1, dashY1, dashX2, dashY2);
        }
    }

    updateUI() {
        this.balanceText.setText(`Баланс: $${this.balance.toFixed(2)}`);
        this.statsText.setText(this.getStatsString());
        
        if (this.hasPosition) {
            const profit = this.calculateCurrentProfit();
            const profitPercent = this.calculateProfitPercent();
            
            this.profitText.setText(`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
            this.profitText.setFill(profit >= 0 ? '#27ae60' : '#e74c3c');
        } else {
            this.profitText.setText('');
        }
        
        this.updateButtonStates();
        this.updatePositionInfo();
    }

    updateButtonStates() {
        const hasPosition = this.hasPosition;
        
        this.longButton.setAlpha(hasPosition ? 0.5 : 1);
        this.shortButton.setAlpha(hasPosition ? 0.5 : 1);
        this.closeButton.setAlpha(hasPosition ? 1 : 0.5);
        this.stopButton.setAlpha(hasPosition ? 1 : 0.5);
    }

    updatePositionInfo() {
        if (this.hasPosition) {
            const type = this.position.type.toUpperCase();
            const entryPrice = this.position.entryPrice.toFixed(2);
            const coins = this.position.coins;
            const currentProfit = this.calculateCurrentProfit().toFixed(2);
            
            let info = `${type} | Вход: $${entryPrice} | Монет: ${coins}`;
            if (this.stopLoss > 0) info += ` | SL: $${this.stopLoss.toFixed(2)}`;
            if (this.takeProfit > 0) info += ` | TP: $${this.takeProfit.toFixed(2)}`;
            
            this.positionInfo.setText(info);
            this.positionInfo.setFill(this.position.type === 'long' ? '#27ae60' : '#e74c3c');
        } else {
            this.positionInfo.setText('Нет открытой позиции');
            this.positionInfo.setFill('#666');
        }
    }

    getStatsString() {
        return `Сделки: ${this.stats.totalTrades} | Успешные: ${this.stats.successfulTrades} | Прибыль: $${this.stats.totalProfit.toFixed(2)}`;
    }

    showMessage(text) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#f39c12',
            fontFamily: 'Arial',
            backgroundColor: '#ffffff',
            padding: { left: 15, right: 15, top: 8, bottom: 8 }
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
        });
    }

    switchCurrency(direction) {
        if (this.hasPosition) return;
        
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

    getCurrentVolatility() {
        let baseVolatility = this.currentCurrency.volatility;
        if (this.activeEvent) {
            baseVolatility *= this.activeEvent.effect.multiplier;
        }
        return baseVolatility;
    }

    triggerRandomEvent() {
        if (this.activeEvent) return;
        
        const event = this.eventsSystem.getRandomEvent();
        this.activeEvent = event;
        this.eventEndTime = Date.now() + event.effect.duration;
        
        this.eventPanel.setFillStyle(event.color, 0.9).setVisible(true);
        this.eventText.setText(`${event.icon} ${event.title} - ${event.description}`).setVisible(true);
        
        this.tweens.add({
            targets: [this.eventPanel, this.eventText],
            alpha: { from: 0, to: 1 },
            duration: 500
        });
        
        this.time.delayedCall(event.effect.duration, () => {
            this.endEvent();
        });
    }

    endEvent() {
        if (this.activeEvent) {
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

    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { 
                    keys: ['balance', 'position', 'stats', 'stopLoss', 'takeProfit'] 
                });
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.position) this.position = JSON.parse(data.position);
                if (data.stats) this.stats = JSON.parse(data.stats);
                if (data.stopLoss) this.stopLoss = parseFloat(data.stopLoss);
                if (data.takeProfit) this.takeProfit = parseFloat(data.takeProfit);
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
                    position: JSON.stringify(this.position),
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
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#f8f9fa',
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        roundPixels: true
    }
};

window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запускаем игру...');
    
    setTimeout(() => {
        try {
            const game = new Phaser.Game(config);
            console.log('Phaser игра создана успешно');
            
            window.addEventListener('resize', () => {
                game.scale.refresh();
            });
            
        } catch (error) {
            console.error('Ошибка при создании игры:', error);
        }
    }, 100);
});