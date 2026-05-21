const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8760);
const HOST = "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "rejestr-przestojow-db.json");
const APP_FILE = path.join(ROOT, "przestoje_linii_produkcyjnej.html");

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ lineStates: {} }, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      lineStates: parsed.lineStates && typeof parsed.lineStates === "object" ? parsed.lineStates : {},
    };
  } catch {
    return { lineStates: {} };
  }
}

function writeDb(db) {
  ensureDb();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    if (url.pathname === "/" || url.pathname === "/przestoje_linii_produkcyjnej.html") {
      send(res, 200, fs.readFileSync(APP_FILE), "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/data" && req.method === "GET") {
      send(res, 200, JSON.stringify(readDb()));
      return;
    }

    if (url.pathname === "/api/line" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      if (!payload.line || !payload.state) {
        send(res, 400, JSON.stringify({ error: "Missing line or state" }));
        return;
      }
      const db = readDb();
      db.lineStates[payload.line] = payload.state;
      writeDb(db);
      send(res, 200, JSON.stringify({ ok: true }));
      return;
    }

    send(res, 404, JSON.stringify({ error: "Not found" }));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message || "Server error" }));
  }
});

ensureDb();
server.listen(PORT, HOST, () => {
  console.log(`Rejestr przestojow dziala: http://localhost:${PORT}/`);
  console.log(`W sieci lokalnej wejdz przez adres IP tego komputera, np. http://ADRES-IP:${PORT}/`);
  console.log(`Baza danych: ${DB_FILE}`);
});
