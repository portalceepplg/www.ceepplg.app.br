
<?php

require_once __DIR__ . '/sessao.php';

if (
    empty($_SESSION['ldap_autenticado']) ||
    empty($_SESSION['ldap_matricula'])
) {
    header('Location: ../paginas/entrar.html');
    exit;
}

$nomeOriginal = $_SESSION['usuario_nome']
    ?? $_SESSION['nome']
    ?? 'Estudante';

$nome = mb_convert_case(
    mb_strtolower(trim($nomeOriginal), 'UTF-8'),
    MB_CASE_TITLE,
    'UTF-8'
);

/* Define o caminho do HTML separado. */
$caminhoHtml = __DIR__ . '/../paginas/area-aluno.html';

if (!is_file($caminhoHtml)) {
    http_response_code(500);
    exit('Não foi possível localizar o HTML da Área do Aluno.');
}

$html = file_get_contents($caminhoHtml);

if ($html === false) {
    http_response_code(500);
    exit('Erro ao carregar a página.');
}

/* Substitui o marcador pelo nome original. */
$html = str_replace(
    '{{NOME_ALUNO}}',
    htmlspecialchars($nome, ENT_QUOTES, 'UTF-8'),
    $html
);

echo $html;
