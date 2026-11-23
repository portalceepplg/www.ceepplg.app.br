<?php

$usuario = 'aluno';
$senha = 'ceep@1234';
$database = 'portal_ceep';
$host = 'localhost';

$mysqli = new mysqli(
    $host,
    $usuario,
    $senha,
    $database
);

if ($mysqli->connect_error) {
    die("Erro ao conectar ao banco de dados: " . $mysqli->connect_error);
}

$mysqli->set_charset("utf8mb4");

?>