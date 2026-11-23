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

$diretorio = __DIR__ . '/../uploads/tccs';
$caminhoRelativo = 'uploads/tccs/';

if (!is_dir($diretorio)) {
    if (!mkdir($diretorio, 0755, true) && !is_dir($diretorio)) {
        http_response_code(500);
        responder(false, 'Não foi possível preparar a pasta das logos.');
    }
}

function obterSistema($mysqli, $id) {
    $stmt = $mysqli->prepare(
        'SELECT id_tcc, titulo, descricao, endereco, logo, ativo
         FROM sistemas_tcc
         WHERE id_tcc = ?'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $sistema = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $sistema ?: null;
}

function apagarLogoAntiga($logo) {
    if (!$logo || !preg_match(
        '#^uploads/tccs/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$#i',
        $logo
    )) {
        return;
    }

    $arquivo = __DIR__ . '/../' . $logo;

    if (is_file($arquivo)) {
        @unlink($arquivo);
    }
}

function receberLogo($diretorio, $caminhoRelativo) {
    if (
        !isset($_FILES['logo']) ||
        $_FILES['logo']['error'] === UPLOAD_ERR_NO_FILE
    ) {
        return null;
    }

    $arquivo = $_FILES['logo'];

    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Falha no envio da logo.');
    }

    if ($arquivo['size'] > 5 * 1024 * 1024) {
        throw new RuntimeException('A logo deve ter no máximo 5 MB.');
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
        throw new RuntimeException('Envie uma logo JPG, PNG, WEBP ou GIF.');
    }

    if (@getimagesize($arquivo['tmp_name']) === false) {
        throw new RuntimeException('O arquivo não é uma imagem válida.');
    }

    $nome = bin2hex(random_bytes(16)) . '.' . $formatos[$mime];
    $destino = $diretorio . '/' . $nome;

    if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
        throw new RuntimeException('Não foi possível salvar a logo.');
    }

    return $caminhoRelativo . $nome;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $resultado = $mysqli->query(
            'SELECT id_tcc, titulo, descricao, endereco, logo, ativo
             FROM sistemas_tcc
             ORDER BY id_tcc DESC'
        );

        $sistemas = [];

        while ($linha = $resultado->fetch_assoc()) {
            $linha['ativo'] = (int) $linha['ativo'];
            $sistemas[] = $linha;
        }

        responder(true, 'Sistemas carregados.', [
            'sistemas' => $sistemas
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        responder(false, 'Método não permitido.');
    }

    $acao = $_POST['acao'] ?? '';

    if (in_array($acao, ['cadastrar', 'editar'], true)) {
        $id = filter_var($_POST['id_tcc'] ?? null, FILTER_VALIDATE_INT);
        $titulo = trim($_POST['titulo'] ?? '');
        $descricao = trim($_POST['descricao'] ?? '');
        $endereco = trim($_POST['endereco'] ?? '');

        if ($titulo === '' || mb_strlen($titulo) > 150) {
            responder(false, 'Informe um título de até 150 caracteres.');
        }

        if ($endereco === '' || mb_strlen($endereco) > 2048) {
            responder(false, 'Informe um endereço válido.');
        }

        if (!filter_var($endereco, FILTER_VALIDATE_URL)) {
            responder(false, 'O endereço precisa incluir http:// ou https://.');
        }

        $sistemaAtual = null;

        if ($acao === 'editar') {
            if (!$id || $id < 1) {
                responder(false, 'Identificador do sistema inválido.');
            }

            $sistemaAtual = obterSistema($mysqli, $id);

            if (!$sistemaAtual) {
                responder(false, 'Sistema não encontrado.');
            }
        }

        $novaLogo = receberLogo($diretorio, $caminhoRelativo);
        $logo = $novaLogo ?? ($sistemaAtual['logo'] ?? null);

        if ($acao === 'cadastrar') {
            $stmt = $mysqli->prepare(
                'INSERT INTO sistemas_tcc
                    (titulo, descricao, endereco, logo, ativo)
                 VALUES (?, ?, ?, ?, 1)'
            );
            $stmt->bind_param('ssss', $titulo, $descricao, $endereco, $logo);
            $stmt->execute();
            $stmt->close();

            responder(true, 'Sistema cadastrado com sucesso.');
        }

        $stmt = $mysqli->prepare(
            'UPDATE sistemas_tcc
             SET titulo = ?, descricao = ?, endereco = ?, logo = ?
             WHERE id_tcc = ?'
        );
        $stmt->bind_param(
            'ssssi',
            $titulo,
            $descricao,
            $endereco,
            $logo,
            $id
        );
        $stmt->execute();
        $stmt->close();

        if ($novaLogo && !empty($sistemaAtual['logo'])) {
            apagarLogoAntiga($sistemaAtual['logo']);
        }

        responder(true, 'Sistema atualizado com sucesso.');
    }

    if (in_array($acao, ['desativar', 'reativar', 'excluir'], true)) {
        $id = filter_var($_POST['id_tcc'] ?? null, FILTER_VALIDATE_INT);

        if (!$id || $id < 1) {
            responder(false, 'Identificador do sistema inválido.');
        }

        $sistema = obterSistema($mysqli, $id);

        if (!$sistema) {
            responder(false, 'Sistema não encontrado.');
        }

        if ($acao === 'desativar' || $acao === 'reativar') {
            $ativo = $acao === 'reativar' ? 1 : 0;

            $stmt = $mysqli->prepare(
                'UPDATE sistemas_tcc SET ativo = ? WHERE id_tcc = ?'
            );
            $stmt->bind_param('ii', $ativo, $id);
            $stmt->execute();
            $stmt->close();

            responder(
                true,
                $ativo ? 'Sistema reativado.' : 'Sistema desativado.'
            );
        }

        $stmt = $mysqli->prepare(
            'DELETE FROM sistemas_tcc WHERE id_tcc = ?'
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        apagarLogoAntiga($sistema['logo'] ?? null);
        responder(true, 'Sistema excluído definitivamente.');
    }

    http_response_code(400);
    responder(false, 'Ação inválida.');

} catch (Throwable $erro) {
    error_log('Sistemas TCC: ' . $erro->getMessage());

    http_response_code(500);
    responder(
        false,
        $erro instanceof RuntimeException
            ? $erro->getMessage()
            : 'Erro interno ao processar os sistemas.'
    );
}