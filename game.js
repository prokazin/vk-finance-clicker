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
        this.createOptimizedUI();
        this.setupEventListeners();
        
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

    createOptimizedUI() {
        const centerX = this.cameras.main.centerX;
        const screenHeight = this.cameras.main.height;
        
        // Верхняя панель - компактная
        this.uiElements.currencyText = this.add.text(centerX, 15, this.currentCurrency.name, {
            fontSize: '22px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.uiElements.balanceText = this.add.text(centerX, 42, `$${this.balance.toFixed(0)}`, {
            fontSize: '20px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        this.uiElements.prevButton = this.createTextButton(30, 28, '◀', 0x3498db, 35, 35);
        this.uiElements.nextButton = this.createTextButton(370, 28, '▶', 0x3498db, 35, 35);

        // Статистика в одну строку
        this.uiElements.statsText = this.add.text(centerX, 68, this.getCompactStats(), {
            fontSize: '13px',
            fill: '#666',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.uiElements.profitText = this.add.text(centerX, 90, '', {
            fontSize: '16px',
            fill: '#27ae60',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Основные кнопки управления
        this.uiElements.buyButton = this.createRoundedButton(centerX - 75, screenHeight - 90, 130, 50, 0x27ae60, 'КУПИТЬ');
        this.uiElements.sellButton = this.createRoundedButton(centerX + 75, screenHeight - 90, 130, 50, 0xe74c3c, 'ПРОДАТЬ');
        
        // Кнопка стоп-ордеров
        this.uiElements.stopButton = this.createRoundedButton(centerX, screenHeight - 150, 150, 40, 0xf39c12, 'СТОП-ОРДЕР');

        // Информация о стоп-ордерах
        this.uiElements.stopInfo = this.add.text(centerX, screenHeight - 180, '', {
            fontSize: '13px',
            fill: '#e67e22',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#fef9e7',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    createTextButton(x, y, text, color, width, height) {
        const button = this.add.rectangle(x, y, width, height, color)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);
        
        this.add.text(x, y, text, {
            fontSize: '18px',
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
        
        // Добавляем тень для объема
        this.add.rectangle(x, y + 2, width, height, 0x000000, 0.2);
        
        this.add.text(x, y, text, {
            fontSize: height > 45 ? '18px' : '16px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        return button;
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
        
        this.showStopMenu = !this.showStopMenu;
        
        if (this.showStopMenu) {
            this.createStopMenu();
        } else {
            this.destroyStopMenu();
        }
    }

    createStopMenu() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Фон меню
        this.stopMenuBg = this.add.rectangle(centerX, centerY, 320, 280, 0x2c3e50)
            .setStrokeStyle(3, 0x3498db);
        
        // Заголовок
        this.stopMenuTitle = this.add.text(centerX, centerY - 110, 'НАСТРОЙКА СТОП-ОРДЕРОВ', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Текущая цена
        this.stopMenuPrice = this.add.text(centerX, centerY - 80, `Текущая цена: $${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '16px',
            fill: '#ecf0f1',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Поля ввода для стоп-лосса и тейк-профита
        this.createStopInput(centerX - 70, centerY - 40, 'stopLoss', 'СТОП-ЛОСС:', this.stopLoss || this.buyPrice * 0.95);
        this.createStopInput(centerX + 70, centerY - 40, 'takeProfit', 'ТЕЙК-ПРОФИТ:', this.takeProfit || this.buyPrice * 1.10);
        
        // Быстрые кнопки для стоп-лосса
        this.createQuickButtons(centerX - 70, centerY + 10, 'stopLoss', [
            { label: '-5%', value: this.buyPrice * 0.95 },
            { label: '-10%', value: this.buyPrice * 0.90 },
            { label: '-15%', value: this.buyPrice * 0.85 }
        ]);
        
        // Быстрые кнопки для тейк-профита
        this.createQuickButtons(centerX + 70, centerY + 10, 'takeProfit', [
            { label: '+5%', value: this.buyPrice * 1.05 },
            { label: '+10%', value: this.buyPrice * 1.10 },
            { label: '+15%', value: this.buyPrice * 1.15 }
        ]);
        
        // Кнопки применения и отмены
        this.stopMenuApply = this.createRoundedButton(centerX - 70, centerY + 70, 120, 40, 0x27ae60, 'ПРИМЕНИТЬ');
        this.stopMenuCancel = this.createRoundedButton(centerX + 70, centerY + 70, 120, 40, 0xe74c3c, 'ОТМЕНА');
        
        this.stopMenuApply.on('pointerdown', () => this.applyStopOrders());
        this.stopMenuCancel.on('pointerdown', () => this.toggleStopMenu());
    }

    createStopInput(x, y, type, label, defaultValue) {
        // Метка
        this.add.text(x, y - 25, label, {
            fontSize: '14px',
            fill: '#ecf0f1',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Поле ввода (симуляция)
        const inputBg = this.add.rectangle(x, y, 100, 35, 0x34495e)
            .setStrokeStyle(2, 0x3498db);
        
        const inputText = this.add.text(x, y, defaultValue.toFixed(2), {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Кнопки +/-
        const minusBtn = this.createTextButton(x - 35, y, '-', 0xe74c3c, 25, 25);
        const plusBtn = this.createTextButton(x + 35, y, '+', 0x27ae60, 25, 25);
        
        this[type + 'Input'] = { bg: inputBg, text: inputText, value: defaultValue };
        
        minusBtn.on('pointerdown', () => this.adjustStopValue(type, -1));
        plusBtn.on('pointerdown', () => this.adjustStopValue(type, 1));
    }

    createQuickButtons(x, y, type, buttons) {
        buttons.forEach((button, index) => {
            const btn = this.createRoundedButton(x, y + (index * 35), 80, 25, 0x3498db, button.label);
            btn.on('pointerdown', () => this.setQuickValue(type, button.value));
        });
    }

    adjustStopValue(type, direction) {
        const input = this[type + 'Input'];
        const step = type === 'stopLoss' ? -0.5 : 0.5;
        input.value += step * direction;
        input.value = Math.max(1, input.value);
        input.text.setText(input.value.toFixed(2));
    }

    setQuickValue(type, value) {
        const input = this[type + 'Input'];
        input.value = value;
        input.text.setText(value.toFixed(2));
    }

    applyStopOrders() {
        this.stopLoss = this.stopLossInput.value;
        this.takeProfit = this.takeProfitInput.value;
        
        // Валидация
        if (this.stopLoss >= this.buyPrice) {
            this.stopLoss = this.buyPrice * 0.95;
        }
        if (this.takeProfit <= this.buyPrice) {
            this.takeProfit = this.buyPrice * 1.05;
        }
        
        this.toggleStopMenu();
        this.updateStopInfo();
        this.saveGameData();
        
        this.showMessage('Стоп-ордера установлены!', 0x27ae60);
    }

    destroyStopMenu() {
        const elements = [
            this.stopMenuBg, this.stopMenuTitle, this.stopMenuPrice,
            this.stopLossInput, this.takeProfitInput,
            this.stopMenuApply, this.stopMenuCancel
        ];
        
        elements.forEach(element => {
            if (element && element.bg) element.bg.destroy();
            if (element && element.text) element.text.destroy();
            if (element && element.destroy) element.destroy();
        });
        
        this.showStopMenu = false;
    }

    showMessage(text, color) {
        const message = this.add.text(this.cameras.main.centerX, 400, text, {
            fontSize: '16px',
            fill: Phaser.Display.Color.IntegerToColor(color).rgba,
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#ffffff',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
        });
    }

    // Остальные методы остаются без изменений...
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
        const changePercent = (Math.random() - 0.5) * currency.volatility * 0.7;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 40) {
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
                this.showMessage('СТОП-ЛОСС СРАБОТАЛ!', 0xe74c3c);
            }
        }
        
        if (this.isHolding && this.takeProfit > 0) {
            if (this.currentCurrency.price >= this.takeProfit) {
                this.sellCoin();
                this.showMessage('ТЕЙК-ПРОФИТ СРАБОТАЛ!', 0x27ae60);
            }
        }
    }

    updateChart() {
        this.chart.clear();
        
        const history = this.currentCurrency.history;
        const width = 380;
        const height = 250;
        const startY = 110;
        
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
        
        // Линии стоп-ордеров
        if (this.isHolding) {
            if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
                const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
                this.chart.lineStyle(2, 0xe74c3c, 0.8);
                this.chart.lineBetween(10, stopY, width + 10, stopY);
                this.add.text(15, stopY - 8, 'STOP', { 
                    fontSize: '10px', 
                    fill: '#e74c3c',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: '#ffffff'
                });
            }
            
            if (this.takeProfit > 0 && this.takeProfit >= minPrice && this.takeProfit <= maxPrice) {
                const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
                this.chart.lineStyle(2, 0x27ae60, 0.8);
                this.chart.lineBetween(10, profitY, width + 10, profitY);
                this.add.text(15, profitY - 8, 'PROFIT', { 
                    fontSize: '10px', 
                    fill: '#27ae60',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: '#ffffff'
                });
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
        const alpha = this.isHolding ? 0.5 : 1;
        this.uiElements.buyButton.setAlpha(alpha);
        this.uiElements.sellButton.setAlpha(this.isHolding ? 1 : 0.5);
        this.uiElements.stopButton.setAlpha(this.isHolding ? 1 : 0.5);
    }

    updateStopInfo() {
        if (this.isHolding) {
            let info = '';
            if (this.stopLoss > 0) info += `STOP: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `PROFIT: $${this.takeProfit.toFixed(1)}`;
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

window.addEventListener('DOMContentLoaded', () => {
    if (window.VK) {
        VK.init(() => {
            new Phaser.Game(config);
        });
    } else {
        new Phaser.Game(config);
    }
});