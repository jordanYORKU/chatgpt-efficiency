document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".typewriter");

    elements.forEach(el => {

        const text = el.textContent
                       .split("\n")
                       .map(line => line.trimStart())
                       .join("\n");

        el.textContent = ""; 

        let i = 0;
        function type() {
            if (i < text.length) {
                el.textContent += text[i];
                i++;
                setTimeout(type, 10);
            }
        }
        type();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".typewriter2");

    elements.forEach(el => {

        const text = el.textContent
                       .split("\n")
                       .map(line => line.trimStart())
                       .join("\n");

        el.textContent = ""; 

        let i = 0;
        function type() {
            if (i < text.length) {
                el.textContent += text[i];
                i++;
                setTimeout(type, 10);
            }
        }
        type();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".typewriter3");

    elements.forEach(el => {

        const text = el.textContent
                       .split("\n")
                       .map(line => line.trimStart())
                       .join("\n");

        el.textContent = ""; 

        let i = 0;
        function type() {
            if (i < text.length) {
                el.textContent += text[i];
                i++;
                setTimeout(type, 10);
            }
        }
        type();
    });
});

// host server on same machine & port 3000:
const WS_URL = 'ws://localhost:3000/';

// find right-box-inner
const updatesContainer = document.querySelector('.right-box-inner');

// if the element isn't found, create and append one to the right box
if (!updatesContainer) {
  console.warn('.right-box-inner not found — creating a fallback container');
  const rb = document.querySelector('.right-box');
  const fallback = document.createElement('div');
  fallback.className = 'right-box-inner';
  rb.appendChild(fallback);
}

// Re-query in case its created
const liveEl = document.querySelector('.right-box-inner');

function addMessage(text, type = 'info') {
  const p = document.createElement('p');
  p.className = `live-message ${type}`;
  const time = new Date().toLocaleTimeString();
  p.innerHTML = `<span class="msg-time">[${time}]</span> ${text}`;
  liveEl.appendChild(p);
  // keep the scroll at bottom
  liveEl.scrollTop = liveEl.scrollHeight;
}

// connect and handle messages
let ws;
function connect() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected to', WS_URL);
    addMessage('Connected to server', 'system');
  };

  ws.onmessage = (evt) => {
    let payload;
    try {
      payload = JSON.parse(evt.data);
    } catch (err) {
      // fallback to treat as plain text
      addMessage(evt.data, 'raw');
      return;
    }

    // handle typed payloads
    const { type, message } = payload;

    switch (type) {
      case 'connected':
        addMessage(message, 'system');
        break;
      case 'update':
        addMessage(message, 'update');
        break;
      case 'answer':
        addMessage(message, 'answer');
        break;
      case 'result':
        // result messages contain question + answer + correctness + responseTime
        if (payload.question) {
          addMessage(`${payload.question} → ${payload.answer.toUpperCase()} — ${payload.correct ? 'Correct' : 'Incorrect'} (${payload.responseTime}ms)`, 'result');
        } else {
          addMessage(message || JSON.stringify(payload), 'result');
        }
        break;
      case 'db':
        addMessage(message, 'db');
        break;
      default:
        // unknown type — show raw
        addMessage(JSON.stringify(payload), 'unknown');
    }
  };

  ws.onclose = () => {
    addMessage('Disconnected from server - attempting reconnect in 2s', 'system');
    console.log('WebSocket closed - reconnecting...');
    setTimeout(connect, 2000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error', err);
  };
}

// start connection
connect();
