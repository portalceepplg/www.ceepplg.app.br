
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

$matricula = trim($_POST['usuario'] ?? '');
$senha = $_POST['senha'] ?? '';

if ($matricula === '' || $senha === '') {
    responderLogin(false, 'Informe a matrícula e a senha.', 400);
}

try {
    $consulta = $mysqli->prepare("
        SELECT
            id,
            id_professor,
            nome,
            matricula,
            senha,
            ativo
        FROM acessos_professores
        WHERE matricula = ?
        LIMIT 1
    ");

    if (!$consulta) {
        throw new RuntimeException('Erro ao preparar consulta.');
    }

    $consulta->bind_param('s', $matricula);
    $consulta->execute();

    $resultado = $consulta->get_result();
    $professor = $resultado->fetch_assoc();

    $consulta->close();

    if (
        !$professor ||
        (int) $professor['ativo'] !== 1 ||
        !password_verify($senha, $professor['senha'])
    ) {
        responderLogin(false, 'Matrícula ou senha incorreta.', 401);
    }

    session_regenerate_id(true);

    unset(
        $_SESSION['ldap_autenticado'],
        $_SESSION['ldap_matricula'],
        $_SESSION['usuario_nome'],
        $_SESSION['nome'],
        $_SESSION['id_admin'],
        $_SESSION['nome_admin'],
        $_SESSION['email_admin'],
        $_SESSION['gestao_autorizada']
    );

    $_SESSION['professor_autenticado'] = true;
    $_SESSION['id_professor'] = (int) $professor['id_professor'];
    $_SESSION['id_acesso_professor'] = (int) $professor['id'];
    $_SESSION['nome_professor'] = $professor['nome'];
    $_SESSION['matricula_professor'] = $professor['matricula'];

    responderLogin(true, 'Autenticação realizada com sucesso.');

} catch (Throwable $erro) {
    error_log('Erro no login do professor: ' . $erro->getMessage());

    responderLogin(false, 'Erro interno ao realizar o login.', 500);
}
