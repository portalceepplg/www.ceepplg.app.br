
<?php

require_once __DIR__ . '/sessao.php';

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

// Permite acesso a estudantes autenticados ou à Gestão autorizada.
$estudanteAutenticado =
    !empty($_SESSION['ldap_autenticado']) &&
    !empty($_SESSION['ldap_matricula']);

$gestaoAutorizada =
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada']);

if (!$estudanteAutenticado && !$gestaoAutorizada) {
    responder(false, 'Acesso não autorizado.', [], 401);
}

$curso = $_GET['curso'] ?? '';

if (!in_array($curso, ['informatica', 'redes'], true)) {
    responder(false, 'Curso inválido.', [], 400);
}

require_once __DIR__ . '/conexao.php';

// Consulta as séries na tabela de relacionamento.
$sql = "
    SELECT
        g.id_grade,
        gs.serie,
        g.titulo
    FROM grades_curriculares AS g
    INNER JOIN grades_curriculares_series AS gs
        ON gs.id_grade = g.id_grade
    WHERE g.curso = ?
    ORDER BY gs.serie, g.titulo
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error_log('Erro ao preparar consulta de grades: ' . $mysqli->error);
    responder(false, 'Não foi possível consultar as grades.', [], 500);
}

$stmt->bind_param('s', $curso);

if (!$stmt->execute()) {
    error_log('Erro ao consultar grades: ' . $stmt->error);
    $stmt->close();

    responder(false, 'Não foi possível consultar as grades.', [], 500);
}

$stmt->bind_result($idGrade, $serie, $titulo);

$grades = [];

while ($stmt->fetch()) {
    $grades[] = [
        'id_grade' => (int) $idGrade,
        'serie' => (int) $serie,
        'titulo' => $titulo
    ];
}

$stmt->close();
$mysqli->close();

responder(true, 'Consulta realizada.', [
    'grades' => $grades
]);
