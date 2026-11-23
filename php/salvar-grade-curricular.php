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

// Proteção da Área da Gestão.
if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    responder(false, 'Acesso não autorizado.', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

// Dados do formulário.
$curso = $_POST['curso'] ?? '';
$series = $_POST['series'] ?? [];
$titulo = trim($_POST['titulo'] ?? '');
$idGrade = $_POST['id_grade'] ?? '';

if (
    !in_array($curso, ['informatica', 'redes'], true) ||
    !is_array($series) ||
    empty($series) ||
    $titulo === '' ||
    mb_strlen($titulo, 'UTF-8') > 150
) {
    responder(false, 'Preencha corretamente o curso, as séries e o título.', 400);
}

// Validação das séries.
$seriesValidas = [];

foreach ($series as $serie) {
    if (!is_string($serie) && !is_int($serie)) {
        responder(false, 'Uma ou mais séries selecionadas são inválidas.', 400);
    }

    $serie = (string) $serie;

    if (!in_array($serie, ['1', '2', '3'], true)) {
        responder(false, 'Uma ou mais séries selecionadas são inválidas.', 400);
    }

    $seriesValidas[] = (int) $serie;
}

$seriesValidas = array_values(array_unique($seriesValidas));

// Identificador opcional.
if ($idGrade !== '') {
    if (
        filter_var($idGrade, FILTER_VALIDATE_INT) === false ||
        (int) $idGrade <= 0
    ) {
        responder(false, 'Identificador do material inválido.', 400);
    }

    $idGrade = (int) $idGrade;
} else {
    $idGrade = null;
}

// Verifica o arquivo enviado.
if (
    !isset($_FILES['pdf']) ||
    $_FILES['pdf']['error'] !== UPLOAD_ERR_OK
) {
    responder(false, 'Selecione um PDF válido para enviar.', 400);
}

$arquivo = $_FILES['pdf'];

// Limite de 15 MB.
if (
    $arquivo['size'] <= 0 ||
    $arquivo['size'] > 15 * 1024 * 1024
) {
    responder(false, 'O PDF deve ter no máximo 15 MB.', 400);
}

if (!is_uploaded_file($arquivo['tmp_name'])) {
    responder(false, 'O arquivo enviado não é válido.', 400);
}

// Validação do tipo MIME.
$verificador = new finfo(FILEINFO_MIME_TYPE);
$tipo = $verificador->file($arquivo['tmp_name']);

if ($tipo !== 'application/pdf') {
    responder(false, 'O arquivo enviado não é um PDF válido.', 400);
}

// Lê o conteúdo do PDF.
$conteudoPdf = file_get_contents($arquivo['tmp_name']);

if ($conteudoPdf === false || $conteudoPdf === '') {
    responder(false, 'Não foi possível ler o PDF enviado.', 500);
}

// Conexão com o banco.
require_once __DIR__ . '/conexao.php';

$transacaoIniciada = false;

try {

    $mysqli->begin_transaction();
    $transacaoIniciada = true;

    if ($idGrade !== null) {

        // Verifica se o material existe.
        $verificar = $mysqli->prepare(
            "SELECT id_grade FROM grades_curriculares WHERE id_grade = ?"
        );

        if (!$verificar) {
            throw new Exception('Erro ao verificar o material.');
        }

        $verificar->bind_param('i', $idGrade);
        $verificar->execute();

        $resultado = $verificar->get_result();
        $existe = $resultado->num_rows > 0;

        $verificar->close();

        if (!$existe) {
            throw new Exception('MATERIAL_NAO_ENCONTRADO');
        }

        // Atualiza o material existente.
        $sql = "
            UPDATE grades_curriculares
            SET curso = ?, titulo = ?, arquivo_pdf = ?
            WHERE id_grade = ?
        ";

        $stmt = $mysqli->prepare($sql);

        if (!$stmt) {
            throw new Exception('Erro ao preparar atualização do material.');
        }

        $stmt->bind_param(
            'sssi',
            $curso,
            $titulo,
            $conteudoPdf,
            $idGrade
        );

        $stmt->execute();
        $stmt->close();

        // Remove os relacionamentos anteriores.
        $stmt = $mysqli->prepare(
            "DELETE FROM grades_curriculares_series WHERE id_grade = ?"
        );

        if (!$stmt) {
            throw new Exception('Erro ao atualizar as séries do material.');
        }

        $stmt->bind_param('i', $idGrade);
        $stmt->execute();
        $stmt->close();

        $mensagem = 'Material substituído com sucesso.';

    } else {

        // Cadastra um novo material.
        $sql = "
            INSERT INTO grades_curriculares
                (curso, titulo, arquivo_pdf)
            VALUES (?, ?, ?)
        ";

        $stmt = $mysqli->prepare($sql);

        if (!$stmt) {
            throw new Exception('Erro ao preparar cadastro do material.');
        }

        $stmt->bind_param(
            'sss',
            $curso,
            $titulo,
            $conteudoPdf
        );

        $stmt->execute();

        $idGrade = $mysqli->insert_id;

        $stmt->close();

        $mensagem = 'Material cadastrado com sucesso.';
    }

    // Registra todas as séries selecionadas.
    $stmt = $mysqli->prepare("
        INSERT INTO grades_curriculares_series (id_grade, serie)
        VALUES (?, ?)
    ");

    if (!$stmt) {
        throw new Exception('Erro ao preparar os relacionamentos das séries.');
    }

    foreach ($seriesValidas as $serieNumero) {
        $stmt->bind_param('ii', $idGrade, $serieNumero);
        $stmt->execute();
    }

    $stmt->close();

    $mysqli->commit();
    $transacaoIniciada = false;

    $mysqli->close();

    responder(true, $mensagem);

} catch (Throwable $erro) {

    if ($transacaoIniciada) {
        $mysqli->rollback();
    }

    error_log(
        'Erro ao salvar material: ' .
        $erro->getMessage()
    );

    $mysqli->close();

    if ($erro->getMessage() === 'MATERIAL_NAO_ENCONTRADO') {
        responder(false, 'Material não encontrado.', 404);
    }

    responder(
        false,
        'Não foi possível salvar o material no banco de dados.',
        500
    );
}

?>