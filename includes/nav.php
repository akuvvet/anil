<nav class="bg-slate-900 text-white">
  <div class="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
    <span>Davetli Yonetim Paneli</span>
    <div class="flex flex-wrap items-center gap-2 text-sm justify-end">
      <span class="px-2 py-1 rounded bg-slate-800/80">Kullanici: <?= htmlspecialchars((string)($_SESSION['username'] ?? '-'), ENT_QUOTES, 'UTF-8') ?></span>
      <?php if ($readOnly): ?><span class="px-2 py-1 rounded bg-slate-800/80">Salt okunur</span><?php endif; ?>
      <?php if (!$readOnly): ?><a class="px-3 py-1.5 rounded bg-slate-700" href="index.php">Giris Formu</a><?php endif; ?>
      <a class="px-3 py-1.5 rounded bg-teal-600 font-medium" href="gun_akisi.php">Gun Akisi</a>
      <a class="px-3 py-1.5 rounded <?= $readOnly ? 'bg-slate-700' : 'bg-indigo-600' ?>" href="list.php">Davetli Listesi</a>
      <a class="px-3 py-1.5 rounded bg-rose-700" href="login.php?logout=1">Cikis</a>
    </div>
  </div>
</nav>
