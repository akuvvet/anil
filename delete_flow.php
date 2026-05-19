<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

requireEditorApi();

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
$id = (int)($input['id'] ?? 0);

if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Gecersiz veri.']);
    exit;
}

try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('DELETE FROM gun_akisi WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Sunucu hatasi: ' . $e->getMessage()]);
}
