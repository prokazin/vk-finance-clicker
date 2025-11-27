// ---- Simple Finance Clicker core (virtual market) ----

// --- State & Persistence ---
const stateKey = 'fc_state_v1';
let state = {
  rub: 1000,
  usd: 0.0,
  price: 90.0,       // USD per RUB virtual rate (for conversion visualization)
  history: [],       // last actions
  deposits: [],      // {amount, start, apy}
  leaderboard: []    // local top balances
};

function loadState(){
  try{
    const raw = localStorage.getItem(stateKey);
    if(raw) state = JSON.parse(raw);
  }catch(e){ console.warn(e) }
}
function saveState(){ localStorage.setItem(stateKey, JSON.stringify(state)); }

// --- UI links ---
const elRub = document.getElementById('rub');
const elUsd = document.getElementById('usd');
const elStake = document.getElementById('stake');
const elTradeType = document.getElementById('tradeType');
const elTradeBtn = document.getElementById('tradeBtn');
const elResult = document.getElementById('result');
const elConvAmt = document.getElementById('convAmount');
const elToUsd = document.getElementById('toUsd');
const elToRub = document.getElementById('toRub');
const elRate = document.getElementById('rate');
const elHistory = document.getElementById('history');
const elDepAmount = document.getElementById('depAmount');
const elOpenDep = document.getElementById('openDep');
const elDepInfo = document.getElementById('depInfo');
const elLeaderboard = document.getElementById('leaderboard');

// init
loadState();
updateUI();

// --- Trade parameters (easy to tune) ---
const tradeParams = {
  safe:   {min:1.02, max:1.12, chance:0.85},
  normal: {min:0.8,  max:1.6,  chance:0.65},
  risk:   {min:0.0,  max:3.0,  chance:0.5}
};

// --- Trade logic ---
function doTrade(){
  const stake = Math.max(1, Number(elStake.value || 1));
  if(stake > state.rub){ alert('Недостаточно рублей'); return; }
  const type = elTradeType.value;
  const cfg = tradeParams[type];

  // take stake immediately
  state.rub -= stake;

  // outcome
  const win = Math.random() < cfg.chance;
  const mult = cfg.min + Math.random()*(cfg.max - cfg.min);
  const profit = Math.round(stake * (mult - 1));

  if(win && mult > 1){
    // return stake + profit
    state.rub += stake + profit;
    pushHistory(`Трейд ${type}: выигрыш +${profit} ₽ (×${mult.toFixed(2)})`, true);
    showResult(`+${profit} ₽ (×${mult.toFixed(2)})`, true);
  } else {
    // loss: some or all stake lost depending on mult
    const loss = Math.round(stake * (1 - Math.min(mult,1)));
    // stake already removed; remove extra loss if any
    state.rub -= loss;
    pushHistory(`Трейд ${type}: проигрыш -${loss} ₽ (×${mult.toFixed(2)})`, false);
    showResult(`-${loss} ₽ (×${mult.toFixed(2)})`, false);
  }

  // update visuals and market move
  updateUI();
  marketStep(); // every trade nudges the market
  saveState();
  maybeUpdateLeaderboard();
}

// --- Show result briefly ---
function showResult(text, positive){
  elResult.innerText = text;
  elResult.style.color = positive ? '#7aed9c' : '#ff7b7b';
  setTimeout(()=> elResult.innerText = '—', 2200);
}

// --- History push ---
function pushHistory(text, positive){
  const time = new Date().toLocaleTimeString();
  state.history.unshift({t:time, text, positive});
  if(state.history.length>50) state.history.pop();
  renderHistory();
}

// --- Conversion (RUB -> USD) using virtual price (price = RUB per USD here) ---
function convertRubToUsd(){
  const amt = Math.max(1, Number(elConvAmt.value || 1));
  if(amt > state.rub){ alert('Нет рублей'); return; }
  // price = RUB per USD => USD = amt / price
  const usdGot = (amt / state.price);
  const fee = 0.005; // 0.5% commission
  const usdAfter = usdGot * (1 - fee);
  state.rub -= amt;
  state.usd += +(usdAfter.toFixed(6));
  pushHistory(`Обмен: ${amt} ₽ → ${usdAfter.toFixed(4)} $`, true);
  saveState();
  updateUI();
  maybeUpdateLeaderboard();
}
function convertUsdToRub(){
  const amt = Math.max(0.01, Number(elConvAmt.value || 1));
  if(amt > state.usd){ alert('Нет $'); return; }
  const rubGot = amt * state.price;
  const fee = 0.005;
  const rubAfter = rubGot * (1 - fee);
  state.usd -= amt;
  state.rub += Math.round(rubAfter);
  pushHistory(`Обмен: ${amt} $ → ${Math.round(rubAfter)} ₽`, true);
  saveState();
  updateUI();
  maybeUpdateLeaderboard();
}

// --- Deposits ---
const DEPOSIT_APY = 0.12; // 12% годовых
function openDeposit(){
  const amt = Math.max(1, Number(elDepAmount.value || 1));
  if(amt > state.usd){ alert('Недостаточно $'); return; }
  state.usd -= amt;
  state.deposits.push({amount:amt, start:Date.now(), apy:DEPOSIT_APY});
  pushHistory(`Вклад открыт: ${amt} $ (APY ${(DEPOSIT_APY*100).toFixed(1)}%)`, true);
  saveState();
  updateUI();
  renderDeposits();
}
function processDepositsTick(dtSeconds){
  // accrue each deposit small amount, credit to USD balance periodically
  state.deposits.forEach(d=>{
    const perSec = d.amount * d.apy / 31536000;
    const delta = perSec * dtSeconds;
    state.usd += delta;
    // optionally increase stored amount to reflect compounding (simple model)
    d.amount += delta;
  });
  saveState();
  updateUI();
  renderDeposits();
}

// --- Leaderboard (local top by total wealth) ---
function maybeUpdateLeaderboard(){
  const total = state.rub + state.usd * state.price;
  state.leaderboard.push({score: Math.round(total), at: new Date().toISOString()});
  state.leaderboard = state.leaderboard.sort((a,b)=>b.score-a.score).slice(0,10);
  saveState();
  renderLeaderboard();
}

// --- Market (virtual) ---
let chart = null;
let chartData = [];
function initChart(){
  const ctx = document.getElementById('chart').getContext('2d');
  // seed
  for(let i=0;i<60;i++) chartData.push(state.price);
  chart = new Chart(ctx, {
    type:'line',
    data: { labels: Array(chartData.length).fill(''), datasets:[{
      label:'RUB per USD', data: chartData, borderColor:'#1db954', backgroundColor:'rgba(29,185,84,0.08)', fill:true, pointRadius:0, tension:0.2
    }]},
    options: { animation:false, plugins:{legend:{display:false}}, scales:{x:{display:false}}}
  });
}
function marketStep(){
  // one tick: small random walk + rare events
  const vol = 0.005; // volatility factor
  let last = chartData[chartData.length-1] || state.price;
  // normal random walk
  const delta = (Math.random()-0.5) * vol * last;
  let next = last + delta;
  // rare events
  const r = Math.random();
  if(r < 0.005){ next *= 0.7; pushHistory('Рынок: резкое падение!', false); }
  else if(r > 0.995){ next *= 1.3; pushHistory('Рынок: резкий рост!', true); }
  // clamp
  next = Math.max(20, Math.min(300, next));
  chartData.push(+next.toFixed(4));
  if(chartData.length>120) chartData.shift();
  chart.data.datasets[0].data = chartData;
  chart.update();
  state.price = next;
  renderRate();
  saveState();
}

// periodic autonomous market ticks (even without trades)
let lastTick = Date.now();
function autoTick(){
  const now = Date.now();
  const dt = (now - lastTick)/1000;
  lastTick = now;
  // market step every ~3 seconds on average
  if(Math.random() < dt/3) marketStep();
  // deposits process every 5 seconds roughly
  processDepositsTick(dt);
}
setInterval(autoTick, 2000);

// --- UI rendering ---
function updateUI(){
  elRub.innerText = Math.round(state.rub);
  elUsd.innerText = state.usd.toFixed(4);
  renderRate();
  renderHistory();
  renderDeposits();
  renderLeaderboard();
}
function renderRate(){ elRate.innerText = state.price.toFixed(4) + ' ₽/ $'; }
function renderHistory(){
  elHistory.innerHTML = '';
  state.history.slice(0,30).forEach(h=>{
    const li = document.createElement('li');
    li.textContent = `${h.t} — ${h.text}`;
    li.style.color = h.positive ? '#7fdbb6' : '#ff9b9b';
    elHistory.appendChild(li);
  });
}
function renderDeposits(){
  elDepInfo.innerText = `Вкладов: ${state.deposits.length}`;
}
function renderLeaderboard(){
  elLeaderboard.innerHTML = '';
  state.leaderboard.forEach(it=>{
    const li = document.createElement('li');
    li.textContent = `${it.score} ₽`;
    elLeaderboard.appendChild(li);
  });
}

// --- Event Listeners ---
elTradeBtn.addEventListener('click', ()=>{ elTradeBtn.disabled=true; doTrade(); setTimeout(()=>elTradeBtn.disabled=false, 600); });
elToUsd.addEventListener('click', convertRubToUsd);
elToRub.addEventListener('click', convertUsdToRub);
elOpenDep.addEventListener('click', openDeposit);

// --- Chart init & seed ---
initChart();
renderRate();
updateUI();
// seed some initial market movements
for(let i=0;i<10;i++) { marketStep(); }

// update leaderboard on load
maybeUpdateLeaderboard();
