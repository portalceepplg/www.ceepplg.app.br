
<?php

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function responder($sucesso, $mensagem, $dados = [], $status = 200)
{
    http_response_code($status);

    echo json_encode(
        array_merge([
            'sucesso' => $sucesso,
            'mensagem' => $mensagem
        ], $dados),
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

// Proteção administrativa: mesma regra de gerenciar-disciplinas.php.
if (
    empty($_SESSION['gestao_autorizada']) ||
    empty($_SESSION['id_admin'])
) {
    responder(
        false,
        'Acesso não autorizado. Entre novamente na Área da Gestão.',
        [],
        401
    );
}

require_once __DIR__ . '/conexao.php';

$metodo = $_SERVER['REQUEST_METHOD'];

// GET: buscar o documento atual.
if ($metodo === 'GET') {
    $resultado = $mysqli->query(
        "SELECT id, titulo, ano_versao, caminho_arquivo,
                descricao, provisoria, atualizado_em
         FROM documentos_normas
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$resultado) {
        error_log('Erro ao consultar normas: ' . $mysqli->error);
        responder(false, 'Não foi possível carregar o documento.', [], 500);
    }

    $documento = $resultado->fetch_assoc();

    if ($documento) {
        $documento['id'] = (int) $documento['id'];
        $documento['ano_versao'] = (int) $documento['ano_versao'];
        $documento['provisoria'] = (int) $documento['provisoria'];
    }

    responder(true, 'Consulta concluída.', [
        'documento' => $documento
    ]);
}

// As alterações só podem ser enviadas por POST.
if ($metodo !== 'POST') {
    responder(false, 'Método não permitido.', [], 405);
}

$titulo = trim($_POST['titulo'] ?? '');
$ano = filter_var(
    $_POST['ano_versao'] ?? null,
    FILTER_VALIDATE_INT
);
$descricao = trim($_POST['descricao'] ?? '');
$provisoria = $_POST['provisoria'] ?? '1';

if ($titulo === '' || mb_strlen($titulo, 'UTF-8') > 150) {
    responder(false, 'Informe um título de até 150 caracteres.', [], 400);
}

if ($ano === false || $ano < 1901 || $ano > 2155) {
    responder(false, 'Informe um ano válido.', [], 400);
}

if (!in_array((string) $provisoria, ['0', '1'], true)) {
    responder(false, 'Selecione uma situação válida.', [], 400);
}

$provisoria = (int) $provisoria;

// Recupera o documento atual, se houver.
$resultado = $mysqli->query(
    "SELECT id, caminho_arquivo
     FROM documentos_normas
     ORDER BY id DESC
     LIMIT 1"
);

if (!$resultado) {
    error_log('Erro ao localizar normas: ' . $mysqli->error);
    responder(false, 'Não foi possível consultar o documento atual.', [], 500);
}

$atual = $resultado->fetch_assoc();
$idDocumento = $atual ? (int) $atual['id'] : 0;
$caminho = $atual['caminho_arquivo'] ?? '';

$arquivoEnviado = isset($_FILES['pdf'])
    && $_FILES['pdf']['error'] !== UPLOAD_ERR_NO_FILE;

// Se um arquivo foi enviado, validar antes de salvá-lo.
if ($arquivoEnviado) {
    if ($_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        responder(false, 'O envio do PDF falhou. Tente novamente.', [], 400);
    }

    $arquivo = $_FILES['pdf'];

    // Limite de 15 MB.
    if ($arquivo['size'] <= 0 || $arquivo['size'] > 15 * 1024 * 1024) {
        responder(false, 'O PDF deve ter no máximo 15 MB.', [], 400);
    }

    if (!is_uploaded_file($arquivo['tmp_name'])) {
        responder(false, 'O arquivo enviado não é válido.', [], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $tipo = $finfo->file($arquivo['tmp_name']);

    if ($tipo !== 'application/pdf') {
        responder(false, 'Envie um arquivo PDF válido.', [], 400);
    }

    // A pasta documentos fica na raiz do projeto.
    $pastaDocumentos = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'documentos';
    error_log('Pasta documentos: ' . $pastaDocumentos);
    error_log('Existe: ' . (is_dir($pastaDocumentos) ? 'sim' : 'não'));
    error_log('Gravável: ' . (is_writable($pastaDocumentos) ? 'sim' : 'não'));

    if (
        !is_dir($pastaDocumentos) ||
        !is_writable($pastaDocumentos)
    ) {
        responder(
            false,
            'A pasta documentos não existe ou não permite gravação pelo servidor.',
            [],
            500
        );
    }

    // Nome gerado pelo servidor, sem utilizar o nome original do upload.
    try {
        $nomeArquivo = 'regimento-escolar-' . date('Ymd-His')
            . '-' . bin2hex(random_bytes(4)) . '.pdf';
    } catch (Throwable $erro) {
        responder(false, 'Não foi possível preparar o nome do arquivo.', [], 500);
    }

    $destino = $pastaDocumentos . DIRECTORY_SEPARATOR . $nomeArquivo;
    $testeDestino = @file_put_contents(
    $destino . '.teste',
    'teste'
);

if ($testeDestino !== false) {
    @unlink($destino . '.teste');
    $resultado = 'funcionou';
} else {
    $resultado = 'falhou';
}

    if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
        responder(false, 'Não foi possível salvar o PDF no servidor.', [], 500);
    }

    $caminho = 'documentos/' . $nomeArquivo;
}

// Sem documento cadastrado, é obrigatório enviar um PDF inicial.
if ($idDocumento === 0 && !$arquivoEnviado) {
    responder(false, 'Envie um PDF para cadastrar o primeiro documento.', [], 400);
}

// Atualiza a linha existente ou cria a primeira.
if ($idDocumento > 0) {
    $stmt = $mysqli->prepare(
        'UPDATE documentos_normas
         SET titulo = ?, ano_versao = ?, caminho_arquivo = ?,
             descricao = ?, provisoria = ?
         WHERE id = ?'
    );

    if (!$stmt) {
        error_log('Erro ao preparar atualização de normas: ' . $mysqli->error);
        responder(false, 'Erro interno ao preparar a atualização.', [], 500);
    }

    $stmt->bind_param(
        'sissii',
        $titulo,
        $ano,
        $caminho,
        $descricao,
        $provisoria,
        $idDocumento
    );
} else {
    $stmt = $mysqli->prepare(
        'INSERT INTO documentos_normas
         (titulo, ano_versao, caminho_arquivo, descricao, provisoria)
         VALUES (?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        error_log('Erro ao preparar cadastro de normas: ' . $mysqli->error);
        responder(false, 'Erro interno ao preparar o cadastro.', [], 500);
    }

    $stmt->bind_param(
        'sissi',
        $titulo,
        $ano,
        $caminho,
        $descricao,
        $provisoria
    );
}

if (!$stmt->execute()) {
    error_log('Erro ao salvar normas: ' . $stmt->error);
    $stmt->close();

    responder(false, 'Não foi possível salvar as alterações.', [], 500);
}

$stmt->close();

responder(true, 'Regimento Escolar atualizado com sucesso.', [
    'caminho_arquivo' => $caminho
]);

?>
