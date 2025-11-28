class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
        this.activeEvent = null;
        this.eventEndTime = 0;
        
        // Crypto.com Modern Colors - refined
        this.colors = {
            background: 0x0D1421,
            primary: 0x00D2FF,
            secondary: 0x884DFF,
            success: 0x00F0A5,
            danger: 0xFF5476,
            warning: 0xFFD166,
            card: 0x172036,
            textPrimary: 0xFFFFFF,
            textSecondary: 0x8B9CB5,
            accent: 0x00F0A5,
            border: 0x2A3A57
        };

        this.currencies = [
            { 
                name: 'VKoin', 
                price: 100, 
                history: [], 
                color: 0x00D2FF, 
                volatility: 0.3,
                icon: '●'
            },
            { 
                name: 'Memecoin', 
                price: 50, 
                history: [], 
                color: 0xFF5476, 
                volatility: 0.6,
                icon: '◆'
            },
            { 
                name: 'Social Token', 
                price: 200, 
                history: [], 
                color: 0x00F0A5, 
                volatility: 0.2,
                icon: '■'
            }
        ];
        this.currentCurrencyIndex = 0;
        
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };

        this.layout = {
            padding: 24,
            headerHeight: 0,
            chartHeight: 0,
            buttonHeight: 0,
            cardRadius: 12,
            buttonRadius: 8
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
        
        // Clean dark background
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
    }

    calculateLayout() {
        const { width, height } = this.cameras.main;
        this.layout.padding = 24;
        this.layout.headerHeight = Math.min(height * 0.22, 160);
        this.layout.chartHeight = Math.min(height * 0.45, 300);
        this.layout.buttonHeight = height - this.layout.headerHeight - this.layout.chartHeight;
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

        // HEADER SECTION - Perfectly aligned
        this.createHeaderSection(centerX, headerY, width);

        // CHART SECTION - Clean and organized
        this.createChartSection(centerX, chartY, width);

        // ACTION BUTTONS - Perfectly spaced
        this.createActionSection(centerX, buttonY, width);

        this.updateButtonStates();
        this.updatePositionInfo();
    }

    createHeaderSection(centerX, headerY, width) {
        // Main header card
        this.headerCard = this.add.rectangle(centerX, headerY, width - this.layout.padding * 2, this.layout.headerHeight - 16, this.colors.card)
            .setStrokeStyle(1, this.colors.border);

        // Currency icon - perfectly centered
        this.currencyIcon = this.add.text(centerX, headerY - 25, this.currentCurrency.icon, {
            fontSize: '28px',
            fill: this.hexToColor(this.currentCurrency.color),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Currency name
        this.currencyText = this.add.text(centerX, headerY, this.currentCurrency.name, {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Current price - large and prominent
        this.priceText = this.add.text(centerX, headerY + 25, `$${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '32px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        // Balance display
        this.balanceText = this.add.text(centerX, headerY + 55, `Balance: $${this.balance.toFixed(2)}`, {
            fontSize: '14px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Currency switcher - perfectly aligned
        const switchSize = 40;
        this.prevButton = this.createRoundedButton(this.layout.padding + 35, headerY + 15, switchSize, switchSize, '←', this.colors.primary);
        this.nextButton = this.createRoundedButton(width - this.layout.padding - 35, headerY + 15, switchSize, switchSize, '→', this.colors.primary);
    }

    createChartSection(centerX, chartY, width) {
        // Chart container
        this.chartCard = this.add.rectangle(centerX, chartY, width - this.layout.padding * 2, this.layout.chartHeight - 20, this.colors.card)
            .setStrokeStyle(1, this.colors.border);

        // Chart title
        this.chartTitle = this.add.text(this.layout.padding + 16, chartY - this.layout.chartHeight/2 + 20, 'PRICE CHART', {
            fontSize: '12px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600',
            letterSpacing: 1
        });

        // Stats - perfectly aligned to right
        this.statsText = this.add.text(width - this.layout.padding - 16, chartY - this.layout.chartHeight/2 + 20, this.getStatsString(), {
            fontSize: '12px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(1, 0);
    }

    createActionSection(centerX, buttonY, width) {
        const isMobile = width < 400;
        const buttonWidth = isMobile ? 140 : 160;
        const buttonHeight = 52;
        const buttonSpacing = isMobile ? 12 : 16;

        // Action buttons container
        this.buttonsCard = this.add.rectangle(centerX, buttonY - 10, width - this.layout.padding * 2, 140, this.colors.card)
            .setStrokeStyle(1, this.colors.border);

        // Position info - centered above buttons
        this.positionCard = this.add.rectangle(centerX, buttonY - 65, Math.min(width - 80, 320), 36, this.colors.card)
            .setStrokeStyle(1, this.colors.border);
        
        this.positionInfo = this.add.text(centerX, buttonY - 65, 'No active position', {
            fontSize: '13px',
            fill: this.hexToColor(this.colors.textSecondary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '400'
        }).setOrigin(0.5);

        // Profit/Loss display
        this.profitText = this.add.text(centerX, buttonY - 40, '', {
            fontSize: '18px',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        // Action buttons row 1 - perfectly spaced
        this.longButton = this.createRoundedButton(centerX - buttonWidth - buttonSpacing, buttonY - 10, buttonWidth, buttonHeight, 'LONG', this.colors.success);
        this.shortButton = this.createRoundedButton(centerX + buttonWidth + buttonSpacing, buttonY - 10, buttonWidth, buttonHeight, 'SHORT', this.colors.danger);
        
        // Close button - centered
        const closeButtonWidth = isMobile ? buttonWidth * 1.2 : buttonWidth * 1.4;
        this.closeButton = this.createRoundedButton(centerX, buttonY - 10, closeButtonWidth, buttonHeight, 'CLOSE', this.colors.primary);

        // Stop order button - centered below
        const stopButtonWidth = isMobile ? 180 : 200;
        this.stopButton = this.createRoundedButton(centerX, buttonY + 35, stopButtonWidth, 46, 'STOP ORDER', this.colors.secondary);
    }

    createRoundedButton(x, y, width, height, text, color) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive();
        
        const textColor = (color === this.colors.success || color === this.colors.primary) ? '#0D1421' : '#FFFFFF';
        
        this.add.text(x, y, text, {
            fontSize: width < 150 ? '14px' : '16px',
            fill: textColor,
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);
        
        return button;
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
            this.showMessage(`LONG opened at $${this.position.entryPrice.toFixed(2)}`, this.colors.success);
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
            this.showMessage(`SHORT opened at $${this.position.entryPrice.toFixed(2)}`, this.colors.danger);
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
        
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
        
        this.updateUI();
        this.updateChart();
        
        const color = profit >= 0 ? this.colors.success : this.colors.danger;
        this.showMessage(`Position closed! P&L: $${profit.toFixed(2)}`, color);
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
        this.showMessage('Stop orders set', this.colors.secondary);
    }

    checkStopOrders() {
        if (!this.hasPosition) return;
        
        const currentPrice = this.currentCurrency.price;
        
        if (this.position.type === 'long') {
            if (this.stopLoss > 0 && currentPrice <= this.stopLoss) {
                this.closePosition();
                this.showMessage('STOP LOSS triggered', this.colors.danger);
            }
            if (this.takeProfit > 0 && currentPrice >= this.takeProfit) {
                this.closePosition();
                this.showMessage('TAKE PROFIT triggered', this.colors.success);
            }
        } else {
            if (this.stopLoss > 0 && currentPrice >= this.stopLoss) {
                this.closePosition();
                this.showMessage('STOP LOSS triggered', this.colors.danger);
            }
            if (this.takeProfit > 0 && currentPrice <= this.takeProfit) {
                this.closePosition();
                this.showMessage('TAKE PROFIT triggered', this.colors.success);
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
        const chartHeight = this.layout.chartHeight - 80;
        const startX = this.layout.padding + 20;
        const startY = this.layout.headerHeight + 50;
        
        const history = this.currentCurrency.history;
        if (history.length < 2) return;
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Clean chart line
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = startX + (i / (history.length - 1)) * chartWidth;
            const y1 = startY + chartHeight - ((history[i] - minPrice) / range) * chartHeight;
            const x2 = startX + ((i + 1) / (history.length - 1)) * chartWidth;
            const y2 = startY + chartHeight - ((history[i + 1] - minPrice) / range) * chartHeight;
            
            this.chart.moveTo(x1, y1);
            this.chart.lineTo(x2, y2);
        }
        
        this.chart.strokePath();
        
        if (this.hasPosition) {
            this.drawPositionMarkers(minPrice, maxPrice, startY, chartHeight, range, chartWidth, startX);
        }
    }

    drawPositionMarkers(minPrice, maxPrice, startY, height, range, width, startX) {
        const entryY = startY + height - ((this.position.entryPrice - minPrice) / range) * height;
        const positionColor = this.position.type === 'long' ? this.colors.success : this.colors.danger;
        
        // Entry line
        this.ordersGraphics.lineStyle(1, positionColor, 0.3);
        this.drawDashedLine(this.ordersGraphics, startX, entryY, startX + width, entryY, 4, 3);
        
        // Entry marker
        this.ordersGraphics.fillStyle(positionColor, 1);
        this.ordersGraphics.fillCircle(startX + width + 4, entryY, 5);
        
        // Entry label
        this.ordersGraphics.fillStyle(positionColor, 0.9);
        this.ordersGraphics.fillRect(startX + width + 12, entryY - 10, 80, 20);
        
        const positionText = this.position.type === 'long' ? 'LONG' : 'SHORT';
        this.add.text(startX + width + 16, entryY - 8, `${positionText} $${this.position.entryPrice.toFixed(2)}`, { 
            fontSize: '9px',
            fill: '#0D1421',
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        });

        // Stop Loss
        if (this.stopLoss > 0) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(2, this.colors.danger, 0.8);
            this.ordersGraphics.lineBetween(startX, stopY, startX + width, stopY);
            
            this.ordersGraphics.fillStyle(this.colors.danger, 0.9);
            this.ordersGraphics.fillRect(startX + 4, stopY - 9, 55, 18);
            
            this.add.text(startX + 8, stopY - 7, `SL $${this.stopLoss.toFixed(2)}`, { 
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
                fontWeight: '600'
            });
        }
        
        // Take Profit
        if (this.takeProfit > 0) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            
            this.ordersGraphics.lineStyle(2, this.colors.success, 0.8);
            this.ordersGraphics.lineBetween(startX, profitY, startX + width, profitY);
            
            this.ordersGraphics.fillStyle(this.colors.success, 0.9);
            this.ordersGraphics.fillRect(startX + 4, profitY - 9, 60, 18);
            
            this.add.text(startX + 8, profitY - 7, `TP $${this.takeProfit.toFixed(2)}`, { 
                fontSize: '8px',
                fill: '#0D1421',
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
            this.profitText.setFill(this.hexToColor(profit >= 0 ? this.colors.success : this.colors.danger));
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
            this.positionInfo.setFill(this.hexToColor(this.position.type === 'long' ? this.colors.success : this.colors.danger));
        } else {
            this.positionInfo.setText('No active position');
            this.positionInfo.setFill(this.hexToColor(this.colors.textSecondary));
        }
    }

    getStatsString() {
        return `Trades: ${this.stats.totalTrades} • Win: ${this.stats.successfulTrades} • P&L: $${this.stats.totalProfit.toFixed(2)}`;
    }

    showMessage(text, color) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const messageBg = this.add.rectangle(centerX, messageY, 280, 44, color)
            .setAlpha(0.95);
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: '14px',
            fill: '#0D1421',
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: [messageBg, message],
            alpha: 0,
            duration: 2000,
            onComplete: () => {
                messageBg.destroy();
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
        this.currencyIcon.setFill(this.hexToColor(this.currentCurrency.color));
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
    backgroundColor: 0x0D1421,
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