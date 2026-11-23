
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

/* Localiza o HTML original da Área do Professor. */
$caminhoHtml = __DIR__ . '/../paginas/area-prof.html';

if (!is_file($caminhoHtml)) {
    http_response_code(500);
    exit('Não foi possível localizar a Área do Professor.');
}

$html = file_get_contents($caminhoHtml);

if ($html === false) {
    http_response_code(500);
    exit('Erro ao carregar a Área do Professor.');
}

/* Identifica que a página está sendo aberta pela Gestão. */
$html = preg_replace(
    '/<body\b/i',
    '<body class="visualizacao-gestao gestor-acessando-professor"',
    $html,
    1
);

/* Substitui o nome do professor por uma identificação da Gestão. */
$html = str_replace(
    '{{NOME_PROFESSOR}}',
    'Equipe da Gestão',
    $html
);

/* Ajusta os elementos da visualização da Gestão. */
$estilosVisualizacao = '
<style>
    /* Mantém o acesso ao perfil visível. */
    .visualizacao-gestao .professor-perfil-acesso {
        display: flex !important;
    }

    /* Permite abrir a página do perfil. */
    .visualizacao-gestao [data-pagina-prof="perfil"] {
        display: none;
    }

    /* Oculta o modal de saída do professor. */
    .visualizacao-gestao .modal-sair {
        display: none !important;
    }

    /* Oculta o botão de saída da conta do professor. */
    .visualizacao-gestao #btnSair {
        display: none !important;
    }
</style>
';

$html = str_replace(
    '</head>',
    $estilosVisualizacao . '</head>',
    $html
);

/* Substitui o botão de saída por um link de retorno à Gestão. */
$html = preg_replace(
    '~<button\b(?=[^>]*\bid=["\']btnSair["\'])[^>]*>.*?</button>~is',
    '<a class="aluno-item professor-item professor-voltar-gestao" href="/php/gestao.php">
        <span class="item-icone">
            <i class="fa-solid fa-arrow-left"></i>
        </span>
        <span class="item-texto">Voltar para a Área da Gestão</span>
    </a>',
    $html,
    1
);

/* Impede que o JavaScript abra o modal de saída do professor. */
$html = str_replace(
    'id="modalSair"',
    'id="modalSairPreview"',
    $html
);

/* Substitui os dados do perfil por informações administrativas. */
$html = str_replace(
    [
        'id="perfilNome">Carregando...',
        'id="perfilMatricula">Carregando...',
        'id="perfilArea">Carregando...',
        'id="perfilDisciplinas">Carregando...'
    ],
    [
        'id="perfilNome">Visualização da Gestão',
        'id="perfilMatricula">Não se aplica',
        'id="perfilArea">Acesso administrativo',
        'id="perfilDisciplinas">Não se aplica'
    ],
    $html
);

/* Impede a alteração de senha durante a visualização. */
$html = str_replace(
    'id="formAlterarSenha"',
    'id="formAlterarSenhaPreview"',
    $html
);

/* Remove o formulário de alteração de senha da visualização. */
$html = preg_replace(
    '~<div class="professor-perfil-senha">.*?</div>\s*(?=</section>)~is',
    '',
    $html,
    1
);

/* Entrega a página ao navegador. */
echo $html;
