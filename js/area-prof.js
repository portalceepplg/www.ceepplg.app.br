
document.addEventListener("DOMContentLoaded", () => {
    // ELEMENTOS DO MENU PÚBLICO
    const menuToggle = document.querySelector(".menu-toggle");
    const menuPublico = document.querySelector(".menu");

    // ELEMENTOS DO MODAL DE SAÍDA
    const modalSair = document.getElementById("modalSair");
    const btnSair = document.getElementById("btnSair");
    const cancelarSaida = document.getElementById("cancelarSaida");
    const confirmarSaida = document.getElementById("confirmarSaida");

    // ELEMENTOS DA NAVEGAÇÃO DO PROFESSOR
    const botoesNavegacao = document.querySelectorAll(
        ".professor-item[data-secao]"
    );

    const atalhos = document.querySelectorAll("[data-abrir-secao]");

    const secoes = document.querySelectorAll("[data-pagina-prof]");

    // MENU PÚBLICO RESPONSIVO
    if (menuToggle && menuPublico) {
        menuToggle.addEventListener("click", () => {
            const aberto = menuPublico.classList.toggle("ativo");

            menuToggle.setAttribute("aria-expanded", String(aberto));
            menuToggle.setAttribute(
                "aria-label",
                aberto ? "Fechar menu" : "Abrir menu"
            );

            const icone = menuToggle.querySelector("i");

            if (icone) {
                icone.classList.toggle("fa-bars", !aberto);
                icone.classList.toggle("fa-xmark", aberto);
            }
        });

        menuPublico.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                menuPublico.classList.remove("ativo");

                menuToggle.setAttribute("aria-expanded", "false");

                const icone = menuToggle.querySelector("i");

                if (icone) {
                    icone.classList.add("fa-bars");
                    icone.classList.remove("fa-xmark");
                }
            });
        });
    }

    // NAVEGAÇÃO ENTRE AS SEÇÕES DO PROFESSOR
    function abrirSecao(nomeSecao) {
        const secaoAtiva = Array.from(secoes).find(secao => {
            return secao.dataset.paginaProf === nomeSecao;
        });

        if (!secaoAtiva) {
            console.error(
                `A seção "${nomeSecao}" não foi encontrada.`
            );
            return;
        }

        // Exibe somente a seção selecionada
        secoes.forEach(secao => {
            const ativa = secao === secaoAtiva;

            secao.hidden = !ativa;
            secao.style.display = ativa ? "" : "none";

            secao.classList.toggle("pagina-prof-ativa", ativa);
        });

        // Atualiza o botão selecionado no menu
        botoesNavegacao.forEach(botao => {
            const ativo = botao.dataset.secao === nomeSecao;

            botao.classList.toggle("ativo", ativo);

            if (ativo) {
                botao.setAttribute("aria-current", "page");
            } else {
                botao.removeAttribute("aria-current");
            }
        });
    }

    // CLIQUES NO MENU LATERAL
    botoesNavegacao.forEach(botao => {
        botao.addEventListener("click", evento => {
            evento.preventDefault();

            const nomeSecao = botao.dataset.secao;

            abrirSecao(nomeSecao);
        });
    });

    // CLIQUES NOS ATALHOS INTERNOS
    atalhos.forEach(botao => {
        botao.addEventListener("click", evento => {
            evento.preventDefault();

            const nomeSecao = botao.dataset.abrirSecao;

            abrirSecao(nomeSecao);
        });
    });

    // ABRE O PAINEL INICIAL
    abrirSecao("inicio");

    // MODAL DE SAÍDA
    function abrirModalSair() {
        if (!modalSair) {
            console.error("Modal #modalSair não encontrado.");
            return;
        }

        modalSair.classList.add("aberto");
        modalSair.setAttribute("aria-hidden", "false");

        if (cancelarSaida) {
            cancelarSaida.focus();
        }
    }

    function fecharModalSair() {
        if (!modalSair) return;

        modalSair.classList.remove("aberto");
        modalSair.setAttribute("aria-hidden", "true");

        if (btnSair) {
            btnSair.focus();
        }
    }

    if (btnSair) {
        btnSair.addEventListener("click", abrirModalSair);
    }

    if (cancelarSaida) {
        cancelarSaida.addEventListener("click", fecharModalSair);
    }

    if (modalSair) {
        modalSair.addEventListener("click", evento => {
            if (evento.target === modalSair) {
                fecharModalSair();
            }
        });
    }

    // FECHA O MODAL COM ESC
    document.addEventListener("keydown", evento => {
        if (
            evento.key === "Escape" &&
            modalSair &&
            modalSair.classList.contains("aberto")
        ) {
            fecharModalSair();
        }
    });

    // CONFIRMA A SAÍDA DO PROFESSOR
    if (confirmarSaida) {
        confirmarSaida.addEventListener("click", () => {
            window.location.href = "../php/sair-prof.php";
        });
    }
});
