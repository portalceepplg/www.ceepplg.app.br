
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

// Identifica o tipo de acesso.
$professorAutenticado =
    !empty($_SESSION['professor_autenticado']) &&
    !empty($_SESSION['id_professor']);

$gestaoAutorizada =
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada']);

// Bloqueia acessos sem autenticação válida.
if (!$professorAutenticado && !$gestaoAutorizada) {
    responder(false, 'Acesso não autorizado.', [], 401);
}

// A Gestão precisa informar qual professor deseja consultar.
if ($gestaoAutorizada && !$professorAutenticado) {
    $idProfessor = filter_input(INPUT_GET, 'id_professor', FILTER_VALIDATE_INT);

    if (!$idProfessor || $idProfessor <= 0) {
        responder(false, 'Identificação do professor não informada.', [], 400);
    }
} else {
    $idProfessor = (int) $_SESSION['id_professor'];
}

require_once __DIR__ . '/conexao.php';

$sql = "
    SELECT
        p.nome,
        ap.matricula,
        a.nome_area,
        GROUP_CONCAT(
            DISTINCT d.nome_disciplina
            ORDER BY d.nome_disciplina
            SEPARATOR ', '
        ) AS disciplinas
    FROM professores p
    LEFT JOIN acessos_professores ap
        ON ap.id_professor = p.id_professor
    LEFT JOIN areas_docentes a
        ON a.id_area = p.id_area
    LEFT JOIN disciplinas_docentes d
        ON d.id_professor = p.id_professor
    WHERE p.id_professor = ?
    GROUP BY
        p.id_professor,
        p.nome,
        ap.matricula,
        a.nome_area
    LIMIT 1
";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error_log('Erro ao preparar perfil do professor: ' . $mysqli->error);
    responder(false, 'Não foi possível consultar o perfil.', [], 500);
}

$stmt->bind_param('i', $idProfessor);
$stmt->execute();

$resultado = $stmt->get_result();
$professor = $resultado->fetch_assoc();

$stmt->close();

if (!$professor) {
    responder(false, 'Dados do professor não encontrados.', [], 404);
}

responder(true, 'Perfil carregado com sucesso.', [
    'professor' => [
        'nome' => $professor['nome'],
        'matricula' => $professor['matricula'] ?? '',
        'area' => $professor['nome_area'] ?? 'Não informada',
        'disciplinas' => $professor['disciplinas'] ?? 'Não informadas'
    ]
]);
