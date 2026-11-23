
<?php
require_once __DIR__ . '/sessao.php';

$professorAutenticado = !empty($_SESSION['professor_autenticado']);

$gestorAutenticado = (
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada'])
);

// Permite acesso somente a professores autenticados ou à Gestão.
if (!$professorAutenticado && !$gestorAutenticado) {
    header('Location: /paginas/entrarprof.html');
    exit;
}

// Define o nome exibido na página.
if ($gestorAutenticado) {
    $nome = 'Equipe da Gestão';
} else {
    $nomeOriginal = $_SESSION['nome_professor'] ?? 'Professor';

    $nome = mb_convert_case(
        mb_strtolower(trim($nomeOriginal), 'UTF-8'),
        MB_CASE_TITLE,
        'UTF-8'
    );
}

// Localiza o arquivo HTML.
$caminhoHtml = __DIR__ . '/../paginas/area-prof.html';

if (!is_file($caminhoHtml)) {
    http_response_code(500);
    exit('Arquivo da Área do Professor não encontrado.');
}

$html = file_get_contents($caminhoHtml);

if ($html === false) {
    http_response_code(500);
    exit('Não foi possível carregar a Área do Professor.');
}

// Insere o nome do usuário.
$html = str_replace(
    '{{NOME_PROFESSOR}}',
    htmlspecialchars($nome, ENT_QUOTES, 'UTF-8'),
    $html
);

// Identifica o acesso da Gestão sem duplicar a classe do body.
if ($gestorAutenticado) {
    $html = preg_replace_callback(
        '/<body\b([^>]*)>/i',
        function ($matches) {
            $atributos = $matches[1];

            if (preg_match('/\bclass\s*=\s*(["\'])(.*?)\1/i', $atributos)) {
                $atributos = preg_replace_callback(
                    '/\bclass\s*=\s*(["\'])(.*?)\1/i',
                    function ($classe) {
                        return 'class="' .
                            trim($classe[2] . ' gestor-acessando-professor') .
                            '"';
                    },
                    $atributos,
                    1
                );
            } else {
                $atributos .= ' class="gestor-acessando-professor"';
            }

            return '<body' . $atributos . '>';
        },
        $html,
        1
    );
}

echo $html;
