<?php
$duracao = 60 * 60 * 24 * 30;

ini_set('session.gc_maxlifetime', (string) $duracao);

session_set_cookie_params([
    'lifetime' => $duracao,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS'])
        && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

