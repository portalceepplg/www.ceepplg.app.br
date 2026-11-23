
<?php

/*
 * login.php
 *
 * Endpoint legado de autenticação.
 * A autenticação dos alunos é realizada por:
 * /php/ldap/autenticar.php
 *
 * A autenticação dos professores é realizada por:
 * /php/login-prof.php
 *
 * Este arquivo permanece apenas para evitar que acessos antigos
 * ao endpoint resultem em erro ou executem autenticações duplicadas.
 */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /paginas/entrar.html');
    exit;
}

/*
 * O formulário atual utiliza JavaScript para enviar os dados
 * diretamente ao autenticador LDAP.
 *
 * Caso este endpoint seja chamado diretamente por POST,
 * encaminha o usuário à página de entrada.
 */

header('Location: /paginas/entrar.html');
exit;
