// script.js — core app for full exchange demo (BTC, TON, RUB virtual)
// state persistence key
const SKEY = 'fc_full_v2';
let store = {
  rub: 1000,
  usdt: 0,
  btc: 0,
  ton: 0,
  positions: [],   // not used for simple market buy (we store positions when using 'positions' flow)
  openOrders: [],  // limit orders: {id, pair, side, amountUSDT, price}
  history: [],
  deposits: [],
  leaderboard: []
};

function loadStore(){ try{ const raw = localStorage.getItem(SKEY); if(raw) store = JSON.parse(raw); }catch(e){ console.warn(e); } }
function saveStore(){ localStorage.setItem(SKEY, JSON.stringify(store)); }

loadStore();

// UI refs
const refs = {
  rub: document.getElementById('rub'),
  usdt: document.getElementById('usdt'),
  btcBal: document.getElementById('btcBal'),
  tonBal: document.getElementById('tonBal'),
  clickStake: document.getElementById('clickStake'),
  clickType: document.getElementById('clickType'),
  clickBtn: document.getElementById('clickBtn'),
  clickRes: document.getElementById('clickRes'),
  convAmount: document.getElementById('convAmount'),
  rubToUsd: document.getElementById('rubToUsd'),
  usdToRub: document.getElementById('usdToRub'),
  fxRate: document.getElementById('fxRate'),
  depAmount: document.getElementById('depAmount'),
  openDep: document.getElementById('openDep'),
  depInfo: document.getElementById('depInfo'),
  pairSelect: document.getElementById('pairSelect'),
  tfSelect: document.getElementById('tfSelect'),
  chartContainer: document.getElementById('chartContainer'),
  marketStatus: document.getElementById('marketStatus'),
  tradePair: document.getElementById('tradePair'),
  orderAmount: document.getElementById('orderAmount'),
  orderType: document.getElementById('orderType'),
  orderPrice: document.getElementById('orderPrice'),
  buyBtn: document.getElementById('buyBtn'),
  sellBtn: document.getElementById('sellBtn'),
  positionsList: document.getElementById('positionsList'),
  historyList: document.getElementById('historyList'),
  leaderboard: document.getElementById('leaderboard'),
  ordersList: document.getElementById('ordersList'),
  totalRub: document.getElementById('totalRub'),
  totalPnl: document.getElementById('totalPnl'),
  openOrders: document.getElementById('openOrders')
};

// render balances
function renderBalances(){
  refs.rub.innerText = Math.round(store.rub);
  refs.usdt.innerText = store.usdt.toFixed(6);
  refs.btcBal.innerText = store.btc.toFixed(6);
  refs.tonBal.innerText = store.ton.toFixed(6);
  // total in rub roughly
  const rubPerUsd = Market.state.rateRUBperUSD || 90;
  const totalRub = Math.round(store.rub + store.usdt * rubPerUsd + (store.btc * (Market.state.lastKline ? Market.state.lastKline.close * rubPerUsd : 0)) + (store.ton * (Market.state.lastKline ? Market.state.lastKline.close * rubPerUsd : 0)));
  refs.totalRub.innerText = `${totalRub} ₽`;
}
renderBalances();

// trade params for clicks
const tradeParams = {
  safe: {min:1.02, max:1.12, chance:0.85},
  normal: {min:0.8, max:1.6, chance:0.65},
  risk: {min:0, max:3.0, chance:0.5}
};

// CLICK trade (instant virtual)
refs.clickBtn.addEventListener('click', ()=>{
  refs.clickBtn.disabled = true;
  setTimeout(()=> refs.clickBtn.disabled = false, 600);
  const stake = Math.max(1, Number(refs.clickStake.value || 1));
  if(stake > store.rub){ alert('Недостаточно рублей'); return; }
  const type = refs.clickType.value;
  const cfg = tradeParams[type];
  store.rub -= stake;
  const win = Math.random() < cfg.chance;
  const mult = cfg.min + Math.random()*(cfg.max - cfg.min);
  const profit = Math.round(stake * (mult - 1));
  if(win && mult > 1){
    store.rub += stake + profit;
    pushHistory(`Клик ${type}: выигрыш +${profit} ₽ (×${mult.toFixed(2)})`);
    showClickRes(`+${profit} ₽`, true);
  } else {
    const loss = Math.round(stake * (1 - Math.min(mult,1)));
    store.rub -= loss;
    pushHistory(`Клик ${type}: проигрыш -${loss} ₽ (×${mult.toFixed(2)})`);
    showClickRes(`-${loss} ₽`, false);
  }
  saveStore(); renderBalances(); maybeLeaderboard();
});

function showClickRes(text, ok){
  refs.clickRes.innerText = text;
  refs.clickRes.style.color = ok ? '#7aed9c' : '#ff7b7b';
  setTimeout(()=> refs.clickRes.innerText = '—', 2500);
}

// Conversion using FX from Market
refs.rubToUsd.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(refs.convAmount.value || 1));
  if(amt > store.rub){ alert('Нет рублей'); return; }
  const usdPerRub = Market.state.rateUSDperRUB || (1/90);
  const usd = amt * usdPerRub * (1 - 0.005);
  store.rub -= amt;
  store.usdt += +(usd.toFixed(6));
  pushHistory(`Обмен: ${amt} ₽ → ${usd.toFixed(4)} $`);
  saveStore(); renderBalances(); maybeLeaderboard();
});
refs.usdToRub.addEventListener('click', ()=>{
  const amt = Math.max(0.01, Number(refs.convAmount.value || 1));
  if(amt > store.usdt){ alert('Нет $'); return; }
  const rubPerUsd = Market.state.rateRUBperUSD || 90;
  const rub = amt * rubPerUsd * (1 - 0.005);
  store.usdt -= amt;
  store.rub += Math.round(rub);
  pushHistory(`Обмен: ${amt} $ → ${Math.round(rub)} ₽`);
  saveStore(); renderBalances(); maybeLeaderboard();
});

// deposits
const DEPOSIT_APY = 0.12; // 12% годовых
refs.openDep.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(refs.depAmount.value || 1));
  if(amt > store.usdt){ alert('Нет $'); return; }
  store.usdt -= amt;
  store.deposits.push({amount:amt, start:Date.now(), apy:DEPOSIT_APY});
  pushHistory(`Вклад открыт: ${amt} $`);
  saveStore(); renderBalances(); renderDeposits();
});
function processDepositsTick(dtSeconds=5){
  store.deposits.forEach(d=>{
    const perSec = d.amount * d.apy / 31536000;
    const delta = perSec * dtSeconds;
    store.usdt += delta;
    d.amount += delta;
  });
  saveStore(); renderBalances(); renderDeposits();
}
setInterval(()=> processDepositsTick(5), 5000);

function renderDeposits(){
  refs.depInfo.innerText = `Вкладов: ${store.deposits.length}`;
}

// Orders (market and limit)
refs.buyBtn.addEventListener('click', ()=> handleOrder('buy'));
refs.sellBtn.addEventListener('click', ()=> handleOrder('sell'));

function handleOrder(side){
  const pair = refs.tradePair.value;
  const amount = Math.max(1, Number(refs.orderAmount.value || 1));
  const type = refs.orderType.value;
  const price = Number(refs.orderPrice.value || 0);
  if(type === 'market'){
    // market: execute immediately at last known price
    executeMarketOrder(pair, side, amount);
  } else {
    // limit: add to openOrders, will be checked on incoming kline events
    if(price <= 0){ alert('Укажи цену для limit'); return; }
    const id = Date.now() + Math.floor(Math.random()*1000);
    store.openOrders.push({id, pair, side, amountUSDT:amount, price});
    pushHistory(`Limit ${side.toUpperCase()} ${amount}$ on ${pair} @ ${price}`);
    saveStore(); renderOpenOrders(); maybeLeaderboard();
  }
}

function executeMarketOrder(pair, side, amountUSDT){
  // find last known price from Market.state.lastKline
  let price = Market.state.lastKline ? Market.state.lastKline.close : null;
  if(!price){
    // fallback: from initial chart data if present
    price = 0;
    // can't execute
    alert('Нет актуальной цены для market order — подожди подключение к рынку');
    return;
  }
  if(side === 'buy'){
    if(amountUSDT > store.usdt){ alert('Недостаточно $'); return; }
    const qty = amountUSDT / price;
    if(pair === 'BTCUSDT'){ store.btc += qty; }
    if(pair === 'TONUSDT'){ store.ton += qty; }
    store.usdt -= amountUSDT;
    pushHistory(`Market Buy ${qty.toFixed(6)} ${pair.replace('USDT','')} @ ${price.toFixed(4)} (spent ${amountUSDT}$)`);
  } else {
    // sell: ensure token balance
    const neededQty = amountUSDT / price;
    if(pair === 'BTCUSDT'){
      if(neededQty > store.btc){ alert('Недостаточно BTC'); return; }
      store.btc -= neededQty;
    }
    if(pair === 'TONUSDT'){
      if(neededQty > store.ton){ alert('Недостаточно TON'); return; }
      store.ton -= neededQty;
    }
    store.usdt += amountUSDT;
    pushHistory(`Market Sell ${neededQty.toFixed(6)} ${pair.replace('USDT','')} @ ${price.toFixed(4)} (got ${amountUSDT}$)`);
  }
  saveStore(); renderBalances(); renderPositions(); renderOpenOrders(); maybeLeaderboard();
}

// open orders execution on kline update: if price crosses target, execute
function checkOpenOrdersOnKline(pair, kline){
  // for each open order for this pair check if the kline high/low crosses price
  const toExec = [];
  store.openOrders.forEach(o=>{
    if(o.pair !== pair) return;
    const target = o.price;
    const side = o.side;
    // if side buy: execute when kline.low <= target (price reached)
    if(side === 'buy' && kline.low <= target && kline.high >= target) toExec.push(o);
    // if side sell: execute when kline.high >= target && kline.low <= target
    if(side === 'sell' && kline.low <= target && kline.high >= target) toExec.push(o);
  });
  toExec.forEach(o=>{
    // execute at target price
    executeLimitOrder(o);
  });
}

function executeLimitOrder(order){
  // remove from openOrders
  store.openOrders = store.openOrders.filter(o=>o.id !== order.id);
  const p = order.pair;
  const amt = order.amountUSDT;
  const price = order.price;
  if(order.side === 'buy'){
    if(amt > store.usdt){ pushHistory(`Limit BUY failed (нет $) ${p}@${price}`); return; }
    const qty = amt / price;
    if(p === 'BTCUSDT') store.btc += qty;
    if(p === 'TONUSDT') store.ton += qty;
    store.usdt -= amt;
    pushHistory(`Limit BUY executed ${qty.toFixed(6)} ${p.replace('USDT','')} @ ${price} (spent ${amt}$)`);
  } else {
    // sell
    const neededQty = amt / price;
    if(p === 'BTCUSDT'){
      if(neededQty > store.btc){ pushHistory(`Limit SELL failed (нет BTC) ${p}@${price}`); return; }
      store.btc -= neededQty;
    }
    if(p === 'TONUSDT'){
      if(neededQty > store.ton){ pushHistory(`Limit SELL failed (нет TON) ${p}@${price}`); return; }
      store.ton -= neededQty;
    }
    store.usdt += amt;
    pushHistory(`Limit SELL executed ${neededQty.toFixed(6)} ${p.replace('USDT','')} @ ${price} (got ${amt}$)`);
  }
  saveStore(); renderBalances(); renderOpenOrders(); renderPositions(); maybeLeaderboard();
}

// render open orders
function renderOpenOrders(){
  refs.openOrders.innerText = `Ордера: ${store.openOrders.length}`;
  const container = refs.ordersList;
  container.innerHTML = '';
  store.openOrders.forEach(o=>{
    const el = document.createElement('div');
    el.className = 'order';
    el.innerText = `${o.pair} ${o.side.toUpperCase()} ${o.amountUSDT}$ @ ${o.price}`;
    container.appendChild(el);
  });
}

// positions rendering (simple: show balances)
function renderPositions(){
  const c = refs.positionsList;
  c.innerHTML = '';
  const btcLine = document.createElement('div'); btcLine.innerText = `BTC: ${store.btc.toFixed(6)}`;
  const tonLine = document.createElement('div'); tonLine.innerText = `TON: ${store.ton.toFixed(6)}`;
  c.appendChild(btcLine); c.appendChild(tonLine);
}

// history
function pushHistory(text){
  store.history.unshift({t:new Date().toLocaleTimeString(), text});
  if(store.history.length > 500) store.history.pop();
  saveStore(); renderHistory();
}
function renderHistory(){
  refs.historyList.innerHTML = '';
  store.history.slice(0,100).forEach(h=>{
    const li = document.createElement('li'); li.textContent = `${h.t} — ${h.text}`;
    refs.historyList.appendChild(li);
  });
}

// leaderboard
function maybeLeaderboard(){
  const rubPerUsd = Market.state.rateRUBperUSD || 90;
  const total = Math.round(store.rub + store.usdt * rubPerUsd + store.btc * (Market.state.lastKline ? Market.state.lastKline.close * rubPerUsd : 0) + store.ton * (Market.state.lastKline ? Market.state.lastKline.close * rubPerUsd : 0));
  store.leaderboard.push({score: total, t: Date.now()});
  store.leaderboard = store.leaderboard.sort((a,b)=>b.score - a.score).slice(0,10);
  saveStore(); renderLeaderboard();
}
function renderLeaderboard(){
  refs.leaderboard.innerHTML = '';
  store.leaderboard.forEach(it=>{
    const li = document.createElement('li'); li.textContent = `${it.score} ₽`;
    refs.leaderboard.appendChild(li);
  });
}

// periodic UI refresh
setInterval(()=>{ renderBalances(); renderPositions(); renderHistory(); renderOpenOrders(); renderDeposits(); renderLeaderboard(); }, 2000);

// hook Market events
Market.on('status', s=>{
  refs.marketStatus.innerText = s.text;
});
Market.on('initial_klines', ({pair, data})=>{
  // init chart handled separately in chart init
});
Market.on('kline', (payload)=>{
  const {pair, candle} = payload;
  // check limit orders for this pair
  checkOpenOrdersOnKline(pair, candle);
  // update lastKline accessible
  Market.state.lastKline = candle;
});

// FX rates
Market.on('rate', r=>{
  if(r && r.rubPerUsd){
    refs.fxRate.innerText = `Курс: ${r.rubPerUsd.toFixed(4)} ₽ / $`;
    Market.state.rateRUBperUSD = r.rubPerUsd;
    Market.state.rateUSDperRUB = r.usdPerRub || (1/r.rubPerUsd);
  } else if(r && r.usdPerRub){
    refs.fxRate.innerText = `Курс: ${(1/r.usdPerRub).toFixed(4)} ₽ / $`;
  }
});

// Chart using LightweightCharts
let lwChart = null, candleSeries = null, currentChartPair = 'BTCUSDT', currentTF = '1m', candleData = [];

async function initChart(pair='BTCUSDT', tf='1m'){
  currentChartPair = pair; currentTF = tf;
  refs.chartContainer.innerHTML = '';
  const el = document.createElement('div'); el.style.width='100%'; el.style.height='440px';
  refs.chartContainer.appendChild(el);
  lwChart = LightweightCharts.createChart(el, { layout:{background:{color:'#0f1724'}, textColor:'#e6eef6'}, rightPriceScale:{visible:true}, timeScale:{timeVisible:true, secondsVisible:false} });
  candleSeries = lwChart.addCandlestickSeries({ upColor:'#1db954', downColor:'#ff4d4f', borderVisible:false, wickVisible:true });
  // fetch klines
  const kl = await Market.fetchKlines(pair, tf, 300);
  const arr = kl.map(k=>({ time: k.time, open: k.open, high: k.high, low: k.low, close: k.close }));
  candleData = arr.slice(-500);
  candleSeries.setData(candleData);
  // subscribe kline events to update series
  Market.on('kline', ({pair: p, candle})=>{
    if(p !== currentChartPair) return;
    const item = { time: candle.time, open:candle.open, high:candle.high, low:candle.low, close:candle.close };
    const last = candleData[candleData.length-1];
    if(!last || item.time > last.time){
      candleData.push(item);
      if(candleData.length>1000) candleData.shift();
      candleSeries.update(item);
    } else {
      candleData[candleData.length-1] = item;
      candleSeries.update(item);
    }
  });
  // connect binance ws
  if(pair !== 'RUBUSD') Market.connect(pair, tf);
  refs.pairSelect.value = pair;
  refs.tfSelect.value = tf;
}

// switch handlers
refs.pairSelect.addEventListener('change', ()=>{
  const p = refs.pairSelect.value;
  initChart(p, refs.tfSelect.value);
});
refs.tfSelect.addEventListener('change', ()=> initChart(refs.pairSelect.value, refs.tfSelect.value));

// start initial chart
initChart('BTCUSDT','1m');

// helper renderers
function renderOpenOrders(){ renderOpenOrdersInner(); }
function renderOpenOrdersInner(){
  const c = document.getElementById('ordersList');
  c.innerHTML = '';
  store.openOrders.forEach(o=>{
    const el = document.createElement('div'); el.className='ord';
    el.innerText = `${o.pair} ${o.side.toUpperCase()} ${o.amountUSDT}$ @ ${o.price}`;
    c.appendChild(el);
  });
  refs.openOrders.innerText = `Ордера: ${store.openOrders.length}`;
}
function renderDeposits(){ refs.depInfo.innerText = `Вкладов: ${store.deposits.length}`; }

// initial render
renderBalances(); renderPositions(); renderHistory(); renderOpenOrdersInner(); renderDeposits(); renderLeaderboard();
