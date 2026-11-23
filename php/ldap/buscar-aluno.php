
<?php

session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

function responderBusca(bool $sucesso, string $mensagem, array $dados = []): void
{
    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem,
        'dados' => $dados
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

/*
 * Este endpoint exige uma sessão LDAP validada.
 * A sessão será configurada na etapa de integração.
 */
if (empty($_SESSION['ldap_autenticado']) ||
    empty($_SESSION['ldap_matricula'])) {
    http_response_code(401);
    responderBusca(false, 'É necessário autenticar-se primeiro.');
}

if (!function_exists('ldap_connect')) {
    http_response_code(503);
    responderBusca(false, 'A extensão LDAP não está habilitada no servidor.');
}

$matricula = $_SESSION['ldap_matricula'];

$ldap = @ldap_connect(LDAP_SERVER);

if (!$ldap) {
    http_response_code(503);
    responderBusca(false, 'Não foi possível acessar o serviço LDAP.');
}

ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);

/*
 * A busca será feita usando uma conta autenticada.
 * A integração precisa guardar com segurança uma credencial
 * de consulta ou usar outro método aprovado pela equipe de TI.
 */

@ldap_unbind($ldap);

responderBusca(
    false,
    'A consulta de dados ainda precisa ser configurada com a equipe de TI.'
);
