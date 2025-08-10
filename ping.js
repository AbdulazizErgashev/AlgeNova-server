import fetch from "node-fetch";

const url = "https://algenova-server.onrender.com";

async function ping() {
  try {
    const res = await fetch(url);
    console.log(`[${new Date().toLocaleTimeString()}] Pink OK:`, res.status);
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] Ping ERROR:`,
      res.message
    );
  }
}

setInterval(ping, 14 * 60 * 1000);

ping();
