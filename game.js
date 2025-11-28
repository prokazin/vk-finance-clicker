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
            { name: 'VKoin', price: 100, history: [], color: 0x007AFF, volatility: 0.3 },
            { name: 'Memecoin', price: 50, history: [], color: 0xFF3B30, volatility: 0.6 },
            { name: 'Social Token', price: 200, history: [], color: 0x5856D6, volatility: 0.2 }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };

        // iOS-style цвета
        this.colors = {
            background: 0xF2F2F7,
            card: 0xFFFFFF,
            textPrimary: 0x000000,
            textSecondary: 0x8E8E93,
            green: 0x34C759,
            red: 0xFF3B30,
            blue: 0x007AFF,
            purple: 0x5856D6,
            orange: 0xFF9500,
            gray: 0xC7C7CC
        };

        this.eventsSystem = {
            news: [
                {
                    id: 1,
                    title: "🚀 Космический рост!",
                    description: "Институциональные инвесторы входят в рынок",
                    effect: { multiplier: 2.2, duration: 15000 },
                    color: 0x34C759,
                    icon: "🚀"
                },
                {
                    id: 2,
                    title: "📈 Бычий прорыв!",
                    description: "Цены обновляют годовые максимумы",
                    effect: { multiplier: 1.8, duration: 12000 },
                    color: 0x34C759,
                    icon: "📈"
                },
                {
                    id: 6,
                    title: "📉 Обвал рынка!",
                    description: "Паника на глобальных биржах",
                    effect: { multiplier: 0.4, duration: 14000 },
                    color: 0xFF3B30,
                    icon: "📉"
                },
                {
                    id: 7,
                    title: "🐻 Медвежья ловушка!",
                    description: "Крупные игроки открывают шорты",
                    effect: { multiplier: 0.6, duration: 12000 },
                    color: 0xFF3B30,
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
        
        // Устанавливаем iOS-style фон
        this.cameras.main.setBackgroundColor(this.colors.background);
        
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

        // iOS-style карточка для заголовка
        this.headerCard = this.add.rectangle(centerX, headerY, width - this.layout.padding * 2, this.layout.headerHeight - 20, this.colors.card)
            .setStrokeStyle(1, this.colors.gray);

        // Верхняя панель - iOS стиль
        this.currencyText = this.add.text(centerX, headerY - 35, this.currentCurrency.name, {
            fontSize: this.getAdaptiveFontSize(28),
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        this.priceText = this.add.text(centerX, headerY - 5, `$${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: this.getAdaptiveFontSize(32),
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        this.balanceText = this.add.text(centerX, headerY + 25, `Баланс: $${this.balance.toFixed(2)}`, {
            fontSize: this.getAdaptiveFontSize(16),
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Кнопки переключения валют - iOS стиль
        this.prevButton = this.add.rectangle(this.layout.padding + 40, headerY - 5, 60, 36, this.colors.card)
            .setStrokeStyle(1, this.colors.gray)
            .setInteractive();
        this.add.text(this.layout.padding + 40, headerY - 5, '←', {
            fontSize: this.getAdaptiveFontSize(20),
            fill: this.hexToColor(this.colors.blue),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        this.nextButton = this.add.rectangle(width - this.layout.padding - 40, headerY - 5, 60, 36, this.colors.card)
            .setStrokeStyle(1, this.colors.gray)
            .setInteractive();
        this.add.text(width - this.layout.padding - 40, headerY - 5, '→', {
            fontSize: this.getAdaptiveFontSize(20),
            fill: this.hexToColor(this.colors.blue),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Статистика
        this.statsText = this.add.text(centerX, headerY + 50, this.getStatsString(), {
            fontSize: this.getAdaptiveFontSize(14),
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, headerY + 70, '', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: this.hexToColor(this.colors.green),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // iOS-style карточка для графика
        this.chartCard = this.add.rectangle(centerX, chartY, width - this.layout.padding * 2, this.layout.chartHeight - 20, this.colors.card)
            .setStrokeStyle(1, this.colors.gray);

        // Панель события - iOS уведомление
        this.eventPanel = this.add.rectangle(centerX, headerY + 100, width - this.layout.padding * 2, 45, 0x000000, 0)
            .setVisible(false);
        this.eventText = this.add.text(centerX, headerY + 100, '', {
            fontSize: this.getAdaptiveFontSize(14),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '500'
        }).setOrigin(0.5).setVisible(false);

        // iOS-style кнопки действий
        const buttonWidth = this.getAdaptiveSize(150);
        const buttonHeight = this.getAdaptiveSize(52);
        const buttonSpacing = 15;
        const buttonRadius = 12;
        
        // Кнопка LONG (iOS green)
        this.longButton = this.add.rectangle(centerX - buttonWidth - buttonSpacing/2, buttonY - 30, buttonWidth, buttonHeight, this.colors.green)
            .setInteractive();
        this.add.text(centerX - buttonWidth - buttonSpacing/2, buttonY - 30, 'LONG', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Кнопка SHORT (iOS red)
        this.shortButton = this.add.rectangle(centerX + buttonWidth + buttonSpacing/2, buttonY - 30, buttonWidth, buttonHeight, this.colors.red)
            .setInteractive();
        this.add.text(centerX + buttonWidth + buttonSpacing/2, buttonY - 30, 'SHORT', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Кнопка закрытия позиции (iOS orange)
        this.closeButton = this.add.rectangle(centerX, buttonY - 30, buttonWidth * 1.3, buttonHeight, this.colors.orange)
            .setInteractive();
        this.add.text(centerX, buttonY - 30, 'CLOSE', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // iOS-style кнопка стоп-ордеров
        const stopButtonWidth = this.getAdaptiveSize(200);
        const stopButtonHeight = this.getAdaptiveSize(44);
        this.stopButton = this.add.rectangle(centerX, buttonY + 15, stopButtonWidth, stopButtonHeight, this.colors.purple)
            .setInteractive();
        this.add.text(centerX, buttonY + 15, 'STOP ORDER', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // iOS-style информационная панель позиции
        this.positionCard = this.add.rectangle(centerX, buttonY - 65, width - this.layout.padding * 2, 45, this.colors.card)
            .setStrokeStyle(1, this.colors.gray);
        
        this.positionInfo = this.add.text(centerX, buttonY - 65, 'No Open Position', {
            fontSize: this.getAdaptiveFontSize(15),
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updatePositionInfo();
    }

    hexToColor(hex) {
        return '#' + hex.toString(16).padStart(6, '0');
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
        
        // Обновляем цену в реальном времени
        this.priceText.setText(`$${currency.price.toFixed(2)}`);
        
        this.checkStopOrders();
        this.updateChart();
        this.updateUI();
    }

    updateChart() {
        this.chart.clear();
        this.ordersGraphics.clear();
        
        const { width, height } = this.cameras.main;
        const chartWidth = width - this.layout.padding * 2 - 40;
        const chartHeight = this.layout.chartHeight - 60;
        const startX = this.layout.padding + 20;
        const startY = this.layout.headerHeight + 30;
        
        const history = this.currentCurrency.history;
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика - iOS стиль
        this.chart.lineStyle(4, this.currentCurrency.color, 1);
        
        history.forEach((price, index) => {
            const x = startX + (index / (history.length - 1)) * chartWidth;
            const y = startY + chartHeight - ((price - minPrice) / range) * chartHeight;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
        
        // ВИЗУАЛИЗАЦИЯ ПОЗИЦИЙ И ОРДЕРОВ - iOS стиль
        if (this.hasPosition) {
            this.drawPositionMarkers(minPrice, maxPrice, startY, chartHeight, range, chartWidth, startX);
        }
    }

    drawPositionMarkers(minPrice, maxPrice, startY, height, range, width, startX) {
        // Маркер цены входа
        const entryY = startY + height - ((this.position.entryPrice - minPrice) / range) * height;
        
        const positionColor = this.position.type === 'long' ? this.colors.green : this.colors.red;
        
        // Пунктирная линия цены входа - iOS стиль
        this.ordersGraphics.lineStyle(2, positionColor, 0.3);
        this.drawDashedLine(this.ordersGraphics, 
            startX, entryY, 
            startX + width, entryY, 6, 4);
        
        // Маркер точки входа - iOS стиль
        this.ordersGraphics.fillStyle(positionColor, 1);
        this.ordersGraphics.fillCircle(startX + width + 5, entryY, 8);
        
        this.ordersGraphics.lineStyle(2, this.colors.card, 1);
        this.ordersGraphics.strokeCircle(startX + width + 5, entryY, 8);
        
        // Подпись позиции - iOS стиль
        this.ordersGraphics.fillStyle(positionColor, 0.9);
        this.ordersGraphics.fillRoundedRect(startX + width + 15, entryY - 12, 90, 24, 6);
        
        const positionText = this.position.type === 'long' ? 'LONG' : 'SHORT';
        this.add.text(startX + width + 20, entryY - 10, `${positionText}: $${this.position.entryPrice.toFixed(2)}`, { 
            fontSize: this.getAdaptiveFontSize(10),
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        });

        // Стоп-лосс и тейк-профит - iOS стиль
        if (this.stopLoss > 0) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(3, this.colors.red, 0.8);
            this.ordersGraphics.lineBetween(startX, stopY, startX + width, stopY);
            
            this.ordersGraphics.fillStyle(this.colors.red, 0.9);
            this.ordersGraphics.fillRoundedRect(startX + 5, stopY - 14, 70, 28, 6);
            
            this.add.text(startX + 10, stopY - 12, `SL: $${this.stopLoss.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(11),
                fill: '#FFFFFF',
                fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
                fontWeight: '600'
            });
        }
        
        if (this.takeProfit > 0) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(3, this.colors.green, 0.8);
            this.ordersGraphics.lineBetween(startX, profitY, startX + width, profitY);
            
            this.ordersGraphics.fillStyle(this.colors.green, 0.9);
            this.ordersGraphics.fillRoundedRect(startX + 5, profitY - 14, 75, 28, 6);
            
            this.add.text(startX + 10, profitY - 12, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(11),
                fill: '#FFFFFF',
                fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
                fontWeight: '600'
            });
        }
    }

    drawDashedLine(graphics, x1, y1, x2, y2, dashLength, gapLength) {
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const dashTotal = dashLength + gapLength;
        const dashes = Math.floor(distance / dashTotal);
        
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
            this.profitText.setFill(this.hexToColor(profit >= 0 ? this.colors.green : this.colors.red));
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
            const profitPercent = this.calculateProfitPercent().toFixed(2);
            
            let info = `${type} | Entry: $${entryPrice} | Coins: ${coins}`;
            if (this.stopLoss > 0) info += ` | SL: $${this.stopLoss.toFixed(2)}`;
            if (this.takeProfit > 0) info += ` | TP: $${this.takeProfit.toFixed(2)}`;
            
            this.positionInfo.setText(info);
            this.positionInfo.setFill(this.hexToColor(this.position.type === 'long' ? this.colors.green : this.colors.red));
        } else {
            this.positionInfo.setText('No Open Position');
            this.positionInfo.setFill(this.hexToColor(this.colors.textSecondary));
        }
    }

    getStatsString() {
        return `Trades: ${this.stats.totalTrades} | Win: ${this.stats.successfulTrades} | P&L: $${this.stats.totalProfit.toFixed(2)}`;
    }

    showMessage(text) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: this.getAdaptiveFontSize(16),
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '500',
            backgroundColor: this.hexToColor(this.colors.card),
            padding: { left: 20, right: 20, top: 12, bottom: 12 }
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: message,
            alpha: 0,
            duration: 2000,
            onComplete: () => {
                message.destroy();
            }
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
        this.priceText.setText(`$${this.currentCurrency.price.toFixed(2)}`);
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
        
        this.eventPanel.setFillStyle(event.color, 0.95).setVisible(true);
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
    backgroundColor: 0xF2F2F7,
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