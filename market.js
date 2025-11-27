// market.js — простой модуль получения рынков (Binance WS + exchangerate.host)
// Exposes a global `Market` object with events and helpers

const Market = (() => {
  const listeners = { 'kline': [], 'rate': [], 'status': [] };
  const state = {
    pair: 'BTCUSDT',
    tf: '1m',
    ws: null,
    lastKline: null,
    rateUSDperRUB: null
  };

  function on(evt, fn){ if(listeners[evt]) listeners[evt].push(fn); }

  function emit(evt, data){ if(listeners[evt]) listeners[evt].forEach(f=>f(data)); }

  // Binace websocket helper: stream name like btcusdt@kline_1m
  function connectBinance(pair = 'BTCUSDT', tf = '1m'){
    disconnect();
    state.pair = pair;
    state.tf = tf;
    const stream = `${pair.toLowerCase()}@kline_${tf}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    try {
      state.ws = new WebSocket(url);
      emit('status', {connected:false, text:'connecting...'});
      state.ws.onopen = ()=> emit('status', {connected:true, text:'connected to binance'} );
      state.ws.onmessage = (ev)=>{
        const msg = JSON.parse(ev.data);
        if(msg.e === 'kline' && msg.k){
          const k = msg.k;
          // k.t = startTime, k.o,k.h,k.l,k.c,k.x (isFinal)
          const candle = {
            time: Math.floor(k.t/1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            isFinal: k.x
          };
          state.lastKline = candle;
          emit('kline', candle);
        }
      };
      state.ws.onclose = ()=> emit('status', {connected:false, text:'disconnected'});
      state.ws.onerror = (e)=> { console.warn('WS err', e); emit('status', {connected:false, text:'error'}); };
    } catch(e){ console.warn('ws error', e); emit('status', {connected:false, text:'error'}); }
  }

  function disconnect(){
    if(state.ws){ try{ state.ws.close(); }catch(e){} state.ws = null; }
  }

  // Fetch recent historical kline (via Binance REST) for initial chart seed
  async function fetchKlines(pair='BTCUSDT', tf='1m', limit=200){
    try{
      // map tf to Binance interval
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${tf}&limit=${limit}`);
      if(!res.ok) throw 0;
      const arr = await res.json();
      // arr elements: [openTime, open, high, low, close, volume, closeTime, ...]
      return arr.map(a=>({
        time: Math.floor(a[0]/1000),
        open: parseFloat(a[1]),
        high: parseFloat(a[2]),
        low: parseFloat(a[3]),
        close: parseFloat(a[4]),
        volume: parseFloat(a[5])
      }));
    }catch(e){
      console.warn('fetchKlines failed', e);
      return [];
    }
  }

  // Fetch RUB <-> USD via exchangerate.host
  async function fetchFx(){
    try{
      const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=RUB');
      if(!r.ok) throw 0;
      const j = await r.json();
      if(j && j.rates && j.rates.RUB){
        // j.rates.RUB = RUB per 1 USD
        state.rateUSDperRUB = 1 / j.rates.RUB; // USD per RUB
        emit('rate', {usdPerRub: state.rateUSDperRUB, rubPerUsd: j.rates.RUB});
      }
    }catch(e){
      console.warn('FX fetch failed', e);
    }
  }

  // polling fx periodically
  setInterval(fetchFx, 10000);
  fetchFx();

  return { on, connectBinance, disconnect, fetchKlines, state };
})();
