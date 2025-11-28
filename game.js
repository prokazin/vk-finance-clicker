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
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        this.loadGameData();
        this.createChart();
        this.createOptimizedUI();
        this.setupEventListeners();
        
        // Медленное обновление как на бирже
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
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

    createOptimizedUI() {
        const centerX = this.cameras.main.centerX;
        const screenHeight = this.cameras.main.height;
        
        // Компактная верхняя панель
        this.currencyText = this.add.text(centerX, 20, this.currentCurrency.name, {
            fontSize: '22px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        this.prevButton = this.createTextButton(40, 20, '◀', 0x3498db, 35, 35);
        this.nextButton = this.createTextButton(360, 20, '▶', 0x3498db, 35, 35);

        // Баланс и статистика
        this.balanceText = this.add.text(centerX, 50, `$${this.balance.toFixed(0)}`, {
            fontSize: '24px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.statsText = this.add.text(centerX, 75, this.getCompactStats(), {
            fontSize: '13px',
            fill: '#666',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, 95, '', {
            fontSize: '16px',
            fill: '#27ae60',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Основные кнопки управления
        this.buyButton = this.createRoundedButton(centerX - 80, screenHeight - 80, 140, 50, 0x27ae60, 'КУПИТЬ');
        this.sellButton = this.createRoundedButton(centerX + 80, screenHeight - 80, 140, 50, 0xe74c3c, 'ПРОДАТЬ');
        
        // Кнопка установки тейков
        this.stopButton = this.createRoundedButton(centerX, screenHeight - 140, 160, 40, 0xf39c12, 'УСТАНОВИТЬ ТЕЙКИ');

        // Информация о тейках
        this.stopInfo = this.add.text(centerX, screenHeight - 170, '', {
            fontSize: '12px',
            fill: '#e67e22',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#fef9e7',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    createTextButton(x, y, text, color, width, height) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);
        
        this.add.text(x, y, text, {
            fontSize: '16px',
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
        
        this.add.text(x, y, text, {
            fontSize: height > 45 ? '18px' : '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.buyButton.on('pointerdown', () => this.buyCoin());
        this.sellButton.on('pointerdown', () => this.sellCoin());
        this.stopButton.on('pointerdown', () => this.toggleStopMenu());
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
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Фон меню
        this.stopMenuBg = this.add.rectangle(centerX, centerY, 350, 280, 0x2c3e50, 0.98)
            .setStrokeStyle(3, 0x3498db)
            .setInteractive();
        
        // Заголовок
        this.stopMenuTitle = this.add.text(centerX, centerY - 120, 'УСТАНОВКА ТЕЙК-ПРОФИТА', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Текущая цена
        this.stopMenuPrice = this.add.text(centerX, centerY - 90, `Текущая цена: $${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '15px',
            fill: '#ecf0f1',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Секция стоп-лосса
        this.add.text(centerX - 80, centerY - 60, 'СТОП-ЛОСС:', {
            fontSize: '15px',
            fill: '#ff7675',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.stopLossInput = this.createNumberInput(centerX - 80, centerY - 30, this.stopLoss || this.buyPrice * 0.95);
        
        // Секция тейк-профита
        this.add.text(centerX + 80, centerY - 60, 'ТЕЙК-ПРОФИТ:', {
            fontSize: '15px',
            fill: '#00b894',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.takeProfitInput = this.createNumberInput(centerX + 80, centerY - 30, this.takeProfit || this.buyPrice * 1.05);
        
        // Быстрые кнопки для стоп-лосса
        this.createQuickButtons(centerX - 80, centerY + 10, 'stopLoss', [
            { label: '-2%', value: this.buyPrice * 0.98 },
            { label: '-5%', value: this.buyPrice * 0.95 },
            { label: '-10%', value: this.buyPrice * 0.90 }
        ]);
        
        // Быстрые кнопки для тейк-профита
        this.createQuickButtons(centerX + 80, centerY + 10, 'takeProfit', [
            { label: '+2%', value: this.buyPrice * 1.02 },
            { label: '+5%', value: this.buyPrice * 1.05 },
            { label: '+10%', value: this.buyPrice * 1.10 }
        ]);
        
        // Кнопки действия
        this.stopMenuApply = this.createRoundedButton(centerX - 70, centerY + 80, 120, 40, 0x27ae60, 'ПРИМЕНИТЬ');
        this.stopMenuCancel = this.createRoundedButton(centerX + 70, centerY + 80, 120, 40, 0xe74c3c, 'ЗАКРЫТЬ');
        
        this.stopMenuApply.on('pointerdown', () => this.applyStopOrders());
        this.stopMenuCancel.on('pointerdown', () => this.hideStopMenu());
    }

    createNumberInput(x, y, defaultValue) {
        const inputBg = this.add.rectangle(x, y, 100, 35, 0x34495e)
            .setStrokeStyle(2, 0x7f8c8d);
        
        const inputText = this.add.text(x, y, defaultValue.toFixed(2), {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Кнопки +/-
        const minusBtn = this.createTextButton(x - 30, y, '-', 0xe74c3c, 25, 25);
        const plusBtn = this.createTextButton(x + 30, y, '+', 0x27ae60, 25, 25);
        
        const inputData = { bg: inputBg, text: inputText, value: defaultValue };
        
        minusBtn.on('pointerdown', () => this.adjustInputValue(inputData, -0.5));
        plusBtn.on('pointerdown', () => this.adjustInputValue(inputData, 0.5));
        
        return inputData;
    }

    createQuickButtons(x, y, type, buttons) {
        buttons.forEach((button, index) => {
            const btn = this.createRoundedButton(x, y + (index * 30), 80, 25, 0x3498db, button.label);
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
            this.stopLossInput.value = value;
            this.stopLossInput.text.setText(value.toFixed(2));
        } else {
            this.takeProfitInput.value = value;
            this.takeProfitInput.text.setText(value.toFixed(2));
        }
    }

    applyStopOrders() {
        this.stopLoss = this.stopLossInput.value;
        this.takeProfit = this.takeProfitInput.value;
        
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
        const elements = [
            this.stopMenuBg, this.stopMenuTitle, this.stopMenuPrice,
            this.stopLossInput, this.takeProfitInput,
            this.stopMenuApply, this.stopMenuCancel
        ];
        
        elements.forEach(element => {
            if (element) {
                if (element.bg) element.bg.destroy();
                if (element.text) element.text.destroy();
                if (element.destroy) element.destroy();
            }
        });
        
        // Удаляем кнопки быстрого выбора
        this.children.getArray().forEach(child => {
            if (child.x && (
                (child.x === this.cameras.main.centerX - 80 && child.y >= this.cameras.main.centerY + 10) ||
                (child.x === this.cameras.main.centerX + 80 && child.y >= this.cameras.main.centerY + 10)
            ) && child.width === 80) {
                child.destroy();
            }
        });
        
        this.showStopMenu = false;
    }

    showNotification(message, color) {
        const notification = this.add.text(this.cameras.main.centerX, 150, message, {
            fontSize: '16px',
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
        
        this.currencyText.setText(this.currentCurrency.name);
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
        const width = this.cameras.main.width - 20;
        const height = 280;
        const startY = 120;
        
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
        
        // Линия графика (четкая)
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
                fontSize: '11px', 
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
                fontSize: '11px', 
                fill: '#27ae60',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#ffffff',
                padding: { left: 4, right: 4, top: 2, bottom: 2 }
            });
        }
    }

    updateUI() {
        this.balanceText.setText(`$${this.balance.toFixed(0)}`);
        this.statsText.setText(this.getCompactStats());
        
        if (this.isHolding) {
            const profit = (this.currentCurrency.price - this.buyPrice) * this.ownedCoins;
            const profitPercent = ((this.currentCurrency.price - this.buyPrice) / this.buyPrice) * 100;
            
            this.profitText.setText(`${profit >= 0 ? '+' : ''}${profit.toFixed(0)} (${profitPercent.toFixed(1)}%)`);
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
            if (this.stopLoss > 0) info += `SL: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `TP: $${this.takeProfit.toFixed(1)}`;
            this.stopInfo.setText(info);
            this.stopInfo.setVisible(true);
        } else {
            this.stopInfo.setVisible(false);
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