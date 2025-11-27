// market.js — Binance websocket kline + exchangerate.host FX polling
// Exposes global Market object with: on(evt,fn), connect(pair,tf), disconnect, fetchKlines

const Market = (() => {
  const listeners = { 'kline': [], 'rate': [], 'status': [], 'initial_klines': [] };
  const state = {
    pair: 'BTCUSDT',
    tf: '1m',
    ws: null,
    lastKline: null,
    rateRUBperUSD: null, // RUB per 1 USD
    rateUSDperRUB: null
  };

  function on(evt, fn){ if(listeners[evt]) listeners[evt].push(fn); }
  function emit(evt, data){ if(listeners[evt]) listeners[evt].forEach(f=>f(data)); }

  function connect(pair='BTCUSDT', tf='1m'){
    disconnect();
    state.pair = pair;
    state.tf = tf;
    // special case: virtual pair RUBUSD handled by FX poller only
    if(pair === 'RUBUSD'){
      emit('status', {connected:true, text:'RUBUSD virtual (fx)'} );
      return;
    }
    const stream = `${pair.toLowerCase()}@kline_${tf}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    try {
      state.ws = new WebSocket(url);
      emit('status', {connected:false, text:'connecting...' });
      state.ws.onopen = ()=> emit('status', {connected:true, text:`connected ${pair}@${tf}`} );
      state.ws.onmessage = (ev)=>{
        const msg = JSON.parse(ev.data);
        if(msg.e === 'kline' && msg.k){
          const k = msg.k;
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
          emit('kline', {pair, tf, candle});
        }
      };
      state.ws.onclose = ()=> emit('status', {connected:false, text:'disconnected'});
      state.ws.onerror = (e)=> { console.warn('WS err', e); emit('status', {connected:false, text:'error'}); };
    } catch(e){
      console.warn('ws error', e);
      emit('status', {connected:false, text:'error'});
    }
  }

  function disconnect(){
    if(state.ws){ try{ state.ws.close(); }catch(e){} state.ws = null; }
  }

  async function fetchKlines(pair='BTCUSDT', tf='1m', limit=200){
    if(pair === 'RUBUSD'){
      // generate synthetic candlesticks from exchangerate.host
      try {
        const resp = await fetch('https://api.exchangerate.host/timeseries?start_date=' + getPastDate(1) + '&end_date=' + getTodayDate() + '&base=USD&symbols=RUB');
        if(resp.ok){
          const json = await resp.json();
          const rates = json.rates || {};
          const arr = [];
          const timestamps = Object.keys(rates).sort();
          timestamps.forEach((d,i)=>{
            const rub = rates[d].RUB;
            const price = rub; // RUB per USD
            const t = Math.floor(new Date(d).getTime()/1000);
            arr.push({ time: t, open: price, high: price*1.001, low: price*0.999, close: price });
          });
          emit('initial_klines', {pair, data: arr});
          return arr;
        }
      } catch(e){ console.warn('fx klines err', e); }
      // fallback: generate small synthetic
      const now = Math.floor(Date.now()/1000);
      const seq = [];
      let v = 90;
      for(let i=0;i<60;i++){ v = +(v * (1 + (Math.random()-0.5)*0.01)).toFixed(4); seq.push({time: now - (60-i)*60, open:v, high:v*1.001, low:v*0.999, close:v}); }
      emit('initial_klines', {pair, data: seq});
      return seq;
    }

    try{
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${tf}&limit=${limit}`);
      if(!res.ok) throw 0;
      const arr = await res.json();
      const mapped = arr.map(a=>({ time: Math.floor(a[0]/1000), open:parseFloat(a[1]), high:parseFloat(a[2]), low:parseFloat(a[3]), close:parseFloat(a[4]), volume:parseFloat(a[5]) }));
      emit('initial_klines', {pair, data: mapped});
      return mapped;
    }catch(e){
      console.warn('fetchKlines failed', e);
      emit('initial_klines', {pair, data: []});
      return [];
    }
  }

  // FX polling for RUB/USD
  async function fetchFx(){
    try{
      const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=RUB');
      if(!r.ok) throw 0;
      const j = await r.json();
      if(j && j.rates && j.rates.RUB){
        state.rateRUBperUSD = j.rates.RUB;
        state.rateUSDperRUB = 1 / j.rates.RUB;
        emit('rate', {rubPerUsd: state.rateRUBperUSD, usdPerRub: state.rateUSDperRUB});
      }
    }catch(e){ console.warn('FX fetch failed', e); }
  }
  setInterval(fetchFx, 10000);
  fetchFx();

  function getPastDate(days=1){
    const d = new Date(); d.setDate(d.getDate()-days);
    return d.toISOString().slice(0,10);
  }
  function getTodayDate(){ return new Date().toISOString().slice(0,10); }

  return { on, connect, disconnect, fetchKlines, state };
})();
