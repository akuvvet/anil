# Wedding Guest Manager (Node.js)

Node.js + MariaDB Web-App fuer Login, Davetli-Erfassung und Live-Status-Update.

## 1) Lokal starten

1. `.env.example` zu `.env` kopieren
2. Werte in `.env` setzen (DB + Session Secret)
3. DB-Script ausfuehren:
   - `db_setup.sql` in deiner MariaDB (`dbwedding`)
4. Abhaengigkeiten installieren:
   - `npm install`
5. App starten:
   - `npm start`
6. Browser:
   - `http://localhost:3000/login`

Standard-Login:
- Username: `admin`
- Passwort: `password`

## 2) Auf Server deployen (GitHub + Subdomain)

### A. Code auf Server holen

```bash
git clone https://github.com/akuvvet/wedding.git
cd wedding
npm install
cp .env.example .env
```

`.env` auf dem Server korrekt fuellen.

### B. PM2 als Prozessmanager

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### C. Nginx Reverse Proxy fuer `wedding.klick-und-fertig.de`

Beispiel-Konfiguration:

```nginx
server {
    listen 80;
    server_name wedding.klick-und-fertig.de;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Dann:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### D. HTTPS aktivieren (Let's Encrypt)

```bash
sudo certbot --nginx -d wedding.klick-und-fertig.de
```

## 3) Projektstruktur

- `app.js` - Express App (Routen + Session)
- `db.js` - MariaDB Verbindungspool
- `views/` - EJS Templates (`login`, `index`, `list`)
- `public/style.css` - Slider / Responsive Styling
- `db_setup.sql` - Tabellen + Admin User
- `.env.example` - Konfigurationsvorlage
- `ecosystem.config.cjs` - PM2 Konfiguration

## 4) Hinweise

- Diese Node-Version ist die aktive App.
- Alte PHP-Dateien koennen bei Bedarf entfernt werden.
# Guvenli Davetli Yonetim ve Stratejik Eleme Sistemi

Salon kapasitesine gore davetli listesini yonetmek icin gelistirilmis, sifre korumali ve mobil uyumlu bir PHP web uygulamasi.

## Ozellikler

- Guvenli giris (session tabanli kimlik dogrulama)
- Davetli ekleme formu
- Canli istatistik kartlari (1/2/3 durum dagilimi)
- AJAX ile anlik status guncelleme
- Mobil uyumlu dashboard tasarimi

## Teknolojiler

- PHP 8+ (PDO)
- MariaDB / MySQL
- Tailwind CSS (CDN)
- JavaScript Fetch API

## Kurulum

1. Projeyi bir PHP sunucusuna koyun (`htdocs` vb.).
2. MariaDB uzerinde `db_setup.sql` dosyasini calistirin.
3. Gerekirse `config.php` icinde veritabani ayarlarini degistirin:
   - `DB_HOST`
   - `DB_NAME` (varsayilan: `dbwedding`)
   - `DB_USER`
   - `DB_PASS`
   - `SALON_CAPACITY`
4. Tarayicidan `login.php` sayfasini acin.

## Varsayilan Giris Bilgisi

- Kullanici adi: `admin`
- Sifre: `password`

Not: Bu sifre sadece ilk kurulum icin ornek olarak eklenmistir. Canli kullanimda mutlaka degistirin.

## Dosya Yapisi

- `config.php`: Ortak veritabani baglantisi ve temel ayarlar
- `login.php`: Giris/cikis islemleri
- `index.php`: Davetli ekleme formu
- `list.php`: Istatistikler ve davetli listesi
- `update.php`: AJAX status guncelleme API
- `style.css`: Ozel slider stilleri
- `db_setup.sql`: Veritabani kurulumu

## Guvenlik Notlari

- Parola dogrulama `password_verify()` ile yapilir.
- Veritabani sorgularinda hazirlanmis ifade (prepared statement) kullanilir.
- Oturum acmamis kullanicilar korumali sayfalara erisemez.
