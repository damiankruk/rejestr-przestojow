const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// SESJA
// =====================
app.use(session({
  secret: "tajny_klucz_123",
  resave: false,
  saveUninitialized: true
}));

const USER = "admin";
const PASS = "1234";

// =====================
// LOGIN
// =====================
app.get("/login", (req, res) => {
  res.send(`
    <h2>🔐 Logowanie</h2>
    <form method="POST" action="/login">
      <input name="user" placeholder="login" />
      <input name="pass" type="password" placeholder="hasło" />
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

  res.send("❌ Błędne dane <a href='/login'>wróć</a>");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

function checkAuth(req, res, next) {
  if (req.session.auth) return next();
  return res.redirect("/login");
}

// =====================
// BAZA
// =====================
const DATA_FILE = path.join(__dirname, "dane.json");

function getData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =====================
// STRONA
// =====================
app.get("/", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "przestoje_linii_produkcyjnej.html"));
});

// =====================
// DANE (KLUCZ — LICZENIE NA SERWERZE)
// =====================
app.get("/api/dane", checkAuth, (req, res) => {
  const dane = getData();
  const teraz = Date.now();

  const wynik = dane.map(x => {
    if (x.status === "przestoj") {
      return {
        ...x,
        czasTrwaniaMin: Math.floor((teraz - x.startCzas) / 60000)
      };
    }
    return {
      ...x,
      czasTrwaniaMin: x.czasTrwaniaMin || 0
    };
  });

  res.json(wynik);
});

// =====================
// DODAJ PRZESTÓJ
// =====================
app.post("/api/dodaj", checkAuth, (req, res) => {
  const dane = getData();

  const nowy = {
    id: Date.now(),
    linia: req.body.linia || "brak",
    status: "przestoj",
    startCzas: Date.now()
  };

  dane.push(nowy);
  saveData(dane);

  res.json({ ok: true });
});

// =====================
// ZAKOŃCZ PRZESTÓJ
// =====================
app.post("/api/zakoncz", checkAuth, (req, res) => {
  const dane = getData();
  const teraz = Date.now();

  const updated = dane.map(x => {
    if (x.id == req.body.id && x.status === "przestoj") {
      return {
        ...x,
        status: "praca",
        czasTrwaniaMin: Math.floor((teraz - x.startCzas) / 60000)
      };
    }
    return x;
  });

  saveData(updated);

  res.json({ ok: true });
});

// =====================
// START SERWERA
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server działa na porcie " + PORT);
});
