class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        this.balance = 1000;
        this.coins = 0;
        this.isHolding = false;
        this.buyPrice = 0;
        this.currentPrice = 100;
        this.priceHistory = [];
    }

    preload() {
        // Ничего не грузим, используем графику Phaser
    }

    create() {
        console.log('Игра запущена!');
        
        // Инициализируем историю цен
        for (let i = 0; i < 50; i++) {
            this.priceHistory.push(this.currentPrice);
        }

        this.createUI();
        this.createChart();
        this.setupEvents();

        // Обновление цены каждую секунду
        this.time.addEvent({
            delay: 1000,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });
    }

    createUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Заголовок
        this.add.text(width / 2, 30, 'КРИПТО ГОНКА', {
            fontSize: '28px',
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Баланс
        this.balanceText = this.add.text(width / 2, 70, `БАЛАНС: $${this.balance}`, {
            fontSize: '24px',
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Текущая цена
        this.priceText = this.add.text(width / 2, 110, `ЦЕНА: $${this.currentPrice.toFixed(2)}`, {
            fontSize: '22px',
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка покупки
        this.buyButton = this.add.rectangle(width / 2 - 100, height - 100, 180, 60, 0x27ae60)
            .setInteractive();
        this.add.text(width / 2 - 100, height - 100, 'КУПИТЬ', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка продажи
        this.sellButton = this.add.rectangle(width / 2 + 100, height - 100, 180, 60, 0xe74c3c)
            .setInteractive();
        this.add.text(width / 2 + 100, height - 100, 'ПРОДАТЬ', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Информация о монетах
        this.coinsText = this.add.text(width / 2, height - 160, `МОНЕТ: ${this.coins}`, {
            fontSize: '18px',
            fill: '#f39c12',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.updateButtons();
    }

    createChart() {
        this.chart = this.add.graphics();
        this.updateChart();
    }

    setupEvents() {
        this.buyButton.on('pointerdown', () => {
            if (!this.isHolding) {
                this.buyCoins();
            }
        });

        this.sellButton.on('pointerdown', () => {
            if (this.isHolding) {
                this.sellCoins();
            }
        });
    }

    buyCoins() {
        const maxCoins = Math.floor(this.balance / this.currentPrice);
        if (maxCoins > 0) {
            this.coins = maxCoins;
            this.buyPrice = this.currentPrice;
            this.balance -= this.coins * this.currentPrice;
            this.isHolding = true;
            this.updateUI();
        }
    }

    sellCoins() {
        const profit = this.coins * this.currentPrice;
        this.balance += profit;
        this.coins = 0;
        this.isHolding = false;
        this.updateUI();
    }

    updatePrice() {
        // Случайное изменение цены от -5% до +5%
        const change = (Math.random() - 0.5) * 10;
        this.currentPrice = Math.max(1, this.currentPrice * (1 + change / 100));
        
        this.priceHistory.push(this.currentPrice);
        if (this.priceHistory.length > 50) {
            this.priceHistory.shift();
        }

        this.updateUI();
        this.updateChart();
    }

    updateUI() {
        this.balanceText.setText(`БАЛАНС: $${Math.floor(this.balance)}`);
        this.priceText.setText(`ЦЕНА: $${this.currentPrice.toFixed(2)}`);
        this.coinsText.setText(`МОНЕТ: ${this.coins}`);
        this.updateButtons();
    }

    updateButtons() {
        this.buyButton.setAlpha(this.isHolding ? 0.5 : 1);
        this.sellButton.setAlpha(this.isHolding ? 1 : 0.5);
    }

    updateChart() {
        this.chart.clear();
        
        const width = this.cameras.main.width - 40;
        const height = 200;
        const startX = 20;
        const startY = 150;

        if (this.priceHistory.length < 2) return;

        const minPrice = Math.min(...this.priceHistory);
        const maxPrice = Math.max(...this.priceHistory);
        const range = maxPrice - minPrice || 1;

        // Рисуем линию графика
        this.chart.lineStyle(4, 0x3498db, 1);

        for (let i = 0; i < this.priceHistory.length - 1; i++) {
            const x1 = startX + (i / (this.priceHistory.length - 1)) * width;
            const y1 = startY + height - ((this.priceHistory[i] - minPrice) / range) * height;
            const x2 = startX + ((i + 1) / (this.priceHistory.length - 1)) * width;
            const y2 = startY + height - ((this.priceHistory[i + 1] - minPrice) / range) * height;

            this.chart.lineBetween(x1, y1, x2, y2);
        }
    }
}

// Конфигурация Phaser
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#f8f9fa',
    scene: MainScene,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Запуск игры
window.addEventListener('load', () => {
    console.log('Загружаем игру...');
    new Phaser.Game(config);
});