
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$campos = [
    'instituicao', 'telefone', 'horario', 'endereco',
    'email', 'instagram', 'facebook', 'youtube',
    'linkedin', 'whatsapp', 'copyright'
];

$dados = [];

foreach ($campos as $campo) {
    $valor = $_POST[$campo] ?? '';

    if (!is_string($valor)) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Dados inválidos.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $dados[$campo] = trim($valor);
}

if ($dados['instituicao'] === '') {
    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Informe o nome da instituição.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (
    $dados['email'] !== '' &&
    !filter_var($dados['email'], FILTER_VALIDATE_EMAIL)
) {
    http_response_code(400);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Informe um e-mail válido.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

foreach (['instagram', 'facebook', 'youtube', 'linkedin', 'whatsapp'] as $campo) {
    if ($dados[$campo] === '') {
        continue;
    }

    $urlValida = filter_var($dados[$campo], FILTER_VALIDATE_URL);
    $protocolo = strtolower(
        (string) parse_url($dados[$campo], PHP_URL_SCHEME)
    );

    if (!$urlValida || !in_array($protocolo, ['http', 'https'], true)) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => "O endereço de {$campo} não é válido."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$sql = "UPDATE configuracoes SET
    instituicao = ?,
    telefone = ?,
    horario = ?,
    endereco = ?,
    email = ?,
    instagram = ?,
    facebook = ?,
    youtube = ?,
    linkedin = ?,
    whatsapp = ?,
    copyright = ?
    WHERE id_configuracao = 1";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível preparar o salvamento.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt->bind_param(
    'sssssssssss',
    $dados['instituicao'],
    $dados['telefone'],
    $dados['horario'],
    $dados['endereco'],
    $dados['email'],
    $dados['instagram'],
    $dados['facebook'],
    $dados['youtube'],
    $dados['linkedin'],
    $dados['whatsapp'],
    $dados['copyright']
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao salvar as configurações.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'sucesso' => true,
    'mensagem' => 'Informações institucionais salvas com sucesso.'
], JSON_UNESCAPED_UNICODE);
