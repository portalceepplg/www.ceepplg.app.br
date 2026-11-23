
<?php
require_once __DIR__ . '/sessao.php';

header('Content-Type: application/json; charset=utf-8');

function responder(bool $sucesso, string $mensagem, int $status = 200, array $dados = []): void {
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

// Verifica autorização da Gestão.
if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    responder(false, 'Acesso não autorizado.', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método não permitido.', 405);
}

require_once __DIR__ . '/conexao.php';

$acao = $_POST['acao'] ?? '';

try {

    // =====================================================
    // LISTAR ACESSOS
    // =====================================================

    if ($acao === 'listar') {

        $sql = "
            SELECT
                a.id,
                a.id_professor,
                COALESCE(p.nome, a.nome) AS nome,
                a.matricula,
                a.email_institucional,
                a.ativo
            FROM acessos_professores a
            LEFT JOIN professores p
                ON p.id_professor = a.id_professor
            ORDER BY nome ASC
        ";

        $resultado = $mysqli->query($sql);

        if (!$resultado) {
            responder(false, 'Não foi possível consultar os acessos.', 500);
        }

        $acessos = [];

        while ($linha = $resultado->fetch_assoc()) {
            $acessos[] = $linha;
        }

        responder(
            true,
            'Acessos carregados com sucesso.',
            200,
            ['acessos' => $acessos]
        );
    }

    // =====================================================
    // CADASTRAR ACESSO
    // =====================================================

    if ($acao === 'cadastrar') {

        $idProfessor = filter_var(
            $_POST['id_professor'] ?? null,
            FILTER_VALIDATE_INT
        );

        $matricula = trim($_POST['matricula'] ?? '');
        $email = trim($_POST['email_institucional'] ?? '');
        $senha = $_POST['senha'] ?? '';

        if (!$idProfessor || $matricula === '' || $email === '' || $senha === '') {
            responder(false, 'Preencha todos os campos obrigatórios.', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            responder(false, 'Informe um e-mail institucional válido.', 400);
        }

        if (strlen($senha) < 8) {
            responder(false, 'A senha deve possuir pelo menos 8 caracteres.', 400);
        }

        $consulta = $mysqli->prepare("
            SELECT nome
            FROM professores
            WHERE id_professor = ?
              AND ativo = 1
            LIMIT 1
        ");

        $consulta->bind_param('i', $idProfessor);
        $consulta->execute();

        $professor = $consulta->get_result()->fetch_assoc();
        $consulta->close();

        if (!$professor) {
            responder(false, 'Professor não encontrado ou inativo.', 404);
        }

        $consulta = $mysqli->prepare("
            SELECT id
            FROM acessos_professores
            WHERE id_professor = ?
               OR matricula = ?
            LIMIT 1
        ");

        $consulta->bind_param('is', $idProfessor, $matricula);
        $consulta->execute();

        $duplicado = $consulta->get_result()->fetch_assoc();
        $consulta->close();

        if ($duplicado) {
            responder(false, 'Este professor ou matrícula já possui um acesso cadastrado.', 409);
        }

        $senhaHash = password_hash($senha, PASSWORD_DEFAULT);
        $nome = $professor['nome'];
        $ativo = 1;

        $insercao = $mysqli->prepare("
            INSERT INTO acessos_professores
                (id_professor, nome, matricula, email_institucional, senha, ativo)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $insercao->bind_param(
            'issssi',
            $idProfessor,
            $nome,
            $matricula,
            $email,
            $senhaHash,
            $ativo
        );

        if (!$insercao->execute()) {
            responder(false, 'Não foi possível cadastrar o acesso.', 500);
        }

        $insercao->close();

        responder(true, 'Acesso do professor cadastrado com sucesso.');
    }

    // =====================================================
    // DESATIVAR OU REATIVAR ACESSO
    // =====================================================

    if ($acao === 'desativar' || $acao === 'reativar') {

        $id = filter_var(
            $_POST['id'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            responder(false, 'Acesso não identificado.', 400);
        }

        $ativo = ($acao === 'reativar') ? 1 : 0;

        $consulta = $mysqli->prepare("
            UPDATE acessos_professores
            SET ativo = ?
            WHERE id = ?
            LIMIT 1
        ");

        $consulta->bind_param('ii', $ativo, $id);

        if (!$consulta->execute()) {
            responder(false, 'Não foi possível atualizar o acesso.', 500);
        }

        if ($consulta->affected_rows === 0) {
            $verificacao = $mysqli->prepare("
                SELECT id
                FROM acessos_professores
                WHERE id = ?
                LIMIT 1
            ");

            $verificacao->bind_param('i', $id);
            $verificacao->execute();

            $existe = $verificacao->get_result()->fetch_assoc();
            $verificacao->close();

            if (!$existe) {
                responder(false, 'Acesso não encontrado.', 404);
            }
        }

        $consulta->close();

        responder(
            true,
            $ativo
                ? 'Acesso do professor reativado com sucesso.'
                : 'Acesso do professor desativado com sucesso.'
        );
    }

    // =====================================================
    // EXCLUIR SOMENTE O ACESSO
    // =====================================================

    if ($acao === 'excluir') {

        $id = filter_var(
            $_POST['id'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            responder(false, 'Acesso não identificado.', 400);
        }

        $consulta = $mysqli->prepare("
            DELETE FROM acessos_professores
            WHERE id = ?
            LIMIT 1
        ");

        $consulta->bind_param('i', $id);

        if (!$consulta->execute()) {
            responder(false, 'Não foi possível excluir o acesso.', 500);
        }

        if ($consulta->affected_rows === 0) {
            responder(false, 'Acesso não encontrado.', 404);
        }

        $consulta->close();

        responder(true, 'Acesso do professor excluído com sucesso.');
    }

    responder(false, 'Ação inválida.', 400);

} catch (Throwable $erro) {

    error_log(
        'Erro em gerenciar-acessos-professores.php: ' .
        $erro->getMessage()
    );

    responder(
        false,
        'Ocorreu um erro interno ao processar a solicitação.',
        500
    );
}
