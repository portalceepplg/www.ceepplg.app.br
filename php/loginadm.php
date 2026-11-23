
<?php

require_once __DIR__ . '/sessao.php';
require_once __DIR__ . '/conexao.php';

header('Content-Type: application/json; charset=utf-8');

function responderLogin(bool $sucesso, string $mensagem, int $status = 200): void
{
    http_response_code($status);

    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderLogin(false, 'Método de requisição inválido.', 405);
}

$credencial = trim($_POST['usuario'] ?? '');
$senha = $_POST['senha'] ?? '';

if ($credencial === '' || $senha === '') {
    responderLogin(false, 'Preencha todos os campos.', 400);
}

$stmt = $mysqli->prepare(
    'SELECT id_admin, nome, email, senha
     FROM administradores
     WHERE (nome = ? OR email = ?)
       AND ativo = 1
     LIMIT 1'
);

if (!$stmt) {
    error_log('Erro no login administrativo: ' . $mysqli->error);
    responderLogin(false, 'Erro interno ao realizar o login.', 500);
}

$stmt->bind_param('ss', $credencial, $credencial);
$stmt->execute();

$resultado = $stmt->get_result();
$admin = $resultado->fetch_assoc();

$stmt->close();

if (!$admin || !password_verify($senha, $admin['senha'])) {
    responderLogin(false, 'Credencial administrativa ou senha incorreta.', 401);
}

/* Renova o identificador da sessão após autenticar. */
session_regenerate_id(true);

/* Remove dados de autenticação dos outros perfis. */
unset(
    $_SESSION['ldap_autenticado'],
    $_SESSION['ldap_matricula'],
    $_SESSION['logado'],
    $_SESSION['usuario_id'],
    $_SESSION['usuario_nome'],
    $_SESSION['usuario'],
    $_SESSION['nome'],
    $_SESSION['professor_autenticado'],
    $_SESSION['nome_professor']
);

/* Registra a autenticação administrativa. */
$_SESSION['id_admin'] = (int) $admin['id_admin'];
$_SESSION['nome_admin'] = $admin['nome'];
$_SESSION['email_admin'] = $admin['email'];
$_SESSION['gestao_autorizada'] = true;

responderLogin(true, 'Autenticação realizada com sucesso.');
