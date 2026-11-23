<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php';

try {
    $sql = "
        SELECT id_tcc, titulo, descricao, endereco, logo
        FROM sistemas_tcc
        WHERE ativo = 1
        ORDER BY titulo ASC
    ";

    $resultado = $mysqli->query($sql);

    if (!$resultado) {
        throw new RuntimeException('Erro ao consultar os domínios.');
    }

    $dominios = [];

    while ($linha = $resultado->fetch_assoc()) {
        $dominios[] = [
            'id' => (int) $linha['id_tcc'],
            'titulo' => $linha['titulo'],
            'descricao' => $linha['descricao'],
            'endereco' => $linha['endereco'],
            'logo' => $linha['logo']
        ];
    }

    echo json_encode(
        $dominios,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $erro) {
    error_log('Erro ao listar domínios: ' . $erro->getMessage());

    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar os domínios.'
    ], JSON_UNESCAPED_UNICODE);
}