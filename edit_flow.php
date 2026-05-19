<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

requireEditorApi();

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
$id = (int)($input['id'] ?? 0);
$tarih = trim((string)($input['tarih'] ?? ''));
$saatBaslangic = trim((string)($input['saat_baslangic'] ?? ''));
$saatBitis = trim((string)($input['saat_bitis'] ?? ''));
$aksiyon = trim((string)($input['aksiyon'] ?? ''));
$aciklama = trim((string)($input['aciklama'] ?? ''));
$sahis = trim((string)($input['sahis'] ?? ''));

if ($id <= 0 || $tarih === '' || $saatBaslangic === '' || $saatBitis === '' || $aksiyon === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Gecersiz veri.']);
    exit;
}

if ($saatBitis < $saatBaslangic) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Bitis saati baslangic saatinden once olamaz.']);
    exit;
}

try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('UPDATE gun_akisi SET tarih = :tarih, saat_baslangic = :saat_baslangic, saat_bitis = :saat_bitis, aksiyon = :aksiyon, aciklama = :aciklama, sahis = :sahis WHERE id = :id');
    $stmt->execute([
        'tarih' => $tarih,
        'saat_baslangic' => $saatBaslangic,
        'saat_bitis' => $saatBitis,
        'aksiyon' => $aksiyon,
        'aciklama' => $aciklama !== '' ? $aciklama : null,
        'sahis' => $sahis !== '' ? $sahis : null,
        'id' => $id,
    ]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Sunucu hatasi: ' . $e->getMessage()]);
}
