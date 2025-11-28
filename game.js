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
        this.activeEvent = null;
        this.eventEndTime = 0;
        
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

        // Система новостей и событий - 25 событий
        this.eventsSystem = {
            news: [
                // БЫЧЬИ СОБЫТИЯ (положительные)
                {
                    id: 1,
                    title: "🚀 Космический рост!",
                    description: "Институциональные инвесторы входят в рынок",
                    effect: { multiplier: 2.2, duration: 15000 },
                    color: 0x27ae60,
                    icon: "🚀"
                },
                {
                    id: 2,
                    title: "📈 Бычий прорыв!",
                    description: "Цены обновляют годовые максимумы",
                    effect: { multiplier: 1.8, duration: 12000 },
                    color: 0x2ecc71,
                    icon: "📈"
                },
                {
                    id: 3,
                    title: "💎 Алмазные руки!",
                    description: "Ходлеры не продают несмотря на рост",
                    effect: { multiplier: 1.5, duration: 10000 },
                    color: 0x1abc9c,
                    icon: "💎"
                },
                {
                    id: 4,
                    title: "🎯 Технологический прорыв!",
                    description: "Запуск нового блокчейн-протокола",
                    effect: { multiplier: 2.0, duration: 13000 },
                    color: 0x3498db,
                    icon: "🎯"
                },
                {
                    id: 5,
                    title: "💰 Крупная инвестиция!",
                    description: "Венчурный фонд вложил $50M в проект",
                    effect: { multiplier: 1.7, duration: 11000 },
                    color: 0xf1c40f,
                    icon: "💰"
                },

                // МЕДВЕЖЬИ СОБЫТИЯ (отрицательные)
                {
                    id: 6,
                    title: "📉 Обвал рынка!",
                    description: "Паника на глобальных биржах",
                    effect: { multiplier: 0.4, duration: 14000 },
                    color: 0xe74c3c,
                    icon: "📉"
                },
                {
                    id: 7,
                    title: "🐻 Медвежья ловушка!",
                    description: "Крупные игроки открывают шорты",
                    effect: { multiplier: 0.6, duration: 12000 },
                    color: 0xc0392b,
                    icon: "🐻"
                },
                {
                    id: 8,
                    title: "💸 Массовые продажи!",
                    description: "Розничные инвесторы фиксируют прибыль",
                    effect: { multiplier: 0.5, duration: 10000 },
                    color: 0xd35400,
                    icon: "💸"
                },
                {
                    id: 9,
                    title: "⚡ Флэш-крэш!",
                    description: "Мгновенное падение на 15% за минуту",
                    effect: { multiplier: 0.3, duration: 8000 },
                    color: 0xff6b6b,
                    icon: "⚡"
                },
                {
                    id: 10,
                    title: "🛑 Регуляторные риски!",
                    description: "ЦБ рассматривает новые ограничения",
                    effect: { multiplier: 0.7, duration: 16000 },
                    color: 0xff4757,
                    icon: "🛑"
                },

                // ВОЛАТИЛЬНОСТЬ
                {
                    id: 11,
                    title: "🎭 Высокая волатильность!",
                    description: "Резкие скачки цен в обе стороны",
                    effect: { multiplier: 2.5, duration: 9000 },
                    color: 0xf39c12,
                    icon: "🎭"
                },
                {
                    id: 12,
                    title: "🌪️ Турбулентность!",
                    description: "Нестабильность на мировых рынках",
                    effect: { multiplier: 2.8, duration: 7000 },
                    color: 0xe67e22,
                    icon: "🌪️"
                },
                {
                    id: 13,
                    title: "⚖️ Боковик!",
                    description: "Цены движутся в узком диапазоне",
                    effect: { multiplier: 0.8, duration: 18000 },
                    color: 0x95a5a6,
                    icon: "⚖️"
                },

                // ТЕХНОЛОГИЧЕСКИЕ
                {
                    id: 14,
                    title: "🔧 Апгрейд сети!",
                    description: "Хардфорк улучшил производительность",
                    effect: { multiplier: 1.6, duration: 14000 },
                    color: 0x9b59b6,
                    icon: "🔧"
                },
                {
                    id: 15,
                    title: "🛡️ Повышение безопасности!",
                    description: "Внедрена новая система защиты",
                    effect: { multiplier: 1.4, duration: 12000 },
                    color: 0x34495e,
                    icon: "🛡️"
                },
                {
                    id: 16,
                    title: "🔗 Партнерство!",
                    description: "Крупная компания интегрирует технологию",
                    effect: { multiplier: 1.9, duration: 13000 },
                    color: 0x1abc9c,
                    icon: "🔗"
                },

                // МАКРОЭКОНОМИЧЕСКИЕ
                {
                    id: 17,
                    title: "🏦 Процентные ставки!",
                    description: "ЦБ снижает ключевую ставку",
                    effect: { multiplier: 1.5, duration: 15000 },
                    color: 0x27ae60,
                    icon: "🏦"
                },
                {
                    id: 18,
                    title: "📊 Инфляция падает!",
                    description: "Данные лучше ожиданий аналитиков",
                    effect: { multiplier: 1.3, duration: 12000 },
                    color: 0x2ecc71,
                    icon: "📊"
                },
                {
                    id: 19,
                    title: "🌍 Глобальный рост!",
                    description: "Мировая экономика показывает восстановление",
                    effect: { multiplier: 1.4, duration: 14000 },
                    color: 0x3498db,
                    icon: "🌍"
                },

                // НЕОЖИДАННЫЕ
                {
                    id: 20,
                    title: "🎲 Неожиданные новости!",
                    description: "Слухи о крупной сделке",
                    effect: { multiplier: 2.0, duration: 8000 },
                    color: 0xe74c3c,
                    icon: "🎲"
                },
                {
                    id: 21,
                    title: "📰 Сенсационное заявление!",
                    description: "CEO крупной компании высказался о крипто",
                    effect: { multiplier: 1.7, duration: 10000 },
                    color: 0xf39c12,
                    icon: "📰"
                },
                {
                    id: 22,
                    title: "🔍 Расследование!",
                    description: "Регуляторы проверяют крупный проект",
                    effect: { multiplier: 0.6, duration: 16000 },
                    color: 0x95a5a6,
                    icon: "🔍"
                },
                {
                    id: 23,
                    title: "🌟 Листинг на бирже!",
                    description: "Крупная биржа добавляет новую пару",
                    effect: { multiplier: 1.8, duration: 12000 },
                    color: 0xf1c40f,
                    icon: "🌟"
                },
                {
                    id: 24,
                    title: "⚡ Сетевые проблемы!",
                    description: "Временные сбои в работе сети",
                    effect: { multiplier: 0.5, duration: 9000 },
                    color: 0xe67e22,
                    icon: "⚡"
                },
                {
                    id: 25,
                    title: "🔄 Ребрендинг!",
                    description: "Проект представляет новое видение",
                    effect: { multiplier: 1.2, duration: 15000 },
                    color: 0x9b59b6,
                    icon: "🔄"
                }
            ],
            getRandomEvent: function() {
                return this.news[Math.floor(Math.random() * this.news.length)];
            }
        };

        this.layout = {
            padding: 20,
            headerHeight: 0,
            chartHeight: 0,
            buttonHeight: 0
        };
    }

    get currentCurrency() {
        return this.currencies[this.currentCurrencyIndex];
    }

    create() {
        console.log('Сцена создается');
        
        // Рассчитываем layout на основе размера экрана
        this.calculateLayout();
        
        // Инициализация данных
        this.currencies.forEach(currency => {
            currency.history = [];
            for (let i = 0; i < 50; i++) {
                currency.history.push(currency.price);
            }
        });

        this.createChart();
        this.createUI();
        this.setupEventListeners();
        
        // Запуск обновления цены
        this.time.addEvent({
            delay: 500,
            callback: this.updatePrice,
            callbackScope: this,
            loop: true
        });

        // Запуск случайных событий каждые 90 секунд (1.5 минуты)
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
        
        // Адаптивные размеры для полноэкранного режима
        this.layout.padding = Math.min(width * 0.05, 25);
        
        // Распределяем пространство: 25% заголовок, 50% график, 25% кнопки
        this.layout.headerHeight = height * 0.25;
        this.layout.chartHeight = height * 0.50;
        this.layout.buttonHeight = height * 0.25;
    }

    createChart() {
        this.chart = this.add.graphics();
        this.ordersGraphics = this.add.graphics();
        this.updateChart();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        
        // Рассчитываем позиции
        const headerY = this.layout.headerHeight / 2;
        const chartY = this.layout.headerHeight + this.layout.chartHeight / 2;
        const buttonY = this.layout.headerHeight + this.layout.chartHeight + this.layout.buttonHeight / 2;

        // Верхняя панель - валюта и баланс
        this.currencyText = this.add.text(centerX, headerY - 25, this.currentCurrency.name, {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#2c3e50',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.balanceText = this.add.text(centerX, headerY, `Баланс: $${this.balance.toFixed(2)}`, {
            fontSize: this.getAdaptiveFontSize(20),
            fill: '#2c3e50',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Кнопки переключения валют
        const buttonSize = this.getAdaptiveSize(35);
        this.prevButton = this.add.text(this.layout.padding + 25, headerY - 10, '←', {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        this.nextButton = this.add.text(width - this.layout.padding - 25, headerY - 10, '→', {
            fontSize: this.getAdaptiveFontSize(24),
            fill: '#3498db',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setInteractive();

        // Статистика
        this.statsText = this.add.text(centerX, headerY + 25, this.getStatsString(), {
            fontSize: this.getAdaptiveFontSize(14),
            fill: '#666',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Прибыль/убыток
        this.profitText = this.add.text(centerX, headerY + 45, '', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#27ae60',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Панель события
        this.eventPanel = this.add.rectangle(centerX, headerY + 70, width - this.layout.padding * 2, 35, 0x2c3e50, 0)
            .setVisible(false);
        this.eventText = this.add.text(centerX, headerY + 70, '', {
            fontSize: this.getAdaptiveFontSize(13),
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Кнопка покупки
        const buttonWidth = this.getAdaptiveSize(140);
        const buttonHeight = this.getAdaptiveSize(50);
        this.buyButton = this.add.rectangle(centerX - buttonWidth/1.8, buttonY - 20, buttonWidth, buttonHeight, 0x27ae60)
            .setInteractive();
        this.add.text(centerX - buttonWidth/1.8, buttonY - 20, 'КУПИТЬ', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка продажи
        this.sellButton = this.add.rectangle(centerX + buttonWidth/1.8, buttonY - 20, buttonWidth, buttonHeight, 0xe74c3c)
            .setInteractive();
        this.add.text(centerX + buttonWidth/1.8, buttonY - 20, 'ПРОДАТЬ', {
            fontSize: this.getAdaptiveFontSize(18),
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Кнопка стоп-ордеров
        const stopButtonWidth = this.getAdaptiveSize(200);
        const stopButtonHeight = this.getAdaptiveSize(40);
        this.stopButton = this.add.rectangle(centerX, buttonY + 20, stopButtonWidth, stopButtonHeight, 0xf39c12)
            .setInteractive();
        this.add.text(centerX, buttonY + 20, 'СТОП-ОРДЕР', {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Информация о стоп-ордерах
        this.stopInfo = this.add.text(centerX, buttonY - 5, '', {
            fontSize: this.getAdaptiveFontSize(12),
            fill: '#e67e22',
            fontFamily: 'Arial',
            backgroundColor: '#fef9e7',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);

        this.updateButtonStates();
        this.updateStopInfo();
    }

    getAdaptiveFontSize(baseSize) {
        const { height } = this.cameras.main;
        // Базовая адаптация для разных размеров экрана
        if (height < 600) return baseSize * 0.8 + 'px';
        if (height > 800) return baseSize * 1.2 + 'px';
        return baseSize + 'px';
    }

    getAdaptiveSize(baseSize) {
        const { height } = this.cameras.main;
        // Адаптация размеров элементов
        if (height < 600) return baseSize * 0.8;
        if (height > 800) return baseSize * 1.2;
        return baseSize;
    }

    setupEventListeners() {
        this.prevButton.on('pointerdown', () => this.switchCurrency(-1));
        this.nextButton.on('pointerdown', () => this.switchCurrency(1));
        this.buyButton.on('pointerdown', () => this.buyCoin());
        this.sellButton.on('pointerdown', () => this.sellCoin());
        this.stopButton.on('pointerdown', () => this.setStopOrder());
    }

    // Система событий и новостей
    triggerRandomEvent() {
        if (this.activeEvent) return;
        
        const event = this.eventsSystem.getRandomEvent();
        this.activeEvent = event;
        this.eventEndTime = Date.now() + event.effect.duration;
        
        // Показываем панель события с иконкой
        this.eventPanel.setFillStyle(event.color, 0.9).setVisible(true);
        this.eventText.setText(`${event.icon} ${event.title} - ${event.description}`).setVisible(true);
        
        // Анимация появления
        this.tweens.add({
            targets: [this.eventPanel, this.eventText],
            alpha: { from: 0, to: 1 },
            duration: 500
        });
        
        // Запускаем таймер завершения события
        this.time.delayedCall(event.effect.duration, () => {
            this.endEvent();
        });
        
        console.log(`Событие активировано: ${event.title}`);
    }

    endEvent() {
        if (this.activeEvent) {
            // Анимация исчезновения
            this.tweens.add({
                targets: [this.eventPanel, this.eventText],
                alpha: { from: 1, to: 0 },
                duration: 500,
                onComplete: () => {
                    this.eventPanel.setVisible(false);
                    this.eventText.setVisible(false);
                    this.activeEvent = null;
                }
            });
        }
    }

    getCurrentVolatility() {
        let baseVolatility = this.currentCurrency.volatility;
        
        if (this.activeEvent) {
            baseVolatility *= this.activeEvent.effect.multiplier;
        }
        
        return baseVolatility;
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
        const volatility = this.getCurrentVolatility();
        const changePercent = (Math.random() - 0.5) * volatility;
        currency.price *= (1 + changePercent / 100);
        currency.price = Math.max(currency.price, 1);
        
        currency.history.push(currency.price);
        if (currency.history.length > 50) {
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
                this.showMessage('СТОП-ЛОСС СРАБОТАЛ!');
            }
        }
        
        if (this.isHolding && this.takeProfit > 0) {
            if (this.currentCurrency.price >= this.takeProfit) {
                this.sellCoin();
                this.showMessage('ТЕЙК-ПРОФИТ СРАБОТАЛ!');
            }
        }
    }

    updateChart() {
        this.chart.clear();
        this.ordersGraphics.clear();
        
        const { width, height } = this.cameras.main;
        const chartWidth = width - this.layout.padding * 2;
        const chartHeight = this.layout.chartHeight - 40;
        const startY = this.layout.headerHeight + 20;
        
        const history = this.currentCurrency.history;
        const minPrice = Math.min(...history);
        const maxPrice = Math.max(...history);
        const range = maxPrice - minPrice || 1;
        
        // Рисуем линию графика
        this.chart.lineStyle(3, this.currentCurrency.color, 1);
        
        history.forEach((price, index) => {
            const x = this.layout.padding + (index / (history.length - 1)) * chartWidth;
            const y = startY + chartHeight - ((price - minPrice) / range) * chartHeight;
            
            if (index === 0) {
                this.chart.moveTo(x, y);
            } else {
                this.chart.lineTo(x, y);
            }
        });
        
        this.chart.strokePath();
        
        // УЛУЧШЕННАЯ ВИЗУАЛИЗАЦИЯ ОРДЕРОВ
        if (this.isHolding) {
            this.drawOrderLines(minPrice, maxPrice, startY, chartHeight, range, chartWidth);
            this.drawBuyMarker(startY, chartHeight, range, chartWidth);
        }
    }

    // УЛУЧШЕННАЯ ОТРИСОВКА ЛИНИЙ ОРДЕРОВ
    drawOrderLines(minPrice, maxPrice, startY, height, range, width) {
        // Стоп-лосс (красная жирная линия с заливкой)
        if (this.stopLoss > 0 && this.stopLoss >= minPrice && this.stopLoss <= maxPrice) {
            const stopY = startY + height - ((this.stopLoss - minPrice) / range) * height;
            
            // Основная линия
            this.ordersGraphics.lineStyle(3, 0xe74c3c, 0.9);
            this.ordersGraphics.lineBetween(this.layout.padding, stopY, this.layout.padding + width, stopY);
            
            // Фон для подписи
            this.ordersGraphics.fillStyle(0xe74c3c, 0.9);
            this.ordersGraphics.fillRect(this.layout.padding + 5, stopY - 12, 60, 16);
            
            // Подпись стоп-лосса
            this.add.text(this.layout.padding + 10, stopY - 10, `SL: $${this.stopLoss.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(10),
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
        }
        
        // Тейк-профит (зеленая жирная линия с заливкой)
        if (this.takeProfit > 0 && this.takeProfit >= minPrice && this.takeProfit <= maxPrice) {
            const profitY = startY + height - ((this.takeProfit - minPrice) / range) * height;
            
            // Основная линия
            this.ordersGraphics.lineStyle(3, 0x27ae60, 0.9);
            this.ordersGraphics.lineBetween(this.layout.padding, profitY, this.layout.padding + width, profitY);
            
            // Фон для подписи
            this.ordersGraphics.fillStyle(0x27ae60, 0.9);
            this.ordersGraphics.fillRect(this.layout.padding + 5, profitY - 12, 65, 16);
            
            // Подпись тейк-профита
            this.add.text(this.layout.padding + 10, profitY - 10, `TP: $${this.takeProfit.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(10),
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
        }
    }

    // УЛУЧШЕННЫЙ МАРКЕР ЦЕНЫ ПОКУПКИ
    drawBuyMarker(startY, height, range, width) {
        if (this.buyPrice > 0) {
            const minPrice = Math.min(...this.currentCurrency.history);
            const buyY = startY + height - ((this.buyPrice - minPrice) / range) * height;
            
            // Вертикальная пунктирная линия через весь график
            this.ordersGraphics.lineStyle(2, 0x3498db, 0.6);
            this.drawDashedLine(this.ordersGraphics, 
                this.layout.padding, buyY, 
                this.layout.padding + width, buyY, 8, 4);
            
            // Большой маркер цены покупки
            this.ordersGraphics.fillStyle(0x3498db, 1);
            this.ordersGraphics.fillCircle(this.layout.padding + width + 3, buyY, 6);
            
            // Обводка маркера
            this.ordersGraphics.lineStyle(2, 0xffffff, 1);
            this.ordersGraphics.strokeCircle(this.layout.padding + width + 3, buyY, 6);
            
            // Красивая подпись с фоном
            this.ordersGraphics.fillStyle(0x3498db, 0.9);
            this.ordersGraphics.fillRect(this.layout.padding + width + 10, buyY - 10, 75, 16);
            
            this.add.text(this.layout.padding + width + 13, buyY - 8, `BUY: $${this.buyPrice.toFixed(2)}`, { 
                fontSize: this.getAdaptiveFontSize(9),
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
        }
    }

    // Функция для рисования пунктирных линий
    drawDashedLine(graphics, x1, y1, x2, y2, dashLength, gapLength) {
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const dashTotal = dashLength + gapLength;
        const dashes = Math.floor(distance / dashTotal);
        const remainder = distance % dashTotal;
        
        let currentX = x1;
        let currentY = y1;
        
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
        this.balanceText.setText(`Баланс: $${this.balance.toFixed(2)}`);
        this.statsText.setText(this.getStatsString());
        
        if (this.isHolding) {
            const profit = (this.currentCurrency.price - this.buyPrice) * this.ownedCoins;
            const profitPercent = ((this.currentCurrency.price - this.buyPrice) / this.buyPrice) * 100;
            
            this.profitText.setText(`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
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
            if (this.stopLoss > 0) info += `STOP: $${this.stopLoss.toFixed(1)} `;
            if (this.takeProfit > 0) info += `PROFIT: $${this.takeProfit.toFixed(1)}`;
            this.stopInfo.setText(info);
        } else {
            this.stopInfo.setText('');
        }
    }

    getStatsString() {
        return `Сделки: ${this.stats.totalTrades} | Успешные: ${this.stats.successfulTrades} | Прибыль: $${this.stats.totalProfit.toFixed(2)}`;
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
            this.updateChart();
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
        this.updateChart();
        this.saveGameData();
    }

    setStopOrder() {
        if (!this.isHolding) return;
        
        this.stopLoss = this.buyPrice * 0.95;
        this.takeProfit = this.buyPrice * 1.10;
        
        this.updateUI();
        this.updateChart();
        this.saveGameData();
        
        this.showMessage('Стоп-ордера установлены!');
    }

    showMessage(text) {
        const centerX = this.cameras.main.width / 2;
        const messageY = this.layout.headerHeight + this.layout.chartHeight / 2;
        
        const message = this.add.text(centerX, messageY, text, {
            fontSize: this.getAdaptiveFontSize(16),
            fill: '#f39c12',
            fontFamily: 'Arial',
            backgroundColor: '#ffffff',
            padding: { left: 15, right: 15, top: 8, bottom: 8 }
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            message.destroy();
        });
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

// Конфигурация Phaser с полноэкранным режимом
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

// Запуск игры при полной загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, запускаем игру...');
    
    // Адаптация под мобильные устройства
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('Service Worker зарегистрирован');
        });
    }
    
    // Запуск в полноэкранном режиме
    setTimeout(() => {
        try {
            const game = new Phaser.Game(config);
            console.log('Phaser игра создана успешно в полноэкранном режиме');
            
            // Обработка изменения размера окна
            window.addEventListener('resize', () => {
                game.scale.refresh();
            });
            
        } catch (error) {
            console.error('Ошибка при создании игры:', error);
        }
    }, 100);
});
