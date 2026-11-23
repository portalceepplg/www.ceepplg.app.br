
<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

function responder($sucesso, $mensagem, $dados = []) {
    echo json_encode(
        array_merge([
            'sucesso' => $sucesso,
            'mensagem' => $mensagem
        ], $dados),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    http_response_code(401);
    responder(false, 'Sessão administrativa inválida. Entre novamente.');
}

require_once __DIR__ . '/conexao.php';

$mysqli->set_charset('utf8mb4');

$diretorio = __DIR__ . '/../uploads/infraestrutura';
$caminhoRelativo = 'uploads/infraestrutura/';

$novasImagensCriadas = [];

if (!is_dir($diretorio)) {
    if (!mkdir($diretorio, 0755, true) && !is_dir($diretorio)) {
        http_response_code(500);
        responder(false, 'Não foi possível preparar a pasta de imagens.');
    }
}

function obterAmbiente($mysqli, $id) {
    $stmt = $mysqli->prepare(
        'SELECT id_local, nome, descricao, imagem, imagem2, ativo
         FROM infraestrutura
         WHERE id_local = ?'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();

    $resultado = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $resultado ?: null;
}

function apagarImagemAntiga($imagem) {
    if (!$imagem) {
        return;
    }

    if (!preg_match(
        '#^uploads/infraestrutura/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$#i',
        $imagem
    )) {
        return;
    }

    $arquivo = __DIR__ . '/../' . $imagem;

    if (is_file($arquivo)) {
        @unlink($arquivo);
    }
}

function receberImagem($campo, $diretorio, $caminhoRelativo) {
    if (
        !isset($_FILES[$campo]) ||
        $_FILES[$campo]['error'] === UPLOAD_ERR_NO_FILE
    ) {
        return null;
    }

    $arquivo = $_FILES[$campo];

    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Falha no envio da imagem.');
    }

    if ($arquivo['size'] > 5 * 1024 * 1024) {
        throw new RuntimeException('Cada imagem deve ter no máximo 5 MB.');
    }

    if (!is_uploaded_file($arquivo['tmp_name'])) {
        throw new RuntimeException('Arquivo enviado inválido.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($arquivo['tmp_name']);

    $formatos = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif'
    ];

    if (!isset($formatos[$mime])) {
        throw new RuntimeException(
            'Formato inválido. Envie JPG, PNG, WEBP ou GIF.'
        );
    }

    if (@getimagesize($arquivo['tmp_name']) === false) {
        throw new RuntimeException('O arquivo não é uma imagem válida.');
    }

    $nomeArquivo = bin2hex(random_bytes(16))
        . '.'
        . $formatos[$mime];

    $destino = $diretorio . '/' . $nomeArquivo;

    if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
        throw new RuntimeException('Não foi possível salvar a imagem.');
    }

    $caminho = $caminhoRelativo . $nomeArquivo;

    return $caminho;
}

try {

    // LISTAR AMBIENTES
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $resultado = $mysqli->query(
            'SELECT id_local, nome, descricao, imagem, imagem2, ativo
             FROM infraestrutura
             ORDER BY id_local DESC'
        );

        $ambientes = [];

        while ($linha = $resultado->fetch_assoc()) {
            $linha['ativo'] = (int) $linha['ativo'];
            $ambientes[] = $linha;
        }

        responder(true, 'Ambientes carregados.', [
            'ambientes' => $ambientes
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        responder(false, 'Método não permitido.');
    }

    $acao = $_POST['acao'] ?? '';

    // CADASTRAR OU EDITAR
    if (in_array($acao, ['cadastrar', 'editar'], true)) {

        $id = filter_var(
            $_POST['id_local'] ?? null,
            FILTER_VALIDATE_INT
        );

        $nome = trim($_POST['nome'] ?? '');
        $descricao = trim($_POST['descricao'] ?? '');

        if ($nome === '' || mb_strlen($nome) > 150) {
            responder(false, 'Informe um nome válido de até 150 caracteres.');
        }

        $ambienteAtual = null;

        if ($acao === 'editar') {
            if (!$id || $id < 1) {
                responder(false, 'Identificador do ambiente inválido.');
            }

            $ambienteAtual = obterAmbiente($mysqli, $id);

            if (!$ambienteAtual) {
                responder(false, 'Ambiente não encontrado.');
            }
        }

        // Recebe as duas imagens, caso tenham sido enviadas.
        $novaImagem = receberImagem(
            'imagem',
            $diretorio,
            $caminhoRelativo
        );

        if ($novaImagem) {
            $novasImagensCriadas[] = $novaImagem;
        }

        $novaImagem2 = receberImagem(
            'imagem2',
            $diretorio,
            $caminhoRelativo
        );

        if ($novaImagem2) {
            $novasImagensCriadas[] = $novaImagem2;
        }

        // Mantém as imagens atuais quando não há novo envio.
        $imagem = $novaImagem
            ?? ($ambienteAtual['imagem'] ?? null);

        $imagem2 = $novaImagem2
            ?? ($ambienteAtual['imagem2'] ?? null);

        if ($acao === 'cadastrar') {

            $stmt = $mysqli->prepare(
                'INSERT INTO infraestrutura
                    (nome, descricao, imagem, imagem2, ativo)
                 VALUES (?, ?, ?, ?, 1)'
            );

            $stmt->bind_param(
                'ssss',
                $nome,
                $descricao,
                $imagem,
                $imagem2
            );

            $stmt->execute();
            $stmt->close();

            responder(true, 'Ambiente cadastrado com sucesso.');
        }

        $stmt = $mysqli->prepare(
            'UPDATE infraestrutura
             SET nome = ?, descricao = ?, imagem = ?, imagem2 = ?
             WHERE id_local = ?'
        );

        $stmt->bind_param(
            'ssssi',
            $nome,
            $descricao,
            $imagem,
            $imagem2,
            $id
        );

        $stmt->execute();
        $stmt->close();

        // Apaga somente as imagens que foram substituídas.
        if ($novaImagem && !empty($ambienteAtual['imagem'])) {
            apagarImagemAntiga($ambienteAtual['imagem']);
        }

        if ($novaImagem2 && !empty($ambienteAtual['imagem2'])) {
            apagarImagemAntiga($ambienteAtual['imagem2']);
        }

        responder(true, 'Ambiente atualizado com sucesso.');
    }

    // DESATIVAR, REATIVAR OU EXCLUIR
    if (in_array($acao, ['desativar', 'reativar', 'excluir'], true)) {

        $id = filter_var(
            $_POST['id_local'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            responder(false, 'Identificador do ambiente inválido.');
        }

        $ambiente = obterAmbiente($mysqli, $id);

        if (!$ambiente) {
            responder(false, 'Ambiente não encontrado.');
        }

        if ($acao === 'desativar' || $acao === 'reativar') {

            $ativo = $acao === 'reativar' ? 1 : 0;

            $stmt = $mysqli->prepare(
                'UPDATE infraestrutura
                 SET ativo = ?
                 WHERE id_local = ?'
            );

            $stmt->bind_param('ii', $ativo, $id);
            $stmt->execute();
            $stmt->close();

            responder(
                true,
                $ativo
                    ? 'Ambiente reativado com sucesso.'
                    : 'Ambiente desativado com sucesso.'
            );
        }

        // Exclusão definitiva do ambiente.
        $stmt = $mysqli->prepare(
            'DELETE FROM infraestrutura
             WHERE id_local = ?'
        );

        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        // Remove as duas imagens associadas ao ambiente.
        apagarImagemAntiga($ambiente['imagem'] ?? null);
        apagarImagemAntiga($ambiente['imagem2'] ?? null);

        responder(true, 'Ambiente excluído definitivamente.');
    }

    http_response_code(400);
    responder(false, 'Ação inválida.');

} catch (Throwable $erro) {

    // Remove arquivos recém-enviados caso o processamento falhe.
    foreach ($novasImagensCriadas as $imagemCriada) {
        apagarImagemAntiga($imagemCriada);
    }

    error_log('Infraestrutura: ' . $erro->getMessage());

    http_response_code(500);

    responder(
        false,
        $erro instanceof RuntimeException
            ? $erro->getMessage()
            : 'Erro interno ao processar a infraestrutura.'
    );
}
