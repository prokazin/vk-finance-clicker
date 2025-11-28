// script.js — Synthetic Market engine + UI + trades + deposits + persistence

// ---------- State & Persistence ----------
const STORAGE_KEY = 'fc_synth_v1';
let state = {
  rub: 1000,
  usd: 0,
  btc: 0,
  ton: 0,
  deposits: [],           // {id, amount, start, apy}
  history: [],            // {t, text}
  lastPrices: { BTC: 45000, TON: 5.0, RUB: 90 }, // RUB per USD for RUB key means RUB per 1 USD
  candles: { BTC: [], TON: [], RUB: [] }, // arrays of OHLC objects
  influence: { BTC:0, TON:0 }, // clicks influence
  settings: { candleIntervalSec: 5, volatilityPct: 1.0 } // volatility base (will be multiplied)
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) state = JSON.parse(raw);
  }catch(e){ console.warn('load err', e); }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Utilities ----------
function nowSeconds(){ return Math.floor(Date.now()/1000); }
function pushHistory(text){
  state.history.unshift({t: new Date().toLocaleTimeString(), text});
  if(state.history.length > 300) state.history.pop();
  saveState(); renderHistory();
}
function randNorm(){ return (Math.random() - 0.5); } // simple symmetric

// ---------- UI Refs ----------
const elRub = document.getElementById('rub');
const elUsd = document.getElementById('usd');
const elBtc = document.getElementById('btc');
const elTon = document.getElementById('ton');
const elAsset = document.getElementById('assetSelect');
const elChartContainer = document.getElementById('chart');
const elLastPrice = document.getElementById('lastPrice');
const elFxRate = document.getElementById('fxRate');
const elClickBtn = document.getElementById('clickBtn');
const elClickStake = document.getElementById('clickStake');
const elClickType = document.getElementById('clickType');
const elClickResult = document.getElementById('clickResult');
const elConvAmount = document.getElementById('convAmount');
const elRubToUsd = document.getElementById('rubToUsd');
const elUsdToRub = document.getElementById('usdToRub');
const elDepAmount = document.getElementById('depAmount');
const elOpenDep = document.getElementById('openDep');
const elDepInfo = document.getElementById('depInfo');
const elTradePair = document.getElementById('tradePair');
const elTradeAmount = document.getElementById('tradeAmount');
const elBuyBtn = document.getElementById('buyBtn');
const elSellBtn = document.getElementById('sellBtn');
const elHistory = document.getElementById('historyList');
const elVolatility = document.getElementById('volatility');
const elTotalRub = document.getElementById('totalRub');
const elInfluence = document.getElementById('influence');
const elDepositsList = document.getElementById('depositsList');

// ---------- Init ----------
loadState();
renderAll();

// ---------- Chart (LightweightCharts) ----------
const chart = LightweightCharts.createChart(elChartContainer, {
  layout: { background: { color: '#0f1724' }, textColor: '#e6eef6' },
  rightPriceScale: { borderColor: '#222' },
  timeScale: { borderColor: '#222' },
});
const candleSeries = chart.addCandlestickSeries({
  upColor: '#1db954', downColor: '#ff4d4f', borderVisible: false, wickVisible: true
});

// helper: map our candle {open,high,low,close,time} to chart format {time,open,high,low,close}
function setChartData(asset){
  const arr = (state.candles[asset] || []).map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
  if(arr.length) candleSeries.setData(arr);
  else candleSeries.setData([]);
}

// ---------- Synthetic Candle Generator ----------
// produce a new candle for asset using previous close
function generateCandle(asset){
  // base price:
  let last = (state.candles[asset] && state.candles[asset].length) ? state.candles[asset].slice(-1)[0].close : state.lastPrices[asset];

  // volatility factor controlled by slider
  const volSlider = Number(elVolatility.value || 10); // 1..50
  const baseVolPct = (volSlider / 1000); // e.g., 0.01 = 1%
  // asset-specific multiplier (BTC more volatile than RUB)
  const assetMult = (asset === 'BTC') ? 3.0 : (asset === 'TON' ? 2.0 : 0.6);

  // influence effect: clicks on asset push price slightly
  const influence = state.influence[asset] || 0;
  const influenceEffect = influence * 0.0008; // small nudges

  // random change
  const changePct = (randNorm() * baseVolPct * assetMult) + influenceEffect;

  const open = last;
  const close = Math.max( (last * (1 + changePct)), 0.0000001 );
  const high = Math.max(open, close) * (1 + Math.abs(randNorm()) * baseVolPct * assetMult * 0.5);
  const low = Math.min(open, close) * (1 - Math.abs(randNorm()) * baseVolPct * assetMult * 0.5);

  return {
    time: nowSeconds(),
    open: +(open.toFixed(6)),
    high: +(high.toFixed(6)),
    low: +(low.toFixed(6)),
    close: +(close.toFixed(6))
  };
}

// push candle into state and keep length limit
function pushCandle(asset, candle){
  state.candles[asset] = state.candles[asset] || [];
  state.candles[asset].push(candle);
  if(state.candles[asset].length > 300) state.candles[asset].shift();
  state.lastPrices[asset] = candle.close;
  saveState();
}

// schedule generator per asset
const ASSETS = ['BTC','TON','RUB']; // RUB here is USD->RUB (price = RUB per USD)
function tickAllAssets(){
  ASSETS.forEach(asset=>{
    const candle = generateCandle(asset);
    pushCandle(asset, candle);
    // if current selected asset — update chart live
    if(elAsset.value === asset) {
      // append/update in chart
      const arr = state.candles[asset].map(c=>({time:c.time,open:c.open,high:c.high,low:c.low,close:c.close}));
      candleSeries.setData(arr);
      elLastPrice.innerText = asset === 'RUB' ? `${state.lastPrices.RUB.toFixed(4)} ₽/USD` : `${state.lastPrices[asset].toFixed(6)} $`;
    }
  });
  // decay influence gradually
  ['BTC','TON'].forEach(a => state.influence[a] = Math.max(0, state.influence[a] * 0.98));
  saveState();
  renderMeta();
}

// run tick every configured interval
setInterval(tickAllAssets, state.settings.candleIntervalSec * 1000);

// ---------- Clicker logic ----------
const tradeParams = {
  safe: {min:1.02, max:1.12, chance:0.85},
  normal: {min:0.8, max:1.6, chance:0.65},
  risk: {min:0, max:3.0, chance:0.5}
};

elClickBtn.addEventListener('click', ()=>{
  const stake = Math.max(1, Number(elClickStake.value || 1));
  if(stake > state.rub){ alert('Недостаточно рублей'); return; }
  const type = elClickType.value;
  const cfg = tradeParams[type];

  state.rub -= stake;
  const win = Math.random() < cfg.chance;
  const mult = cfg.min + Math.random() * (cfg.max - cfg.min);
  const profit = Math.round(stake * (mult - 1));

  if(win && mult > 1){
    state.rub += stake + profit;
    pushHistory(`Клик ${type}: выигрыш +${profit} ₽ (×${mult.toFixed(2)})`);
    showTemp(elClickResult, `+${profit} ₽`, true);
  } else {
    const loss = Math.round(stake * (1 - Math.min(mult,1)));
    state.rub -= loss;
    pushHistory(`Клик ${type}: проигрыш -${loss} ₽ (×${mult.toFixed(2)})`);
    showTemp(elClickResult, `-${loss} ₽`, false);
  }

  // Optionally, clicks influence price of selected asset slightly
  const sel = elAsset.value;
  if(sel === 'BTC' || sel === 'TON'){
    state.influence[sel] = (state.influence[sel] || 0) + Math.log10(stake + 1);
  }

  saveState(); renderAll();
});

function showTemp(el, text, ok){
  el.textContent = text;
  el.style.color = ok ? '#7aed9c' : '#ff7b7b';
  setTimeout(()=>{ el.textContent = '—'; el.style.color = ''; }, 2200);
}

// ---------- Conversion RUB <-> USD ----------
elRubToUsd.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(elConvAmount.value || 1));
  if(amt > state.rub){ alert('Нет рублей'); return; }
  // price: state.lastPrices.RUB is RUB per 1 USD
  const usd = (amt / state.lastPrices.RUB) * (1 - 0.005); // 0.5% fee
  state.rub -= amt;
  state.usd += +(usd.toFixed(6));
  pushHistory(`Обмен: ${amt} ₽ → ${usd.toFixed(4)} $`);
  saveState(); renderAll();
});

elUsdToRub.addEventListener('click', ()=>{
  const amt = Math.max(0.01, Number(elConvAmount.value || 1));
  if(amt > state.usd){ alert('Нет $'); return; }
  const rub = amt * state.lastPrices.RUB * (1 - 0.005);
  state.usd -= amt;
  state.rub += Math.round(rub);
  pushHistory(`Обмен: ${amt} $ → ${Math.round(rub)} ₽`);
  saveState(); renderAll();
});

// ---------- Deposits (Earn) ----------
elOpenDep.addEventListener('click', ()=>{
  const amt = Math.max(1, Number(elDepAmount.value || 1));
  if(amt > state.usd){ alert('Недостаточно $'); return; }
  const id = Date.now() + Math.floor(Math.random()*1000);
  const apy = 0.12;
  state.usd -= amt;
  state.deposits.push({id, amount:amt, start:Date.now(), apy});
  pushHistory(`Открыт вклад: ${amt} $ (APY ${(apy*100).toFixed(1)}%)`);
  saveState(); renderAll();
});

// accrual every 10 sec (simple continuous)
setInterval(()=>{
  const now = Date.now();
  state.deposits.forEach(d=>{
    const secs = (now - (d.last || d.start))/1000;
    const perSec = d.amount * d.apy / 31536000;
    const delta = perSec * 10; // credit every 10s
    d.amount += delta; // compound
    state.usd += delta;
    d.last = now;
  });
  saveState(); renderAll();
}, 10000);

// ---------- Trading (Market buy/sell) ----------
elBuyBtn.addEventListener('click', ()=> marketOrder('buy'));
elSellBtn.addEventListener('click', ()=> marketOrder('sell'));

function marketOrder(side){
  const pair = elTradePair.value; // BTC or TON
  const amountUSDT = Math.max(1, Number(elTradeAmount.value || 1));
  if(side === 'buy' && amountUSDT > state.usd){ alert('Недостаточно $'); return; }

  const price = state.lastPrices[pair]; // in USD (price is USD per token)
  const qty = amountUSDT / price;

  if(side === 'buy'){
    if(pair === 'BTC') state.btc += qty;
    if(pair === 'TON') state.ton += qty;
    state.usd -= amountUSDT;
    pushHistory(`Market BUY ${qty.toFixed(6)} ${pair} @ ${price.toFixed(4)} (spent ${amountUSDT}$)`);
  } else {
    // sell: need token amount equivalent
    const needQty = amountUSDT / price;
    if(pair === 'BTC' && needQty > state.btc){ alert('Недостаточно BTC'); return; }
    if(pair === 'TON' && needQty > state.ton){ alert('Недостаточно TON'); return; }
    if(pair === 'BTC') state.btc -= needQty;
    if(pair === 'TON') state.ton -= needQty;
    state.usd += amountUSDT;
    pushHistory(`Market SELL ${needQty.toFixed(6)} ${pair} @ ${price.toFixed(4)} (got ${amountUSDT}$)`);
  }

  // small market impact from trade (bigger buys nudge price)
  const impact = Math.log10(amountUSDT + 1) * 0.0007;
  if(side === 'buy') state.influence[pair] = (state.influence[pair] || 0) + impact;
  else state.influence[pair] = (state.influence[pair] || 0) - impact;

  saveState(); renderAll();
}

// ---------- Rendering ----------
function renderHistory(){
  elHistory.innerHTML = '';
  state.history.slice(0,100).forEach(h=>{
    const li = document.createElement('li');
    li.textContent = `${h.t} — ${h.text}`;
    elHistory.appendChild(li);
  });
}

function renderDeposits(){
  elDepositsList.innerHTML = '';
  state.deposits.forEach(d=>{
    const div = document.createElement('div');
    div.textContent = `ID:${d.id} — ${d.amount.toFixed(4)} $`;
    elDepositsList.appendChild(div);
  });
  elDepInfo.textContent = `Вкладов: ${state.deposits.length}`;
}

function renderMeta(){
  const asset = elAsset.value;
  const last = state.lastPrices[asset];
  if(asset === 'RUB') elLastPrice.innerText = `${last.toFixed(4)} ₽ / USD`;
  else elLastPrice.innerText = `${last.toFixed(6)} $`;
  elFxRate.innerText = `${state.lastPrices.RUB.toFixed(4)} ₽ / $`;
  elInfluence.innerText = `${Math.round((state.influence.BTC || 0) + (state.influence.TON || 0))}`;
  const rubPerUsd = state.lastPrices.RUB;
  const total = Math.round(state.rub + state.usd * rubPerUsd + state.btc * (state.lastPrices.BTC * rubPerUsd || 0) + state.ton * (state.lastPrices.TON * rubPerUsd || 0));
  elTotalRub.innerText = `${total} ₽`;
}

function renderBalances(){
  elRub.innerText = Math.round(state.rub);
  elUsd.innerText = state.usd.toFixed(6);
  elBtc.innerText = state.btc.toFixed(6);
  elTon.innerText = state.ton.toFixed(6);
}

function renderAll(){
  renderBalances();
  renderHistory();
  renderDeposits();
  renderMeta();
  // chart data for selected asset
  const asset = elAsset.value;
  setChartData(asset);
}

// when user changes asset selection
elAsset.addEventListener('change', ()=> {
  const a = elAsset.value;
  setChartData(a);
  renderMeta();
});

// volatility slider change
elVolatility.addEventListener('input', ()=> {
  state.settings.volatilityPct = Number(elVolatility.value);
  saveState();
});

// initialize candle arrays if empty (seed)
function seedIfEmpty(){
  ASSETS.forEach(asset=>{
    if(!state.candles[asset] || state.candles[asset].length < 20){
      let base = state.lastPrices[asset];
      state.candles[asset] = [];
      for(let i=0;i<60;i++){
        const open = base;
        const change = (Math.random()-0.5) * (0.01 * (asset==='BTC'?3: asset==='TON'?2:0.4));
        const close = Math.max(0.0000001, open*(1+change));
        const high = Math.max(open, close)*(1 + Math.random()*0.002);
        const low = Math.min(open, close)*(1 - Math.random()*0.002);
        state.candles[asset].push({time: nowSeconds() - (60*(60-i)), open:+open.toFixed(6), high:+high.toFixed(6), low:+low.toFixed(6), close:+close.toFixed(6)});
        base = close;
      }
    }
  });
  saveState();
}
seedIfEmpty();
setChartData(elAsset.value);
renderAll();

// autosave periodically
setInterval(()=> saveState(), 5000);