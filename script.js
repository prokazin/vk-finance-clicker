let state = {
    rub: 0,
    usd: 0,
    btc: 0,
    deposits: [],
    positions: [],
    lastPrices: { BTC: 45000, TON: 5.0, RUB: 90 },
    online: true
};

loadState();

const rubBal = document.getElementById("rubBalance");
const usdBal = document.getElementById("usdBalance");
const btcBal = document.getElementById("btcBalance");
const netStatus = document.getElementById("netStatus");

renderBalances();

document.getElementById("clickBtn").onclick = () => {
    state.rub += 1;
    saveState();
    renderBalances();
};

function renderBalances(){
    rubBal.textContent = state.rub;
    usdBal.textContent = state.usd.toFixed(2);
    btcBal.textContent = state.btc.toFixed(6);
}

function saveState(){
    localStorage.setItem("gameState", JSON.stringify(state));
}

function loadState(){
    const saved = localStorage.getItem("gameState");
    if(saved) state = JSON.parse(saved);
}

window.addEventListener("online", ()=>{ state.online = true; netStatus.textContent = "Online"; });
window.addEventListener("offline", ()=>{ state.online = false; netStatus.textContent = "Offline"; });


// -------------------- GRAPH -----------------------

let chart = LightweightCharts.createChart(document.getElementById("chart"), {
    layout: { background: { color: "#0e0e0e" }, textColor:"#fff" },
    grid: { vertLines:{color:"#222"}, horzLines:{color:"#222"} }
});
let candleSeries = chart.addCandlestickSeries();

async function loadOnlineCandles(symbol){
    try {
        let url;
        if(symbol === "BTC") url = "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=50";
        if(symbol === "TON") url = "https://api.binance.com/api/v3/klines?symbol=TONUSDT&interval=1m&limit=50";
        if(symbol === "RUB") url = "https://api.binance.com/api/v3/klines?symbol=USDTRUB&interval=1m&limit=50";

        const candles = await fetch(url).then(r=>r.json());

        const formatted = candles.map(c => ({
            time: c[0] / 1000,
            open: Number(c[1]),
            high: Number(c[2]),
            low: Number(c[3]),
            close: Number(c[4])
        }));

        candleSeries.setData(formatted);
        state.lastPrices[symbol] = formatted.at(-1).close;
        renderBalances();

    } catch(e){
        state.online = false;
        netStatus.textContent = "Offline";
    }
}

function offlineCandle(prev){
    const open = prev;
    const close = open + (Math.random() - 0.5) * (prev * 0.002);
    const high = Math.max(open, close) + Math.random()*5;
    const low = Math.min(open, close) - Math.random()*5;

    return { open, high, low, close };
}

let offlineData = [];

function updateOffline(symbol){
    if(offlineData.length === 0){
        let base = state.lastPrices[symbol];
        for(let i=0;i<50;i++){
            let c = offlineCandle(base);
            offlineData.push({
                time: Math.floor(Date.now()/1000) - (60*(50-i)),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close
            });
            base = c.close;
        }
        candleSeries.setData(offlineData);
    }

    let last = offlineData.at(-1).close;
    let c = offlineCandle(last);

    offlineData.push({
        time: Math.floor(Date.now()/1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
    });

    if(offlineData.length > 50) offlineData.shift();

    candleSeries.setData(offlineData);
    state.lastPrices[symbol] = c.close;
}

setInterval(()=>{
    const symbol = document.getElementById("assetSelect").value;

    if(state.online){
        loadOnlineCandles(symbol);
    } else {
        updateOffline(symbol);
    }
}, 5000);

// -------------------- TRADE -----------------------

document.getElementById("buyBtn").onclick = ()=> trade("buy");
document.getElementById("sellBtn").onclick = ()=> trade("sell");

function trade(side){
    const amount = Number(document.getElementById("tradeAmount").value);
    const symbol = document.getElementById("assetSelect").value;
    const price = state.lastPrices[symbol];

    if(!amount) return;

    if(side === "buy"){
        if(state.usd < amount) return alert("Not enough USD");

        state.usd -= amount;
        const btc = amount / price;

        state.btc += btc;

        state.positions.push({
            type:"BUY",
            entry:price,
            amount:btc,
            time:Date.now()
        });

    } else {
        const btc = amount / price;
        if(state.btc < btc) return alert("Not enough BTC");

        state.btc -= btc;
        state.usd += amount;

        state.positions.push({
            type:"SELL",
            entry:price,
            amount:btc,
            time:Date.now()
        });
    }

    saveState();
    renderBalances();
    renderPositions();
}

function renderPositions(){
    const box = document.getElementById("positions");
    box.innerHTML = "";

    state.positions.forEach(p=>{
        box.innerHTML += `
            <div>
                ${p.type} — ${p.amount.toFixed(6)} BTC @ ${p.entry}
            </div>
        `;
    });
}

// -------------------- Earn -----------------------

document.getElementById("depBtn").onclick = ()=> {
    const sum = Number(document.getElementById("depAmount").value);
    if(sum < 1 || state.rub < sum) return;

    state.rub -= sum;
    state.deposits.push({
        amount: sum,
        last: Date.now()
    });

    saveState();
    renderBalances();
    renderDeposits();
};

function renderDeposits(){
    const box = document.getElementById("depositList");
    box.innerHTML = "";

    state.deposits.forEach(d=>{
        box.innerHTML += `<div>Deposit: ${d.amount} RUB</div>`;
    });
}

setInterval(()=>{
    state.deposits.forEach(d=>{
        if(Date.now() - d.last > 10000){
            d.amount *= 1.02;
            d.last = Date.now();
            state.rub += d.amount * 0.02;
        }
    });
    saveState();
    renderBalances();
    renderDeposits();
}, 3000);

// -------------------- Converter -----------------------

document.getElementById("rubToUsd").onclick = ()=>{
    if(state.rub < 100) return;
    const price = state.lastPrices.RUB;
    state.rub -= 100;
    state.usd += 100 / price;
    saveState();
    renderBalances();
};

document.getElementById("usdToRub").onclick = ()=>{
    if(state.usd < 1) return;
    const price = state.lastPrices.RUB;
    state.usd -= 1;
    state.rub += 1 * price;
    saveState();
    renderBalances();
};