class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
        this.activeEvent = null;
        this.eventEndTime = 0;
        
        // iOS 26 Modern Colors
        this.colors = {
            background: 0xF5F5F7,
            card: 0xFFFFFF,
            textPrimary: 0x1C1C1E,
            textSecondary: 0x8E8E93,
            green: 0x32D74B,
            red: 0xFF453A,
            blue: 0x0A84FF,
            indigo: 0x5E5CE6,
            orange: 0xFF9F0A,
            teal: 0x64D2FF,
            gray1: 0x8E8E93,
            gray2: 0x636366,
            gray3: 0x48484A,
            gray4: 0x3A3A3C,
            gray5: 0x2C2C2E,
            gray6: 0x1C1C1E
        };

        this.currencies = [
            { 
                name: 'VKoin', 
                price: 100, 
                history: [], 
                color: 0x0A84FF, 
                volatility: 0.3,
                icon: '🔵'
            },
            { 
                name: 'Memecoin', 
                price: 50, 
                history: [], 
                color: 0xFF453A, 
                volatility: 0.6,
                icon: '🟠'
            },
            { 
                name: 'Social Token', 
                price: 200, 
                history: [], 
                color: 0x5E5CE6, 
                volatility: 0.2,
                icon: '🟣'
            }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };

        this.layout = {
            padding: 28,
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
        this.calculateLayout();
        
        // Modern iOS background
        this.cameras.main.setBackgroundColor(this.colors.background);
        
        // Initialize history
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });

        this.createUI();
        this.createChart();
        this.setupEventListeners();
        
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });

        console.log('🚀 iOS 26 Trading Game Started');
    }

    calculateLayout() {
        const { width, height } = this.cameras.main;
        this.layout.padding = 28;
        this.layout.headerHeight = height * 0.24;
        this.layout.chartHeight = height * 0.45;
        this.layout.buttonHeight = height * 0.31;
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

        // Modern Header with gradient effect
        this.headerCard = this.add.rectangle(centerX, headerY, width - this.layout.padding * 2, this.layout.headerHeight - 24, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray1)
            .setDepth(1);

        // Currency icon and name
        this.currencyIcon = this.add.text(centerX, headerY - 45, this.currentCurrency.icon, {
            fontSize: '32px',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont'
        }).setOrigin(0.5).setDepth(2);

        this.currencyText = this.add.text(centerX, headerY - 15, this.currentCurrency.name, {
            fontSize: '22px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5).setDepth(2);

        // Current price - Large dynamic display
        this.priceText = this.add.text(centerX, headerY + 15, `$${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '42px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '800'
        }).setOrigin(0.5).setDepth(2);

        // Balance display
        this.balanceText = this.add.text(centerX, headerY + 55, `Balance: $${this.balance.toFixed(2)}`, {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5).setDepth(2);

        // Modern currency switcher
        const switchSize = 44;
        this.prevButton = this.createModernButton(this.layout.padding + 50, headerY + 10, switchSize, switchSize, '←', this.colors.blue);
        this.nextButton = this.createModernButton(width - this.layout.padding - 50, headerY + 10, switchSize, switchSize, '→', this.colors.blue);

        // Stats display
        this.statsText = this.add.text(centerX, headerY + 80, this.getStatsString(), {
            fontSize: '14px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5).setDepth(2);

        // Profit/Loss display
        this.profitText = this.add.text(centerX, headerY + 100, '', {
            fontSize: '18px',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5).setDepth(2);

        // Modern Chart Card
        this.chartCard = this.add.rectangle(centerX, chartY, width - this.layout.padding * 2, this.layout.chartHeight - 24, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray1)
            .setDepth(1);

        // Action Buttons Section
        this.createActionButtons(centerX, buttonY, width);

        // Position Info Card
        this.positionCard = this.add.rectangle(centerX, buttonY - 85, width - this.layout.padding * 2, 52, this.colors.card)
            .setStrokeStyle(0.5, this.colors.gray1)
            .setDepth(1);
        
        this.positionInfo = this.add.text(centerX, buttonY - 85, 'No active position', {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5).setDepth(2);

        this.updateButtonStates();
        this.updatePositionInfo();
    }

    createModernButton(x, y, width, height, text, color) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive()
            .setDepth(2);
        
        this.add.text(x, y, text, {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5).setDepth(3);
        
        return button;
    }

    createActionButtons(centerX, buttonY, width) {
        const buttonWidth = 170;
        const buttonHeight = 58;
        const buttonSpacing = 18;
        
        // LONG Button - Modern green
        this.longButton = this.add.rectangle(centerX - buttonWidth - buttonSpacing/2, buttonY - 35, buttonWidth, buttonHeight, this.colors.green)
            .setInteractive()
            .setDepth(2);
        
        this.add.text(centerX - buttonWidth - buttonSpacing/2, buttonY - 35, 'LONG', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5).setDepth(3);

        // SHORT Button - Modern red
        this.shortButton = this.add.rectangle(centerX + buttonWidth + buttonSpacing/2, buttonY - 35, buttonWidth, buttonHeight, this.colors.red)
            .setInteractive()
            .setDepth(2);
        
        this.add.text(centerX + buttonWidth + buttonSpacing/2, buttonY - 35, 'SHORT', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5).setDepth(3);

        // CLOSE Button - Modern gray
        this.closeButton = this.add.rectangle(centerX, buttonY - 35, buttonWidth * 1.5, buttonHeight, this.colors.gray3)
            .setInteractive()
            .setDepth(2);
        
        this.add.text(centerX, buttonY - 35, 'CLOSE', {
            fontSize: '19px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5).setDepth(3);

        // STOP ORDER Button - Modern indigo
        const stopButtonWidth = 210;
        const stopButtonHeight = 50;
        this.stopButton = this.add.rectangle(centerX, buttonY + 25, stopButtonWidth, stopButtonHeight, this.colors.indigo)
            .setInteractive()
            .setDepth(2);
        
        this.add.text(centerX, buttonY + 25, 'STOP ORDER', {
            fontSize: '17px',
            fill: '#FFFFFF',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5).setDepth(3);
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
            this.showMessage(`🟢 LONG opened at $${this.position.entryPrice.toFixed(2)}`);
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
            this.showMessage(`🔴 SHORT opened at $${this.position.entryPrice.toFixed(2)}`);
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
        
        const emoji = profit >= 0 ? '🎉' : '💸';
        this.showMessage(`${emoji} ${positionType} closed! P&L: $${profit.toFixed(2)}`);
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
        this.showMessage('🛡️ Stop orders set');
    }

    checkStopOrders() {
        if (!this.hasPosition) return;
        
        const currentPrice = this.currentCurrency.price;
        
        if (this.position.type === 'long') {
            if (this.stopLoss > 0 && currentPrice <= this.stopLoss) {
                this.closePosition();
                this.showMessage('🔴 STOP LOSS triggered');
            }
            if (this.takeProfit > 0 && currentPrice >= this.takeProfit) {
                this.closePosition();
                this.showMessage('🟢 TAKE PROFIT triggered');
            }
        } else {
            if (this.stopLoss > 0 && currentPrice >= this.stopLoss) {
                this.closePosition();
                this.showMessage('🔴 STOP LOSS triggered');
            }
            if (this.takeProfit > 0 && currentPrice <= this.takeProfit) {
                this.closePosition();
                this.showMessage('🟢 TAKE PROFIT triggered');
            }
        }
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
        
        // Modern chart line
        this.chart.lineStyle(4, this.currentCurrency.color, 1);
        
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = startX + (i / (history.length - 1)) * chartWidth;
            const y1 = startY + chartHeight - ((history[i] - minPrice) / range) * chartHeight;
            const x2 = startX + ((i + 1) / (history.length - 1)) * chartWidth;
            const y2 = startY + chartHeight - ((history[i + 1] - minPrice) / range) * chartHeight;
            
            this.chart.lineBetween(x1, y1, x2, y2);
        }
        
        // Draw markers if position exists
        if (this.hasPosition) {
            this.drawPositionMarkers(minPrice, maxPrice, startY, chartHeight, range, chartWidth, startX);
        }
    }

    drawPositionMarkers(minPrice, maxPrice, startY, height, range, width, startX) {
        const entryY = startY + height - ((this.position.entryPrice - minPrice) / range) * height;
        const positionColor = this.position.type === 'long' ? this.colors.green : this.colors.red;
        
        // Entry line
        this.ordersGraphics.lineStyle(2, positionColor, 0.2);
        this.drawDashedLine(this.ordersGraphics, startX, entryY, startX + width, entryY, 8, 6);
        
        // Entry marker
        this.ordersGraphics.fillStyle(positionColor, 1);
        this.ordersGraphics.fillCircle(startX + width + 6, entryY, 8);
        
        // Entry label
        this.ordersGraphics.fillStyle(positionColor, 0.95);
        this.ordersGraphics.fillRoundedRect(startX + width + 18, entryY - 14, 92, 28, 14);
        
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
            this.ordersGraphics.fillRoundedRect(startX + 8, stopY - 15, 70, 30, 15);
            
            this.add.text(startX + 13, stopY - 13, `SL $${this.stopLoss.toFixed(2)}`, { 
                fontSize: '11px',
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
            this.ordersGraphics.fillRoundedRect(startX + 8, profitY - 15, 75, 30, 15);
            
            this.add.text(startX + 13, profitY - 13, `TP $${this.takeProfit.toFixed(2)}`, { 
                fontSize: '11px',
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
            
            let info = `${type} • $${entryPrice} • ${coins} coins`;
            if (this.stopLoss > 0) info += ` • SL: $${this.stopLoss.toFixed(2)}`;
            if (this.takeProfit > 0) info += ` • TP: $${this.takeProfit.toFixed(2)}`;
            
            this.positionInfo.setText(info);
            this.positionInfo.setFill(this.hexToColor(this.position.type === 'long' ? this.colors.green : this.colors.red));
        } else {
            this.positionInfo.setText('No active position');
            this.positionInfo.setFill(this.hexToColor(this.colors.textSecondary));
        }
    }

    getStatsString() {
        return `Trades: ${this.stats.totalTrades} • Win: ${this.stats.successfulTrades} • P&L: $${this.stats.totalProfit.toFixed(2)}`;
    }

    showMessage(text) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: '17px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '500',
            backgroundColor: this.hexToColor(this.colors.card),
            padding: { left: 24, right: 24, top: 16, bottom: 16 }
        }).setOrigin(0.5).setDepth(10);
        
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
        
        this.currencyIcon.setText(this.currentCurrency.icon);
        this.currencyText.setText(this.currentCurrency.name);
        this.priceText.setText(`$${this.currentCurrency.price.toFixed(2)}`);
        this.updateChart();
        this.updateUI();
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: 0xF5F5F7,
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
    setTimeout(() => {
        try {
            const game = new Phaser.Game(config);
            window.addEventListener('resize', () => {
                game.scale.refresh();
            });
        } catch (error) {
            console.error('Error creating game:', error);
        }
    }, 100);
});