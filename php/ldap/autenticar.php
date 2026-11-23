
<?php

require_once __DIR__ . '/../sessao.php';

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

function responder(
    bool $sucesso,
    string $mensagem,
    int $status = 200,
    array $dados = []
): void {
    http_response_code($status);

    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem,
        'dados' => $dados
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

$matricula = trim($_POST['usuario'] ?? '');
$senha = $_POST['senha'] ?? '';

if ($matricula === '' || trim($senha) === '') {
    responder(false, 'Preencha a matrícula e a senha.');
}

if (
    strpos($matricula, '@') !== false ||
    strpos($matricula, '\\') !== false
) {
    responder(false, 'Formato de matrícula inválido.');
}

if (!function_exists('ldap_connect')) {
    error_log('LDAP: extensão não habilitada.');
    responder(false, 'Serviço LDAP indisponível.', 503);
}

if (!function_exists('ldap_escape')) {
    error_log('LDAP: função ldap_escape indisponível.');
    responder(false, 'Não foi possível processar a autenticação.', 503);
}

$ldap = @ldap_connect(LDAP_SERVER);

if (!$ldap) {
    responder(false, 'Não foi possível acessar o servidor LDAP.', 503);
}

ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);

/* 1. Valida a matrícula e a senha no LDAP. */
$usuarioDominio = $matricula . LDAP_DOMAIN;
$autenticado = @ldap_bind($ldap, $usuarioDominio, $senha);

if (!$autenticado) {
    @ldap_unbind($ldap);
    responder(false, 'Matrícula ou senha incorretos.');
}



/* 2. Localiza o aluno na OU autorizada. */
$filtroMatricula = ldap_escape(
    $matricula,
    '',
    LDAP_ESCAPE_FILTER
);

$filtro = '(&(objectCategory=person)(objectClass=user)'
        . '(sAMAccountName=' . $filtroMatricula . '))';

$atributos = ['displayName', 'sAMAccountName'];

$pesquisa = @ldap_search(
    $ldap,
    LDAP_BASE_DN,
    $filtro,
    $atributos
);

if ($pesquisa === false) {
    error_log('LDAP: falha na pesquisa da matrícula.');
    @ldap_unbind($ldap);

    responder(
        false,
        'Não foi possível verificar o cadastro do aluno.',
        503
    );
}

$resultados = @ldap_get_entries($ldap, $pesquisa);

if (
    $resultados === false ||
    $resultados['count'] !== 1
) {
    @ldap_unbind($ldap);

    responder(
        false,
        'A matrícula não foi localizada na OU de alunos.'
    );
}

$aluno = $resultados[0];

$nome = $matricula;

if (
    isset($aluno['displayname'][0]) &&
    $aluno['displayname'][0] !== ''
) {
    $nome = $aluno['displayname'][0];
}

$matriculaConfirmada = $aluno['samaccountname'][0]
    ?? $matricula;

@ldap_unbind($ldap);

/* 3. Registra o acesso confirmado no MySQL. */
require_once __DIR__ . '/../conexao.php';

$stmt = $mysqli->prepare(
    'INSERT INTO acessos_ldap (matricula, nome)
     VALUES (?, ?)'
);

if ($stmt) {
    $stmt->bind_param(
        'ss',
        $matriculaConfirmada,
        $nome
    );

    if (!$stmt->execute()) {
        error_log(
            'MySQL: não foi possível registrar o acesso LDAP. '
            . $stmt->error
        );
    }

    $stmt->close();
} else {
    error_log(
        'MySQL: falha ao preparar o registro do acesso LDAP. '
        . $mysqli->error
    );
}


/* 4. Inicia a sessão autenticada do aluno. */
session_regenerate_id(true);

/* Remove dados de autenticação de outros perfis. */
unset(
    $_SESSION['professor_autenticado'],
    $_SESSION['nome_professor'],
    $_SESSION['id_admin'],
    $_SESSION['nome_admin'],
    $_SESSION['email_admin'],
    $_SESSION['gestao_autorizada']
);

/* Registra a autenticação do aluno. */
$_SESSION['ldap_autenticado'] = true;
$_SESSION['ldap_matricula'] = $matriculaConfirmada;

$_SESSION['logado'] = true;
$_SESSION['usuario_id'] = $matriculaConfirmada;
$_SESSION['usuario_nome'] = $nome;
$_SESSION['usuario'] = $matriculaConfirmada;
$_SESSION['nome'] = $nome;


/* 5. Retorna a resposta esperada pelo JavaScript. */
responder(
    true,
    'Autenticação realizada com sucesso via LDAP.',
    200,
    [
        'matricula' => $matriculaConfirmada,
        'nome' => $nome
    ]
);
