
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

$mysqli->set_charset('utf8mb4');

try {
    $sql = "SELECT id_local, nome, descricao, imagem, imagem2
            FROM infraestrutura
            WHERE ativo = 1
           ORDER BY nome ASC";

    $resultado = $mysqli->query($sql);

    if (!$resultado) {
        throw new Exception('Não foi possível consultar os ambientes.');
    }

    $ambientes = [];

    while ($linha = $resultado->fetch_assoc()) {
        $ambientes[] = $linha;
    }

    echo json_encode([
        'sucesso' => true,
        'ambientes' => $ambientes
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $erro) {
    error_log('Infraestrutura pública: ' . $erro->getMessage());

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar a infraestrutura.'
    ], JSON_UNESCAPED_UNICODE);
}
