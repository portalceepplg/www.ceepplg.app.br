
<?php
session_start();

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

// Protege todas as operações com a sessão administrativa.
if (
    empty($_SESSION['gestao_autorizada']) ||
    empty($_SESSION['id_admin'])
) {
    responder(
        false,
        'Acesso não autorizado. Entre novamente na Área da Gestão.',
        [],
        401
    );
}

require_once __DIR__ . '/conexao.php';

$metodo = $_SERVER['REQUEST_METHOD'];

// GET: carregar cursos e disciplinas ativas.
if ($metodo === 'GET') {
    $cursos = [];
    $disciplinas = [];

    $resultadoCursos = $mysqli->query(
        "SELECT id_curso, nome
         FROM cursos
         WHERE ativo = 1
         ORDER BY nome"
    );

    if (!$resultadoCursos) {
        error_log('Erro ao consultar cursos: ' . $mysqli->error);
        responder(false, 'Não foi possível consultar os cursos.', [], 500);
    }

    while ($linha = $resultadoCursos->fetch_assoc()) {
        $cursos[] = [
            'id_curso' => (int) $linha['id_curso'],
            'nome' => $linha['nome']
        ];
    }

    $resultadoDisciplinas = $mysqli->query(
        "SELECT
            d.id_disciplina,
            d.id_curso,
            d.nome,
            c.nome AS curso
         FROM disciplinas d
         INNER JOIN cursos c ON c.id_curso = d.id_curso
         WHERE d.ativo = 1
           AND c.ativo = 1
         ORDER BY c.nome, d.nome"
    );

    if (!$resultadoDisciplinas) {
        error_log('Erro ao consultar disciplinas: ' . $mysqli->error);
        responder(
            false,
            'Não foi possível consultar as disciplinas.',
            [],
            500
        );
    }

    while ($linha = $resultadoDisciplinas->fetch_assoc()) {
        $disciplinas[] = [
            'id_disciplina' => (int) $linha['id_disciplina'],
            'id_curso' => (int) $linha['id_curso'],
            'nome' => $linha['nome'],
            'curso' => $linha['curso']
        ];
    }

    responder(true, 'Dados carregados.', [
        'cursos' => $cursos,
        'disciplinas' => $disciplinas
    ]);
}

// As demais operações precisam ser POST.
if ($metodo !== 'POST') {
    responder(false, 'Método não permitido.', [], 405);
}

$acao = trim($_POST['acao'] ?? '');
$idDisciplina = filter_var(
    $_POST['id_disciplina'] ?? null,
    FILTER_VALIDATE_INT
);

// DESATIVAR: mantém o registro no banco.
if ($acao === 'desativar') {
    if (!$idDisciplina || $idDisciplina < 1) {
        responder(false, 'Identificador de disciplina inválido.', [], 400);
    }

    $stmt = $mysqli->prepare(
        'UPDATE disciplinas
         SET ativo = 0
         WHERE id_disciplina = ? AND ativo = 1'
    );

    if (!$stmt) {
        error_log('Erro ao preparar desativação: ' . $mysqli->error);
        responder(false, 'Erro interno ao desativar a disciplina.', [], 500);
    }

    $stmt->bind_param('i', $idDisciplina);
    $executou = $stmt->execute();
    $alteradas = $stmt->affected_rows;
    $stmt->close();

    if (!$executou) {
        responder(false, 'Não foi possível desativar a disciplina.', [], 500);
    }

    if ($alteradas === 0) {
        responder(
            false,
            'Disciplina não encontrada ou já desativada.',
            [],
            404
        );
    }

    responder(true, 'Disciplina desativada com sucesso.');
}

// EXCLUIR: remove definitivamente o registro do banco.
if ($acao === 'excluir') {
    if (!$idDisciplina || $idDisciplina < 1) {
        responder(
            false,
            'Identificador de disciplina inválido.',
            [],
            400
        );
    }

    $stmt = $mysqli->prepare(
        'DELETE FROM disciplinas WHERE id_disciplina = ?'
    );

    if (!$stmt) {
        error_log('Erro ao preparar exclusão: ' . $mysqli->error);
        responder(
            false,
            'Erro interno ao preparar a exclusão da disciplina.',
            [],
            500
        );
    }

    $stmt->bind_param('i', $idDisciplina);
    $executou = $stmt->execute();
    $excluidas = $stmt->affected_rows;
    $erro = $stmt->error;
    $stmt->close();

    if (!$executou) {
        error_log('Erro ao excluir disciplina: ' . $erro);

        responder(
            false,
            'Não foi possível excluir a disciplina. Verifique se existem registros vinculados a ela.',
            [],
            409
        );
    }

    if ($excluidas === 0) {
        responder(
            false,
            'Disciplina não encontrada.',
            [],
            404
        );
    }

    responder(true, 'Disciplina excluída definitivamente com sucesso.');
}

// CADASTRAR ou EDITAR.
if (!in_array($acao, ['cadastrar', 'editar'], true)) {
    responder(false, 'Ação inválida.', [], 400);
}

$nome = trim($_POST['nome'] ?? '');
$idCurso = filter_var(
    $_POST['id_curso'] ?? null,
    FILTER_VALIDATE_INT
);

if ($nome === '' || mb_strlen($nome, 'UTF-8') > 150) {
    responder(
        false,
        'Informe um nome de disciplina com até 150 caracteres.',
        [],
        400
    );
}

if (!$idCurso || $idCurso < 1) {
    responder(false, 'Selecione um curso válido.', [], 400);
}

if ($acao === 'editar' && (!$idDisciplina || $idDisciplina < 1)) {
    responder(false, 'Identificador de disciplina inválido.', [], 400);
}



// Confirma que o curso existe e está ativo.
$stmt = $mysqli->prepare(
    'SELECT id_curso FROM cursos WHERE id_curso = ? AND ativo = 1 LIMIT 1'
);

if (!$stmt) {
    error_log('Erro ao verificar curso: ' . $mysqli->error);
    responder(false, 'Erro interno ao validar o curso.', [], 500);
}

$stmt->bind_param('i', $idCurso);
$stmt->execute();
$cursoExiste = $stmt->get_result()->num_rows > 0;
$stmt->close();

if (!$cursoExiste) {
    responder(false, 'O curso selecionado não existe ou está inativo.', [], 400);
}

// Impede disciplinas ativas com o mesmo nome no mesmo curso.
$idExcluir = $acao === 'editar' ? $idDisciplina : 0;

$stmt = $mysqli->prepare(
    'SELECT id_disciplina
     FROM disciplinas
     WHERE id_curso = ?
       AND nome = ?
       AND ativo = 1
       AND id_disciplina <> ?
     LIMIT 1'
);

if (!$stmt) {
    error_log('Erro ao verificar duplicidade: ' . $mysqli->error);
    responder(false, 'Erro interno ao validar a disciplina.', [], 500);
}

$stmt->bind_param('isi', $idCurso, $nome, $idExcluir);
$stmt->execute();
$duplicada = $stmt->get_result()->num_rows > 0;
$stmt->close();

if ($duplicada) {
    responder(
        false,
        'Já existe uma disciplina ativa com esse nome neste curso.',
        [],
        409
    );
}

if ($acao === 'cadastrar') {
    $stmt = $mysqli->prepare(
        'INSERT INTO disciplinas (id_curso, nome, ativo)
         VALUES (?, ?, 1)'
    );

    if (!$stmt) {
        error_log('Erro ao preparar cadastro: ' . $mysqli->error);
        responder(false, 'Erro interno ao cadastrar a disciplina.', [], 500);
    }

    $stmt->bind_param('is', $idCurso, $nome);
    $executou = $stmt->execute();
    $stmt->close();

    if (!$executou) {
        responder(false, 'Não foi possível cadastrar a disciplina.', [], 500);
    }

    responder(true, 'Disciplina cadastrada com sucesso.');
}

// Atualiza somente uma disciplina que ainda está ativa.
$stmt = $mysqli->prepare(
    'UPDATE disciplinas
     SET id_curso = ?, nome = ?
     WHERE id_disciplina = ? AND ativo = 1'
);

if (!$stmt) {
    error_log('Erro ao preparar edição: ' . $mysqli->error);
    responder(false, 'Erro interno ao editar a disciplina.', [], 500);
}

$stmt->bind_param('isi', $idCurso, $nome, $idDisciplina);
$executou = $stmt->execute();
$alteradas = $stmt->affected_rows;
$stmt->close();

if (!$executou) {
    responder(false, 'Não foi possível editar a disciplina.', [], 500);
}

// affected_rows pode ser zero quando os dados não mudaram.
$stmt = $mysqli->prepare(
    'SELECT id_disciplina
     FROM disciplinas
     WHERE id_disciplina = ? AND ativo = 1
     LIMIT 1'
);

if (!$stmt) {
    responder(false, 'Não foi possível confirmar a edição.', [], 500);
}

$stmt->bind_param('i', $idDisciplina);
$stmt->execute();
$existe = $stmt->get_result()->num_rows > 0;
$stmt->close();

if (!$existe) {
    responder(false, 'Disciplina não encontrada ou inativa.', [], 404);
}

responder(true, 'Disciplina atualizada com sucesso.');
?>
