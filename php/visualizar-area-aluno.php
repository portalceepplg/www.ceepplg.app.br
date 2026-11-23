
<?php

require_once __DIR__ . '/sessao.php';

/* Permite a visualização somente para usuários da Gestão. */
if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    header('Location: /paginas/entraradm.html');
    exit;
}

/* Localiza o HTML original da Área do Aluno. */
$caminhoHtml = __DIR__ . '/../paginas/area-aluno.html';

if (!is_file($caminhoHtml)) {
    http_response_code(500);
    exit('Não foi possível localizar a Área do Aluno.');
}

$html = file_get_contents($caminhoHtml);

if ($html === false) {
    http_response_code(500);
    exit('Erro ao carregar a página.');
}

/* Altera a mensagem de boas-vindas somente na visualização. */
$html = str_replace(
    '{{NOME_ALUNO}}',
    'Equipe da Gestão',
    $html
);

/* Identifica a visualização da Gestão no HTML. */
$html = preg_replace(
    '/<body\b/i',
    '<body data-visualizacao-gestao="1"',
    $html,
    1
);

/* Substitui o botão Sair da conta antes de exibir a página. */
$html = preg_replace(
    '~<button\b(?=[^>]*\bid=["\']btnSair["\'])[^>]*>.*?</button>~is',
    '<a class="aluno-item aluno-sair" href="/php/gestao.php">
        <span class="item-icone">
            <i class="fa-solid fa-arrow-left"></i>
        </span>
        <span class="item-texto">Voltar à Gestão</span>
    </a>',
    $html,
    1
);

/* Impede a utilização do modal de saída dos estudantes. */
$html = str_replace(
    'id="modalSair"',
    'id="modalSairPreview"',
    $html
);

echo $html;
