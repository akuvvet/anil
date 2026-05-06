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
const LIMITED_USER_USERNAME = "enis";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
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
  if (req.session.user) return next();
  if (req.originalUrl.startsWith("/api")) {
    return res.status(401).json({ success: false, message: "Yetkisiz erisim." });
  }
  return res.redirect("/login");
}

async function ensureSeedUsers() {
  const limitedUserPasswordHash = await bcrypt.hash("password", 10);
  await pool.query(
    "INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = username",
    [LIMITED_USER_USERNAME, limitedUserPasswordHash]
  );
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

async function resolveCurrentUserId(req) {
  const sessionUser = req.session?.user || {};
  const sessionUserId = Number(sessionUser.id || 0);
  if (sessionUserId > 0) return sessionUserId;
  const username = String(sessionUser.username || "").trim();
  if (!username) return null;
  const [rows] = await pool.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
  return rows[0] ? Number(rows[0].id) : null;
}

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("login", { error: "" });
});

app.post("/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) return res.render("login", { error: "Kullanici adi ve sifre zorunludur." });
  const validFallback = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;

  try {
    const [rows] = await pool.query("SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1", [username]);
    const user = rows[0];
    let validHash = false;
    if (user && user.password_hash && user.password_hash.startsWith("$2")) {
      const normalizedHash = user.password_hash.replace(/^\$2y\$/, "$2b$");
      validHash = await bcrypt.compare(password, normalizedHash);
    }
    if (!validHash && !validFallback) return res.render("login", { error: "Giris bilgileri hatali." });
    let userId = user ? Number(user.id) : 0;
    if (!userId && validFallback) {
      const fallbackHash = await bcrypt.hash(password, 10);
      const [insertResult] = await pool.query(
        "INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = username",
        [username, fallbackHash]
      );
      userId = Number(insertResult.insertId || 0);
      if (!userId) {
        const [fallbackRows] = await pool.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
        userId = fallbackRows[0] ? Number(fallbackRows[0].id) : 0;
      }
    }
    req.session.user = {
      id: userId || 0,
      username: user ? user.username : username
    };
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
  res.render("index", { ok, error: "", username: req.session.user.username });
});

app.post("/", requireLogin, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const email = String(req.body.email || "").trim();
  const status = Number(req.body.status || 2);
  if (!name) return res.render("index", { ok: false, error: "Ad Soyad zorunludur.", username: req.session.user.username });
  if (![1, 2, 3].includes(status)) return res.render("index", { ok: false, error: "Gecersiz status secimi.", username: req.session.user.username });

  try {
    const userId = await resolveCurrentUserId(req);
    await pool.query("INSERT INTO guests (name, phone, email, status, user_id) VALUES (?, ?, ?, ?, ?)", [
      name,
      phone || null,
      email || null,
      status,
      userId
    ]);
    res.redirect("/?ok=1");
  } catch (err) {
    res.status(500).render("index", { ok: false, error: "Kayit hatasi: " + err.message, username: req.session.user.username });
  }
});

app.get("/list", requireLogin, async (req, res) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const [guests] = await pool.query(
      "SELECT id, name, phone, email, status, user_id FROM guests ORDER BY name ASC, id ASC"
    );
    const [countRows] = await pool.query("SELECT status, COUNT(*) AS total FROM guests GROUP BY status");
    const stats = countStats(countRows);
    res.render("list", {
      guests,
      stats,
      currentUserId: Number(currentUserId || 0),
      username: req.session.user.username
    });
  } catch (err) {
    res.status(500).send("Sunucu hatasi: " + err.message);
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/update", requireLogin, async (req, res) => {
  const id = Number(req.body.id || 0);
  const status = Number(req.body.status || 0);
  if (!id || ![1, 2, 3].includes(status)) {
    return res.status(422).json({ success: false, message: "Gecersiz veri." });
  }

  try {
    const userId = await resolveCurrentUserId(req);
    await pool.query("UPDATE guests SET status = ?, user_id = ? WHERE id = ?", [status, userId, id]);
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

function statsPayload(stats) {
  return {
    count_1: stats.count1,
    count_2: stats.count2,
    count_3: stats.count3,
    total_guests: stats.totalGuests,
    occupancy_rate: stats.occupancyRate
  };
}

async function handleGuestSave(req, res) {
  const id = Number(req.params.id || 0);
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const email = String(req.body.email || "").trim();
  const status = Number(req.body.status || 0);
  if (!id || !name || ![1, 2, 3].includes(status)) {
    return res.status(422).json({ success: false, message: "Gecersiz veri." });
  }

  try {
    const userId = await resolveCurrentUserId(req);
    await pool.query("UPDATE guests SET name = ?, phone = ?, email = ?, status = ?, user_id = ? WHERE id = ?", [
      name,
      phone || null,
      email || null,
      status,
      userId,
      id
    ]);
    const [countRows] = await pool.query("SELECT status, COUNT(*) AS total FROM guests GROUP BY status");
    const stats = countStats(countRows);
    return res.json({ success: true, stats: statsPayload(stats) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Sunucu hatasi: " + err.message });
  }
}

app.put("/api/guest/:id", requireLogin, handleGuestSave);
app.post("/api/guest/:id", requireLogin, handleGuestSave);

app.delete("/api/guest/:id", requireLogin, async (req, res) => {
  const id = Number(req.params.id || 0);
  const currentUserId = Number(await resolveCurrentUserId(req) || 0);
  if (!id) {
    return res.status(422).json({ success: false, message: "Gecersiz veri." });
  }

  try {
    const [rows] = await pool.query("SELECT user_id FROM guests WHERE id = ? LIMIT 1", [id]);
    const guest = rows[0];
    if (!guest) {
      return res.status(404).json({ success: false, message: "Kayit bulunamadi." });
    }
    const guestUserId = guest.user_id == null ? null : Number(guest.user_id);
    const canDelete = currentUserId === 1 || (guestUserId !== null && guestUserId === currentUserId);
    if (!canDelete) {
      return res.status(403).json({ success: false, message: "Bu kaydi silme yetkiniz yok." });
    }

    await pool.query("DELETE FROM guests WHERE id = ?", [id]);
    const [countRows] = await pool.query("SELECT status, COUNT(*) AS total FROM guests GROUP BY status");
    const stats = countStats(countRows);
    return res.json({ success: true, stats: statsPayload(stats) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Sunucu hatasi: " + err.message });
  }
});

ensureSeedUsers()
  .catch((err) => {
    console.error("Kullanici seed hatasi:", err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
