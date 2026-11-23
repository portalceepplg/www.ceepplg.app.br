<?php

require_once __DIR__ . '/sessao.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$destino = null;

/* Área do Aluno */
if (
    !empty($_SESSION['ldap_autenticado']) &&
    !empty($_SESSION['ldap_matricula'])
) {
    $destino = '../php/area-aluno.php';
}

/* Área do Professor */
elseif (!empty($_SESSION['professor_autenticado'])) {
    $destino = '../php/area-prof.php';
}

/* Área da Gestão */
elseif (
    !empty($_SESSION['id_admin']) &&
    !empty($_SESSION['gestao_autorizada'])
) {
    $destino = '../php/gestao.php';
}

echo json_encode([
    'autenticado' => $destino !== null,
    'destino' => $destino
]);