const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "zmien-ten-klucz-w-render",
  resave: false,
  saveUninitialized: false
}));

const USER = process.env.APP_USER || "admin";
const PASS = process.env.APP_PASS || "1234";
const DATA_FILE = path.join(__dirname, "dane.json");

const lineOptions = ["L 1/2", "L 6/7", "L 8", "L 9", "L 10", "L 11", "L 12", "L 15", "L 16", "L 19", "L 20"];

function defaultState() {
  return {
    current: {
      status: "Praca",
      kind: "Praca",
      start: new Date().toISOString(),
      note: ""
    },
    entries: [],
    updatedAt: Date.now()
  };
}

function normalizeStore(raw) {
  if (raw && raw.lineStates && typeof raw.lineStates === "object") {
    return { lineStates: raw.lineStates };
  }

  const store = { lineStates: {} };
  lineOptions.forEach((line) => {
    store.lineStates[line] = defaultState();
  });
  return store;
}

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = normalizeStore({});
      writeStore(initial);
      return initial;
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const store = normalizeStore(parsed);
    lineOptions.forEach((line) => {
      if (!store.lineStates[line]) store.lineStates[line] = defaultState();
      if (!Array.isArray(store.lineStates[line].entries)) store.lineStates[line].entries = [];
      if (!store.lineStates[line].current) store.lineStates[line].current = defaultState().current;
      if (!store.lineStates[line].updatedAt) store.lineStates[line].updatedAt = 0;
    });
    return store;
  } catch (error) {
    console.error("Nie mozna odczytac dane.json:", error);
    return normalizeStore({});
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function checkAuth(req, res, next) {
  if (req.session.auth) return next();
  return res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.send(`
    <h2>Logowanie</h2>
    <form method="POST" action="/login">
      <input name="user" placeholder="login" autocomplete="username" />
      <input name="pass" type="password" placeholder="haslo" autocomplete="current-password" />
      <button>Zaloguj</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === USER && pass === PASS) {
    req.session.auth = true;
    return res.redirect("/");
  }
  res.send("Bledne dane <a href='/login'>wroc</a>");
});

app.get("/logout", (req, res) => {
