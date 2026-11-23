
<?php

require_once __DIR__ . '/sessao.php';

/* Limpa todos os dados da sessão atual. */
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

/* Destrói a sessão no servidor. */
session_destroy();

/* Volta ao login do aluno. */
header('Location: ../paginas/entrar.html');
exit;
