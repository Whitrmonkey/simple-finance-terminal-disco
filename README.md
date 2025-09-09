# DCTG  Finance  Terminal;
this project is created because i want to try to train model and see the market behaves kinda like live backtesting with pre trained model i try to see it's performance;
but till now all model perform poorly, hope you guys can crack it.

    Built with:
      Node.js (v18+)
      WebSocket API (Binance Futures)
      blessed & blessed-contrib (for terminal UI components)
      asciichart (for rendering market price charts)

technically you can stream from others api provider but because when i try to train my model using raw ohhclv data i fetch the data from binance so naturally this proejct also developed using binance data fetching;
feel free to tinker withit;

to install
    
    npm install ws node-fetch blessed blessed-contrib asciichart mathjs python-shell pkg

additional notes;


      sudo apt update && sudo apt upgrade -y
      
      # Add NodeSource repo for Node 18
      curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
      
      # Install Node.js and npm
      sudo apt install -y nodejs
      
      # Verify
      node -v
      npm -v

 a sneak peek to install correct node 18;

# Config it;
if you want to stream other pairs on line
change const SYMBOL to the desired crypto pair on binance; 
btcusdt or ethusdt or bnbusdt ur choice just change it
        
        // =============================
        // CONFIG
        // =============================
        const SYMBOL = 'btcusdt';
        const INTERVAL = '1m';

to stream data you have 2 options spot or futures the current code is stream from futures data.
for SPOT data change WebSocket to wss://stream.binance.com:9443/ws/<streamName> 
for Futures data change WebSocket to wss://fstream.binance.com/ws/${stream}
        
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


# to Start simply type;
        node start_terminal.mjs 
that's it thanks 


