<?php

require_once __DIR__ . '/sessao.php';

$alunoAutenticado = (
    !empty($_SESSION['ldap_autenticado']) &&
    !empty($_SESSION['ldap_matricula'])
);

$gestorAutenticado = (
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada'])
);

if (!$alunoAutenticado && !$gestorAutenticado) {
    http_response_code(401);
    exit('Acesso não autorizado.');
}

$idGrade = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$idGrade || $idGrade < 1) {
    http_response_code(400);
    exit('Grade curricular inválida.');
}

require_once __DIR__ . '/conexao.php';

$sql = "
    SELECT titulo, arquivo_pdf
    FROM grades_curriculares
    WHERE id_grade = ?
    LIMIT 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    exit('Não foi possível preparar a consulta.');
}

$stmt->bind_param('i', $idGrade);

if (!$stmt->execute()) {
    $stmt->close();
    http_response_code(500);
    exit('Não foi possível consultar a grade.');
}

$stmt->store_result();
$stmt->bind_result($titulo, $pdf);

if (!$stmt->fetch()) {
    $stmt->close();
    http_response_code(404);
    exit('Grade curricular não encontrada.');
}

$stmt->close();
$mysqli->close();

if (empty($pdf)) {
    http_response_code(404);
    exit('O PDF não está disponível.');
}

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="grade-curricular.pdf"');
header('Content-Length: ' . strlen($pdf));
header('Cache-Control: private, no-store, no-cache, must-revalidate');

echo $pdf;
exit;