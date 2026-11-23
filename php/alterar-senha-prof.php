
<?php

require_once __DIR__ . '/sessao.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function responder($sucesso, $mensagem, $status = 200)
{
    http_response_code($status);

    echo json_encode([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

if (
    empty($_SESSION['professor_autenticado']) ||
    empty($_SESSION['id_professor']) ||
    empty($_SESSION['id_acesso_professor'])
) {
    responder(false, 'Sessão não autorizada.', 401);
}

$senhaAtual = $_POST['senha_atual'] ?? '';
$novaSenha = $_POST['nova_senha'] ?? '';
$confirmarSenha = $_POST['confirmar_senha'] ?? '';

if ($senhaAtual === '' || $novaSenha === '' || $confirmarSenha === '') {
    responder(false, 'Preencha todos os campos.', 400);
}

if (strlen($novaSenha) < 8) {
    responder(false, 'A nova senha deve ter pelo menos 8 caracteres.', 400);
}

if ($novaSenha !== $confirmarSenha) {
    responder(false, 'A confirmação da nova senha não corresponde.', 400);
}

if ($senhaAtual === $novaSenha) {
    responder(false, 'A nova senha deve ser diferente da senha atual.', 400);
}

require_once __DIR__ . '/conexao.php';

$idAcesso = (int) $_SESSION['id_acesso_professor'];
$idProfessor = (int) $_SESSION['id_professor'];

// Busca a senha cadastrada para a conta autenticada.
$sql = "
    SELECT senha
    FROM acessos_professores
    WHERE id = ?
      AND id_professor = ?
      AND ativo = 1
    LIMIT 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error_log('Erro ao preparar consulta de senha: ' . $mysqli->error);
    responder(false, 'Não foi possível validar sua conta.', 500);
}

$stmt->bind_param('ii', $idAcesso, $idProfessor);
$stmt->execute();

$resultado = $stmt->get_result();
$acesso = $resultado->fetch_assoc();

$stmt->close();

if (!$acesso || !password_verify($senhaAtual, $acesso['senha'])) {
    responder(false, 'A senha inicial/atual está incorreta.', 401);
}

// Gera o hash da nova senha.
$novoHash = password_hash($novaSenha, PASSWORD_DEFAULT);

if ($novoHash === false) {
    responder(false, 'Não foi possível gerar a nova senha.', 500);
}

// Atualiza somente a conta do professor autenticado.
$sql = "
    UPDATE acessos_professores
    SET senha = ?
    WHERE id = ?
      AND id_professor = ?
      AND ativo = 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error_log('Erro ao preparar atualização de senha: ' . $mysqli->error);
    responder(false, 'Não foi possível atualizar sua senha.', 500);
}

$stmt->bind_param('sii', $novoHash, $idAcesso, $idProfessor);

if (!$stmt->execute()) {
    error_log('Erro ao atualizar senha: ' . $stmt->error);
    $stmt->close();
    responder(false, 'Ocorreu um erro ao salvar a nova senha.', 500);
}

$alterado = $stmt->affected_rows;
$stmt->close();

if ($alterado !== 1) {
    responder(false, 'A senha não foi alterada. Tente novamente.', 500);
}

responder(true, 'Senha alterada com sucesso!');
