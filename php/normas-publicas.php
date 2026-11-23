
<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once __DIR__ . '/conexao.php';

$resultado = $mysqli->query(
    "SELECT titulo, ano_versao, caminho_arquivo, descricao, provisoria
     FROM documentos_normas
     ORDER BY id DESC
     LIMIT 1"
);

if (!$resultado) {
    error_log('Erro ao consultar documento público: ' . $mysqli->error);

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar o documento.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$documento = $resultado->fetch_assoc();

if (!$documento) {
    http_response_code(404);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Nenhum documento foi cadastrado.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Só disponibiliza caminhos de PDF dentro da pasta documentos.
$caminho = $documento['caminho_arquivo'] ?? '';

if (!preg_match('/\Adocumentos\/[a-zA-Z0-9._-]+\.pdf\z/i', $caminho)) {
    error_log('Caminho inválido no documento de normas.');

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'O arquivo do documento precisa ser verificado.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

echo json_encode([
    'sucesso' => true,
    'documento' => [
        'titulo' => $documento['titulo'],
        'ano_versao' => (int) $documento['ano_versao'],
        'caminho_arquivo' => $caminho,
        'descricao' => $documento['descricao'] ?? '',
        'provisoria' => (int) $documento['provisoria']
    ]
], JSON_UNESCAPED_UNICODE);

$mysqli->close();
?>
