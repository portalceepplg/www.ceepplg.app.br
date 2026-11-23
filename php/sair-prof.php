
<?php

require_once __DIR__ . '/sessao.php';

/* Limpa todos os dados da sessão. */
$_SESSION = [];

/* Invalida o cookie persistente. */
if (ini_get('session.use_cookies')) {
    $parametros = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        [
            'expires' => time() - 42000,
            'path' => $parametros['path'],
            'domain' => $parametros['domain'],
            'secure' => $parametros['secure'],
            'httponly' => $parametros['httponly'],
            'samesite' => $parametros['samesite'] ?? 'Lax'
        ]
    );
}

/* Encerra a sessão no servidor. */
session_destroy();

/* Retorna ao login do professor. */
header('Location: ../paginas/entrarprof.html');
exit;
