// script.js — core app logic

// --- state & persistence ---
const S_KEY = 'fc_full_v1';
let store = {
  rub: 1000,
  usdt: 0,
  btc: 0,
  positions: [],      // open positions {id, side, sizeBTC, entryPrice, amountUSDT}
  history: [],
  deposits: [],       // {amount, start, apy}
  leaderboard: []
};

function load(){ try{ const s = localStorage.getItem(S_KEY); if(s) store = JSON.parse(s);}catch(e){console.warn(e);} }
function save(){ localStorage.setItem(S_KEY, JSON.stringify(store)); }

// --- UI refs ---
const elRub = document.getElementById('rub');
const elUsdt = document.getElementById('usdt');
const elBtc = document.getElementById('btcBal');
const elClickStake = document.getElementById('clickStake');
const elClickType = document.getElementById('clickType');
const elClickBtn = document.getElementById('clickBtn');
const elClickRes = document.getElementById('clickRes');
const elConvAmount = document.getElementById('convAmount');
const elRubToUsd = document.getElementById('rubToUsd');
const elUsdToRub = document.getElementById('usdToRub');
const elFxRate = document.getElementById('fxRate');
const elDepAmount = document.getElementById('depAmount');
const elOpenDep = document.getElementById('openDep');
const elDepInfo = document.getElementById('depInfo');
const elPairSelect = document.getElementById('pairSelect');
const elTfSelect = document.getElementById('tfSelect');
const elChartContainer = document.getElementById('chartContainer');
const elMarketStatus = document.getElementById('marketStatus');
const elOrderAmount = document.getElementById('orderAmount');
const elOrderType = document.getElementById('orderType');
const elOrderPrice = document.getElementById('orderPrice');
const elBuyBtn = document.getElementById('buyBtn');
const elSellBtn = document.getElementById('sellBtn');
const elPositionsList = document.getElementById('positionsList');
const elHistoryList = document.getElementById('historyList');
const elLeaderboard = document.getElementById('leaderboard');
const elTotalRub = document.getElementById('totalRub');
const elTotalPnl = document.getElementById('totalPnl');

// --- init ---
load(); renderBalances();

// --- connect market & chart ---
let chart = null;
let candleSeries = null;
let chartData = []; // candlesticks

async function initChart(pair='BTCUSDT', tf='1m'){
  elChartContainer.innerHTML = '';
  const chartEl = document.createElement('div'); chartEl.style.height = '420px'; chartEl.style.width = '100%';
  elChartContainer.appendChild(chartEl);
  chart = LightweightCharts.createChart(chartEl, { layout: { background: {color: '#0f1724'}, textColor: '#e6eef6' }, rightPriceScale: {visible:true}, timeScale:{timeVisible:true, secondsVisible:false} });
  candleSeries = chart.addCandlestickSeries({ upColor: '#1db954', downColor: '#ff4d4f', borderVisible:false, wickVisible:true });
  // fetch initial klines
  const klines = await Market.fetchKlines(pair, tf, 200);
  if(klines.length){
    const arr = klines.map(k=>({ time: k.time, open:k.open, high:k.high, low:k.low, close:k.close }));
    candleSeries.setData(arr);
    chartData = arr.slice(-200);
  } else {
    // seed synthetic
    const now = Math.floor(Date.now()/1000);
    const seed = 30000;
    let p = seed;
    for(let i=0;i<60;i++){
      p = Math.round(p*(1 + (Math.random()-0.5)*0.01)*100)/100;
      chartData.push({time: now - (60-i)*60, open:p, high:p*1.002, low:p*0.998, close:p});
    }
    candleSeries.setData(chartData);
  }
  // subscribe to kline events
  Market.on('kline', (candle)=>{
    // only push if same pair/tf
    if(elPairSelect.value !== Market.state.pair || elTfSelect.value !== Market.state.tf) return;
    // update last bar or add
    const last = chartData[chartData.length-1];
    if(!last || candle.time > last.time){
      const item = { time:candle.time, open:candle.open, high:candle.high, low:candle.low, close:candle.close };
      chartData.push(item);
      if(chartData.length>500) chartData.shift();
      candleSeries.update(item);
    } else {
      // update existing
      const item = { time:candle.time, open:candle.open, high:candle.high, low:candle.low, close:candle.close };
      chartData[chartData.length-1] = item;
      candleSeries.update(item);
    }
  });

  Market.on('status', s=>{
    elMarketStatus.innerText = s.text;
  });

  Market.connectBinance(elPairSelect.value, elTfSelect.value);
}

// switch pair/tf handlers
elPairSelect.addEventListener('change', ()=> {
  Market.connectBinance(elPairSelect.value, elTfSelect.value);
  initChart(elPairSelect.value, elTfSelect.value);
});
elTfSelect.addEventListener('change', ()=> {
  Market.connectBinance(elPairSelect.value, elTfSelect.value);
  initChart(elPairSelect.value, elTfSelect.value);
});

// fx rate updates
Market.on('rate', (r)=> {
  if(r && r.rubPerUsd) elFxRate.innerText = `Курс: ${r.rubPerUsd.toFixed(4)} ₽ / $`;
});

// start chart
initChart(elPairSelect.value, elTfSelect.value);

// --- trading params (from earlier) ---
const tradeParams = {
  safe:   {min:1.02, max:1.12, chance:0.85},
  normal: {min:0.8,  max:1.6,  chance:0.65},
  risk:   {min:0.0,  max:3.0,  chance:0.5}
};

// --- clicker trade (virtual instant) ---
function clickTrade(){
  const stake = Math.max(1, Number(elClickStake.value || 1));
  if(stake > store.rub){ alert('Недостаточно рублей'); return; }
  const type = elClickType.value;
  const cfg = tradeParams[type];
  store.rub -= stake;
  const win = Math.random() < cfg.chance;
  const mult = cfg.min + Math.random()*(cfg.max - cfg.min);
  const profit = Math.round(stake * (mult - 1));
  if(win && mult > 1){
    store.rub += stake + profit;
    pushHistory(`Клик ${type}: +${profit} ₽ (×${mult.toFixed(2)})`);
    showClickRes(`+${profit} ₽`, true);
  } else {
    const loss = Math.round(stake * (1 - Math.min(mult,1)));
    store.rub -= loss;
    pushHistory(`Клик ${type}: -${loss} ₽ (×${mult.toFixed(2)})`);
    showClickRes(`-${loss} ₽`, false);
  }
  save(); renderBalances(); maybeUpdateLeaderboard();
  // nudge market a bit (simulate impact)
  // small noop: market will update via WS
}
elClickBtn.addEventListener('click', ()=>{ elClickBtn.disabled=true; clickTrade(); setTimeout(()=>elClickBtn.disabled=false, 600); });
function showClickRes(text, ok){
  elClickRes.innerText = text; elClickRes.style.color = ok ? '#7aed9c' : '#ff7b7b';
  setTimeout(()=> elClickRes.innerText = '—', 2300);
}

// --- conversion (RUB <-> USD) using Market's fx data (if available) ---
async function rubToUsd(){
  const amt = Math.max(1, Number(elConvAmount.value || 1));
  if(amt > store.rub){ alert('Нет рублей'); return; }
  // use server fx if available
  // Market emits rate event containing usdPerRub or rubPerUsd; fallback simple
  let usdPerRub = Market.state.rateUSDperRUB || (1/90);
  const usd = amt * usdPerRub * (1 - 0.005); // 0.5% fee
  store.rub -= amt;
  store.usdt += +(usd.toFixed(6));
  pushHistory(`Обмен: ${amt} ₽ → ${usd.toFixed(4)} $`);
  save(); renderBalances(); maybeUpdateLeaderboard();
}
async function usdToRub(){
  const amt = Math.max(0.01, Number(elConvAmount.value || 1));
  if(amt > store.usdt){ alert('Нет $'); return; }
  const rubPerUsd = Market.state.rateRUBperUSD || (Market.state.rateUSDperRUB ? 1/Market.state.rateUSDperRUB : 90);
  const rub = amt * (rubPerUsd) * (1 - 0.005);
  store.usdt -= amt;
  store.rub += Math.round(rub);
  pushHistory(`Обмен: ${amt} $ → ${Math.round(rub)} ₽`);
  save(); renderBalances(); maybeUpdateLeaderboard();
}
elRubToUsd.addEventListener('click', rubToUsd);
elUsdToRub.addEventListener('click', usdToRub);

// keep fx values in Market.state mapped conveniently
Market.on('rate', r=>{
  if(r && r.rubPerUsd){
    Market.state.rateRUBperUSD = r.rubPerUsd;
    Market.state.rateUSDperRUB = r.usdPerRub;
  } else if(r && r.rubPerUsd === undefined && r.usdPerRub){
    Market.state.rateUSDperRUB = r.usdPerRub;
    Market.state.rateRUBperUSD = 1/r.usdPerRub;
  }
});

// --- deposits ---
const APY = 0.12; // 12% годовых
elOpenDep.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(elDepAmount.value || 1));
  if(amt > store.usdt){ alert('Нет $'); return; }
  store.usdt -= amt;
  store.deposits.push({amount:amt, start:Date.now(), apy:APY});
  pushHistory(`Вклад открыт: ${amt} $`);
  save(); renderBalances(); renderDeposits();
});
function processDeposits(dtSeconds=5){
  // accrue to usd, simple compounding
  store.deposits.forEach(d=>{
    const perSec = d.amount * d.apy / 31536000;
    const delta = perSec * dtSeconds;
    store.usdt += delta; // credit to balance
    d.amount += delta;   // compound
  });
  save(); renderBalances(); renderDeposits();
}
setInterval(()=> processDeposits(5), 5000);

// --- manual orders (market/limit) simplified ---
function marketBuy(amountUSDT){
  // buy BTC at last price from Market.state.lastKline.close or chartData
  const price = Market.state.lastKline ? Market.state.lastKline.close : (chartData[chartData.length-1]?.close || 30000);
  const btcQty = amountUSDT / price;
  store.usdt -= amountUSDT;
  store.btc += btcQty;
  store.positions.push({id:Date.now(), side:'long', sizeBTC:btcQty, entryPrice:price, amountUSDT:amountUSDT});
  pushHistory(`Market Buy ${btcQty.toFixed(6)} BTC @ ${price.toFixed(2)} (spent ${amountUSDT} $)`);
  save(); renderBalances(); renderPositions(); maybeUpdateLeaderboard();
}
function marketSell(amountUSDT){
  // sell amount worth of BTC
  const price = Market.state.lastKline ? Market.state.lastKline.close : (chartData[chartData.length-1]?.close || 30000);
  const btcToSell = amountUSDT / price;
  if(btcToSell > store.btc){ alert('Нет BTC'); return; }
  store.btc -= btcToSell;
  store.usdt += amountUSDT;
  // close proportional positions (simple handling)
  pushHistory(`Market Sell ${btcToSell.toFixed(6)} BTC @ ${price.toFixed(2)} (got ${amountUSDT} $)`);
  save(); renderBalances(); renderPositions(); maybeUpdateLeaderboard();
}
elBuyBtn.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(elOrderAmount.value || 1));
  if(amt > store.usdt){ alert('Недостаточно $'); return; }
  if(elOrderType.value === 'market'){ marketBuy(amt); }
  else {
    // limit: for demo we'll execute if current price <= orderPrice (for buy)
    const target = Number(elOrderPrice.value || 0);
    if(!target){ alert('Укажи цену'); return; }
    // store a pending order
    store.history.push({t:new Date().toLocaleTimeString(), text:`Limit Buy ${amt}$ @ ${target}`});
    save(); renderHistory();
  }
});
elSellBtn.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(elOrderAmount.value || 1));
  // if user wants to sell, ensure they have BTC equivalent
  const price = Market.state.lastKline ? Market.state.lastKline.close : (chartData[chartData.length-1]?.close || 30000);
  const neededBTC = amt / price;
  if(neededBTC > store.btc){ alert('Недостаточно BTC'); return; }
  if(elOrderType.value === 'market'){ marketSell(amt); }
  else {
    const target = Number(elOrderPrice.value || 0);
    store.history.push({t:new Date().toLocaleTimeString(), text:`Limit Sell ${amt}$ @ ${target}`});
    save(); renderHistory();
  }
});

// --- rendering helpers ---
function renderBalances(){
  elRub.innerText = Math.round(store.rub);
  elUsdt.innerText = store.usdt.toFixed(6);
  elBtc.innerText = store.btc.toFixed(6);
  // total in RUB (approx)
  const usdToRub = Market.state.rateRUBperUSD || 90;
  const totalRub = Math.round(store.rub + store.usdt * usdToRub + (store.btc * (Market.state.lastKline ? Market.state.lastKline.close * usdToRub : 0)));
  elTotalRub.innerText = totalRub + ' ₽';
}
function renderDeposits(){
  elDepInfo.innerText = `Вкладов: ${store.deposits.length}`;
}
function pushHistory(text){
  store.history.unshift({t:new Date().toLocaleTimeString(), text});
  if(store.history.length>200) store.history.pop();
  save(); renderHistory();
}
function renderHistory(){
  elHistoryList.innerHTML = '';
  store.history.slice(0,50).forEach(h=>{
    const li = document.createElement('li'); li.textContent = `${h.t} — ${h.text}`;
    elHistoryList.appendChild(li);
  });
}
function renderPositions(){
  elPositionsList.innerHTML = '';
  store.positions.forEach(pos=>{
    const li = document.createElement('div'); li.className='pos';
    const price = Market.state.lastKline ? Market.state.lastKline.close : pos.entryPrice;
    const curVal = pos.sizeBTC * price;
    const pnl = curVal - pos.amountUSDT;
    li.innerHTML = `<div>Pos ${pos.id} — ${pos.sizeBTC.toFixed(6)} BTC @ ${pos.entryPrice.toFixed(2)}</div><div>Cur ${curVal.toFixed(2)} $ PnL ${pnl.toFixed(2)} $</div>`;
    elPositionsList.appendChild(li);
  });
}
function maybeUpdateLeaderboard(){
  const usdToRub = Market.state.rateRUBperUSD ? 1/Market.state.rateUSDperRUB : 90;
  const total = Math.round(store.rub + store.usdt * usdToRub + store.btc * (Market.state.lastKline ? Market.state.lastKline.close * usdToRub : 0));
  store.leaderboard.push({score:total, t:Date.now()});
  store.leaderboard = store.leaderboard.sort((a,b)=>b.score-a.score).slice(0,10);
  save(); renderLeaderboard();
}
function renderLeaderboard(){
  elLeaderboard.innerHTML = '';
  store.leaderboard.forEach(it=>{
    const li = document.createElement('li');
    li.textContent = `${it.score} ₽`;
    elLeaderboard.appendChild(li);
  });
}

// update UI periodically
setInterval(()=>{ renderBalances(); renderPositions(); renderHistory(); }, 2000);

// handle incoming kline to update local Market.state.lastKline mapping (for price)
Market.on('kline', (candle)=> {
  Market.state.lastKline = candle;
});

// initial render
renderDeposits();
renderPositions();
renderHistory();
renderLeaderboard();
