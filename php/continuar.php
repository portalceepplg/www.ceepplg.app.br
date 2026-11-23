
<?php

require_once __DIR__ . '/sessao.php';

/* Área do Aluno */
if (
    !empty($_SESSION['ldap_autenticado']) &&
    !empty($_SESSION['ldap_matricula'])
) {
    header('Location: area-aluno.php');
    exit;
}

/* Área do Professor */
if (!empty($_SESSION['professor_autenticado'])) {
    header('Location: area-prof.php');
    exit;
}

/* Área da Gestão */
if (
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada'])
) {
    header('Location: gestao.php');
    exit;
}

/* Nenhuma sessão autenticada */
header('Location: ../paginas/entrar.html');
exit;
