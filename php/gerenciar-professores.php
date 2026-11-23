
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

// Proteção da Área da Gestão.
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

// =====================================================
// GET: LISTAR ÁREAS E TODOS OS PROFESSORES
// =====================================================

if ($metodo === 'GET') {
    $areas = [];
    $professores = [];

    $resultadoAreas = $mysqli->query(
        'SELECT id_area, nome_area
         FROM areas_docentes
         ORDER BY id_area'
    );

    if (!$resultadoAreas) {
        error_log('Erro ao consultar áreas: ' . $mysqli->error);

        responder(
            false,
            'Não foi possível consultar as áreas.',
            [],
            500
        );
    }

    while ($linha = $resultadoAreas->fetch_assoc()) {
        $areas[] = [
            'id_area' => (int) $linha['id_area'],
            'nome_area' => $linha['nome_area']
        ];
    }

    $resultadoProfessores = $mysqli->query(
        "SELECT
            p.id_professor,
            p.nome,
            p.id_area,
            p.ativo,
            a.nome_area,
            GROUP_CONCAT(
                DISTINCT d.nome_disciplina
                ORDER BY d.nome_disciplina
                SEPARATOR ', '
            ) AS disciplinas
         FROM professores p
         LEFT JOIN areas_docentes a
            ON a.id_area = p.id_area
         LEFT JOIN disciplinas_docentes d
            ON d.id_professor = p.id_professor
         GROUP BY
            p.id_professor,
            p.nome,
            p.id_area,
            p.ativo,
            a.nome_area
         ORDER BY
            a.id_area,
            p.nome"
    );

    if (!$resultadoProfessores) {
        error_log(
            'Erro ao consultar professores: ' . $mysqli->error
        );

        responder(
            false,
            'Não foi possível consultar os professores.',
            [],
            500
        );
    }

    while ($linha = $resultadoProfessores->fetch_assoc()) {
        $professores[] = [
            'id_professor' => (int) $linha['id_professor'],
            'nome' => $linha['nome'],
            'id_area' => (int) $linha['id_area'],
            'ativo' => (int) $linha['ativo'],
            'nome_area' => $linha['nome_area'] ?? '',
            'disciplinas' => $linha['disciplinas'] ?? ''
        ];
    }

    responder(true, 'Dados carregados.', [
        'areas' => $areas,
        'professores' => $professores
    ]);
}

// =====================================================
// SOMENTE POST PODE ALTERAR OS REGISTROS
// =====================================================

if ($metodo !== 'POST') {
    responder(false, 'Método não permitido.', [], 405);
}

$acao = trim($_POST['acao'] ?? '');

$idProfessor = filter_var(
    $_POST['id_professor'] ?? null,
    FILTER_VALIDATE_INT
);

// =====================================================
// DESATIVAR PROFESSOR
// =====================================================

if ($acao === 'desativar') {
    if (!$idProfessor || $idProfessor < 1) {
        responder(
            false,
            'Identificador de professor inválido.',
            [],
            400
        );
    }

    $stmt = $mysqli->prepare(
        'UPDATE professores
         SET ativo = 0
         WHERE id_professor = ? AND ativo = 1'
    );

    if (!$stmt) {
        error_log('Erro ao preparar desativação: ' . $mysqli->error);

        responder(
            false,
            'Erro interno ao desativar o professor.',
            [],
            500
        );
    }

    $stmt->bind_param('i', $idProfessor);
    $executou = $stmt->execute();
    $alteracoes = $stmt->affected_rows;
    $stmt->close();

    if (!$executou) {
        responder(
            false,
            'Não foi possível desativar o professor.',
            [],
            500
        );
    }

    if ($alteracoes === 0) {
        responder(
            false,
            'Professor não encontrado ou já inativo.',
            [],
            404
        );
    }

    responder(true, 'Professor desativado com sucesso.');
}

// =====================================================
// REATIVAR PROFESSOR
// =====================================================

if ($acao === 'reativar') {
    if (!$idProfessor || $idProfessor < 1) {
        responder(
            false,
            'Identificador de professor inválido.',
            [],
            400
        );
    }

    $stmt = $mysqli->prepare(
        'UPDATE professores
         SET ativo = 1
         WHERE id_professor = ? AND ativo = 0'
    );

    if (!$stmt) {
        error_log('Erro ao preparar reativação: ' . $mysqli->error);

        responder(
            false,
            'Erro interno ao reativar o professor.',
            [],
            500
        );
    }

    $stmt->bind_param('i', $idProfessor);
    $executou = $stmt->execute();
    $alteracoes = $stmt->affected_rows;
    $stmt->close();

    if (!$executou) {
        responder(
            false,
            'Não foi possível reativar o professor.',
            [],
            500
        );
    }

    if ($alteracoes === 0) {
        responder(
            false,
            'Professor não encontrado ou já ativo.',
            [],
            404
        );
    }

    responder(true, 'Professor reativado com sucesso.');
}


// =====================================================
// EXCLUIR PROFESSOR DEFINITIVAMENTE
// =====================================================

if ($acao === 'excluir') {
    if (!$idProfessor || $idProfessor < 1) {
        responder(
            false,
            'Identificador de professor inválido.',
            [],
            400
        );
    }

    try {
        $mysqli->begin_transaction();

        // Verificar se o professor existe.
        $stmt = $mysqli->prepare(
            'SELECT id_professor
             FROM professores
             WHERE id_professor = ?
             LIMIT 1'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível verificar o professor.'
            );
        }

        $stmt->bind_param('i', $idProfessor);
        $stmt->execute();

        $professorExiste = $stmt->get_result()->num_rows > 0;
        $stmt->close();

        if (!$professorExiste) {
            throw new Exception('Professor não encontrado.');
        }

        // Excluir disciplinas associadas.
        $stmt = $mysqli->prepare(
            'DELETE FROM disciplinas_docentes
             WHERE id_professor = ?'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível preparar a exclusão das disciplinas.'
            );
        }

        $stmt->bind_param('i', $idProfessor);

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível excluir as disciplinas associadas.'
            );
        }

        $stmt->close();

        // Excluir professor, ativo ou inativo.
        $stmt = $mysqli->prepare(
            'DELETE FROM professores
             WHERE id_professor = ?'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível preparar a exclusão do professor.'
            );
        }

        $stmt->bind_param('i', $idProfessor);

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível excluir o professor.'
            );
        }

        $excluido = $stmt->affected_rows;
        $stmt->close();

        if ($excluido === 0) {
            throw new Exception(
                'Não foi possível localizar o professor para exclusão.'
            );
        }

        $mysqli->commit();

        responder(
            true,
            'Professor excluído definitivamente.'
        );

    } catch (Throwable $erro) {
        $mysqli->rollback();

        error_log(
            'Erro ao excluir professor: ' . $erro->getMessage()
        );

        responder(
            false,
            $erro->getMessage(),
            [],
            400
        );
    }
}


// =====================================================
// CADASTRAR OU EDITAR
// =====================================================

if (!in_array($acao, ['cadastrar', 'editar'], true)) {
    responder(false, 'Ação inválida.', [], 400);
}

$nome = trim($_POST['nome'] ?? '');

$idArea = filter_var(
    $_POST['id_area'] ?? null,
    FILTER_VALIDATE_INT
);

$textoDisciplinas = trim($_POST['disciplinas'] ?? '');

if ($nome === '' || mb_strlen($nome, 'UTF-8') > 150) {
    responder(
        false,
        'Informe o nome do professor, com até 150 caracteres.',
        [],
        400
    );
}

if (!$idArea || $idArea < 1) {
    responder(
        false,
        'Selecione uma área válida.',
        [],
        400
    );
}

if ($acao === 'editar' && (!$idProfessor || $idProfessor < 1)) {
    responder(
        false,
        'Identificador de professor inválido.',
        [],
        400
    );
}

// Disciplinas separadas por vírgulas.
$disciplinas = array_values(array_unique(array_filter(
    array_map('trim', explode(',', $textoDisciplinas)),
    function ($disciplina) {
        return $disciplina !== '';
    }
)));

if (count($disciplinas) === 0) {
    responder(
        false,
        'Informe pelo menos uma disciplina.',
        [],
        400
    );
}

foreach ($disciplinas as $disciplina) {
    if (mb_strlen($disciplina, 'UTF-8') > 100) {
        responder(
            false,
            'Cada disciplina deve ter até 100 caracteres.',
            [],
            400
        );
    }
}

// Confirmar que a área existe.
$stmt = $mysqli->prepare(
    'SELECT id_area
     FROM areas_docentes
     WHERE id_area = ?
     LIMIT 1'
);

if (!$stmt) {
    responder(
        false,
        'Erro interno ao validar a área.',
        [],
        500
    );
}

$stmt->bind_param('i', $idArea);
$stmt->execute();
$areaExiste = $stmt->get_result()->num_rows > 0;
$stmt->close();

if (!$areaExiste) {
    responder(
        false,
        'A área selecionada não existe.',
        [],
        400
    );
}

try {
    $mysqli->begin_transaction();

    if ($acao === 'cadastrar') {
        $stmt = $mysqli->prepare(
            'INSERT INTO professores (nome, ativo, id_area)
             VALUES (?, 1, ?)'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível preparar o cadastro.'
            );
        }

        $stmt->bind_param('si', $nome, $idArea);

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível cadastrar o professor.'
            );
        }

        $idProfessor = (int) $mysqli->insert_id;
        $stmt->close();

           } else {
        $stmt = $mysqli->prepare(
            'UPDATE professores
             SET nome = ?, id_area = ?
             WHERE id_professor = ?'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível preparar a edição.'
            );
        }

        $stmt->bind_param(
            'sii',
            $nome,
            $idArea,
            $idProfessor
        );

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível editar o professor.'
            );
        }

        $stmt->close();

        $stmt = $mysqli->prepare(
            'SELECT id_professor
             FROM professores
             WHERE id_professor = ?
             LIMIT 1'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível confirmar o professor.'
            );
        }

        $stmt->bind_param('i', $idProfessor);
        $stmt->execute();

        $professorExiste = $stmt->get_result()->num_rows > 0;
        $stmt->close();

        if (!$professorExiste) {
            throw new Exception(
                'Professor não encontrado.'
            );
        }

        $stmt = $mysqli->prepare(
            'DELETE FROM disciplinas_docentes
             WHERE id_professor = ?'
        );

        if (!$stmt) {
            throw new Exception(
                'Não foi possível atualizar as disciplinas.'
            );
        }

        $stmt->bind_param('i', $idProfessor);

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível atualizar as disciplinas.'
            );
        }

        $stmt->close();
    }

    // Salvar as disciplinas associadas.
    $stmt = $mysqli->prepare(
        'INSERT INTO disciplinas_docentes
            (id_professor, nome_disciplina)
         VALUES (?, ?)'
    );

    if (!$stmt) {
        throw new Exception(
            'Não foi possível preparar as disciplinas.'
        );
    }

    foreach ($disciplinas as $disciplina) {
        $stmt->bind_param(
            'is',
            $idProfessor,
            $disciplina
        );

        if (!$stmt->execute()) {
            throw new Exception(
                'Não foi possível salvar a disciplina: ' . $disciplina
            );
        }
    }

    $stmt->close();
    $mysqli->commit();

    responder(
        true,
        $acao === 'cadastrar'
            ? 'Professor cadastrado com sucesso.'
            : 'Professor atualizado com sucesso.'
    );

} catch (Throwable $erro) {
    $mysqli->rollback();

    error_log(
        'Erro ao salvar professor: ' . $erro->getMessage()
    );

    responder(
        false,
        'Não foi possível salvar os dados. Confira as informações e tente novamente.',
        [],
        500
    );
}
?>
