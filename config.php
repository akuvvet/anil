<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'dbanil';
const DB_USER = 'root';
const DB_PASS = '';
const SALON_CAPACITY = 720;

function generateInviteToken(): string
{
    return bin2hex(random_bytes(24));
}

function ensureGuestInviteColumns(PDO $pdo): void
{
    $cols = $pdo->query('SHOW COLUMNS FROM guests')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('invite_token', $cols, true)) {
        $pdo->exec('ALTER TABLE guests ADD COLUMN invite_token VARCHAR(64) DEFAULT NULL');
    }
    $indexes = $pdo->query("SHOW INDEX FROM guests WHERE Key_name = 'idx_guests_invite_token'")->fetchAll();
    if (!$indexes) {
        $pdo->exec('CREATE UNIQUE INDEX idx_guests_invite_token ON guests (invite_token)');
    }
}

function ensureGuestInviteToken(PDO $pdo, int $guestId): ?string
{
    $stmt = $pdo->prepare('SELECT invite_token FROM guests WHERE id = ? LIMIT 1');
    $stmt->execute([$guestId]);
    $token = (string)($stmt->fetchColumn() ?: '');
    if ($token !== '') {
        return $token;
    }

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $candidate = generateInviteToken();
        try {
            $update = $pdo->prepare('UPDATE guests SET invite_token = ? WHERE id = ? AND (invite_token IS NULL OR invite_token = \'\')');
            $update->execute([$candidate, $guestId]);
            if ($update->rowCount() > 0) {
                return $candidate;
            }
            $stmt->execute([$guestId]);
            $token = (string)($stmt->fetchColumn() ?: '');
            if ($token !== '') {
                return $token;
            }
        } catch (PDOException $e) {
            if ((int)$e->errorInfo[1] !== 1062) {
                throw $e;
            }
        }
    }

    return null;
}

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

function normalizeRole(string $role): string
{
    $r = strtolower(trim($role));
    if ($r === 'viewer') {
        return 'viewer';
    }
    if ($r === 'benutzer') {
        return 'benutzer';
    }
    return 'admin';
}

function isAdmin(): bool
{
    return userRole() === 'admin';
}

function isBenutzer(): bool
{
    return userRole() === 'benutzer';
}

function currentUserId(): int
{
    return (int)($_SESSION['user_id'] ?? 0);
}

function canManageGuest(?int $guestUserId): bool
{
    if (isAdmin()) {
        return true;
    }
    if (!isBenutzer()) {
        return false;
    }
    $current = currentUserId();
    if ($current <= 0 || $guestUserId === null) {
        return false;
    }
    return $guestUserId === $current;
}

function canSeeGuestContact(?int $guestUserId): bool
{
    return canManageGuest($guestUserId);
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
        header('Location: gun_akisi.php');
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
