class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.balance = 1000;
        this.position = null;
        this.stopLoss = 0;
        this.takeProfit = 0;
        this.activeEvent = null;
        this.eventEndTime = 0;
        
        // 🔥 ДОБАВЛЕНО: Настройки плеча и таймфреймов
        this.leverage = 1; // 1x, 2x, 5x, 10x
        this.leverageOptions = [1, 2, 5, 10];
        
        this.timeframes = [
            { name: '1min', interval: 1000, points: 50 },
            { name: '5min', interval: 5000, points: 50 },
            { name: '1hour', interval: 60000, points: 50 }
        ];
        this.currentTimeframeIndex = 0;
        
        this.priceUpdateTimer = null;
        
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
            buttonHeight: 0
        };
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    get currentTimeframe() {
        return this.timeframes[this.currentTimeframeIndex];
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

        // Загружаем сохраненные данные ПЕРЕД созданием UI
        await this.loadGameData();

        this.createUI();
        this.createChart();
        this.setupEventListeners();
        
        // 🔥 ИЗМЕНЕНО: Запуск обновления цены с учетом таймфрейма
        this.startPriceUpdates();

        console.log('🚀 VK Trading App Started');
    }

    // 🔥 ДОБАВЛЕНО: Запуск обновления цены по таймфрейму
    startPriceUpdates() {
        if (this.priceUpdateTimer) {
            this.priceUpdateTimer.remove();
        }
        
        this.priceUpdateTimer = this.time.addEvent({
            delay: this.currentTimeframe.interval,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    // 🔥 ИЗМЕНЕНО: Более реалистичная симуляция цены
    updatePrice() {
        const currency = this.currentCurrency;
        
        // Реалистичное движение цены (Geometric Brownian Motion)
        const drift = 0.0002; // Небольшой дрейф вверх
        const volatility = currency.volatility * (this.currentTimeframe.interval / 1000) * 0.01;
        const randomShock = (Math.random() - 0.5) * volatility;
        
        // Формула GBM для более реалистичного движения
        const priceChange = Math.exp(drift + randomShock);
        currency.price *= priceChange;
        currency.price = Math.max(currency.price, 0.01); // Защита от отрицательных цен
        
        currency.history.push(currency.price);
        if (currency.history.length > this.currentTimeframe.points) {
            currency.history.shift();
        }
        
        this.priceText.setText(`$${currency.price.toFixed(2)}`);
        this.checkStopOrders();
        this.updateChart();
        this.updateUI();
    }

    createHeaderSection(centerX, headerY, width) {
        // Main header card
        this.headerCard = this.add.rectangle(centerX, headerY, width - this.layout.padding * 2, this.layout.headerHeight - 16, this.colors.card)
            .setStrokeStyle(1, this.colors.border);

        // Currency icon
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

        // Current price
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

        // 🔥 ДОБАВЛЕНО: Отображение плеча и таймфрейма
        this.leverageText = this.add.text(centerX, headerY + 75, `Leverage: ${this.leverage}x | ${this.currentTimeframe.name}`, {
            fontSize: '12px',
            fill: this.hexToColor(this.colors.warning),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Currency switcher
        const switchSize = 40;
        this.prevButton = this.createRoundedButton(this.layout.padding + 35, headerY + 15, switchSize, switchSize, '←', this.colors.primary);
        this.nextButton = this.createRoundedButton(width - this.layout.padding - 35, headerY + 15, switchSize, switchSize, '→', this.colors.primary);
    }

    createActionSection(centerX, buttonY, width) {
        const isMobile = width < 400;
        const buttonWidth = isMobile ? 140 : 160;
        const buttonHeight = 52;
        const buttonSpacing = isMobile ? 12 : 16;

        // Action buttons container
        this.buttonsCard = this.add.rectangle(centerX, buttonY - 10, width - this.layout.padding * 2, 180, this.colors.card) // Увеличена высота
            .setStrokeStyle(1, this.colors.border);

        // Position info
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

        // Action buttons row 1
        this.longButton = this.createRoundedButton(centerX - buttonWidth - buttonSpacing, buttonY - 10, buttonWidth, buttonHeight, 'LONG', this.colors.success);
        this.shortButton = this.createRoundedButton(centerX + buttonWidth + buttonSpacing, buttonY - 10, buttonWidth, buttonHeight, 'SHORT', this.colors.danger);
        
        // Close button
        const closeButtonWidth = isMobile ? buttonWidth * 1.2 : buttonWidth * 1.4;
        this.closeButton = this.createRoundedButton(centerX, buttonY - 10, closeButtonWidth, buttonHeight, 'CLOSE', this.colors.primary);

        // 🔥 ДОБАВЛЕНО: Кнопки управления плечом
        const leverageButtonWidth = isMobile ? 60 : 70;
        this.leverageDownButton = this.createRoundedButton(centerX - leverageButtonWidth - 10, buttonY + 35, leverageButtonWidth, 36, '←', this.colors.secondary);
        this.leverageUpButton = this.createRoundedButton(centerX + leverageButtonWidth + 10, buttonY + 35, leverageButtonWidth, 36, '→', this.colors.secondary);
        this.leverageDisplay = this.add.text(centerX, buttonY + 35, `${this.leverage}x`, {
            fontSize: '16px',
            fill: this.hexToColor(this.colors.warning),
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont',
            fontWeight: '700'
        }).setOrigin(0.5);

        // 🔥 ДОБАВЛЕНО: Кнопки таймфреймов
        const timeframeButtonWidth = isMobile ? 50 : 60;
        this.timeframePrevButton = this.createRoundedButton(width - this.layout.padding - 100, buttonY + 35, timeframeButtonWidth, 36, '←', this.colors.primary);
        this.timeframeNextButton = this.createRoundedButton(width - this.layout.padding - 30, buttonY + 35, timeframeButtonWidth, 36, '→', this.colors.primary);
        this.timeframeDisplay = this.add.text(width - this.layout.padding - 65, buttonY + 35, this.currentTimeframe.name, {
            fontSize: '12px',
            fill: this.hexToColor(this.colors.textPrimary),
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont',
            fontWeight: '600'
        }).setOrigin(0.5);

        // Stop order button (перемещена)
        const stopButtonWidth = isMobile ? 140 : 160;
        this.stopButton = this.createRoundedButton(centerX, buttonY + 80, stopButtonWidth, 36, 'STOP ORDER', this.colors.secondary);

        // Share button for VK
        this.shareButton = this.createRoundedButton(this.layout.padding + 50, buttonY + 80, 90, 36, 'SHARE', this.colors.warning);
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.longButton.on('pointerdown', () => this.openLong());
        this.shortButton.on('pointerdown', () => this.openShort());
        this.closeButton.on('pointerdown', () => this.closePosition());
        this.stopButton.on('pointerdown', () => this.setStopOrder());
        this.shareButton.on('pointerdown', () => this.shareResults());
        
        // 🔥 ДОБАВЛЕНО: Обработчики для новых кнопок
        this.leverageDownButton.on('pointerdown', () => this.changeLeverage(-1));
        this.leverageUpButton.on('pointerdown', () => this.changeLeverage(1));
        this.timeframePrevButton.on('pointerdown', () => this.changeTimeframe(-1));
        this.timeframeNextButton.on('pointerdown', () => this.changeTimeframe(1));
    }

    // 🔥 ДОБАВЛЕНО: Изменение кредитного плеча
    changeLeverage(direction) {
        if (this.hasPosition) {
            this.showMessage('Close position to change leverage', this.colors.danger);
            return;
        }
        
        const currentIndex = this.leverageOptions.indexOf(this.leverage);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = this.leverageOptions.length - 1;
        if (newIndex >= this.leverageOptions.length) newIndex = 0;
        
        this.leverage = this.leverageOptions[newIndex];
        this.leverageDisplay.setText(`${this.leverage}x`);
        this.leverageText.setText(`Leverage: ${this.leverage}x | ${this.currentTimeframe.name}`);
        
        this.showMessage(`Leverage set to ${this.leverage}x`, this.colors.warning);
    }

    // 🔥 ДОБАВЛЕНО: Изменение таймфрейма
    changeTimeframe(direction) {
        if (this.hasPosition) {
            this.showMessage('Close position to change timeframe', this.colors.danger);
            return;
        }
        
        this.currentTimeframeIndex += direction;
        if (this.currentTimeframeIndex < 0) {
            this.currentTimeframeIndex = this.timeframes.length - 1;
        } else if (this.currentTimeframeIndex >= this.timeframes.length) {
            this.currentTimeframeIndex = 0;
        }
        
        this.timeframeDisplay.setText(this.currentTimeframe.name);
        this.leverageText.setText(`Leverage: ${this.leverage}x | ${this.currentTimeframe.name}`);
        
        // Перезапускаем таймер с новым интервалом
        this.startPriceUpdates();
        
        this.showMessage(`Timeframe: ${this.currentTimeframe.name}`, this.colors.primary);
    }

    // 🔥 ИЗМЕНЕНО: Открытие позиции с учетом плеча
    async openLong() {
        if (this.hasPosition) return;
        
        const maxCoins = Math.floor(this.balance / this.currentCurrency.price);
        const coinsToBuy = Math.floor(maxCoins * this.leverage);
        
        if (coinsToBuy > 0) {
            this.position = {
                type: 'long',
                entryPrice: this.currentCurrency.price,
                coins: coinsToBuy,
                leverage: this.leverage,
                invested: coinsToBuy * this.currentCurrency.price / this.leverage
            };
            this.balance -= this.position.invested;
            
            this.updateUI();
            this.updateChart();
            await this.saveGameData();
            this.showMessage(`LONG ${this.leverage}x at $${this.position.entryPrice.toFixed(2)}`, this.colors.success);
        }
    }

    // 🔥 ИЗМЕНЕНО: Открытие шорта с учетом плеча
    async openShort() {
        if (this.hasPosition) return;
        
        const maxCoins = Math.floor(this.balance / this.currentCurrency.price);
        const coinsToSell = Math.floor(maxCoins * this.leverage);
        
        if (coinsToSell > 0) {
            this.position = {
                type: 'short',
                entryPrice: this.currentCurrency.price,
                coins: coinsToSell,
                leverage: this.leverage,
                invested: coinsToSell * this.currentCurrency.price / this.leverage
            };
            this.balance += coinsToSell * this.currentCurrency.price; // Получаем средства от продажи
            this.balance -= this.position.invested; // Вычитаем залоговые средства
            
            this.updateUI();
            this.updateChart();
            await this.saveGameData();
            this.showMessage(`SHORT ${this.leverage}x at $${this.position.entryPrice.toFixed(2)}`, this.colors.danger);
        }
    }

    // 🔥 ИЗМЕНЕНО: Закрытие позиции с учетом плеча
    async closePosition() {
        if (!this.hasPosition) return;
        
        let profit = 0;
        
        if (this.position.type === 'long') {
            const totalValue = this.position.coins * this.currentCurrency.price;
            profit = totalValue - (this.position.coins * this.position.entryPrice);
            this.balance += this.position.invested + profit;
        } else {
            const totalValue = this.position.coins * this.currentCurrency.price;
            profit = (this.position.coins * this.position.entryPrice) - totalValue;
            this.balance += this.position.invested + profit;
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
        await this.saveGameData();
        
        const color = profit >= 0 ? this.colors.success : this.colors.danger;
        const leverageText = this.position ? ` (${this.position.leverage}x)` : '';
        this.showMessage(`Position closed${leverageText}! P&L: $${profit.toFixed(2)}`, color);
    }

    // 🔥 ИЗМЕНЕНО: Расчет прибыли с учетом плеча
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
        
        const profit = this.calculateCurrentProfit();
        const invested = this.position.invested;
        return (profit / invested) * 100;
    }

    // 🔥 ДОБАВЛЕНО: Сохранение новых настроек
    async saveGameData() {
        try {
            if (window.VK) {
                await VK.call('storage.set', {
                    balance: this.balance.toString(),
                    position: JSON.stringify(this.position),
                    stats: JSON.stringify(this.stats),
                    stopLoss: this.stopLoss.toString(),
                    takeProfit: this.takeProfit.toString(),
                    leverage: this.leverage.toString(),
                    timeframe: this.currentTimeframeIndex.toString()
                });
            }
        } catch (error) {
            console.log('❌ Failed to save data:', error);
        }
    }

    // 🔥 ДОБАВЛЕНО: Загрузка новых настроек
    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { 
                    keys: ['balance', 'position', 'stats', 'stopLoss', 'takeProfit', 'leverage', 'timeframe'] 
                });
                
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.position && data.position !== 'null') this.position = JSON.parse(data.position);
                if (data.stats) this.stats = JSON.parse(data.stats);
                if (data.stopLoss) this.stopLoss = parseFloat(data.stopLoss);
                if (data.takeProfit) this.takeProfit = parseFloat(data.takeProfit);
                if (data.leverage) this.leverage = parseInt(data.leverage);
                if (data.timeframe) this.currentTimeframeIndex = parseInt(data.timeframe);
            }
        } catch (error) {
            console.log('❌ Failed to load data:', error);
        }
    }

    // Остальной код без изменений...
    // (updateUI, updateChart, drawPositionMarkers, showMessage, switchCurrency и другие методы остаются прежними)
}
