<?php
require_once __DIR__ . '/sessao.php';

/* Exige uma sessão administrativa válida. */
if (
    empty($_SESSION['id_admin']) ||
    empty($_SESSION['gestao_autorizada'])
) {
    header('Location: ../paginas/entraradm.html');
    exit;
}

/* Carrega a página da Gestão. */
$caminhoHtml = __DIR__ . '/../paginas/gestao.html';

if (!is_file($caminhoHtml)) {
    http_response_code(500);
    exit('Não foi possível localizar a página da Gestão.');
}

require $caminhoHtml;
?>