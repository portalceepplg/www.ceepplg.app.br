
<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/conexao.php';

$cursos = [];

$sqlCursos = $mysqli->query(
    "SELECT id_curso, nome
     FROM cursos
     WHERE ativo = 1
     ORDER BY id_curso"
);

if (!$sqlCursos) {
    error_log('Erro ao consultar cursos públicos: ' . $mysqli->error);
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar os cursos.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

while ($curso = $sqlCursos->fetch_assoc()) {
    $curso['id_curso'] = (int) $curso['id_curso'];
    $curso['disciplinas'] = [];
    $cursos[$curso['id_curso']] = $curso;
}

$sqlDisciplinas = $mysqli->query(
    "SELECT id_disciplina, id_curso, nome
     FROM disciplinas
     WHERE ativo = 1
     ORDER BY id_curso, id_disciplina"
);

if (!$sqlDisciplinas) {
    error_log('Erro ao consultar disciplinas públicas: ' . $mysqli->error);
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível carregar as disciplinas.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

while ($disciplina = $sqlDisciplinas->fetch_assoc()) {
    $idCurso = (int) $disciplina['id_curso'];

    if (isset($cursos[$idCurso])) {
        $cursos[$idCurso]['disciplinas'][] = [
            'id_disciplina' => (int) $disciplina['id_disciplina'],
            'nome' => $disciplina['nome']
        ];
    }
}

echo json_encode([
    'sucesso' => true,
    'cursos' => array_values($cursos)
], JSON_UNESCAPED_UNICODE);

$mysqli->close();
?>
