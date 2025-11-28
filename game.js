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

        // iOS 26 Colors
        this.colors = {
            background: 0xF2F2F7,
            card: 0xFFFFFF,
            textPrimary: 0x000000,
            textSecondary: 0x8E8E93,
            green: 0x30D158,
            red: 0xFF453A,
            blue: 0x0A84FF,
            indigo: 0x5E5CE6,
            orange: 0xFF9F0A,
            teal: 0x64D2FF,
            gray: 0x8E8E93,
            gray2: 0x636366,
            gray3: 0x48484A
        };

        this.eventsSystem = {
            news: [
                {
                    id: 1,
                    title: "🚀 Institutional Inflow",
                    description: "Major funds entering the market",
                    effect: { multiplier: 2.2, duration: 15000 },
                    color: 0x30D158,
                    icon: "🚀"
                },
                {
                    id: 2,
                    title: "📈 Bullish Breakout",
                    description: "Prices hitting new yearly highs",
                    effect: { multiplier: 1.8, duration: 12000 },
                    color: 0x30D158,
                    icon: "📈"
                },
                {
                    id: 6,
                    title: "📉 Market Crash",
                    description: "Panic selling across exchanges",
                    effect: { multiplier: 0.4, duration: 14000 },
                    color: 0xFF453A,
                    icon: "📉"
                },
                {
                    id: 7,
                    title: "🐻 Bear Trap",
                    description: "Large players opening shorts",
                    effect: { multiplier: 0.6, duration: 12000 },
                    color: 0xFF453A,
                    icon: "🐻"
                }
            ],
            getRandomEvent: function() {
                return this.news[Math.floor(Math.random() * this.news.length)];
            }
        };

        this.layout = {
            padding: 24,
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
        
        // iOS background
        this.cameras.main.setBackgroundColor(this.colors.background);
        
        // Initialize price history
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });

        this.createUI();
        this.createChart();
        this.setupEventListeners();
        
        // Price update loop
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });

        // Random events
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
        this.layout.padding = Math.min(width * 0.05, 24);
        this.layout.headerHeight = height * 0.22;
        this.layout.chartHeight = height * 0.48;
        this.layout.buttonHeight = height * 0.30;
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

        // Header Card with iOS 26 blur effect simulation
        this.headerCard = this.add.rectangle(centerX, headerY, width - this.layout.padding * 2, this.layout.headerHeight - 20, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray3);

        // Currency name - iOS 26 large title style
        this.currencyText = this.add.text(centerX, headerY - 40, this.currentCurrency.name, {
            fontSize: '28px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        // Current price - iOS 26 dynamic type
        this.priceText = this.add.text(centerX, headerY - 5, `$${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '36px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '800'
        }).setOrigin(0.5);

        // Balance - iOS 26 caption style
        this.balanceText = this.add.text(centerX, headerY + 30, `Balance: $${this.balance.toFixed(2)}`, {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Currency switcher - iOS 26 segmented control style
        const switchWidth = 70;
        const switchHeight = 36;
        
        this.prevButton = this.add.rectangle(this.layout.padding + 45, headerY - 5, switchWidth, switchHeight, this.colors.card)
            .setStrokeStyle(1, this.colors.gray2)
            .setInteractive();
        this.add.text(this.layout.padding + 45, headerY - 5, '←', {
            fontSize: '20px',
            fill: this.hexToColor(this.colors.blue),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        this.nextButton = this.add.rectangle(width - this.layout.padding - 45, headerY - 5, switchWidth, switchHeight, this.colors.card)
            .setStrokeStyle(1, this.colors.gray2)
            .setInteractive();
        this.add.text(width - this.layout.padding - 45, headerY - 5, '→', {
            fontSize: '20px',
            fill: this.hexToColor(this.colors.blue),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Stats - iOS 26 footnote style
        this.statsText = this.add.text(centerX, headerY + 55, this.getStatsString(), {
            fontSize: '14px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Profit/Loss display
        this.profitText = this.add.text(centerX, headerY + 75, '', {
            fontSize: '18px',
            fill: this.hexToColor(this.colors.green),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Chart Card - iOS 26 style
        this.chartCard = this.add.rectangle(centerX, chartY, width - this.layout.padding * 2, this.layout.chartHeight - 20, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray3);

        // Event notification - iOS 26 banner style
        this.eventPanel = this.add.rectangle(centerX, headerY + 105, width - this.layout.padding * 2, 42, 0x000000, 0)
            .setVisible(false);
        this.eventText = this.add.text(centerX, headerY + 105, '', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '500'
        }).setOrigin(0.5).setVisible(false);

        // Action Buttons - iOS 26 style
        const buttonWidth = 160;
        const buttonHeight = 56;
        const buttonSpacing = 16;
        
        // LONG Button - iOS 26 filled style
        this.longButton = this.add.rectangle(centerX - buttonWidth - buttonSpacing/2, buttonY - 40, buttonWidth, buttonHeight, this.colors.green)
            .setInteractive();
        this.add.text(centerX - buttonWidth - buttonSpacing/2, buttonY - 40, 'LONG', {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // SHORT Button - iOS 26 filled style
        this.shortButton = this.add.rectangle(centerX + buttonWidth + buttonSpacing/2, buttonY - 40, buttonWidth, buttonHeight, this.colors.red)
            .setInteractive();
        this.add.text(centerX + buttonWidth + buttonSpacing/2, buttonY - 40, 'SHORT', {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // CLOSE Button - iOS 26 gray style
        this.closeButton = this.add.rectangle(centerX, buttonY - 40, buttonWidth * 1.4, buttonHeight, this.colors.gray2)
            .setInteractive();
        this.add.text(centerX, buttonY - 40, 'CLOSE POSITION', {
            fontSize: '17px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // STOP ORDER Button - iOS 26 tinted style
        const stopButtonWidth = 200;
        const stopButtonHeight = 48;
        this.stopButton = this.add.rectangle(centerX, buttonY + 10, stopButtonWidth, stopButtonHeight, this.colors.indigo)
            .setInteractive();
        this.add.text(centerX, buttonY + 10, 'STOP ORDER', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Position Info Card - iOS 26 style
        this.positionCard = this.add.rectangle(centerX, buttonY - 80, width - this.layout.padding * 2, 50, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray3);
        
        this.positionInfo = this.add.text(centerX, buttonY - 80, 'No Open Position', {
            fontSize: '15px',
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
            this.showMessage(`LONG opened at $${this.position.entryPrice.toFixed(2)}`);
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
            this.showMessage(`SHORT opened at $${this.position.entryPrice.toFixed(2)}`);
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
        
        this.showMessage(`${positionType} closed! P&L: $${profit.toFixed(2)}`);
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
        
        this.showMessage('Stop orders set!');
    }

    checkStopOrders() {
        if (!this.hasPosition) return;
        
        const currentPrice = this.currentCurrency.price;
        
        if (this.position.type === 'long') {
            if (this.stopLoss > 0 && currentPrice <= this.stopLoss) {
                this.closePosition();
                this.showMessage('STOP LOSS TRIGGERED!');
            }
            if (this.takeProfit > 0 && currentPrice >= this.takeProfit) {
                this.closePosition();
                this.showMessage('TAKE PROFIT TRIGGERED!');
            }
        } else {
            if (this.stopLoss > 0 && currentPrice >= this.stopLoss) {
                this.closePosition();
                this.showMessage('STOP LOSS TRIGGERED!');
            }
            if (this.takeProfit > 0 && currentPrice <= this.takeProfit) {
                this.closePosition();
                this.showMessage('TAKE PROFIT TRIGGERED!');
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
        
        // Update real-time price display
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
        if (history.length < 2) return;
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Draw chart line - iOS 26 style
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        // Smooth line drawing
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = startX + (i / (history.length - 1)) * chartWidth;
            const y1 = startY + chartHeight - ((history[i] - minPrice) / range) * chartHeight;
            const x2 = startX + ((i + 1) / (history.length - 1)) * chartWidth;
            const y2 = startY + chartHeight - ((history[i + 1] - minPrice) / range) * chartHeight;
            
            this.chart.lineBetween(x1, y1, x2, y2);
        }
        
        this.chart.strokePath();
        
        // Draw position markers and orders
        if (this.hasPosition) {
            this.drawPositionMarkers(minPrice, maxPrice, startY, chartHeight, range, chartWidth, startX);
        }
    }

    drawPositionMarkers(minPrice, maxPrice, startY, height, range, width, startX) {
        // Entry price marker
        const entryY = startY + height - ((this.position.entryPrice - minPrice) / range) * height;
        const positionColor = this.position.type === 'long' ? this.colors.green : this.colors.red;
        
        // Entry line - iOS 26 style dashed
        this.ordersGraphics.lineStyle(2, positionColor, 0.3);
        this.drawDashedLine(this.ordersGraphics, startX, entryY, startX + width, entryY, 8, 6);
        
        // Entry point marker
        this.ordersGraphics.fillStyle(positionColor, 1);
        this.ordersGraphics.fillCircle(startX + width + 6, entryY, 9);
        this.ordersGraphics.lineStyle(2, this.colors.card, 1);
        this.ordersGraphics.strokeCircle(startX + width + 6, entryY, 9);
        
        // Entry label - iOS 26 style
        this.ordersGraphics.fillStyle(positionColor, 0.95);
        this.ordersGraphics.fillRoundedRect(startX + width + 18, entryY - 14, 95, 28, 8);
        
        const positionText = this.position.type === 'long' ? 'LONG' : 'SHORT';
        this.add.text(startX + width + 23, entryY - 12, `${positionText} $${this.position.entryPrice.toFixed(2)}`, { 
            fontSize: '11px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        });

        // Stop Loss
        if (this.stopLoss > 0) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(3, this.colors.red, 0.8);
            this.ordersGraphics.lineBetween(startX, stopY, startX + width, stopY);
            
            this.ordersGraphics.fillStyle(this.colors.red, 0.95);
            this.ordersGraphics.fillRoundedRect(startX + 8, stopY - 15, 75, 30, 8);
            
            this.add.text(startX + 13, stopY - 13, `SL $${this.stopLoss.toFixed(2)}`, { 
                fontSize: '12px',
                fill: '#FFFFFF',
                fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
                fontWeight: '600'
            });
        }
        
        // Take Profit
        if (this.takeProfit > 0) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(3, this.colors.green, 0.8);
            this.ordersGraphics.lineBetween(startX, profitY, startX + width, profitY);
            
            this.ordersGraphics.fillStyle(this.colors.green, 0.95);
            this.ordersGraphics.fillRoundedRect(startX + 8, profitY - 15, 80, 30, 8);
            
            this.add.text(startX + 13, profitY - 13, `TP $${this.takeProfit.toFixed(2)}`, { 
                fontSize: '12px',
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
        this.balanceText.setText(`Balance: $${this.balance.toFixed(2)}`);
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
            
            let info = `${type} • Entry: $${entryPrice} • Size: ${coins}`;
            if (this.stopLoss > 0) info += ` • SL: $${this.stopLoss.toFixed(2)}`;
            if (this.takeProfit > 0) info += ` • TP: $${this.takeProfit.toFixed(2)}`;
            
            this.positionInfo.setText(info);
            this.positionInfo.setFill(this.hexToColor(this.position.type === 'long' ? this.colors.green : this.colors.red));
        } else {
            this.positionInfo.setText('No Open Position');
            this.positionInfo.setFill(this.hexToColor(this.colors.textSecondary));
        }
    }

    getStatsString() {
        return `Trades: ${this.stats.totalTrades} • Win Rate: ${this.stats.successfulTrades} • P&L: $${this.stats.totalProfit.toFixed(2)}`;
    }

    showMessage(text) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '500',
            backgroundColor: this.hexToColor(this.colors.card),
            padding: { left: 24, right: 24, top: 16, bottom: 16 }
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
            duration: 400
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
                duration: 400,
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