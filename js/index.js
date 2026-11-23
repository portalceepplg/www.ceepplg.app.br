
/* ==========================================================
   VISUALIZAÇÃO DA ÁREA DO ALUNO PELA GESTÃO
   Executa imediatamente para evitar a oscilação do botão.
========================================================== */

(function () {

    const parametrosPagina = new URLSearchParams(window.location.search);

    const visualizacaoGestao =
        document.body.dataset.visualizacaoGestao === "1" ||
        parametrosPagina.get("visualizacao") === "gestao";

    if (!visualizacaoGestao) return;

    const menuAluno = document.querySelector(".aluno-menu");

    if (!menuAluno) return;

    /* Mantém a visualização da Gestão durante a navegação. */
    const linksMenu = menuAluno.querySelectorAll("a.aluno-item");

    linksMenu.forEach(function (link) {

        const destino = new URL(
            link.getAttribute("href"),
            window.location.origin
        );

        /* O Painel Inicial deve retornar à visualização do aluno. */
        if (destino.pathname === "/php/area-aluno.php") {
            destino.pathname = "/php/visualizar-area-aluno.php";
        }

        destino.searchParams.set("visualizacao", "gestao");

        link.href = destino.pathname + destino.search + destino.hash;
    });

    /* Substitui o botão original antes da exibição da página. */
    const botaoSair = document.getElementById("btnSair");

    if (botaoSair) {

        const linkGestao = document.createElement("a");

        linkGestao.className = "aluno-item aluno-sair";
        linkGestao.href = "/php/gestao.php";

        linkGestao.innerHTML = `
            <span class="item-icone">
                <i class="fa-solid fa-arrow-left"></i>
            </span>
            <span class="item-texto">Voltar à Gestão</span>
        `;

        botaoSair.replaceWith(linkGestao);
    }

})();


document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================================
       IDENTIFICAÇÃO DAS PÁGINAS
    ========================================================== */

    const paginaAtual = window.location.pathname.toLowerCase();

    const estaNaAreaAluno =
        paginaAtual.endsWith("/area-aluno.html") ||
        paginaAtual.endsWith("/area-aluno.php");

    const estaNoLogin = paginaAtual.endsWith("/entrar.html");
    const estaNoLoginGestao = paginaAtual.endsWith("/entraradm.html");
    const estaNoLoginProfessor = paginaAtual.endsWith("/entrarprof.html");

    /* ==========================================================
       VERIFICAR SESSÃO EXISTENTE
    ========================================================== */

    const endpointSessao = document.body.dataset.verificarSessao;

    if (
        endpointSessao &&
        (estaNoLogin || estaNoLoginGestao || estaNoLoginProfessor)
    ) {
        fetch(endpointSessao, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        })
            .then(function (resposta) {
                if (!resposta.ok) {
                    throw new Error("Não foi possível verificar a sessão.");
                }

                return resposta.json();
            })
            .then(function (sessao) {
                if (sessao.autenticado && sessao.destino) {
                    window.location.replace(sessao.destino);
                }
            })
            .catch(function (erro) {
                console.error("Erro ao verificar a sessão:", erro);
            });
    }

    /* ==========================================================
       BALÃO DE ERRO
    ========================================================== */

    const mensagemErro = document.getElementById("mensagemErro");
    const textoErro = document.getElementById("textoErro");

    function mostrarErroLogin(mensagem = "Matrícula ou senha incorreta.") {
        if (!mensagemErro || !textoErro) return;

        textoErro.textContent = mensagem;
        mensagemErro.classList.remove("visivel");

        void mensagemErro.offsetWidth;

        mensagemErro.classList.add("visivel");
    }

    function ocultarErroLogin() {
        if (mensagemErro) {
            mensagemErro.classList.remove("visivel");
        }
    }

    /* ==========================================================
       LOGIN LDAP — ÁREA DO ALUNO
    ========================================================== */

    if (estaNoLogin) {
        const loginForm = document.getElementById("loginForm");
        const campoUsuario = document.getElementById("usuario");
        const campoSenha = document.getElementById("senha");

        if (loginForm && campoUsuario && campoSenha) {
            loginForm.addEventListener("submit", async function (event) {
                event.preventDefault();
                ocultarErroLogin();

                if (campoUsuario.value.trim() === "") {
                    mostrarErroLogin("Preencha sua matrícula.");
                    campoUsuario.focus();
                    return;
                }

                if (campoSenha.value === "") {
                    mostrarErroLogin("Preencha sua senha.");
                    campoSenha.focus();
                    return;
                }

                const botaoEnviar = loginForm.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

                if (botaoEnviar) {
                    botaoEnviar.disabled = true;
                }

                try {
                    const resposta = await fetch(
                        "/php/ldap/autenticar.php",
                        {
                            method: "POST",
                            body: new FormData(loginForm),
                            credentials: "same-origin",
                            cache: "no-store"
                        }
                    );

                    const resultado = await resposta.json();

                    if (!resposta.ok || !resultado.sucesso) {
                        mostrarErroLogin(
                            resultado.mensagem ||
                            "Não foi possível realizar o login."
                        );
                        return;
                    }

                    localStorage.removeItem("alunoAutenticado");

                    window.location.replace("/php/area-aluno.php");

                } catch (erro) {
                    console.error("Erro no login LDAP:", erro);

                    mostrarErroLogin(
                        "Não foi possível conectar ao serviço de login."
                    );
                } finally {
                    if (botaoEnviar) {
                        botaoEnviar.disabled = false;
                    }
                }
            });
        }
    }

    /* ==========================================================
       LOGIN — ÁREA DO PROFESSOR
    ========================================================== */

    if (estaNoLoginProfessor) {
        const formularioProfessor = document.getElementById("loginForm");
        const usuarioProfessor = document.getElementById("usuario");
        const senhaProfessor = document.getElementById("senha");

        if (
            formularioProfessor &&
            usuarioProfessor &&
            senhaProfessor
        ) {
            formularioProfessor.addEventListener("submit", async function (event) {
                event.preventDefault();
                ocultarErroLogin();

                if (usuarioProfessor.value.trim() === "") {
                    mostrarErroLogin("Preencha sua matrícula.");
                    usuarioProfessor.focus();
                    return;
                }

                if (senhaProfessor.value === "") {
                    mostrarErroLogin("Preencha sua senha.");
                    senhaProfessor.focus();
                    return;
                }

                const botaoEnviar = formularioProfessor.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

                if (botaoEnviar) {
                    botaoEnviar.disabled = true;
                }

                try {
                    const resposta = await fetch(
                        "/php/login-prof.php",
                        {
                            method: "POST",
                            body: new FormData(formularioProfessor),
                            credentials: "same-origin",
                            cache: "no-store"
                        }
                    );

                    const resultado = await resposta.json();

                    if (!resposta.ok || !resultado.sucesso) {
                        mostrarErroLogin(
                            resultado.mensagem ||
                            "Matrícula ou senha incorreta."
                        );
                        return;
                    }

                    window.location.replace("/php/area-prof.php");

                } catch (erro) {
                    console.error("Erro no login do professor:", erro);

                    mostrarErroLogin(
                        "Não foi possível conectar ao serviço de login."
                    );
                } finally {
                    if (botaoEnviar) {
                        botaoEnviar.disabled = false;
                    }
                }
            });
        }
    }

    /* ==========================================================
       LOGIN — ÁREA DA GESTÃO
    ========================================================== */

    if (estaNoLoginGestao) {
        const formularioGestao = document.getElementById("loginForm");
        const usuarioGestao = document.getElementById("usuario");
        const senhaGestao = document.getElementById("senha");

        if (formularioGestao && usuarioGestao && senhaGestao) {
            formularioGestao.addEventListener("submit", async function (event) {
                event.preventDefault();
                ocultarErroLogin();

                if (usuarioGestao.value.trim() === "") {
                    mostrarErroLogin("Preencha sua credencial administrativa.");
                    usuarioGestao.focus();
                    return;
                }

                if (senhaGestao.value === "") {
                    mostrarErroLogin("Preencha sua senha.");
                    senhaGestao.focus();
                    return;
                }

                const botaoEnviar = formularioGestao.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

                if (botaoEnviar) {
                    botaoEnviar.disabled = true;
                }

                try {
                    const resposta = await fetch(
                        "/php/loginadm.php",
                        {
                            method: "POST",
                            body: new FormData(formularioGestao),
                            credentials: "same-origin",
                            cache: "no-store"
                        }
                    );

                    const resultado = await resposta.json();

                    if (!resposta.ok || !resultado.sucesso) {
                        mostrarErroLogin(
                            resultado.mensagem ||
                            "Credencial administrativa ou senha incorreta."
                        );
                        return;
                    }

                    window.location.replace("/php/gestao.php");

                } catch (erro) {
                    console.error("Erro no login da Gestão:", erro);

                    mostrarErroLogin(
                        "Não foi possível conectar ao serviço de login."
                    );
                } finally {
                    if (botaoEnviar) {
                        botaoEnviar.disabled = false;
                    }
                }
            });
        }
    }

    /* ==========================================================
       OCULTAR ERRO AO EDITAR OS CAMPOS
    ========================================================== */

    const campoUsuarioLogin = document.getElementById("usuario");
    const campoSenhaLogin = document.getElementById("senha");

    if (campoUsuarioLogin) {
        campoUsuarioLogin.addEventListener("input", ocultarErroLogin);
    }

    if (campoSenhaLogin) {
        campoSenhaLogin.addEventListener("input", ocultarErroLogin);
    }

    /* ==========================================================
       MENU PRINCIPAL / HAMBÚRGUER
    ========================================================== */

    const botaoMenu = document.querySelector(".menu-toggle");
    const menuPrincipal = document.querySelector(".menu");

    if (botaoMenu && menuPrincipal) {
        botaoMenu.addEventListener("click", function () {
            menuPrincipal.classList.toggle("aberto");
        });
    }

    /* ==========================================================
       ABRIR / FECHAR CURSOS
    ========================================================== */

    function openCourse(course) {
        const card = document.querySelector(`.course-${course}`);

        if (card) {
            card.classList.add("is-open");
        }
    }

    function closeCourse(course) {
        const card = document.querySelector(`.course-${course}`);

        if (card) {
            card.classList.remove("is-open");
        }
    }

    window.openCourse = openCourse;
    window.closeCourse = closeCourse;

    /* ==========================================================
       MOSTRAR / OCULTAR SENHA
    ========================================================== */

    const senha = document.getElementById("senha");
    const botaoMostrarSenha = document.getElementById("mostrarSenha");

    if (senha && botaoMostrarSenha) {
        botaoMostrarSenha.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });

        botaoMostrarSenha.addEventListener("click", function (event) {
            event.preventDefault();

            const mostrar = senha.type === "password";
            const icone = botaoMostrarSenha.querySelector("i");
            const posicaoCursor = senha.selectionStart ?? senha.value.length;

            senha.type = mostrar ? "text" : "password";

            if (icone) {
                icone.classList.toggle("fa-eye", !mostrar);
                icone.classList.toggle("fa-eye-slash", mostrar);
            }

            botaoMostrarSenha.setAttribute(
                "aria-label",
                mostrar ? "Ocultar senha" : "Mostrar senha"
            );

            senha.focus({ preventScroll: true });

            try {
                senha.setSelectionRange(posicaoCursor, posicaoCursor);
            } catch (erro) {
                // Alguns navegadores não permitem selecionar o texto.
            }
        });
    }

    /* ==========================================================
       SAIR DA CONTA — ÁREA DO ALUNO
    ========================================================== */

    const btnSair = document.getElementById("btnSair");
    const modalSair = document.getElementById("modalSair");
    const cancelarSaida = document.getElementById("cancelarSaida");
    const confirmarSaida = document.getElementById("confirmarSaida");

    if (btnSair && modalSair) {
        btnSair.addEventListener("click", function () {
            modalSair.classList.add("aberto");
        });
    }

    if (cancelarSaida && modalSair) {
        cancelarSaida.addEventListener("click", function () {
            modalSair.classList.remove("aberto");
        });
    }

    if (confirmarSaida && modalSair) {
        confirmarSaida.addEventListener("click", function () {
            modalSair.classList.remove("aberto");
            window.location.href = "/php/sair-aluno.php";
        });
    }

    /* ==========================================================
       CALCULADORA DE MÉDIA
    ========================================================== */

    const comSimulado = document.getElementById("comSimulado");
    const semSimulado = document.getElementById("semSimulado");
    const campoAV3 = document.getElementById("campoAV3");
    const calcularMedia = document.getElementById("calcularMedia");
    const resultadoMedia = document.getElementById("resultadoMedia");
    const valorMedia = document.getElementById("valorMedia");
    const formulaTexto = document.getElementById("formulaTexto");

    if (
        comSimulado &&
        semSimulado &&
        campoAV3 &&
        calcularMedia &&
        resultadoMedia &&
        valorMedia &&
        formulaTexto
    ) {
        comSimulado.classList.add("ativo");
        semSimulado.classList.remove("ativo");

        campoAV3.style.display = "";
        formulaTexto.textContent = "(AV1 × 2 + AV2 × 3 + AV3 × 1) ÷ 6";

        comSimulado.addEventListener("click", function () {
            comSimulado.classList.add("ativo");
            semSimulado.classList.remove("ativo");

            campoAV3.style.display = "";
            formulaTexto.textContent = "(AV1 × 2 + AV2 × 3 + AV3 × 1) ÷ 6";

            valorMedia.textContent = "—";
        });

        semSimulado.addEventListener("click", function () {
            semSimulado.classList.add("ativo");
            comSimulado.classList.remove("ativo");

            campoAV3.style.display = "none";
            formulaTexto.textContent = "(AV1 × 2 + AV2 × 3) ÷ 5";

            valorMedia.textContent = "—";
        });

        calcularMedia.addEventListener("click", function () {
            const campoAV1 = document.getElementById("av1");
            const campoAV2 = document.getElementById("av2");
            const campoAV3Nota = document.getElementById("av3");

            if (!campoAV1 || !campoAV2 || !campoAV3Nota) return;

            const av1 = parseFloat(campoAV1.value);
            const av2 = parseFloat(campoAV2.value);
            const av3 = parseFloat(campoAV3Nota.value);

            if (
                campoAV1.value.trim() === "" ||
                campoAV2.value.trim() === ""
            ) {
                alert("Digite as notas da AV1 e AV2.");
                return;
            }

            if (
                !Number.isFinite(av1) ||
                !Number.isFinite(av2) ||
                av1 < 0 || av1 > 10 ||
                av2 < 0 || av2 > 10
            ) {
                alert("As notas da AV1 e AV2 devem estar entre 0 e 10.");
                return;
            }

            let media;

            if (comSimulado.classList.contains("ativo")) {
                if (
                    campoAV3Nota.value.trim() === "" ||
                    !Number.isFinite(av3)
                ) {
                    alert("Digite a nota da AV3.");
                    return;
                }

                if (av3 < 0 || av3 > 10) {
                    alert("A nota da AV3 deve estar entre 0 e 10.");
                    return;
                }

                media = (av1 * 2 + av2 * 3 + av3) / 6;
            } else {
                media = (av1 * 2 + av2 * 3) / 5;
            }

            valorMedia.textContent = media.toFixed(2).replace(".", ",");

            resultadoMedia.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        });
    }

});

/* ==========================================================
   SELEÇÃO DO TIPO DE ACESSO
========================================================== */

function selecionarTipo(tipo) {
    if (tipo === "aluno") {
        window.location.href = "/paginas/entrar.html";
    } else if (tipo === "professor") {
        window.location.href = "/paginas/entrarprof.html";
    }
}
