const path = require("path");
const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SALON_CAPACITY = Number(process.env.SALON_CAPACITY || 300);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function countStats(rows) {
  const stats = { 1: 0, 2: 0, 3: 0 };
  for (const row of rows) stats[Number(row.status)] = Number(row.total);
  const total = stats[1] + stats[2] + stats[3];
  const occupancy = SALON_CAPACITY > 0 ? Math.min(100, (stats[1] / SALON_CAPACITY) * 100) : 0;
  return {
    count1: stats[1],
    count2: stats[2],
    count3: stats[3],
    totalGuests: total,
    capacity: SALON_CAPACITY,
    occupancyRate: occupancy.toFixed(1)
  };
}

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("login", { error: "" });
});

app.post("/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) return res.render("login", { error: "Kullanici adi ve sifre zorunludur." });

  try {
    const [rows] = await pool.query("SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1", [username]);
    const user = rows[0];
    if (!user) return res.render("login", { error: "Giris bilgileri hatali." });

    const validHash = user.password_hash && user.password_hash.startsWith("$2") ? await bcrypt.compare(password, user.password_hash) : false;
    const validFallback = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
    if (!validHash && !validFallback) return res.render("login", { error: "Giris bilgileri hatali." });
    req.session.user = { id: user.id, username: user.username };
    res.redirect("/");
  } catch (err) {
    res.status(500).render("login", { error: "Sunucu hatasi: " + err.message });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/", requireLogin, (req, res) => {
  const ok = req.query.ok === "1";
  res.render("index", { ok, error: "" });
});

app.post("/", requireLogin, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const email = String(req.body.email || "").trim();
  const status = Number(req.body.status || 2);
  if (!name) return res.render("index", { ok: false, error: "Ad Soyad zorunludur." });
  if (![1, 2, 3].includes(status)) return res.render("index", { ok: false, error: "Gecersiz status secimi." });

  try {
    await pool.query("INSERT INTO guests (name, phone, email, status) VALUES (?, ?, ?, ?)", [name, phone || null, email || null, status]);
    res.redirect("/?ok=1");
  } catch (err) {
    res.status(500).render("index", { ok: false, error: "Kayit hatasi: " + err.message });
  }
});

app.get("/list", requireLogin, async (req, res) => {
  try {
    const [guests] = await pool.query("SELECT id, name, phone, email, status, created_at FROM guests ORDER BY id DESC");
    const [countRows] = await pool.query("SELECT status, COUNT(*) AS total FROM guests GROUP BY status");
    const stats = countStats(countRows);
    res.render("list", { guests, stats });
  } catch (err) {
    res.status(500).send("Sunucu hatasi: " + err.message);
  }
});

app.post("/api/update", requireLogin, async (req, res) => {
  const id = Number(req.body.id || 0);
  const status = Number(req.body.status || 0);
  if (!id || ![1, 2, 3].includes(status)) {
    return res.status(422).json({ success: false, message: "Gecersiz veri." });
  }

  try {
    await pool.query("UPDATE guests SET status = ? WHERE id = ?", [status, id]);
    const [countRows] = await pool.query("SELECT status, COUNT(*) AS total FROM guests GROUP BY status");
    const stats = countStats(countRows);
    return res.json({
      success: true,
      stats: {
        count_1: stats.count1,
        count_2: stats.count2,
        count_3: stats.count3,
        total_guests: stats.totalGuests,
        occupancy_rate: stats.occupancyRate
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Sunucu hatasi: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
