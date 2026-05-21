const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, "dane.json");

// =======================
// FUNKCJE BAZY DANYCH
// =======================

function getData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Błąd odczytu danych:", err);
    return [];
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Błąd zapisu danych:", err);
  }
}

// =======================
// STRONA GŁÓWNA
// =======================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "przestoje_linii_produkcyjnej.html"));
});

// =======================
// API - POBIERZ DANE
// =======================

app.get("/api/dane", (req, res) => {
  const dane = getData();
  res.json(dane);
});

// =======================
// API - DODAJ WPIS
// =======================

app.post("/api/dodaj", (req, res) => {
  const dane = getData();

  const nowyWpis = {
    id: Date.now(),
    ...req.body
  };

  dane.push(nowyWpis);
  saveData(dane);

  res.json({ success: true, data: nowyWpis });
});

// =======================
// API - USUŃ WPIS
// =======================

app.post("/api/usun", (req, res) => {
  let dane = getData();

  const id = req.body.id;

  dane = dane.filter(item => item.id != id);

  saveData(dane);

  res.json({ success: true });
});

// =======================
// START SERWERA
// =======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serwer działa na porcie " + PORT);
});
