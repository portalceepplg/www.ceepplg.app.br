
<?php

require_once __DIR__ . '/sessao.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function responder($sucesso, $mensagem, $status = 200, $dados = [])
{
    http_response_code($status);

    echo json_encode(array_merge([
        'sucesso' => $sucesso,
        'mensagem' => $mensagem
    ], $dados), JSON_UNESCAPED_UNICODE);

    exit;
}

// Proteção da Área da Gestão.
if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    responder(false, 'Acesso não autorizado.', 401);
}

// A listagem aceita somente GET.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(false, 'Método não permitido.', 405);
}

// Conexão com o banco.
require_once __DIR__ . '/conexao.php';

// Busca cada material uma única vez e reúne suas séries.
$sql = "
    SELECT
        g.id_grade,
        g.curso,
        g.titulo,
        g.data_cadastro,
        GROUP_CONCAT(
            gs.serie
            ORDER BY gs.serie
            SEPARATOR ','
        ) AS series
    FROM grades_curriculares g
    LEFT JOIN grades_curriculares_series gs
        ON gs.id_grade = g.id_grade
    GROUP BY
        g.id_grade,
        g.curso,
        g.titulo,
        g.data_cadastro
    ORDER BY
        g.curso,
        g.titulo
";

$resultado = $mysqli->query($sql);

if (!$resultado) {
    error_log(
        'Erro ao listar grades da Gestão: ' . $mysqli->error
    );

    $mysqli->close();

    responder(
        false,
        'Não foi possível carregar os materiais.',
        500
    );
}

$grades = [];

while ($linha = $resultado->fetch_assoc()) {

    $linha['series'] = $linha['series'] !== null
        ? array_map('intval', explode(',', $linha['series']))
        : [];

    $grades[] = $linha;
}

$resultado->free();
$mysqli->close();

responder(
    true,
    'Materiais carregados com sucesso.',
    200,
    ['grades' => $grades]
);

?>
