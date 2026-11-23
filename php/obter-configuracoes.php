
<?php
require_once __DIR__ . '/sessao.php';

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['id_admin']) || empty($_SESSION['gestao_autorizada'])) {
    http_response_code(401);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Acesso não autorizado.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/conexao.php';

$sql = "SELECT instituicao, telefone, horario, endereco, email,
               instagram, facebook, youtube, linkedin,
               whatsapp, copyright
        FROM configuracoes
        WHERE id_configuracao = 1
        LIMIT 1";

$resultado = $mysqli->query($sql);

if (!$resultado) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao consultar as configurações.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$dados = $resultado->fetch_assoc();

if (!$dados) {
    http_response_code(404);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Configurações não encontradas.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'sucesso' => true,
    'dados' => $dados
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$mysqli->close();
