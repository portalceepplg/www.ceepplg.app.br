
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

// Permite somente POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

// Valida o identificador.
$idGrade = filter_input(INPUT_POST, 'id_grade', FILTER_VALIDATE_INT);

if (!$idGrade || $idGrade <= 0) {
    responder(false, 'Identificador da grade inválido.', 400);
}

// Conexão com o banco.
require_once __DIR__ . '/conexao.php';

// Exclui a grade e o PDF armazenado no campo arquivo_pdf.
$sql = "
    DELETE FROM grades_curriculares
    WHERE id_grade = ?
    LIMIT 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error_log('Erro ao preparar exclusão da grade: ' . $mysqli->error);
    responder(false, 'Não foi possível preparar a exclusão.', 500);
}

$stmt->bind_param('i', $idGrade);

try {
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        $stmt->close();
        $mysqli->close();

        responder(false, 'Grade curricular não encontrada.', 404);
    }

} catch (mysqli_sql_exception $erro) {
    error_log(
        'Erro ao excluir grade curricular: ' .
        $erro->getMessage()
    );

    $stmt->close();
    $mysqli->close();

    responder(false, 'Não foi possível excluir a grade curricular.', 500);
}

$stmt->close();
$mysqli->close();

responder(true, 'Grade curricular excluída com sucesso.');

?>
