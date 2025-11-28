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

        this.uiElements = {};
        this.screen = {
            width: 0,
            height: 0,
            centerX: 0,
            centerY: 0
        };
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        this.calculateScreenSize();
        this.loadGameData();
        this.createChart();
        this.createAdaptiveUI();
        this.setupEventListeners();
        
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    calculateScreenSize() {
        this.screen.width = this.cameras.main.width;
        this.screen.height = this.cameras.main.height;
        this.screen.centerX = this.screen.width / 2;
        this.screen.centerY = this.screen.height / 2;
    }

    createChart() {
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 60; i++) {
                currency.history.push(currency.price);
            }
        });
        
        this.chart = this.add.graphics();
        this.updateChart();
    }

    createAdaptiveUI() {
        const { width, height, centerX } = this.screen;
        
        // Определяем размеры в зависимости от высоты экрана
        const isSmallScreen = height < 600;
        const headerHeight = isSmallScreen ? 80 : 100;
        const chartHeight = isSmallScreen ? height * 0.45 : height * 0.5;
        const buttonAreaHeight = height - headerHeight - chartHeight;
        
        // Верхняя панель (заголовок)
        this.createHeader(centerX, headerHeight);
        
        // Область графика
        this.chartArea = {
            y: headerHeight,
            height: chartHeight
        };
        
        // Нижняя панель (кнопки)
        this.createButtonPanel(centerX, headerHeight + chartHeight, buttonAreaHeight);
        
        this.updateButtonStates();
        this.updateStopInfo();
    }

    createHeader(centerX, headerHeight) {
        const headerY = headerHeight / 2;
        
        // Название валюты
        this.uiElements.currencyText = this.add.text(centerX, headerY - 15, this.currentCurrency.name, {
            fontSize: this.screen.height < 600 ? '20px' : '24px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        const buttonSize = this.screen.height < 600 ? 30 : 35;
        this.uiElements.prevButton = this.createTextButton(buttonSize + 10, headerY - 15, '◀', 0x3498db, buttonSize, buttonSize);
        this.uiElements.nextButton = this.createTextButton(this.screen.width - buttonSize - 10, headerY - 15, '▶', 0x3498db, buttonSize, buttonSize);

        // Баланс
        this.uiElements.balanceText = this.add.text(centerX, headerY + 15, `$${this.balance.toFixed(0)}`, {
            fontSize: this.screen.height < 600 ? '22px' : '26px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Статистика
        this.uiElements.statsText = this.add.text(centerX, headerY + 40, this.getCompactStats(), {
            fontSize: this.screen.height < 600 ? '11px' : '13px',
            fill: '#666',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.uiElements.profitText = this.add.text(centerX, headerY + 60, '', {
            fontSize: this.screen.height < 600 ? '14px' : '16px',
            fill: '#27ae60',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    createButtonPanel(centerX, startY, panelHeight) {
        const buttonY = startY + (panelHeight / 2);
        const isSmallScreen = this.screen.height < 600;
        
        // Основные кнопки покупки/продажи
        const buttonWidth = isSmallScreen ? this.screen.width * 0.4 : 140;
        const buttonHeight = isSmallScreen ? 45 : 50;
        const buttonGap = isSmallScreen ? 10 : 20;
        
        this.uiElements.buyButton = this.createRoundedButton(
            centerX - buttonWidth/2 - buttonGap/2, 
            buttonY - (isSmallScreen ? 25 : 30), 
            buttonWidth, buttonHeight, 0x27ae60, 'КУПИТЬ'
        );
        
        this.uiElements.sellButton = this.createRoundedButton(
            centerX + buttonWidth/2 + buttonGap/2, 
            buttonY - (isSmallScreen ? 25 : 30), 
            buttonWidth, buttonHeight, 0xe74c3c, 'ПРОДАТЬ'
        );
        
        // Кнопка тейков
        const stopButtonWidth = isSmallScreen ? this.screen.width * 0.6 : 160;
        const stopButtonHeight = isSmallScreen ? 35 : 40;
        
        this.uiElements.stopButton = this.createRoundedButton(
            centerX, 
            buttonY + (isSmallScreen ? 15 : 25), 
            stopButtonWidth, stopButtonHeight, 0xf39c12, 'УСТАНОВИТЬ ТЕЙКИ'
        );

        // Информация о тейках
        this.uiElements.stopInfo = this.add.text(
            centerX, 
            buttonY - (isSmallScreen ? 0 : 10), 
            '', 
            {
                fontSize: isSmallScreen ? '11px' : '12px',
                fill: '#e67e22',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#fef9e7',
                padding: { left: 8, right: 8, top: 4, bottom: 4 }
            }
        ).setOrigin(0.5);
    }

    createTextButton(x, y, text, color, width, height) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);
        
        this.add.text(x, y, text, {
            fontSize: height > 30 ? '16px' : '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
    }

    createRoundedButton(x, y, width, height, color, text) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);
        
        const fontSize = this.calculateButtonFontSize(width, height, text);
        
        this.add.text(x, y, text, {
            fontSize: fontSize + 'px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
    }

    calculateButtonFontSize(width, height, text) {
        const baseSize = Math.min(width, height) * 0.3;
        const maxSize = height * 0.5;
        
        // Корректировка для длинного текста
        if (text.length > 10) {
            return Math.min(baseSize * 0.8, maxSize);
        }
        
        return Math.min(baseSize, maxSize);
    }

    setupEventListeners() {
        this.uiElements.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.uiElements.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.uiElements.buyButton.on('pointerdown', () => this.buyCoin());
        this.uiElements.sellButton.on('pointerdown', () => this.sellCoin());
        this.uiElements.stopButton.on('pointerdown', () => this.toggleStopMenu());
    }

    toggleStopMenu() {
        if (!this.isHolding) return;
        
        if (this.showStopMenu) {
            this.hideStopMenu();
        } else {
            this.showStopMenu = true;
            this.createStopMenu();
        }
    }

    createStopMenu() {
        const { centerX, centerY, width, height } = this.screen;
        const isSmallScreen = height < 600;
        
        // Размеры меню адаптируются под экран
        const menuWidth = Math.min(width * 0.9, 350);
        const menuHeight = isSmallScreen ? 250 : 280;
        
        // Фон меню
        this.uiElements.stopMenuBg = this.add.rectangle(centerX, centerY, menuWidth, menuHeight, 0x2c3e50, 0.98)
            .setStrokeStyle(3, 0x3498db)
            .setInteractive();
        
        // Заголовок
        this.uiElements.stopMenuTitle = this.add.text(centerX, centerY - menuHeight/2 + 30, 'УСТАНОВКА ТЕЙК-ПРОФИТА', {
            fontSize: isSmallScreen ? '16px' : '18px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Текущая цена
        this.uiElements.stopMenuPrice = this.add.text(centerX, centerY - menuHeight/2 + 60, `Цена: $${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: isSmallScreen ? '13px' : '15px',
            fill: '#ecf0f1',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Секция стоп-лосса
        this.add.text(centerX - menuWidth/4, centerY - menuHeight/2 + 90, 'СТОП-ЛОСС:', {
            fontSize: isSmallScreen ? '13px' : '15px',
            fill: '#ff7675',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.uiElements.stopLossInput = this.createNumberInput(
            centerX - menuWidth/4, 
            centerY - menuHeight/2 + 120, 
            this.stopLoss || this.buyPrice * 0.95,
            isSmallScreen
        );
        
        // Секция тейк-профита
        this.add.text(centerX + menuWidth/4, centerY - menuHeight/2 + 90, 'ТЕЙК-ПРОФИТ:', {
            fontSize: isSmallScreen ? '13px' : '15px',
            fill: '#00b894',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.uiElements.takeProfitInput = this.createNumberInput(
            centerX + menuWidth/4, 
            centerY - menuHeight/2 + 120, 
            this.takeProfit || this.buyPrice * 1.05,
            isSmallScreen
        );
        
        // Быстрые кнопки
        this.createQuickButtons(
            centerX - menuWidth/4, 
            centerY - menuHeight/2 + 150, 
            'stopLoss', 
            [
                { label: '-2%', value: this.buyPrice * 0.98 },
                { label: '-5%', value: this.buyPrice * 0.95 },
                { label: '-10%', value: this.buyPrice * 0.90 }
            ],
            isSmallScreen
        );
        
        this.createQuickButtons(
            centerX + menuWidth/4, 
            centerY - menuHeight/2 + 150, 
            'takeProfit', 
            [
                { label: '+2%', value: this.buyPrice * 1.02 },
                { label: '+5%', value: this.buyPrice * 1.05 },
                { label: '+10%', value: this.buyPrice * 1.10 }
            ],
            isSmallScreen
        );
        
        // Кнопки действия
        const actionButtonWidth = isSmallScreen ? 100 : 120;
        const actionButtonHeight = isSmallScreen ? 35 : 40;
        
        this.uiElements.stopMenuApply = this.createRoundedButton(
            centerX - menuWidth/4, 
            centerY + menuHeight/2 - 40, 
            actionButtonWidth, actionButtonHeight, 0x27ae60, 'ПРИМЕНИТЬ'
        );
        
        this.uiElements.stopMenuCancel = this.createRoundedButton(
            centerX + menuWidth/4, 
            centerY + menuHeight/2 - 40, 
            actionButtonWidth, actionButtonHeight, 0xe74c3c, 'ЗАКРЫТЬ'
        );
        
        this.uiElements.stopMenuApply.on('pointerdown', () => this.applyStopOrders());
        this.uiElements.stopMenuCancel.on('pointerdown', () => this.hideStopMenu());
    }

    createNumberInput(x, y, defaultValue, isSmallScreen) {
        const inputWidth = isSmallScreen ? 80 : 100;
        const inputHeight = isSmallScreen ? 30 : 35;
        
        const inputBg = this.add.rectangle(x, y, inputWidth, inputHeight, 0x34495e)
            .setStrokeStyle(2, 0x7f8c8d);
        
        const inputText = this.add.text(x, y, defaultValue.toFixed(2), {
            fontSize: isSmallScreen ? '12px' : '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Кнопки +/-
        const buttonSize = isSmallScreen ? 20 : 25;
        const minusBtn = this.createTextButton(x - inputWidth/3, y, '-', 0xe74c3c, buttonSize, buttonSize);
        const plusBtn = this.createTextButton(x + inputWidth/3, y, '+', 0x27ae60, buttonSize, buttonSize);
        
        const inputData = { bg: inputBg, text: inputText, value: defaultValue };
        
        minusBtn.on('pointerdown', () => this.adjustInputValue(inputData, -0.5));
        plusBtn.on('pointerdown', () => this.adjustInputValue(inputData, 0.5));
        
        return inputData;
    }

    createQuickButtons(x, y, type, buttons, isSmallScreen) {
        const buttonWidth = isSmallScreen ? 60 : 80;
        const buttonHeight = isSmallScreen ? 20 : 25;
        const buttonSpacing = isSmallScreen ? 25 : 30;
        
        buttons.forEach((button, index) => {
            const btn = this.createRoundedButton(
                x, 
                y + (index * buttonSpacing), 
                buttonWidth, buttonHeight, 0x3498db, button.label
            );
            btn.on('pointerdown', () => this.setInputValue(type, button.value));
        });
    }

    adjustInputValue(inputData, change) {
        inputData.value += change;
        inputData.value = Math.max(1, inputData.value);
        inputData.text.setText(inputData.value.toFixed(2));
    }

    setInputValue(type, value) {
        if (type === 'stopLoss') {
            this.uiElements.stopLossInput.value = value;
            this.uiElements.stopLossInput.text.setText(value.toFixed(2));
        } else {
            this.uiElements.takeProfitInput.value = value;
            this.uiElements.takeProfitInput.text.setText(value.toFixed(2));
        }
    }

    applyStopOrders() {
        this.stopLoss = this.uiElements.stopLossInput.value;
        this.takeProfit = this.uiElements.takeProfitInput.value;
        
        // Валидация
        if (this.stopLoss >= this.buyPrice) {
            this.stopLoss = this.buyPrice * 0.98;
        }
        if (this.takeProfit <= this.buyPrice) {
            this.takeProfit = this.buyPrice * 1.02;
        }
        
        this.hideStopMenu();
        this.updateStopInfo();
        this.saveGameData();
        
        this.showNotification('Тейк-профиты установлены!', 0x27ae60);
    }

    hideStopMenu() {
        // Удаляем все элементы меню
        const menuElements = [
            'stopMenuBg', 'stopMenuTitle', 'stopMenuPrice',
            'stopLossInput', 'takeProfitInput',
            'stopMenuApply', 'stopMenuCancel'
        ];
        
        menuElements.forEach(elementName => {
            const element = this.uiElements[elementName];
            if (element) {
                if (element.bg) element.bg.destroy();
                if (element.text) element.text.destroy();
                if (element.destroy) element.destroy();
                delete this.uiElements[elementName];
            }
        });
        
        this.showStopMenu = false;
    }

    showNotification(message, color) {
        const notification = this.add.text(this.screen.centerX, this.chartArea.y + 50, message, {
            fontSize: this.screen.height < 600 ? '14px' : '16px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
            padding: { left: 15, right: 15, top: 8, bottom: 8 }
        }).setOrigin(0.5).setDepth(100);
        
        this.time.delayedCall(2000, () => {
            notification.destroy();
        });
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
        const changePercent = (Math.random() - 0.5) * currency.volatility * 0.5;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 60) {
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
                this.showNotification('СТОП-ЛОСС СРАБОТАЛ!', 0xe74c3c);
            }
        }
        
        if (this.isHolding && this.takeProfit > 0) {
            if (this.currentCurrency.price >= this.takeProfit) {
                this.sellCoin();
                this.showNotification('ТЕЙК-ПРОФИТ СРАБОТАЛ!', 0x27ae60);
            }
        }
    }

    updateChart() {
        this.chart.clear();
        
        const history = this.currentCurrency.history;
        const width = this.screen.width - 20;
        const height = this.chartArea.height - 20;
        const startY = this.chartArea.y + 10;
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Фон графика
        this.chart.fillStyle(0xf8f9fa);
        this.chart.fillRect(10, startY, width, height);
        
        // Сетка графика
        this.chart.lineStyle(1, 0xe9ecef, 0.5);
        for (let i = 1; i < 5; i++) {
            const y = startY + (height / 5) * i;
            this.chart.lineBetween(10, y, width + 10, y);
        }
        
        // Линия графика
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = 10 + (i / (history.length - 1)) * width;
            const y1 = startY + height - ((history[i] - minPrice) / range) * height;
            const x2 = 10 + ((i + 1) / (history.length - 1)) * width;
            const y2 = startY + height - ((history[i + 1] - minPrice) / range) * height;
            
            this.chart.lineBetween(x1, y1, x2, y2);
        }
        
        // Линии тейк-профитов
        if (this.isHolding) {
            this.drawStopLines(minPrice, maxPrice, startY, height, range, width);
        }
    }

    drawStopLines(minPrice, maxPrice, startY, height, range, width) {
        if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            this.chart.lineStyle(2, 0xe74c3c, 0.9);
            this.chart.lineBetween(10, stopY, width + 10, stopY);
            this.add.text(15, stopY - 10, `SL: $${this.stopLoss.toFixed(2)}`, { 
                fontSize: this.screen.height < 600 ? '10px' : '11px', 
                fill: '#e74c3c',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#ffffff',
                padding: { left: 4, right: 4, top: 2, bottom: 2 }
            });
        }
        
        if (this.takeProfit > 0 && this.takeProfit >= minPrice && this.takeProfit <= maxPrice) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            this.chart.lineStyle(2, 0x27ae60, 0.9);
            this.chart.lineBetween(10, profitY, width + 10, profitY);
            this.add.text(15, profitY - 10, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: this.screen.height < 600 ? '10px' : '11px', 
                fill: '#27ae60',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#ffffff',
                padding: { left: 4, right: 4, top: 2, bottom: 2 }
            });
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
        const buyAlpha = this.isHolding ? 0.5 : 1;
        const sellAlpha = this.isHolding ? 1 : 0.5;
        const stopAlpha = this.isHolding ? 1 : 0.5;
        
        this.uiElements.buyButton.setAlpha(buyAlpha);
        this.uiElements.sellButton.setAlpha(sellAlpha);
        this.uiElements.stopButton.setAlpha(stopAlpha);
    }

    updateStopInfo() {
        if (this.isHolding) {
            let info = '';
            if (this.stopLoss > 0) info += `SL: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `TP: $${this.takeProfit.toFixed(1)}`;
            this.uiElements.stopInfo.setText(info);
            this.uiElements.stopInfo.setVisible(true);
        } else {
            this.uiElements.stopInfo.setVisible(false);
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

window.addEventListener('DOMContentLoaded', () => {
    if (window.VK) {
        VK.init(() => {
            new Phaser.Game(config);
        });
    } else {
        new Phaser.Game(config);
    }
});