
<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once __DIR__ . '/conexao.php';

$sql = "
    SELECT
        p.id_professor,
        p.nome,
        p.id_area,
        a.nome_area,
        GROUP_CONCAT(
            DISTINCT d.nome_disciplina
            ORDER BY d.nome_disciplina
            SEPARATOR ', '
        ) AS disciplinas
    FROM professores p
    INNER JOIN areas_docentes a
        ON a.id_area = p.id_area
    LEFT JOIN disciplinas_docentes d
        ON d.id_professor = p.id_professor
    WHERE p.ativo = 1
    GROUP BY
        p.id_professor,
        p.nome,
        p.id_area,
        a.nome_area
    ORDER BY
        a.id_area,
        p.nome
";

$resultado = $mysqli->query($sql);

if (!$resultado) {
    http_response_code(500);

    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Não foi possível consultar os professores.'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$professores = [];

while ($linha = $resultado->fetch_assoc()) {
    $professores[] = $linha;
}

echo json_encode([
    'sucesso' => true,
    'professores' => $professores
], JSON_UNESCAPED_UNICODE);

$mysqli->close();
