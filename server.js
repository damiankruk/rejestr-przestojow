onst express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// SESJA LOGOWANIA
// =======================
app.use(session({
  secret: "tajny_klucz_123",
  resave: false,
  saveUninitialized: true
}));

const USER = "admin";
const PASS = "1234";

// =======================
// LOGIN
// =======================

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

// =======================
// OCHRONA
// =======================
function checkAuth(req, res, next) {
  if (req.session.auth) return next();
  return res.redirect("/login");
}

// =======================
// BAZA
// =======================
const DATA_FILE = path.join(__dirname, "dane.json");

function getData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =======================
// STRONA
// =======================

app.get("/", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "przestoje_linii_produkcyjnej.html"));
});

// =======================
// API - POBIERZ DANE (POPRAWIONE LICZENIE CZASU)
// =======================

app.get("/api/dane", checkAuth, (req, res) => {
  const dane = getData();
  const teraz = Date.now();

  const poprawione = dane.map(item => {
    return {
      ...item,
      czasTrwaniaMin: item.startCzas
        ? Math.floor((teraz - item.startCzas) / 60000)
        : 0
    };
  });

  res.json(poprawione);
});

// =======================
// API - DODAJ (START CZASU NA SERWERZE)
// =======================

app.post("/api/dodaj", checkAuth, (req, res) => {
  const dane = getData();

  const nowy = {
    id: Date.now(),
    status: req.body.status || "praca",
    linia: req.body.linia || "",
    startCzas: Date.now() // 🔥 KLUCZOWE - jeden wspólny czas
  };

  dane.push(nowy);
  saveData(dane);

  res.json({ ok: true });
});

// =======================
// API - USUŃ
// =======================

app.post("/api/usun", checkAuth, (req, res) => {
  let dane = getData();

  dane = dane.filter(x => x.id != req.body.id);

  saveData(dane);

  res.json({ ok: true });
});

// =======================
// START
// =======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server działa na porcie " + PORT);
});
