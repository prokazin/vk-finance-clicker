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
        
        // Очень медленное обновление как на бирже
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
        
        // Компактная верхняя панель
        this.currencyText = this.add.text(centerX, 15, this.currentCurrency.name, {
            fontSize: '20px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки переключения валют (меньше)
        this.prevButton = this.add.text(30, 15, '◀', {
            fontSize: '18px',
            fill: '#3498db',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#ecf0f1',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setInteractive();

        this.nextButton = this.add.text(370, 15, '▶', {
            fontSize: '18px',
            fill: '#3498db',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#ecf0f1',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setInteractive();

        // Баланс и статистика компактно
        this.balanceText = this.add.text(centerX, 45, `$${this.balance.toFixed(0)}`, {
            fontSize: '22px',
            fill: '#2c3e50',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.statsText = this.add.text(centerX, 70, this.getCompactStats(), {
            fontSize: '12px',
            fill: '#666',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, 90, '', {
            fontSize: '14px',
            fill: '#27ae60',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопки управления (компактнее)
        this.buyButton = this.add.rectangle(centerX - 75, 520, 130, 45, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - 75, 520, 'КУПИТЬ', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.sellButton = this.add.rectangle(centerX + 75, 520, 130, 45, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + 75, 520, 'ПРОДАТЬ', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка установки тейков
        this.stopButton = this.add.rectangle(centerX, 470, 150, 35, 0xf39c12)
            .setInteractive();
        this.add.text(centerX, 470, 'УСТАНОВИТЬ ТЕЙКИ', {
            fontSize: '13px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Информация о тейках
        this.stopInfo = this.add.text(centerX, 440, '', {
            fontSize: '11px',
            fill: '#e67e22',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#fef9e7',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.buyButton.on('pointerdown', () => this.buyCoin());
        this.sellButton.on('pointerdown', () => this.sellCoin());
        this.stopButton.on('pointerdown', () => this.showStopMenu = true ? this.createStopMenu() : this.destroyStopMenu());
    }

    createStopMenu() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Фон меню
        this.stopMenuBg = this.add.rectangle(centerX, centerY, 350, 250, 0x2c3e50, 0.95)
            .setStrokeStyle(2, 0x3498db)
            .setInteractive();
        
        // Заголовок
        this.add.text(centerX, centerY - 100, 'УСТАНОВКА ТЕЙК-ПРОФИТА', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Текущая цена
        this.add.text(centerX, centerY - 70, `Текущая цена: $${this.currentCurrency.price.toFixed(2)}`, {
            fontSize: '14px',
            fill: '#ecf0f1',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        // Поле ввода для стоп-лосса
        this.add.text(centerX - 80, centerY - 40, 'СТОП-ЛОСС:', {
            fontSize: '14px',
            fill: '#ff7675',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        this.stopLossInput = this.createNumberInput(centerX - 80, centerY - 15, this.stopLoss || this.buyPrice * 0.95);
        
        // Поле ввода для тейк-профита
        this.add.text(centerX + 80, centerY - 40, 'ТЕЙК-ПРОФИТ:', {
            fontSize: '14px',
            fill: '#00b894',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);
        
        this.takeProfitInput = this.createNumberInput(centerX + 80, centerY - 15, this.takeProfit || this.buyPrice * 1.05);
        
        // Быстрые кнопки для стоп-лосса
        this.createQuickButtons(centerX - 80, centerY + 20, 'stopLoss', [
            { label: '-2%', value: this.buyPrice * 0.98 },
            { label: '-5%', value: this.buyPrice * 0.95 },
            { label: '-10%', value: this.buyPrice * 0.90 }
        ]);
        
        // Быстрые кнопки для тейк-профита
        this.createQuickButtons(centerX + 80, centerY + 20, 'takeProfit', [
            { label: '+2%', value: this.buyPrice * 1.02 },
            { label: '+5%', value: this.buyPrice * 1.05 },
            { label: '+10%', value: this.buyPrice * 1.10 }
        ]);
        
        // Кнопки действия
        this.applyButton = this.add.rectangle(centerX - 60, centerY + 70, 100, 35, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - 60, centerY + 70, 'ПРИМЕНИТЬ', {
            fontSize: '13px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.cancelButton = this.add.rectangle(centerX + 60, centerY + 70, 100, 35, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + 60, centerY + 70, 'ОТМЕНА', {
            fontSize: '13px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.applyButton.on('pointerdown', () => this.applyStopOrders());
        this.cancelButton.on('pointerdown', () => this.destroyStopMenu());
        
        this.showStopMenu = true;
    }

    createNumberInput(x, y, defaultValue) {
        const inputBg = this.add.rectangle(x, y, 100, 30, 0x34495e)
            .setStrokeStyle(1, 0x7f8c8d);
        
        const inputText = this.add.text(x, y, defaultValue.toFixed(2), {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Кнопки +/-
        const minusBtn = this.add.rectangle(x - 25, y, 20, 20, 0xe74c3c)
            .setInteractive();
        this.add.text(x - 25, y, '-', {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        const plusBtn = this.add.rectangle(x + 25, y, 20, 20, 0x27ae60)
            .setInteractive();
        this.add.text(x + 25, y, '+', {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        minusBtn.on('pointerdown', () => this.adjustInputValue(inputText, -1));
        plusBtn.on('pointerdown', () => this.adjustInputValue(inputText, 1));
        
        return { bg: inputBg, text: inputText, value: defaultValue };
    }

    createQuickButtons(x, y, type, buttons) {
        buttons.forEach((button, index) => {
            const btn = this.add.rectangle(x, y + (index * 25), 70, 20, 0x3498db)
                .setInteractive();
            this.add.text(x, y + (index * 25), button.label, {
                fontSize: '11px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif'
            }).setOrigin(0.5);
            
            btn.on('pointerdown', () => this.setInputValue(type, button.value));
        });
    }

    adjustInputValue(inputText, direction) {
        const currentValue = parseFloat(inputText.text);
        const newValue = currentValue + (direction * (currentValue * 0.01)); // 1% изменение
        inputText.setText(newValue.toFixed(2));
        
        if (inputText === this.stopLossInput.text) {
            this.stopLossInput.value = newValue;
        } else {
            this.takeProfitInput.value = newValue;
        }
    }

    setInputValue(type, value) {
        if (type === 'stopLoss') {
            this.stopLossInput.text.setText(value.toFixed(2));
            this.stopLossInput.value = value;
        } else {
            this.takeProfitInput.text.setText(value.toFixed(2));
            this.takeProfitInput.value = value;
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
        
        this.destroyStopMenu();
        this.updateStopInfo();
        this.saveGameData();
        
        this.showMessage('Тейки установлены!', 0x27ae60);
    }

    destroyStopMenu() {
        if (this.stopMenuBg) this.stopMenuBg.destroy();
        if (this.stopLossInput) this.stopLossInput.bg.destroy();
        if (this.stopLossInput) this.stopLossInput.text.destroy();
        if (this.takeProfitInput) this.takeProfitInput.bg.destroy();
        if (this.takeProfitInput) this.takeProfitInput.text.destroy();
        if (this.applyButton) this.applyButton.destroy();
        if (this.cancelButton) this.cancelButton.destroy();
        
        // Удаляем кнопки быстрого выбора
        for (let i = 0; i < 6; i++) {
            const btn = this.children.getArray().find(child => 
                child.x === (this.cameras.main.centerX - 80 || this.cameras.main.centerX + 80) && 
                child.y === (this.cameras.main.centerY + 20 + i * 25) &&
                child.width === 70
            );
            if (btn) btn.destroy();
        }
        
        this.showStopMenu = false;
    }

    showMessage(text, color) {
        const message = this.add.text(this.cameras.main.centerX, 400, text, {
            fontSize: '14px',
            fill: Phaser.Display.Color.IntegerToColor(color).rgba,
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#ffffff',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
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
        // Очень медленное изменение как на реальной бирже
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
        const height = 280;
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
        
        // Линия графика (более четкая)
        this.chart.lineStyle(2, this.currentCurrency.color, 1);
        
        for (let i = 0; i < history.length - 1; i++) {
            const x1 = 10 + (i / (history.length - 1)) * width;
            const y1 = startY + height - ((history[i] - minPrice) / range) * height;
            const x2 = 10 + ((i + 1) / (history.length - 1)) * width;
            const y2 = startY + height - ((history[i + 1] - minPrice) / range) * height;
            
            this.chart.lineBetween(x1, y1, x2, y2);
        }
        
        // Линии тейк-профитов (четкие)
        if (this.isHolding) {
            this.drawStopLines(minPrice, maxPrice, startY, height, range);
        }
    }

    drawStopLines(minPrice, maxPrice, startY, height, range) {
        if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            this.chart.lineStyle(2, 0xe74c3c, 0.8);
            this.chart.lineBetween(10, stopY, width + 10, stopY);
            this.add.text(15, stopY - 8, `SL: $${this.stopLoss.toFixed(2)}`, { 
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
            this.add.text(15, profitY - 8, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: '10px', 
                fill: '#27ae60',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#ffffff'
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
        } else {
            this.stopInfo.setText('');
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