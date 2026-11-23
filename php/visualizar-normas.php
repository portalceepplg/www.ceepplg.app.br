
<?php

require_once __DIR__ . '/conexao.php';

// Busca o documento mais recente cadastrado.
$resultado = $mysqli->query(
    "SELECT caminho_arquivo
     FROM documentos_normas
     ORDER BY id DESC
     LIMIT 1"
);

if (!$resultado) {
    http_response_code(500);
    exit('Não foi possível localizar o documento.');
}

$documento = $resultado->fetch_assoc();
$mysqli->close();

if (!$documento) {
    http_response_code(404);
    exit('Documento não encontrado.');
}

// Valida o caminho registrado no banco.
$caminho = $documento['caminho_arquivo'] ?? '';

if (!preg_match('/\Adocumentos\/([a-zA-Z0-9._-]+\.pdf)\z/i', $caminho, $partes)) {
    http_response_code(400);
    exit('Caminho do documento inválido.');
}

// Localiza o arquivo dentro da pasta documentos.
$pastaDocumentos = realpath(__DIR__ . '/../documentos');
$arquivo = $pastaDocumentos
    ? realpath($pastaDocumentos . '/' . $partes[1])
    : false;

// Impede acesso a arquivos fora da pasta autorizada.
if (
    !$arquivo ||
    dirname($arquivo) !== $pastaDocumentos ||
    !is_file($arquivo) ||
    !is_readable($arquivo)
) {
    http_response_code(404);
    exit('Arquivo PDF não encontrado.');
}

// Informa ao navegador que o arquivo pode ser exibido.
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . basename($arquivo) . '"');
header('Content-Length: ' . filesize($arquivo));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate');

readfile($arquivo);
exit;
