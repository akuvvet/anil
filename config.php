<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'dbwedding';
const DB_USER = 'root';
const DB_PASS = '';
const SALON_CAPACITY = 300;

function getPdo(): PDO
{
    return new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

function userRole(): string
{
    return (string)($_SESSION['role'] ?? 'admin');
}

function isViewer(): bool
{
    return userRole() === 'viewer';
}

function requireLogin(): void
{
    if (!isset($_SESSION['user_id'])) {
        header('Location: login.php');
        exit;
    }
}

function requireEditor(): void
{
    requireLogin();
    if (isViewer()) {
        header('Location: list.php');
        exit;
    }
}

function requireEditorApi(): void
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Yetkisiz erisim.']);
        exit;
    }
    if (isViewer()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Salt okunur hesap: degisiklik yapilamaz.']);
        exit;
    }
}
