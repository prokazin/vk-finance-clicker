class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.balance = 1000;
        this.ownedCoins = 0;
        this.currentCurrencies = [
            { name: 'VKoin', price: 100, history: [], color: 0x3498db },
            { name: 'Memecoin', price: 50, history: [], color: 0xe74c3c },
            { name: 'Social Token', price: 200, history: [], color: 0x9b59b6 }
        ];
        this.currentCurrencyIndex = 0;
        this.isHolding = false;
        this.buyPrice = 0;
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            totalProfit: 0
        };
        
        // Размеры для графика
        this.chartWidth = 380;
        this.chartHeight = 300;
    }

    get currentCurrency() {
        return this.currentCurrencies[this.currentCurrencyIndex];
    }

    get currentPrice() {
        return this.currentCurrency.price;
    }

    set currentPrice(value) {
        this.currentCurrency.price = value;
    }

    get priceHistory() {
        return this.currentCurrency.history;
    }

    init() {
        this.loadGameData();
    }

    create() {
        // Сначала создаем UI
        this.createUI();
        // Затем график
        this.createChart();
        
        this.time.addEvent({
            delay: 200,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    createChart() {
        // Инициализируем историю цен для всех валют
        this.currentCurrencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 100; i++) {
                currency.history.push(currency.price);
            }
        });

        // Создаем график в фиксированной позиции
        this.chart = this.add.graphics();
        this.updateChart();
    }

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.className = 'ui-overlay';
        
        // Верхняя панель
        const topPanel = document.createElement('div');
        topPanel.className = 'top-panel';
        topPanel.innerHTML = `
            <div class="currency-selector">
                <button class="btn-currency" id="prevCurrency">←</button>
                <div class="currency-name" id="currencyName">${this.currentCurrency.name}</div>
                <button class="btn-currency" id="nextCurrency">→</button>
            </div>
            
            <div class="balance-stats">
                <div class="balance-section">
                    <div class="balance-amount">$${this.balance.toFixed(2)}</div>
                    <div class="balance-change" id="balanceChange"></div>
                </div>
                
                <div class="stats-section">
                    <div class="stat-item">
                        Сделки
                        <span class="stat-value" id="totalTrades">0</span>
                    </div>
                    <div class="stat-item">
                        Успешные
                        <span class="stat-value" id="successfulTrades">0</span>
                    </div>
                    <div class="stat-item">
                        Прибыль
                        <span class="stat-value" id="totalProfit">0</span>
                    </div>
                    <div class="stat-item">
                        Монет
                        <span class="stat-value" id="coinsCount">0</span>
                    </div>
                </div>
            </div>
        `;
        uiContainer.appendChild(topPanel);

        // Область графика (просто div для позиционирования)
        const chartArea = document.createElement('div');
        chartArea.className = 'chart-area';
        chartArea.id = 'chart-area';
        uiContainer.appendChild(chartArea);

        // Нижняя панель
        const bottomPanel = document.createElement('div');
        bottomPanel.className = 'bottom-panel';
        bottomPanel.innerHTML = `
            <div class="controls">
                <button class="btn btn-buy" id="buyBtn">КУПИТЬ</button>
                <button class="btn btn-sell" id="sellBtn" disabled>ПРОДАТЬ</button>
            </div>
            <button class="leaderboard-btn" id="leaderboardBtn">🏆 ТАБЛИЦА ЛИДЕРОВ</button>
        `;
        uiContainer.appendChild(bottomPanel);

        document.body.appendChild(uiContainer);

        // Назначаем обработчики
        this.setupEventListeners();
        this.updateStatsUI();
    }

    setupEventListeners() {
        this.buyBtn = document.getElementById('buyBtn');
        this.sellBtn = document.getElementById('sellBtn');
        this.balanceChange = document.getElementById('balanceChange');
        this.currencyName = document.getElementById('currencyName');
        this.prevCurrencyBtn = document.getElementById('prevCurrency');
        this.nextCurrencyBtn = document.getElementById('nextCurrency');
        this.totalTradesEl = document.getElementById('totalTrades');
        this.successfulTradesEl = document.getElementById('successfulTrades');
        this.totalProfitEl = document.getElementById('totalProfit');
        this.coinsCountEl = document.getElementById('coinsCount');
        this.leaderboardBtn = document.getElementById('leaderboardBtn');

        this.buyBtn.onclick = () => this.buyCoin();
        this.sellBtn.onclick = () => this.sellCoin();
        this.prevCurrencyBtn.onclick = () => this.switchCurrency(-1);
        this.nextCurrencyBtn.onclick = () => this.switchCurrency(1);
        this.leaderboardBtn.onclick = () => this.showLeaderboard();
    }

    switchCurrency(direction) {
        if (this.isHolding) return;
        
        this.currentCurrencyIndex += direction;
        if (this.currentCurrencyIndex < 0) {
            this.currentCurrencyIndex = this.currentCurrencies.length - 1;
        } else if (this.currentCurrencyIndex >= this.currentCurrencies.length) {
            this.currentCurrencyIndex = 0;
        }
        
        this.currencyName.textContent = this.currentCurrency.name;
        this.updateChart();
        this.updateUI();
    }

    updatePrice() {
        const currency = this.currentCurrency;
        
        const volatility = {
            'VKoin': 1.5,
            'Memecoin': 3.0,
            'Social Token': 0.8
        }[currency.name];
        
        const changePercent = (Math.random() - 0.5) * volatility;
        currency.price *= (1 + changePercent / 100);
        
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 100) {
            currency.history.shift();
        }
        
        this.updateChart();
        this.updateUI();
    }

    updateChart() {
        this.chart.clear();
        
        const history = this.priceHistory;
        const width = this.chartWidth;
        const height = this.chartHeight;
        
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем фон графика
        this.chart.fillStyle(0xf8f9fa);
        this.chart.fillRect(10, 120, width, height);
        
        // Рисуем линию графика
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        history.forEach((price, index) => {
            const x = 10 + (index / (history.length - 1)) * width;
            const y = 120 + height - ((price - minPrice) / range) * height;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
    }

    updateUI() {
        if (this.balanceChange) {
            document.querySelector('.balance-amount').textContent = `$${this.balance.toFixed(2)}`;
            this.coinsCountEl.textContent = this.ownedCoins;
            
            if (this.isHolding) {
                const profit = (this.currentPrice - this.buyPrice) * this.ownedCoins;
                const profitPercent = ((this.currentPrice - this.buyPrice) / this.buyPrice) * 100;
                
                this.balanceChange.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`;
                this.balanceChange.className = `balance-change ${profit >= 0 ? 'profit' : 'loss'}`;
            } else {
                this.balanceChange.textContent = '';
            }
        }
    }

    updateStatsUI() {
        if (this.totalTradesEl) {
            this.totalTradesEl.textContent = this.stats.totalTrades;
            this.successfulTradesEl.textContent = this.stats.successfulTrades;
            this.totalProfitEl.textContent = this.stats.totalProfit.toFixed(2);
            this.coinsCountEl.textContent = this.ownedCoins;
        }
    }

    buyCoin() {
        if (this.isHolding) return;
        
        const coinsToBuy = Math.floor(this.balance / this.currentPrice);
        if (coinsToBuy > 0) {
            this.ownedCoins = coinsToBuy;
            this.buyPrice = this.currentPrice;
            this.balance -= coinsToBuy * this.currentPrice;
            this.isHolding = true;
            
            this.buyBtn.disabled = true;
            this.sellBtn.disabled = false;
            
            this.updateUI();
            this.saveGameData();
        }
    }

    sellCoin() {
        if (!this.isHolding) return;
        
        const profit = (this.currentPrice - this.buyPrice) * this.ownedCoins;
        
        this.stats.totalTrades++;
        if (profit > 0) {
            this.stats.successfulTrades++;
        }
        this.stats.totalProfit += profit;
        
        this.balance += this.ownedCoins * this.currentPrice;
        this.ownedCoins = 0;
        this.isHolding = false;
        
        this.buyBtn.disabled = false;
        this.sellBtn.disabled = true;
        
        this.updateStatsUI();
        this.updateUI();
        this.saveGameData();
    }

    async loadGameData() {
        try {
            if (window.VK) {
                const data = await VK.call('storage.get', { 
                    keys: ['balance', 'ownedCoins', 'stats', 'currencies'] 
                });
                if (data.balance) this.balance = parseFloat(data.balance);
                if (data.ownedCoins) this.ownedCoins = parseInt(data.ownedCoins);
                if (data.stats) this.stats = JSON.parse(data.stats);
                if (data.currencies) {
                    const saved = JSON.parse(data.currencies);
                    this.currentCurrencies.forEach((currency, index) => {
                        if (saved[index]) {
                            currency.price = saved[index].price;
                            currency.history = saved[index].history || [currency.price];
                        }
                    });
                }
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
                    currencies: JSON.stringify(this.currentCurrencies)
                });
            }
        } catch (error) {
            console.log('Не удалось сохранить данные:', error);
        }
    }

    async showLeaderboard() {
        try {
            if (window.VK) {
                VK.call('showLeaderboardBox', { user_result: Math.floor(this.balance) });
            } else {
                alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
            }
        } catch (error) {
            alert(`Ваш баланс: $${this.balance.toFixed(2)}`);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 400,
    height: 600,
    backgroundColor: '#f8f9fa',
    scene: GameScene
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