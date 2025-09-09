// terminal.mjs - Clean Terminal Interface with Imported Render Functions
import WebSocket from 'ws';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { renderPriceChart } from './renderPriceChart.mjs';
// import { renderAccountStatement, renderSystemStatement, renderTradesHistoryInfo } from './renderModelInfo.mjs';
// import { initializeModel, processMarketUpdate } from './model.mjs';

// =============================
// CONFIG
// =============================
const SYMBOL = 'btcusdt';
const INTERVAL = '1m';

const streams = {
  trades: `${SYMBOL}@trade`,
  depth: `${SYMBOL}@depth20@100ms`,
  ticker: `${SYMBOL}@ticker`,
  kline: `${SYMBOL}@kline_${INTERVAL}`
};

// =============================
// TERMINAL UI SETUP
// =============================
const screen = blessed.screen({ 
  smartCSR: true, 
  title: 'DCTG Finance Terminal',
  fullUnicode: true
});
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

let priceBox, orderBookBox, AccountStatementmodelInfo, SystemStatementmodelInfo, tradesHistorymodelInfo, tradesHistory;

function layoutUI() {
  screen.children.forEach(child => child.detach());

  priceBox = grid.set(0, 0, 6, 6, blessed.box, { 
    label: '{bold}{green-fg}MARKET INFO{/green-fg}{/bold}', 
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line', fg: 'cyan' }
  });

  AccountStatementmodelInfo = grid.set(0, 6, 6, 3, blessed.box, { 
    // label: '{bold}{white-fg}ACCOUNT STATEMENT{/white-fg}{/bold}', 
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line', fg: 'white' }
  });
  
  SystemStatementmodelInfo = grid.set(0, 9, 6, 3, blessed.box, { 
    // label: '{bold}{white-fg}SYSTEM STATUS{/white-fg}{/bold}', 
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line', fg: 'white' }
  });
  
  tradesHistorymodelInfo = grid.set(6, 6, 6, 6, blessed.box, { 
    // label: '{bold}{white-fg}TRADE HISTORY{/white-fg}{/bold}', 
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line', fg: 'white' }
  });

  orderBookBox = grid.set(6, 0, 6, 3, blessed.box, { 
    label: '{bold}{red-fg}ORDER BOOK{/red-fg}{/bold}', 
    tags: true,
    border: { type: 'line', fg: 'red' }
  });

  tradesHistory = grid.set(6, 3, 6, 3, blessed.box, {
    label: '{bold}{yellow-fg}LIVE TRADES{/yellow-fg}{/bold}',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', inverse: true },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    border: { type: 'line', fg: 'yellow' }
  });
}

layoutUI();
screen.on('resize', () => layoutUI());

// =============================
// SIMPLE STATE
// =============================
let prices = [];
let volumes = [];
const maxPrices = 200;

let bestBid = 0;
let bestAsk = 0;
let orderBookData = { bids: [], asks: [] };
let marketData = {};
let trades = [];
const maxTrades = 120;

// =============================
// RENDER FUNCTIONS
// =============================
function renderBars(levels, maxQty, type) {
  if (!Array.isArray(levels) || levels.length === 0) return '';
  
  const priceWidth = 10;
  const qtyWidth = 12;

  return levels.map(([price, qty]) => {
    const p = parseFloat(price).toFixed(2).padStart(priceWidth);
    const q = parseFloat(qty).toFixed(4).padStart(qtyWidth);
    const barLength = Math.max(1, Math.round((parseFloat(qty) / maxQty) * 10));
    const colorTag = type === 'bid' ? 'green-fg' : 'red-fg';
    const bar = `{${colorTag}}${'█'.repeat(barLength)}{/${colorTag}}`;
    return `${p} | ${q} | ${bar}`;
  }).join('\n');
}

function renderOrderBook() {
  if (!orderBookBox || !orderBookData) return;

  const asks = (orderBookData.asks || []).slice(0, 8).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  const bids = (orderBookData.bids || []).slice(0, 8).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

  const maxAskQty = asks.length ? Math.max(...asks.map(a => parseFloat(a[1]))) : 1;
  const maxBidQty = bids.length ? Math.max(...bids.map(b => parseFloat(b[1]))) : 1;

  const askLines = renderBars(asks, maxAskQty, 'ask');
  const bidLines = renderBars(bids, maxBidQty, 'bid');

  orderBookBox.setContent(`
{bold}{red-fg}Best Ask: ${bestAsk}{/red-fg}{/bold}

${askLines}

${bidLines}

{bold}{green-fg}Best Bid: ${bestBid}{/green-fg}{/bold}
  `);
}

function renderTrades() {
  if (!tradesHistory) return;
  tradesHistory.setContent(trades.join('\n'));
  tradesHistory.setScrollPerc(100);
}

// =============================
// WEBSOCKET CONNECTIONS
// =============================
function connectStream(stream, handler) {
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);
  ws.on('message', msg => {
    try {
      const parsed = JSON.parse(msg.toString());
      handler(parsed);
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
  ws.on('error', err => console.error('WS Error:', err.message));
  ws.on('close', () => setTimeout(() => connectStream(stream, handler), 2000));
}

// Trades
connectStream(streams.trades, data => {
  if (!data || !data.p) return;
  const price = parseFloat(data.p);
  const qty = parseFloat(data.q || 0);

  // processMarketUpdate('trade', data);

  const side = data.m
    ? '{white-fg}{red-bg} SELL {/red-bg}{/white-fg}'
    : '{white-fg}{green-bg} BUY {/green-bg}{/white-fg}';

  trades.push(`${new Date(data.T).toLocaleTimeString()} ${side} ${qty.toFixed(4)} @ {bold}${price.toFixed(4)}{/bold}`);
  if (trades.length > maxTrades) trades.shift();
});

// Depth
connectStream(streams.depth, data => {
  if (!data || !data.b || !data.a) return;

  // processMarketUpdate('orderbook', data);

  orderBookData = { bids: data.b || [], asks: data.a || [] };
  bestBid = orderBookData.bids.length ? orderBookData.bids[0][0] : bestBid;
  bestAsk = orderBookData.asks.length ? orderBookData.asks[0][0] : bestAsk;
});

// Ticker
connectStream(streams.ticker, data => {
  if (!data) return;
  
  // processMarketUpdate('ticker', data);

  marketData = data;
});

// Kline - Simple price and volume tracking
connectStream(streams.kline, data => {
  if (!data || !data.k) return;

  // processMarketUpdate('kline', data);

  const price = parseFloat(data.k.c);
  const volume = parseFloat(data.k.v || 0);
  
  if (!isNaN(price)) {
    prices.push(price);
    if (prices.length > maxPrices) prices.shift();
  }
  
  if (!isNaN(volume)) {
    volumes.push(volume);
    if (volumes.length > maxPrices) volumes.shift();
  }
});

// =============================
// REFRESH LOOP
// =============================
setInterval(() => {
  // Market and order book rendering
  renderPriceChart(priceBox, prices, volumes, marketData, SYMBOL);
  renderOrderBook();
  renderTrades();
  
  // Model info rendering using imported functions
  // renderAccountStatement(AccountStatementmodelInfo);
  // renderSystemStatement(SystemStatementmodelInfo);
  // renderTradesHistoryInfo(tradesHistorymodelInfo);
  
  screen.render();
}, 500);

// =============================
// EXIT HANDLING
// =============================
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

console.log('Starting DCTG Finance Terminal...');
screen.render();