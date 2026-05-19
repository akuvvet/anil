<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/config.php';
requireEditor();
$readOnly = false;
$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string)($_POST['name'] ?? ''));
    $phone = trim((string)($_POST['phone'] ?? ''));
    $email = trim((string)($_POST['email'] ?? ''));
    $city = trim((string)($_POST['city'] ?? ''));
    $status = (int)($_POST['status'] ?? 2);

    if ($name === '') {
        $error = 'Ad Soyad zorunludur.';
    } elseif (!in_array($status, [1,2,3], true)) {
        $error = 'Gecersiz status secimi.';
    } else {
        try {
            $pdo = getPdo();
            $userId = currentUserId();
            $stmt = $pdo->prepare('INSERT INTO guests (name, phone, email, city, status, user_id) VALUES (:name,:phone,:email,:city,:status,:user_id)');
            $stmt->execute([
                'name' => $name,
                'phone' => $phone !== '' ? $phone : null,
                'email' => $email !== '' ? $email : null,
                'city' => $city !== '' ? $city : null,
                'status' => $status,
                'user_id' => $userId > 0 ? $userId : null,
            ]);
            header('Location: index.php?ok=1');
            exit;
        } catch (PDOException $e) {
            $error = 'Kayit hatasi: ' . $e->getMessage();
        }
    }
}
if (isset($_GET['ok'])) $success = 'Davetli basariyla kaydedildi.';
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Giris Formu</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="min-h-screen bg-slate-100">
  <?php require __DIR__ . '/includes/nav.php'; ?>

  <main class="max-w-3xl mx-auto p-4 sm:p-6">
    <section class="bg-white border rounded-2xl p-6">
      <h1 class="text-xl font-bold">Davetli Veri Girisi</h1>
      <?php if ($success !== ''): ?><div class="mt-4 rounded bg-emerald-100 text-emerald-700 px-3 py-2 text-sm"><?= htmlspecialchars($success, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <?php if ($error !== ''): ?><div class="mt-4 rounded bg-red-100 text-red-700 px-3 py-2 text-sm"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2"><label class="text-sm">Ad Soyad</label><input name="name" required class="mt-1 w-full rounded border px-3 py-2"></div>
        <div><label class="text-sm">Telefon</label><input name="phone" class="mt-1 w-full rounded border px-3 py-2"></div>
        <div><label class="text-sm">Email</label><input type="email" name="email" class="mt-1 w-full rounded border px-3 py-2"></div>
        <div><label class="text-sm">Sehir</label><input name="city" class="mt-1 w-full rounded border px-3 py-2" placeholder="Orn. Istanbul, Ankara"></div>
        <div class="sm:col-span-2"><label class="text-sm">Baslangic Statusu</label><select name="status" class="mt-1 w-full rounded border px-3 py-2"><option value="1">1 - Mutlaka</option><option value="2" selected>2 - Olabilir</option><option value="3">3 - Gerek Yok</option></select></div>
        <div class="sm:col-span-2"><button class="rounded bg-indigo-600 text-white px-5 py-2.5 font-semibold">Kaydet</button></div>
      </form>
    </section>
  </main>
</body>
</html>
