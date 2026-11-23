document.addEventListener("DOMContentLoaded", () => {
    const conteudo = document.getElementById("gestaoConteudo");
    const sidebar = document.getElementById("gestaoSidebar");
    const toggle = document.getElementById("gestaoMenuToggle");
    const toast = document.getElementById("gestaoToast");
    const btnSair = document.getElementById("btnSairGestao");
    const grupo = document.querySelector(".gestao-grupo-titulo");

    const modalSair = document.getElementById("modalSair");
    const cancelarSaida = document.getElementById("cancelarSaida");
    const confirmarSaida = document.getElementById("confirmarSaida");

    const painelInicialHTML = conteudo ? conteudo.innerHTML : "";

    const arquivos = {
        painel: null,
        institucional: "../paginas/gestao-institucional.html",
        cursos: "../paginas/gestao-cursos.html",
        docentes: "../paginas/gestao-docentes.html",
        acessosProfessores: "../paginas/gestao-acessos-professores.html",
        infraestrutura: "../paginas/gestao-infraestrutura.html",
        normas: "../paginas/gestao-normas.html",
        aprofundamento: "../paginas/gestao-aprofundamento.html",
        recursos: "../paginas/gestao-tccs.html",

    };

    const API_DISCIPLINAS = "../php/gerenciar-disciplinas.php";
    const API_PROFESSORES = "../php/gerenciar-professores.php";
    const API_ACESSOS_PROFESSORES = "../php/gerenciar-acessos-professores.php";
    const API_INFRAESTRUTURA = "../php/gerenciar-infraestrutura.php";
    const API_CONFIGURACOES = "../php/obter-configuracoes.php";
    const API_SALVAR_CONFIGURACOES = "../php/salvar-configuracoes.php";

    let toastTimer;

    function mostrarAviso(mensagem) {
        if (!toast) return;

        toast.textContent = mensagem;
        toast.classList.add("visivel");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("visivel");
        }, 3500);
    }

    function marcarAtivo(arquivo) {
        document.querySelectorAll("[data-arquivo]").forEach(botao => {
            const ativo = botao.dataset.arquivo === arquivo;

            botao.classList.toggle("ativo", ativo);

            if (botao.classList.contains("gestao-subitem")) {
                if (ativo) {
                    botao.setAttribute("aria-current", "page");
                } else {
                    botao.removeAttribute("aria-current");
                }
            }
        });
    }

    function fecharMenuMobile() {
        if (window.innerWidth <= 760 && sidebar) {
            sidebar.classList.remove("gestao-sidebar-aberta");
        }
    }

    // =====================================================
    // REQUISIÇÕES: DISCIPLINAS DOS CURSOS
    // =====================================================

    async function requisicaoDisciplinas(opcoes = {}) {
        const resposta = await fetch(API_DISCIPLINAS, {
            credentials: "same-origin",
            ...opcoes
        });

        let dados;

        try {
            dados = await resposta.json();
        } catch {
            throw new Error(
                "O servidor não retornou JSON válido. Confira gerenciar-disciplinas.php."
            );
        }

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || `Erro na requisição (${resposta.status}).`
            );
        }

        return dados;
    }

    async function carregarDisciplinas() {
        if (!conteudo) return;

        const formulario = conteudo.querySelector("#formDisciplina");

        if (!formulario) return;

        const seletorCurso = conteudo.querySelector("#cursoDisciplina");
        const filtroCurso = conteudo.querySelector("#filtroCurso");
        const lista = conteudo.querySelector("#listaDisciplinas");
        const mensagemVazia = conteudo.querySelector("#mensagemListaVazia");

        if (!seletorCurso || !filtroCurso || !lista) return;

        lista.textContent = "Carregando disciplinas...";

        try {
            const dados = await requisicaoDisciplinas({
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            preencherCursos(seletorCurso, dados.cursos || []);
            preencherFiltro(filtroCurso, dados.cursos || []);

            renderizarDisciplinas(
                dados.disciplinas || [],
                filtroCurso.value,
                lista,
                mensagemVazia
            );
        } catch (erro) {
            console.error("Erro ao carregar disciplinas:", erro);
            lista.textContent = erro.message;
            mostrarAviso("Não foi possível carregar as disciplinas.");
        }
    }

    function preencherCursos(seletor, cursos) {
        const valorAnterior = seletor.value;

        seletor.replaceChildren();

        const opcaoInicial = document.createElement("option");
        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione o curso";
        seletor.appendChild(opcaoInicial);

        cursos.forEach(curso => {
            const opcao = document.createElement("option");
            opcao.value = String(curso.id_curso);
            opcao.textContent = curso.nome;
            seletor.appendChild(opcao);
        });

        if (cursos.some(curso =>
            String(curso.id_curso) === valorAnterior
        )) {
            seletor.value = valorAnterior;
        }

        if (cursos.length === 0) {
            opcaoInicial.textContent = "Nenhum curso ativo cadastrado";
        }
    }

    function preencherFiltro(seletor, cursos) {
        const valorAnterior = seletor.value || "todos";

        seletor.replaceChildren();

        const todos = document.createElement("option");
        todos.value = "todos";
        todos.textContent = "Todos os cursos";
        seletor.appendChild(todos);

        cursos.forEach(curso => {
            const opcao = document.createElement("option");
            opcao.value = String(curso.id_curso);
            opcao.textContent = curso.nome;
            seletor.appendChild(opcao);
        });

        if (
            valorAnterior === "todos" ||
            cursos.some(curso =>
                String(curso.id_curso) === valorAnterior
            )
        ) {
            seletor.value = valorAnterior;
        } else {
            seletor.value = "todos";
        }
    }

   function renderizarDisciplinas(
    disciplinas,
    filtro,
    lista,
    mensagemVazia
) {
    lista.replaceChildren();

    const filtradas = disciplinas.filter(disciplina => {
        return (
            filtro === "todos" ||
            String(disciplina.id_curso) === String(filtro)
        );
    });

    if (filtradas.length === 0) {
        if (mensagemVazia) {
            mensagemVazia.hidden = false;
        } else {
            lista.textContent = "Nenhuma disciplina encontrada.";
        }
        return;
    }

    if (mensagemVazia) mensagemVazia.hidden = true;

    filtradas.forEach(disciplina => {
        const item = document.createElement("div");
        item.className = "gestao-item-lista";
        item.dataset.item = "";
        item.dataset.curso = String(disciplina.id_curso);

        const icone = document.createElement("div");
        icone.className = "gestao-item-lista-icone";

        const elementoIcone = document.createElement("i");
        elementoIcone.className = "fa-solid fa-book";
        icone.appendChild(elementoIcone);

        const informacoes = document.createElement("div");
        informacoes.className = "gestao-item-lista-conteudo";

        const nomeCurso = document.createElement("span");
        nomeCurso.className = "gestao-item-curso";
        nomeCurso.textContent = disciplina.curso;

        const nomeDisciplina = document.createElement("strong");
        nomeDisciplina.textContent = disciplina.nome;

        informacoes.append(nomeCurso, nomeDisciplina);

        const acoes = document.createElement("div");
        acoes.className = "gestao-acoes-disciplina";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "gestao-botao-editar-disciplina";
        editar.dataset.editarDisciplina =
            String(disciplina.id_disciplina);
        editar.textContent = "Editar";
        editar.setAttribute("aria-label", `Editar ${disciplina.nome}`);

        const desativar = document.createElement("button");
        desativar.type = "button";
        desativar.className = "gestao-botao-desativar-disciplina";
        desativar.dataset.desativarDisciplina =
            String(disciplina.id_disciplina);
        desativar.textContent = "Desativar";
        desativar.setAttribute(
            "aria-label",
            `Desativar ${disciplina.nome}`
        );

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "gestao-botao-excluir-disciplina";
        excluir.dataset.excluirDisciplina =
            String(disciplina.id_disciplina);
        excluir.textContent = "Excluir";
        excluir.setAttribute(
            "aria-label",
            `Excluir ${disciplina.nome}`
        );

        acoes.append(editar, desativar, excluir);
        item.append(icone, informacoes, acoes);
        lista.appendChild(item);
    });
}

    function limparFormularioDisciplina() {
        const formulario = conteudo.querySelector("#formDisciplina");

        if (!formulario) return;

        formulario.reset();
        conteudo.querySelector("#idDisciplina").value = "";

        conteudo.querySelector("#tituloFormularioDisciplina").textContent =
            "Adicionar matéria";

        const botaoSalvar =
            conteudo.querySelector("#btnSalvarDisciplina");

        botaoSalvar.innerHTML =
            '<i class="fa-solid fa-plus"></i> Adicionar matéria';

        conteudo.querySelector("#btnCancelarEdicao").hidden = true;
    }

function inicializarFormularioDisciplinas() {
    const formulario = conteudo.querySelector("#formDisciplina");

    if (!formulario || formulario.dataset.inicializado === "true") {
        return;
    }

    formulario.dataset.inicializado = "true";

    const filtroCurso = conteudo.querySelector("#filtroCurso");
    const lista = conteudo.querySelector("#listaDisciplinas");
    const mensagemVazia = conteudo.querySelector("#mensagemListaVazia");

    // CADASTRAR E EDITAR
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        const id = conteudo.querySelector("#idDisciplina").value;
        const dados = new FormData(formulario);

        dados.set("acao", id ? "editar" : "cadastrar");

        const botaoSalvar = conteudo.querySelector("#btnSalvarDisciplina");
        botaoSalvar.disabled = true;

        try {
            const resultado = await requisicaoDisciplinas({
                method: "POST",
                body: dados
            });

            mostrarAviso(resultado.mensagem || "Disciplina salva.");

            limparFormularioDisciplina();
            await carregarDisciplinas();

        } catch (erro) {
            console.error("Erro ao salvar disciplina:", erro);
            mostrarAviso(erro.message || "Não foi possível salvar.");
        } finally {
            botaoSalvar.disabled = false;
        }
    });

    // CANCELAR EDIÇÃO
    const cancelarEdicao = conteudo.querySelector("#btnCancelarEdicao");

    if (cancelarEdicao) {
        cancelarEdicao.addEventListener(
            "click",
            limparFormularioDisciplina
        );
    }

    // FILTRAR DISCIPLINAS
    filtroCurso.addEventListener("change", async () => {
        try {
            const dados = await requisicaoDisciplinas({
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            renderizarDisciplinas(
                dados.disciplinas || [],
                filtroCurso.value,
                lista,
                mensagemVazia
            );

        } catch (erro) {
            mostrarAviso(erro.message);
        }
    });

    // AÇÕES DA LISTA
    lista.addEventListener("click", async evento => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const botaoEditar = alvo.closest("[data-editar-disciplina]");
        const botaoDesativar = alvo.closest("[data-desativar-disciplina]");
        const botaoExcluir = alvo.closest("[data-excluir-disciplina]");

        // EDITAR
        if (botaoEditar) {
            const id = botaoEditar.dataset.editarDisciplina;

            try {
                const dados = await requisicaoDisciplinas({
                    method: "GET",
                    headers: { Accept: "application/json" },
                    cache: "no-store"
                });

                const disciplina = (dados.disciplinas || []).find(
                    item => String(item.id_disciplina) === String(id)
                );

                if (!disciplina) {
                    mostrarAviso("Disciplina não encontrada.");
                    return;
                }

                conteudo.querySelector("#idDisciplina").value =
                    disciplina.id_disciplina;

                conteudo.querySelector("#cursoDisciplina").value =
                    String(disciplina.id_curso);

                conteudo.querySelector("#nomeDisciplina").value =
                    disciplina.nome;

                conteudo.querySelector("#tituloFormularioDisciplina").textContent =
                    "Editar matéria";

                const botaoSalvar =
                    conteudo.querySelector("#btnSalvarDisciplina");

                botaoSalvar.innerHTML =
                    '<i class="fa-solid fa-check"></i> Salvar alterações';

                conteudo.querySelector("#btnCancelarEdicao").hidden = false;

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            } catch (erro) {
                console.error("Erro ao editar disciplina:", erro);
                mostrarAviso(erro.message);
            }

            return;
        }

        // DESATIVAR
        if (botaoDesativar) {
            const id = botaoDesativar.dataset.desativarDisciplina;

            if (!window.confirm(
                "Deseja desativar esta disciplina?"
            )) {
                return;
            }

            const dados = new FormData();
            dados.set("acao", "desativar");
            dados.set("id_disciplina", id);

            botaoDesativar.disabled = true;

            try {
                const resultado = await requisicaoDisciplinas({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(resultado.mensagem);
                await carregarDisciplinas();

            } catch (erro) {
                console.error("Erro ao desativar disciplina:", erro);
                mostrarAviso(erro.message);
                botaoDesativar.disabled = false;
            }

            return;
        }

        // EXCLUIR DEFINITIVAMENTE
        if (botaoExcluir) {
            const id = botaoExcluir.dataset.excluirDisciplina;

            if (!id) {
                mostrarAviso("Disciplina não identificada.");
                return;
            }

            if (!window.confirm(
                "Deseja excluir definitivamente esta disciplina?"
            )) {
                return;
            }

            const dados = new FormData();
            dados.set("acao", "excluir");
            dados.set("id_disciplina", id);

            botaoExcluir.disabled = true;

            try {
                const resultado = await requisicaoDisciplinas({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(resultado.mensagem);
                await carregarDisciplinas();

            } catch (erro) {
                console.error("Erro ao excluir disciplina:", erro);
                mostrarAviso(erro.message);
                botaoExcluir.disabled = false;
            }

            return;
        }
    });

    carregarDisciplinas();
}

   
// =====================================================
// REQUISIÇÕES: CORPO DOCENTE
// =====================================================

async function requisicaoProfessores(opcoes = {}) {
    const resposta = await fetch(API_PROFESSORES, {
        credentials: "same-origin",
        ...opcoes
    });

    let dados;

    try {
        dados = await resposta.json();
    } catch {
        throw new Error(
            "O servidor não retornou JSON válido. Confira gerenciar-professores.php."
        );
    }

    if (!resposta.ok || !dados.sucesso) {
        throw new Error(
            dados.mensagem ||
            `Erro na requisição (${resposta.status}).`
        );
    }

    return dados;
}

async function carregarProfessores() {
    if (!conteudo) return;

    const formulario = conteudo.querySelector("#formProfessor");

    if (!formulario) return;

    const seletorArea = conteudo.querySelector("#areaProfessor");
    const lista = conteudo.querySelector("#listaProfessores");
    const mensagemVazia =
        conteudo.querySelector("#mensagemListaVazia");

    if (!seletorArea || !lista) return;

    lista.textContent = "Carregando professores...";

    try {
        const dados = await requisicaoProfessores({
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        preencherAreasDocentes(seletorArea, dados.areas || []);

        renderizarProfessores(
            dados.professores || [],
            lista,
            mensagemVazia
        );
    } catch (erro) {
        console.error("Erro ao carregar professores:", erro);
        lista.textContent = erro.message;

        if (mensagemVazia) mensagemVazia.hidden = true;

        mostrarAviso("Não foi possível carregar os professores.");
    }
}

function preencherAreasDocentes(seletor, areas) {
    const valorAnterior = seletor.value;

    seletor.replaceChildren();

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione a área";
    seletor.appendChild(opcaoInicial);

    areas.forEach(area => {
        const opcao = document.createElement("option");
        opcao.value = String(area.id_area);
        opcao.textContent = area.nome_area;
        seletor.appendChild(opcao);
    });

    if (areas.some(area =>
        String(area.id_area) === valorAnterior
    )) {
        seletor.value = valorAnterior;
    }

    if (areas.length === 0) {
        opcaoInicial.textContent = "Nenhuma área cadastrada";
    }
}

function renderizarProfessores(
    professores,
    lista,
    mensagemVazia
) {
    lista.replaceChildren();

    if (professores.length === 0) {
        if (mensagemVazia) {
            mensagemVazia.textContent = "Nenhum professor cadastrado.";
            mensagemVazia.hidden = false;
        } else {
            lista.textContent = "Nenhum professor cadastrado.";
        }

        return;
    }

    if (mensagemVazia) mensagemVazia.hidden = true;

    professores.forEach(professor => {
        const ativo = Number(professor.ativo) === 1;

        const item = document.createElement("div");
        item.className = "gestao-item-lista";

        const icone = document.createElement("div");
        icone.className = "gestao-item-lista-icone";

        const elementoIcone = document.createElement("i");
        elementoIcone.className = "fa-solid fa-user";
        icone.appendChild(elementoIcone);

        const informacoes = document.createElement("div");
        informacoes.className = "gestao-item-lista-conteudo";

        const area = document.createElement("span");
        area.className = "gestao-item-curso";
        area.textContent = professor.nome_area || "Área não informada";

        const nome = document.createElement("strong");
        nome.textContent = professor.nome;

        const disciplinas = document.createElement("span");
        disciplinas.className = "gestao-professor-detalhe";
        disciplinas.textContent =
            professor.disciplinas || "Nenhuma disciplina informada";

        const status = document.createElement("span");
        status.className = "gestao-professor-detalhe";
        status.textContent = ativo
            ? "Status: Ativo"
            : "Status: Inativo";

        informacoes.append(area, nome, disciplinas, status);

        const acoes = document.createElement("div");
        acoes.className =
            "gestao-acoes-disciplina gestao-acoes-professor";

        // EDITAR: disponível para todos.
        const editar = document.createElement("button");
        editar.type = "button";
        editar.dataset.editarProfessor =
            String(professor.id_professor);
        editar.textContent = "Editar";
        editar.setAttribute(
            "aria-label",
            `Editar ${professor.nome}`
        );

        acoes.appendChild(editar);

        // DESATIVAR ou REATIVAR.
        if (ativo) {
            const desativar = document.createElement("button");
            desativar.type = "button";
            desativar.dataset.desativarProfessor =
                String(professor.id_professor);
            desativar.textContent = "Desativar";
            desativar.setAttribute(
                "aria-label",
                `Desativar ${professor.nome}`
            );

            acoes.appendChild(desativar);
        } else {
            const reativar = document.createElement("button");
            reativar.type = "button";
            reativar.dataset.reativarProfessor =
                String(professor.id_professor);
            reativar.textContent = "Reativar";
            reativar.setAttribute(
                "aria-label",
                `Reativar ${professor.nome}`
            );

            acoes.appendChild(reativar);
        }

        // EXCLUIR: disponível para todos.
        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.dataset.excluirProfessor =
            String(professor.id_professor);
        excluir.textContent = "Excluir";
        excluir.setAttribute(
            "aria-label",
            `Excluir ${professor.nome}`
        );

        acoes.appendChild(excluir);

        item.append(icone, informacoes, acoes);
        lista.appendChild(item);
    });
}

function limparFormularioProfessor() {
    const formulario = conteudo.querySelector("#formProfessor");

    if (!formulario) return;

    formulario.reset();

    conteudo.querySelector("#idProfessor").value = "";

    conteudo.querySelector("#tituloFormularioProfessor").textContent =
        "Adicionar professor";

    const botaoSalvar =
        conteudo.querySelector("#btnSalvarProfessor");

    botaoSalvar.innerHTML =
        '<i class="fa-solid fa-user-plus"></i> Cadastrar professor';

    conteudo.querySelector("#btnCancelarEdicaoProfessor").hidden = true;
}

function inicializarFormularioProfessores() {
    const formulario = conteudo.querySelector("#formProfessor");

    if (!formulario || formulario.dataset.inicializado === "true") {
        return;
    }

    formulario.dataset.inicializado = "true";

    const lista = conteudo.querySelector("#listaProfessores");

    // Cadastrar ou editar professor.
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        const id = conteudo.querySelector("#idProfessor").value;
        const dados = new FormData(formulario);

        dados.set("acao", id ? "editar" : "cadastrar");

        const botaoSalvar =
            conteudo.querySelector("#btnSalvarProfessor");

        botaoSalvar.disabled = true;

        try {
            const resultado = await requisicaoProfessores({
                method: "POST",
                body: dados
            });

            mostrarAviso(
                resultado.mensagem || "Professor salvo com sucesso."
            );

            limparFormularioProfessor();
            await carregarProfessores();
        } catch (erro) {
            console.error("Erro ao salvar professor:", erro);
            mostrarAviso(erro.message || "Não foi possível salvar.");
        } finally {
            botaoSalvar.disabled = false;
        }
    });

    // Cancelar edição.
    const cancelarEdicao =
        conteudo.querySelector("#btnCancelarEdicaoProfessor");

    if (cancelarEdicao) {
        cancelarEdicao.addEventListener(
            "click",
            limparFormularioProfessor
        );
    }

    // Editar, desativar, reativar ou excluir professor.
    lista.addEventListener("click", async evento => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const botaoEditar =
            alvo.closest("[data-editar-professor]");

        const botaoDesativar =
            alvo.closest("[data-desativar-professor]");

        const botaoReativar =
            alvo.closest("[data-reativar-professor]");

        const botaoExcluir =
            alvo.closest("[data-excluir-professor]");

        // REATIVAR.
        if (botaoReativar) {
            const dados = new FormData();
            dados.set("acao", "reativar");
            dados.set(
                "id_professor",
                botaoReativar.dataset.reativarProfessor
            );

            botaoReativar.disabled = true;

            try {
                const resultado = await requisicaoProfessores({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(
                    resultado.mensagem ||
                    "Professor reativado com sucesso."
                );

                await carregarProfessores();
            } catch (erro) {
                console.error("Erro ao reativar professor:", erro);
                mostrarAviso(erro.message);
                botaoReativar.disabled = false;
            }

            return;
        }

        // EXCLUIR DEFINITIVAMENTE.
        if (botaoExcluir) {
            const confirmar = window.confirm(
                "Deseja excluir definitivamente este professor? " +
                "Essa ação não poderá ser desfeita e poderá excluir " +
                "também as disciplinas associadas."
            );

            if (!confirmar) return;

            const dados = new FormData();
            dados.set("acao", "excluir");
            dados.set(
                "id_professor",
                botaoExcluir.dataset.excluirProfessor
            );

            botaoExcluir.disabled = true;

            try {
                const resultado = await requisicaoProfessores({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(
                    resultado.mensagem ||
                    "Professor excluído definitivamente."
                );

                const idEmEdicao =
                    conteudo.querySelector("#idProfessor").value;

                if (
                    idEmEdicao ===
                    botaoExcluir.dataset.excluirProfessor
                ) {
                    limparFormularioProfessor();
                }

                await carregarProfessores();
            } catch (erro) {
                console.error("Erro ao excluir professor:", erro);
                mostrarAviso(erro.message);
                botaoExcluir.disabled = false;
            }

            return;
        }

        // EDITAR.
        if (botaoEditar) {
            try {
                const dados = await requisicaoProfessores({
                    method: "GET",
                    headers: { Accept: "application/json" },
                    cache: "no-store"
                });

                const professor = (dados.professores || []).find(item =>
                    String(item.id_professor) ===
                    botaoEditar.dataset.editarProfessor
                );

                if (!professor) {
                    mostrarAviso("Professor não encontrado.");
                    return;
                }

                conteudo.querySelector("#idProfessor").value =
                    professor.id_professor;

                conteudo.querySelector("#nomeProfessor").value =
                    professor.nome;

                conteudo.querySelector("#areaProfessor").value =
                    String(professor.id_area);

                conteudo.querySelector("#disciplinasProfessor").value =
                    professor.disciplinas || "";

                conteudo.querySelector("#tituloFormularioProfessor")
                    .textContent = "Editar professor";

                conteudo.querySelector("#btnSalvarProfessor").innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';

                conteudo.querySelector(
                    "#btnCancelarEdicaoProfessor"
                ).hidden = false;

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            } catch (erro) {
                console.error("Erro ao abrir professor:", erro);
                mostrarAviso(erro.message);
            }

            return;
        }

        // DESATIVAR.
        if (botaoDesativar) {
            const confirmar = window.confirm(
                "Deseja desativar este professor? " +
                "O registro será mantido no banco e poderá ser reativado."
            );

            if (!confirmar) return;

            const dados = new FormData();
            dados.set("acao", "desativar");
            dados.set(
                "id_professor",
                botaoDesativar.dataset.desativarProfessor
            );

            botaoDesativar.disabled = true;

            try {
                const resultado = await requisicaoProfessores({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(
                    resultado.mensagem || "Professor desativado."
                );

                const idEmEdicao =
                    conteudo.querySelector("#idProfessor").value;

                if (
                    idEmEdicao ===
                    botaoDesativar.dataset.desativarProfessor
                ) {
                    limparFormularioProfessor();
                }

                await carregarProfessores();
            } catch (erro) {
                console.error("Erro ao desativar professor:", erro);
                mostrarAviso(erro.message);
                botaoDesativar.disabled = false;
            }
        }
    });

    carregarProfessores();
}

    // =====================================================
    // INFRAESTRUTURA ESCOLAR
    // =====================================================

    async function requisicaoInfraestrutura(opcoes = {}) {
        const resposta = await fetch(API_INFRAESTRUTURA, {
            credentials: "same-origin",
            cache: "no-store",
            ...opcoes
        });

        let dados;

        try {
            dados = await resposta.json();
        } catch {
            throw new Error(
                "O servidor não retornou JSON válido. Verifique gerenciar-infraestrutura.php."
            );
        }

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || `Erro HTTP ${resposta.status}.`
            );
        }

        return dados;
    }

    // Normalizar caminhos das imagens.
    function caminhoImagemInfraestrutura(caminho) {
        if (!caminho) return "";

        if (/^(https?:)?\/\//i.test(caminho) || caminho.startsWith("/")) {
            return caminho;
        }

        return "../" + caminho.replace(/^(\.\.\/)+/, "");
    }

    // Obter as duas imagens do ambiente.
    function obterImagensInfraestrutura(ambiente) {
        if (Array.isArray(ambiente.imagens)) {
            return ambiente.imagens.filter(Boolean);
        }

        return [
            ambiente.imagem,
            ambiente.imagem2 || ambiente.foto2
        ].filter(Boolean);
    }

    // Limpar formulário.
    function limparFormularioInfraestrutura() {
        const formulario = conteudo.querySelector("#formInfraestrutura");

        if (!formulario) return;

        formulario.reset();

        conteudo.querySelector("#idInfraestrutura").value = "";

        conteudo.querySelector(
            "#tituloFormularioInfraestrutura"
        ).textContent = "Adicionar ambiente";

        conteudo.querySelector(
            "#btnSalvarInfraestrutura"
        ).innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar ambiente';

        conteudo.querySelector(
            "#btnCancelarInfraestrutura"
        ).hidden = true;

        // Limpar as duas pré-visualizações.
        [
            {
                preview: "#previewInfraestrutura",
                saida: '[data-preview-output="infra1"]'
            },
            {
                preview: "#previewInfraestrutura2",
                saida: '[data-preview-output="infra2"]'
            }
        ].forEach(item => {
            const preview = conteudo.querySelector(item.preview);
            const saida = conteudo.querySelector(item.saida);

            if (preview) {
                preview.removeAttribute("src");
                preview.hidden = true;
            }

            if (saida) {
                saida.textContent = "Nenhuma imagem selecionada.";
            }
        });

        const mensagem = conteudo.querySelector("#mensagemInfraestrutura");

        if (mensagem) {
            mensagem.hidden = true;
            mensagem.textContent = "";
        }
    }

    // Pré-visualização de cada foto.
    function configurarPreviewInfraestrutura(input, preview, saida) {
        if (!input || !preview) return;

        input.addEventListener("change", () => {
            const arquivo = input.files?.[0];

            if (saida) {
                saida.textContent = arquivo
                    ? arquivo.name
                    : "Nenhuma imagem selecionada.";
            }

            if (arquivo && arquivo.type.startsWith("image/")) {
                const url = URL.createObjectURL(arquivo);

                preview.src = url;
                preview.hidden = false;
            } else {
                preview.removeAttribute("src");
                preview.hidden = true;
            }
        });
    }

    // Renderizar ambientes cadastrados.
    function renderizarInfraestrutura(ambientes) {
        const lista = conteudo.querySelector("#listaInfraestrutura");

        if (!lista) return;

        lista.replaceChildren();

        if (ambientes.length === 0) {
            const vazio = document.createElement("div");
            vazio.className = "gestao-lista-vazia";

            const icone = document.createElement("i");
            icone.className = "fa-solid fa-building";

            const texto = document.createElement("p");
            texto.textContent =
                "Nenhum ambiente cadastrado. Utilize o formulário acima para adicionar o primeiro.";

            vazio.append(icone, texto);
            lista.appendChild(vazio);

            return;
        }

        ambientes.forEach(ambiente => {
            const item = document.createElement("article");
            item.className = "gestao-item-lista";

            // Fotos do ambiente.
            const galeria = document.createElement("div");

            galeria.style.cssText = `
                display: flex;
                gap: 8px;
                flex-shrink: 0;
                flex-wrap: wrap;
            `;

            const imagens = obterImagensInfraestrutura(ambiente);

            imagens.forEach((caminho, indice) => {
                const imagem = document.createElement("img");

                imagem.src = caminhoImagemInfraestrutura(caminho);
                imagem.alt = `Foto ${indice + 1} de ${ambiente.nome}`;
                imagem.loading = "lazy";

                imagem.style.cssText = `
                    width: 100px;
                    height: 80px;
                    object-fit: cover;
                    border-radius: 8px;
                `;

                imagem.addEventListener("error", () => {
                    imagem.hidden = true;
                });

                galeria.appendChild(imagem);
            });

            if (imagens.length === 0) {
                const semFoto = document.createElement("span");
                semFoto.textContent = "Sem fotos";
                semFoto.className = "gestao-professor-detalhe";

                galeria.appendChild(semFoto);
            }

            // Informações.
            const informacoes = document.createElement("div");
            informacoes.className = "gestao-item-lista-conteudo";

            const nome = document.createElement("strong");
            nome.textContent = ambiente.nome;

            const descricao = document.createElement("p");
            descricao.textContent =
                ambiente.descricao || "Nenhuma descrição informada.";

            const quantidade = document.createElement("span");
            quantidade.className = "gestao-professor-detalhe";
            quantidade.textContent =
                `${imagens.length} ${imagens.length === 1 ? "foto cadastrada" : "fotos cadastradas"}`;

            const status = document.createElement("span");
            status.className = "gestao-professor-detalhe";

            status.textContent = Number(ambiente.ativo) === 1
                ? "Status: Ativo — publicado"
                : "Status: Inativo — desativado";

            informacoes.append(nome, descricao, quantidade, status);

            // Ações.
            const acoes = document.createElement("div");

            acoes.className =
                "gestao-acoes-disciplina gestao-acoes-infraestrutura";

            const editar = document.createElement("button");
            editar.type = "button";
            editar.textContent = "Editar";
            editar.dataset.editarInfraestrutura = ambiente.id_local;

            const alternar = document.createElement("button");
            alternar.type = "button";

            if (Number(ambiente.ativo) === 1) {
                alternar.textContent = "Desativar";
                alternar.dataset.desativarInfraestrutura =
                    ambiente.id_local;
            } else {
                alternar.textContent = "Reativar";
                alternar.dataset.reativarInfraestrutura =
                    ambiente.id_local;
            }

            const excluir = document.createElement("button");
            excluir.type = "button";
            excluir.textContent = "Excluir";
            excluir.dataset.excluirInfraestrutura = ambiente.id_local;

            acoes.append(editar, alternar, excluir);

            item.append(galeria, informacoes, acoes);

            lista.appendChild(item);
        });
    }

    // Carregar ambientes.
    async function carregarInfraestrutura() {
        const lista = conteudo.querySelector("#listaInfraestrutura");

        if (!lista) return;

        lista.textContent = "Carregando ambientes...";

        try {
            const dados = await requisicaoInfraestrutura({
                method: "GET",
                headers: { Accept: "application/json" }
            });

            renderizarInfraestrutura(dados.ambientes || []);

        } catch (erro) {
            console.error("Erro ao carregar infraestrutura:", erro);

            lista.textContent = erro.message;

            mostrarAviso("Não foi possível carregar os ambientes.");
        }
    }

    // Inicializar formulário.
    function inicializarFormularioInfraestrutura() {
        const formulario = conteudo.querySelector("#formInfraestrutura");

        if (!formulario || formulario.dataset.inicializado === "true") {
            return;
        }

        formulario.dataset.inicializado = "true";

        const lista = conteudo.querySelector("#listaInfraestrutura");

        const inputImagem1 = conteudo.querySelector("#imagemInfraestrutura");
        const inputImagem2 = conteudo.querySelector("#imagemInfraestrutura2");

        const preview1 = conteudo.querySelector("#previewInfraestrutura");
        const preview2 = conteudo.querySelector("#previewInfraestrutura2");

        const saida1 = conteudo.querySelector(
            '[data-preview-output="infra1"]'
        );

        const saida2 = conteudo.querySelector(
            '[data-preview-output="infra2"]'
        );

        const cancelar = conteudo.querySelector(
            "#btnCancelarInfraestrutura"
        );

        // Pré-visualizar primeira foto.
        configurarPreviewInfraestrutura(
            inputImagem1,
            preview1,
            saida1
        );

        // Pré-visualizar segunda foto.
        configurarPreviewInfraestrutura(
            inputImagem2,
            preview2,
            saida2
        );

        // Cadastrar ou editar.
        formulario.addEventListener("submit", async evento => {
            evento.preventDefault();

            if (!formulario.reportValidity()) return;

            const id = conteudo.querySelector("#idInfraestrutura").value;

            const dados = new FormData(formulario);

            dados.set("acao", id ? "editar" : "cadastrar");

            const botao = conteudo.querySelector(
                "#btnSalvarInfraestrutura"
            );

            const mensagem = conteudo.querySelector(
                "#mensagemInfraestrutura"
            );

            botao.disabled = true;

            if (mensagem) {
                mensagem.hidden = false;
                mensagem.textContent = "Salvando ambiente...";
            }

            try {
                const resultado = await requisicaoInfraestrutura({
                    method: "POST",
                    body: dados
                });

                mostrarAviso(resultado.mensagem);

                limparFormularioInfraestrutura();

                await carregarInfraestrutura();

            } catch (erro) {
                console.error("Erro ao salvar ambiente:", erro);

                if (mensagem) {
                    mensagem.hidden = false;
                    mensagem.textContent = erro.message;
                }

                mostrarAviso(erro.message);

            } finally {
                botao.disabled = false;
            }
        });

        // Cancelar edição.
        if (cancelar) {
            cancelar.addEventListener(
                "click",
                limparFormularioInfraestrutura
            );
        }

        // Ações da listagem.
        lista.addEventListener("click", async evento => {
            const alvo = evento.target;

            if (!(alvo instanceof Element)) return;

            const editar = alvo.closest("[data-editar-infraestrutura]");
            const desativar = alvo.closest("[data-desativar-infraestrutura]");
            const reativar = alvo.closest("[data-reativar-infraestrutura]");
            const excluir = alvo.closest("[data-excluir-infraestrutura]");

            if (!editar && !desativar && !reativar && !excluir) return;

            try {

                // EDITAR.
                if (editar) {
                    const dados = await requisicaoInfraestrutura({
                        method: "GET",
                        headers: { Accept: "application/json" }
                    });

                    const ambiente = (dados.ambientes || []).find(item =>
                        String(item.id_local) ===
                        editar.dataset.editarInfraestrutura
                    );

                    if (!ambiente) {
                        throw new Error("Ambiente não encontrado.");
                    }

                    const imagens = obterImagensInfraestrutura(ambiente);

                    conteudo.querySelector("#idInfraestrutura").value =
                        ambiente.id_local;

                    conteudo.querySelector("#nomeInfraestrutura").value =
                        ambiente.nome || "";

                    conteudo.querySelector(
                        "#descricaoInfraestrutura"
                    ).value = ambiente.descricao || "";

                    inputImagem1.value = "";
                    inputImagem2.value = "";

                    // Primeira foto atual.
                    if (preview1) {
                        if (imagens[0]) {
                            preview1.src =
                                caminhoImagemInfraestrutura(imagens[0]);

                            preview1.hidden = false;
                        } else {
                            preview1.removeAttribute("src");
                            preview1.hidden = true;
                        }
                    }

                    // Segunda foto atual.
                    if (preview2) {
                        if (imagens[1]) {
                            preview2.src =
                                caminhoImagemInfraestrutura(imagens[1]);

                            preview2.hidden = false;
                        } else {
                            preview2.removeAttribute("src");
                            preview2.hidden = true;
                        }
                    }

                    if (saida1) {
                        saida1.textContent = imagens[0]
                            ? "Foto atual mantida. Selecione outra para substituí-la."
                            : "Nenhuma foto cadastrada.";
                    }

                    if (saida2) {
                        saida2.textContent = imagens[1]
                            ? "Foto atual mantida. Selecione outra para substituí-la."
                            : "Nenhuma segunda foto cadastrada.";
                    }

                    conteudo.querySelector(
                        "#tituloFormularioInfraestrutura"
                    ).textContent = "Editar ambiente";

                    conteudo.querySelector(
                        "#btnSalvarInfraestrutura"
                    ).innerHTML =
                        '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';

                    cancelar.hidden = false;

                    formulario.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;
                }

                let acao;
                let id;

                if (desativar) {
                    acao = "desativar";
                    id = desativar.dataset.desativarInfraestrutura;

                    if (!confirm(
                        "Desativar este ambiente? Ele deixará de aparecer no site público."
                    )) return;

                } else if (reativar) {
                    acao = "reativar";
                    id = reativar.dataset.reativarInfraestrutura;

                    if (!confirm("Deseja reativar este ambiente?")) return;

                } else {
                    acao = "excluir";
                    id = excluir.dataset.excluirInfraestrutura;

                    if (!confirm(
                        "Excluir definitivamente este ambiente e suas duas fotos? Esta ação não pode ser desfeita."
                    )) return;
                }

                const dados = new FormData();

                dados.set("acao", acao);
                dados.set("id_local", id);

                const resultado = await requisicaoInfraestrutura({
                    method: "POST",
                    body: dados
                });

                const idEmEdicao =
                    conteudo.querySelector("#idInfraestrutura").value;

                if (idEmEdicao === String(id)) {
                    limparFormularioInfraestrutura();
                }

                mostrarAviso(resultado.mensagem);

                await carregarInfraestrutura();

            } catch (erro) {
                console.error("Erro ao gerenciar infraestrutura:", erro);

                mostrarAviso(
                    erro.message || "Não foi possível executar a ação."
                );
            }
        });

        carregarInfraestrutura();
    }



    // =====================================================
    // FORMULÁRIOS DAS DEMAIS SEÇÕES
    // =====================================================


    const API_NORMAS = "../php/gerenciar-normas.php";

    
async function carregarNormas() {
    const area = conteudo?.querySelector("#normasDocumentoAtual");
    const formulario = conteudo?.querySelector("#formNormas");

    if (!area || !formulario) return;

    area.textContent = "Carregando documento...";

    try {
        const resposta = await fetch(API_NORMAS, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Não foi possível carregar o documento."
            );
        }

        const documento = dados.documento;

        // CASO NÃO EXISTA DOCUMENTO CADASTRADO
        if (!documento) {
            area.innerHTML = `
                <div class="gestao-lista-vazia">
                    <h3>Nenhum documento cadastrado</h3>
                    <p>
                        Preencha os campos e envie o PDF para cadastrar
                        o primeiro documento.
                    </p>
                </div>
            `;

            formulario.querySelector("#normasTitulo").value =
                "Regimento Escolar";

            formulario.querySelector("#normasAno").value =
                new Date().getFullYear();

            formulario.querySelector("#normasDescricao").value = "";

            formulario.querySelector("#normasProvisoria").value = "1";

            return;
        }

        // PREENCHIMENTO DO FORMULÁRIO
        formulario.querySelector("#normasTitulo").value =
            documento.titulo || "";

        formulario.querySelector("#normasAno").value =
            documento.ano_versao || "";

        formulario.querySelector("#normasDescricao").value =
            documento.descricao || "";

        formulario.querySelector("#normasProvisoria").value =
            String(documento.provisoria);

        // DADOS DO DOCUMENTO
        const titulo = escaparHTML(
            documento.titulo || "Regimento Escolar"
        );

        const descricao = escaparHTML(
            documento.descricao || "Nenhuma descrição informada."
        );

        const ano = escaparHTML(
            String(documento.ano_versao || "")
        );

        const caminho = String(documento.caminho_arquivo || "");

        // VALIDAÇÃO DO CAMINHO DO PDF
        const caminhoValido =
            /^documentos\/[a-zA-Z0-9._-]+\.pdf$/i.test(caminho);

        const linkPDF = caminhoValido
            ? `<a href="../${encodeURI(caminho)}"
                   target="_blank"
                   rel="noopener noreferrer">
                    <i class="fa-solid fa-file-pdf"></i>
                    Abrir PDF atual
               </a>`
            : "<p>O caminho do PDF precisa ser verificado.</p>";

        // SITUAÇÃO DO DOCUMENTO
        const situacao = Number(documento.provisoria) === 1
            ? "Provisório"
            : "Definitivo";

        const classeSituacao = Number(documento.provisoria) === 1
            ? "normas-status-provisorio"
            : "normas-status-definitivo";

        // EXIBIÇÃO DO DOCUMENTO CADASTRADO
        area.innerHTML = `
            <div class="gestao-documento-atual">

                <div class="normas-documento-cabecalho">

                    <div class="normas-documento-icone">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>

                    <div class="normas-documento-identificacao">

                        <span class="normas-documento-categoria">
                            DOCUMENTO INSTITUCIONAL
                        </span>

                        <h3>${titulo}</h3>

                        <div class="normas-documento-informacoes">

                            <span>
                                <i class="fa-solid fa-calendar"></i>
                                Versão ${ano}
                            </span>

                            <span class="${classeSituacao}">
                                ${situacao}
                            </span>

                        </div>
                    </div>
                </div>

                <div class="normas-documento-descricao">
                    <p>${descricao}</p>
                </div>

                ${Number(documento.provisoria) === 1 ? `
                    <div class="normas-documento-aviso">
                        <i class="fa-solid fa-circle-exclamation"></i>

                        <p>
                            Documento disponibilizado para consulta provisória.
                            Pode estar desatualizado; confirme com a instituição
                            se existe uma versão mais recente.
                        </p>
                    </div>
                ` : ""}

                <div class="normas-documento-rodape">
                    ${linkPDF}
                </div>

            </div>
        `;

    } catch (erro) {
        console.error("Erro ao carregar normas:", erro);

        area.textContent =
            erro.message ||
            "Erro ao carregar o documento. Verifique sua sessão administrativa.";
    }
}


    function escaparHTML(valor) {
        return String(valor).replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function inicializarFormularioNormas() {
        const formulario = conteudo?.querySelector("#formNormas");

        if (!formulario || formulario.dataset.inicializado === "true") return;

        formulario.dataset.inicializado = "true";

        formulario.addEventListener("submit", async evento => {
            evento.preventDefault();

            if (!formulario.reportValidity()) return;

            const botao = formulario.querySelector('[type="submit"]');
            const mensagem = formulario.querySelector("#normasMensagem");
            const dadosFormulario = new FormData(formulario);

            if (botao) botao.disabled = true;

            if (mensagem) {
                mensagem.hidden = false;
                mensagem.textContent = "Salvando alterações...";
            }

            try {
                const resposta = await fetch(API_NORMAS, {
                    method: "POST",
                    body: dadosFormulario,
                    credentials: "same-origin",
                    cache: "no-store"
                });

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {
                    throw new Error(dados.mensagem || "Não foi possível salvar as alterações.");
                }

                if (mensagem) {
                    mensagem.textContent = dados.mensagem || "Documento atualizado com sucesso.";
                }

                formulario.querySelector("#normasPdf").value = "";

                const saida = formulario.querySelector('[data-preview-output="normas"]');
                if (saida) saida.textContent = "Nenhum arquivo novo selecionado.";

                mostrarAviso(dados.mensagem || "Regimento Escolar atualizado com sucesso.");

                await carregarNormas();

            } catch (erro) {
                console.error("Erro ao salvar normas:", erro);

                if (mensagem) {
                    mensagem.hidden = false;
                    mensagem.textContent = erro.message || "Erro ao salvar o documento.";
                } else {
                    mostrarAviso(erro.message || "Erro ao salvar o documento.");
                }
            } finally {
                if (botao) botao.disabled = false;
            }
        });

        carregarNormas();
    }

    
    // =====================================================
    // INFORMAÇÕES INSTITUCIONAIS
    // =====================================================

    async function inicializarFormularioInstitucional() {
        const formulario = conteudo?.querySelector("#formConfiguracoes");

        if (!formulario || formulario.dataset.inicializado === "true") {
            return;
        }

        formulario.dataset.inicializado = "true";

        const botaoSalvar = formulario.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        // Carregar as informações já cadastradas.
        try {
            const resposta = await fetch(API_CONFIGURACOES, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            });

            const resultado = await resposta.json();

            if (!resposta.ok || !resultado.sucesso) {
                throw new Error(
                    resultado.mensagem ||
                    "Não foi possível carregar as informações institucionais."
                );
            }

            Object.entries(resultado.dados).forEach(([campo, valor]) => {
                const elemento = formulario.elements.namedItem(campo);

                if (elemento && "value" in elemento) {
                    elemento.value = valor ?? "";
                }
            });
        } catch (erro) {
            console.error("Erro ao carregar informações institucionais:", erro);
            mostrarAviso(erro.message);
        }

        // Salvar as alterações.
        formulario.addEventListener("submit", async evento => {
            evento.preventDefault();

            if (!formulario.reportValidity()) {
                return;
            }

            const textoOriginal = botaoSalvar
                ? botaoSalvar.innerHTML
                : "";

            if (botaoSalvar) {
                botaoSalvar.disabled = true;

                if (botaoSalvar.tagName === "BUTTON") {
                    botaoSalvar.textContent = "Salvando...";
                } else {
                    botaoSalvar.value = "Salvando...";
                }
            }

            try {
                const resposta = await fetch(API_SALVAR_CONFIGURACOES, {
                    method: "POST",
                    credentials: "same-origin",
                    cache: "no-store",
                    body: new FormData(formulario),
                    headers: {
                        Accept: "application/json"
                    }
                });

                const resultado = await resposta.json();

                if (!resposta.ok || !resultado.sucesso) {
                    throw new Error(
                        resultado.mensagem ||
                        "Não foi possível salvar as informações."
                    );
                }

                mostrarAviso(
                    resultado.mensagem ||
                    "Informações institucionais salvas com sucesso."
                );
            } catch (erro) {
                console.error("Erro ao salvar informações institucionais:", erro);
                mostrarAviso(erro.message);
            } finally {
                if (botaoSalvar) {
                    botaoSalvar.disabled = false;

                    if (botaoSalvar.tagName === "BUTTON") {
                        botaoSalvar.innerHTML = textoOriginal;
                    } else {
                        botaoSalvar.value = textoOriginal;
                    }
                }
            }
        });
    }
// =====================================================
// CADASTRO DE SISTEMAS / DOMÍNIOS
// =====================================================


    // =====================================================
    // GRADES CURRICULARES
    // =====================================================

    const API_GRADES = "../php/listar-grades-gestao.php";
    const API_EXCLUIR_GRADE = "../php/excluir-grade-curricular.php";

    async function carregarGradesGestao() {
        const lista = conteudo.querySelector("#listaGradesGestao");

        if (!lista) return;

        lista.textContent = "Carregando materiais cadastrados...";

        try {
            const resposta = await fetch(API_GRADES, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem || "Não foi possível carregar os materiais."
                );
            }

            renderizarGradesGestao(dados.grades || [], lista);

        } catch (erro) {
            console.error("Erro ao carregar grades curriculares:", erro);
            lista.textContent = erro.message;
            mostrarAviso("Não foi possível carregar os materiais.");
        }
    }

    
function renderizarGradesGestao(grades, lista) {
    lista.replaceChildren();

    if (grades.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "gestao-lista-vazia";

        const texto = document.createElement("p");
        texto.textContent =
            "Nenhuma grade curricular cadastrada. Os materiais enviados aparecerão aqui.";

        vazio.appendChild(texto);
        lista.appendChild(vazio);
        return;
    }

    const cursos = [
        { valor: "informatica", nome: "Informática" },
        { valor: "redes", nome: "Redes de Computadores" }
    ];

    cursos.forEach(curso => {
        const gradesCurso = grades.filter(
            grade => grade.curso === curso.valor
        );

        if (gradesCurso.length === 0) return;

        const grupo = document.createElement("section");
        grupo.className = "gestao-grupo-grades";

        const tituloCurso = document.createElement("h3");
        tituloCurso.innerHTML = `
            <i class="fa-solid fa-graduation-cap"></i>
            ${curso.nome}
        `;

        grupo.appendChild(tituloCurso);

        const listaCurso = document.createElement("div");
        listaCurso.className = "gestao-lista-grades";

        gradesCurso.forEach(grade => {
            const item = document.createElement("article");
            item.className = "gestao-item-grade";

            const icone = document.createElement("div");
            icone.className = "gestao-grade-icone";
            icone.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';

            const informacoes = document.createElement("div");
            informacoes.className = "gestao-grade-informacoes";

            const titulo = document.createElement("strong");
            titulo.textContent = grade.titulo;

            const series = document.createElement("span");
            series.className = "gestao-grade-series";

            const seriesSelecionadas = Array.isArray(grade.series)
                ? grade.series.map(Number)
                : [];

            series.textContent = seriesSelecionadas.length > 0
                ? `Séries: ${seriesSelecionadas
                    .sort((a, b) => a - b)
                    .map(serie => `${serie}ª`)
                    .join(", ")}`
                : "Nenhuma série vinculada";

            informacoes.append(titulo, series);

            const acoes = document.createElement("div");
acoes.className = "gestao-acoes-grade";

const botaoVisualizar = document.createElement("button");
botaoVisualizar.type = "button";
botaoVisualizar.className = "gestao-grade-visualizar";
botaoVisualizar.textContent = "Visualizar PDF";
botaoVisualizar.dataset.visualizarGrade =
    String(grade.id_grade);

const botaoSubstituir = document.createElement("button");
botaoSubstituir.type = "button";
botaoSubstituir.className = "gestao-grade-substituir";
botaoSubstituir.textContent = "Substituir";
botaoSubstituir.dataset.substituirGrade =
    String(grade.id_grade);

const botaoExcluir = document.createElement("button");
botaoExcluir.type = "button";
botaoExcluir.className = "gestao-grade-excluir";
botaoExcluir.textContent = "Excluir";
botaoExcluir.dataset.excluirGrade =
    String(grade.id_grade);

acoes.append(
    botaoVisualizar,
    botaoSubstituir,
    botaoExcluir
);

            item.append(icone, informacoes, acoes);
            listaCurso.appendChild(item);
        });

        grupo.appendChild(listaCurso);
        lista.appendChild(grupo);
    });
}


    
function inicializarGradesGestao() {
    const lista = conteudo.querySelector("#listaGradesGestao");
    const visualizador = conteudo.querySelector("#visualizadorGradeGestao");
    const iframe = conteudo.querySelector("#iframeGradeGestao");
    const titulo = conteudo.querySelector("#tituloGradeGestao");

    const modalExcluir = conteudo.querySelector("#modalExcluirGrade");
    const cancelarExclusao = conteudo.querySelector("#cancelarExclusaoGrade");
    const confirmarExclusao = conteudo.querySelector("#confirmarExclusaoGrade");

    if (
        !lista || !visualizador || !iframe || !titulo ||
        !modalExcluir || !cancelarExclusao || !confirmarExclusao
    ) return;

    if (lista.dataset.inicializado === "true") {
        carregarGradesGestao();
        return;
    }

    lista.dataset.inicializado = "true";

    let idGradeParaExcluir = null;

    function fecharModalExclusao() {
        modalExcluir.hidden = true;
        idGradeParaExcluir = null;
    }

    cancelarExclusao.addEventListener("click", fecharModalExclusao);

    modalExcluir.addEventListener("click", evento => {
        if (evento.target === modalExcluir) {
            fecharModalExclusao();
        }
    });

    lista.addEventListener("click", async evento => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        // VISUALIZAR GRADE
        const botaoVisualizar = alvo.closest("[data-visualizar-grade]");

        if (botaoVisualizar) {
            const id = botaoVisualizar.dataset.visualizarGrade;

            if (!id || !/^\d+$/.test(id)) return;

            titulo.textContent = "Visualização da grade curricular";

            iframe.src =
                `../php/visualizar-grade-curricular.php?id=${encodeURIComponent(id)}`;

            visualizador.hidden = false;

            visualizador.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            return;
        }

        // SUBSTITUIR GRADE
        const botaoSubstituir = alvo.closest("[data-substituir-grade]");

        if (botaoSubstituir) {
            const id = botaoSubstituir.dataset.substituirGrade;

            if (!id || !/^\d+$/.test(id)) return;

            try {
                const resposta = await fetch(API_GRADES, {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const resultado = await resposta.json();

                if (!resposta.ok || !resultado.sucesso) {
                    throw new Error(
                        resultado.mensagem ||
                        "Não foi possível localizar a grade."
                    );
                }

                const grade = (resultado.grades || []).find(item =>
                    String(item.id_grade) === String(id)
                );

                if (!grade) {
                    throw new Error("Grade curricular não encontrada.");
                }

                const formulario =
                    conteudo.querySelector("#formGradeCurricular");

                if (!formulario) return;

                // Identifica o material que será atualizado.
                formulario.querySelector('[name="id_grade"]').value =
                    grade.id_grade;

                // Preenche o curso e o título.
                formulario.elements.curso.value = grade.curso;
                formulario.elements.titulo.value = grade.titulo;

                // Marca as séries vinculadas ao material.
                const seriesSelecionadas = Array.isArray(grade.series)
                    ? grade.series.map(Number)
                    : [];

                formulario.querySelectorAll(
                    'input[name="series[]"]'
                ).forEach(checkbox => {
                    checkbox.checked = seriesSelecionadas.includes(
                        Number(checkbox.value)
                    );
                });

                // Solicita o novo PDF.
                formulario.elements.pdf.value = "";

                const preview = formulario.querySelector(
                    '[data-preview-output="aprofundamento"]'
                );

                if (preview) {
                    preview.textContent =
                        "Selecione o novo PDF para substituir o material atual.";
                }

                const botaoSalvar = formulario.querySelector(
                    'button[type="submit"]'
                );

                if (botaoSalvar) {
                    botaoSalvar.innerHTML =
                        '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';
                }

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                mostrarAviso(
                    "Material selecionado. Escolha o novo PDF para substituí-lo."
                );

            } catch (erro) {
                console.error("Erro ao localizar grade:", erro);
                mostrarAviso(erro.message);
            }

            return;
        }

        // ABRIR MODAL DE EXCLUSÃO
        const botaoExcluir = alvo.closest("[data-excluir-grade]");

        if (botaoExcluir) {
            const id = botaoExcluir.dataset.excluirGrade;

            if (!id || !/^\d+$/.test(id)) return;

            idGradeParaExcluir = id;
            modalExcluir.hidden = false;
        }
    });

    // CONFIRMAR EXCLUSÃO
    confirmarExclusao.addEventListener("click", async () => {
        if (!idGradeParaExcluir) return;

        confirmarExclusao.disabled = true;

        confirmarExclusao.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';

        try {
            const formulario = new FormData();
            formulario.append("id_grade", idGradeParaExcluir);

            const resposta = await fetch(API_EXCLUIR_GRADE, {
                method: "POST",
                credentials: "same-origin",
                body: formulario
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem ||
                    "Não foi possível excluir a grade."
                );
            }

            fecharModalExclusao();

            iframe.src = "";
            visualizador.hidden = true;

            mostrarAviso(
                dados.mensagem ||
                "Grade curricular excluída com sucesso."
            );

            await carregarGradesGestao();

        } catch (erro) {
            console.error("Erro ao excluir grade:", erro);
            mostrarAviso(
                erro.message || "Não foi possível excluir a grade."
            );
        } finally {
            confirmarExclusao.disabled = false;

            confirmarExclusao.innerHTML =
                '<i class="fa-solid fa-trash"></i> Excluir definitivamente';
        }
    });

    carregarGradesGestao();
}

   

    // =====================================================
    // CADASTRO E GERENCIAMENTO DE SISTEMAS TCC
    // =====================================================

    const API_TCC = "../php/gerenciar-tccs.php";
    

    async function requisicaoTCC(opcoes = {}) {
        const resposta = await fetch(API_TCC, {
            credentials: "same-origin",
            cache: "no-store",
            ...opcoes
        });

        let dados;

        try {
            dados = await resposta.json();
        } catch {
            throw new Error(
                "O servidor não retornou JSON válido. Verifique gerenciar-tccs.php."
            );
        }

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || `Erro na requisição (${resposta.status}).`
            );
        }

        return dados;
    }

    // CARREGAR SISTEMAS
    async function carregarTCCs() {
        const lista = conteudo.querySelector("#listaTCCs");

        if (!lista) return;

        lista.textContent = "Carregando sistemas...";

        try {
            const dados = await requisicaoTCC({
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            });

            renderizarTCCs(dados.sistemas || [], lista);

        } catch (erro) {
            console.error("Erro ao carregar sistemas:", erro);

            lista.textContent = erro.message;

            mostrarAviso("Não foi possível carregar os sistemas.");
        }
    }

  
    // LIMPAR FORMULÁRIO
    function limparFormularioTCC() {
        const formulario = conteudo.querySelector("#formTCC");

        if (!formulario) return;

        formulario.reset();

        conteudo.querySelector("#idTCC").value = "";

        conteudo.querySelector("#tituloFormularioTCC").textContent =
            "Adicionar sistema de TCC";

        conteudo.querySelector("#btnSalvarTCC").innerHTML =
            '<i class="fa-solid fa-plus"></i> Adicionar sistema';

        const cancelar = conteudo.querySelector("#btnCancelarTCC");

        if (cancelar) cancelar.hidden = true;

        const mensagem = conteudo.querySelector("#mensagemTCC");

        if (mensagem) {
            mensagem.hidden = true;
            mensagem.textContent = "";
        }

        const preview = formulario.querySelector(
            '[data-preview-output="tcc"]'
        );

        if (preview) {
            preview.textContent = "Nenhuma logo selecionada.";
        }
    }

  
// RENDERIZAR SISTEMAS
function renderizarTCCs(sistemas, lista) {
    lista.replaceChildren();

    if (sistemas.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "gestao-lista-vazia";

        const icone = document.createElement("i");
        icone.className = "fa-solid fa-laptop-code";

        const texto = document.createElement("p");
        texto.textContent =
            "Nenhum sistema cadastrado. Utilize o formulário acima para adicionar o primeiro.";

        vazio.append(icone, texto);
        lista.appendChild(vazio);
        return;
    }

    sistemas.forEach(sistema => {
        const ativo = Number(sistema.ativo) === 1;

        const item = document.createElement("article");
        item.className = "gestao-item-lista gestao-item-tcc";

        const imagem = document.createElement("img");
        imagem.className = "gestao-tcc-logo";
        imagem.alt = `Logo de ${sistema.titulo}`;
        imagem.loading = "lazy";

        if (sistema.logo) {
            imagem.src = "../" + sistema.logo.replace(/^\/+/, "");
        } else {
            imagem.hidden = true;
        }

        imagem.addEventListener("error", () => {
            imagem.hidden = true;
        });

        const informacoes = document.createElement("div");
        informacoes.className = "gestao-item-lista-conteudo";

        const titulo = document.createElement("strong");
        titulo.textContent = sistema.titulo;

        const descricao = document.createElement("p");
        descricao.textContent =
            sistema.descricao || "Nenhuma descrição informada.";

        const dominio = document.createElement("a");
        dominio.href = sistema.endereco;
        dominio.textContent = sistema.endereco;
        dominio.target = "_blank";
        dominio.rel = "noopener noreferrer";
        dominio.className = "gestao-tcc-dominio";

        const status = document.createElement("span");
        status.className = "gestao-professor-detalhe";
        status.textContent = ativo
            ? "Status: Ativo — publicado na Área do Aluno"
            : "Status: Inativo — não aparece para os alunos";

        informacoes.append(titulo, descricao, dominio, status);

        const acoes = document.createElement("div");
        acoes.className = "gestao-acoes-disciplina";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.textContent = "Editar";
        editar.dataset.editarTcc = sistema.id_tcc;

        const alternar = document.createElement("button");
        alternar.type = "button";

        if (ativo) {
            alternar.textContent = "Desativar";
            alternar.dataset.desativarTcc = sistema.id_tcc;
        } else {
            alternar.textContent = "Reativar";
            alternar.dataset.reativarTcc = sistema.id_tcc;
        }

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.textContent = "Excluir";
        excluir.dataset.excluirTcc = sistema.id_tcc;

        acoes.append(editar, alternar, excluir);
        item.append(imagem, informacoes, acoes);
        lista.appendChild(item);
    });
}


// INICIALIZAR FORMULÁRIO E LISTAGEM
function inicializarFormularioTCC() {
    const formulario = conteudo.querySelector("#formTCC");

    if (!formulario) return;

    const lista = conteudo.querySelector("#listaTCCs");

    if (!lista) return;

    if (formulario.dataset.inicializado === "true") {
        carregarTCCs();
        return;
    }

    formulario.dataset.inicializado = "true";

    const botaoSalvar = formulario.querySelector("#btnSalvarTCC");
    const botaoCancelar = formulario.querySelector("#btnCancelarTCC");
    const mensagem = formulario.querySelector("#mensagemTCC");

    // CADASTRAR OU EDITAR
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        const id = conteudo.querySelector("#idTCC").value;
        const dados = new FormData(formulario);

        dados.set("acao", id ? "editar" : "cadastrar");

        botaoSalvar.disabled = true;

        try {
            const resultado = await requisicaoTCC({
                method: "POST",
                body: dados
            });

            mostrarAviso(resultado.mensagem);

            limparFormularioTCC();
            await carregarTCCs();

        } catch (erro) {
            console.error("Erro ao salvar TCC:", erro);

            if (mensagem) {
                mensagem.hidden = false;
                mensagem.textContent = erro.message;
            }

            mostrarAviso(erro.message);

        } finally {
            botaoSalvar.disabled = false;
        }
    });

    // CANCELAR EDIÇÃO
    if (botaoCancelar) {
        botaoCancelar.addEventListener("click", limparFormularioTCC);
    }

    // AÇÕES DA LISTAGEM
    lista.addEventListener("click", async evento => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const editar = alvo.closest("[data-editar-tcc]");
        const desativar = alvo.closest("[data-desativar-tcc]");
        const reativar = alvo.closest("[data-reativar-tcc]");
        const excluir = alvo.closest("[data-excluir-tcc]");

        if (!editar && !desativar && !reativar && !excluir) return;

        const botao = editar || desativar || reativar || excluir;

        const id = editar
            ? editar.dataset.editarTcc
            : desativar
                ? desativar.dataset.desativarTcc
                : reativar
                    ? reativar.dataset.reativarTcc
                    : excluir.dataset.excluirTcc;

        if (!id) {
            mostrarAviso("Não foi possível identificar o sistema.");
            return;
        }

        botao.disabled = true;

        try {
            // EDITAR
            if (editar) {
                const dados = await requisicaoTCC({
                    method: "GET",
                    headers: { Accept: "application/json" }
                });

                const sistema = (dados.sistemas || []).find(item =>
                    String(item.id_tcc) === String(id)
                );

                if (!sistema) {
                    throw new Error("Sistema não encontrado.");
                }

                conteudo.querySelector("#idTCC").value = sistema.id_tcc;
                conteudo.querySelector("#tituloTCC").value = sistema.titulo || "";
                conteudo.querySelector("#enderecoTCC").value = sistema.endereco || "";
                conteudo.querySelector("#descricaoTCC").value = sistema.descricao || "";
                conteudo.querySelector("#logoTCC").value = "";

                conteudo.querySelector("#tituloFormularioTCC").textContent =
                    "Editar sistema de TCC";

                botaoSalvar.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';

                if (botaoCancelar) botaoCancelar.hidden = false;

                const preview = formulario.querySelector(
                    '[data-preview-output="tcc"]'
                );

                if (preview) {
                    preview.textContent = sistema.logo
                        ? "Logo atual mantida. Selecione outra para substituí-la."
                        : "Nenhuma logo selecionada.";
                }

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                return;
            }

            let acao;
            let confirmacao;

            if (desativar) {
                acao = "desativar";
                confirmacao =
                    "Deseja desativar este sistema? Ele deixará de aparecer na Área do Aluno.";
            } else if (reativar) {
                acao = "reativar";
                confirmacao =
                    "Deseja reativar este sistema e publicá-lo novamente na Área do Aluno?";
            } else {
                acao = "excluir";
                confirmacao =
                    "Deseja excluir definitivamente este sistema e sua logo? Esta ação não poderá ser desfeita.";
            }

            if (!window.confirm(confirmacao)) return;

            const dados = new FormData();
            dados.set("acao", acao);
            dados.set("id_tcc", id);

            const resultado = await requisicaoTCC({
                method: "POST",
                body: dados
            });

            if (
                conteudo.querySelector("#idTCC").value === String(id)
            ) {
                limparFormularioTCC();
            }

            mostrarAviso(resultado.mensagem);
            await carregarTCCs();

        } catch (erro) {
            console.error("Erro ao gerenciar sistema:", erro);
            mostrarAviso(erro.message || "Não foi possível executar a ação.");

        } finally {
            if (botao.isConnected) {
                botao.disabled = false;
            }
        }
    });

    carregarTCCs();
}





async function inicializarAcessosProfessores() {
    const formulario = conteudo.querySelector("#formAcessoProfessor");
    const lista = conteudo.querySelector("#listaAcessosProfessores");
    const mensagemVazia = conteudo.querySelector("#mensagemAcessosVazios");

    if (!formulario || formulario.dataset.inicializado === "true") return;

    formulario.dataset.inicializado = "true";

    const select = formulario.querySelector("#idProfessorAcesso");

    async function carregarProfessoresDisponiveis() {
        if (!select) return;

        try {
            const resposta = await fetch(API_PROFESSORES, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json" }
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(dados.mensagem || "Erro ao carregar professores.");
            }

            select.replaceChildren();

            const opcaoInicial = document.createElement("option");
            opcaoInicial.value = "";
            opcaoInicial.textContent = "Selecione um professor";
            select.appendChild(opcaoInicial);

            const professores = (dados.professores || []).filter(
                professor => Number(professor.ativo) === 1
            );

            professores.forEach(professor => {
                const opcao = document.createElement("option");
                opcao.value = professor.id_professor;
                opcao.textContent = professor.nome;
                select.appendChild(opcao);
            });

            if (professores.length === 0) {
                opcaoInicial.textContent = "Nenhum professor ativo cadastrado";
            }

        } catch (erro) {
            console.error("Erro ao carregar professores:", erro);
            mostrarAviso(erro.message);
        }
    }

    async function requisitarAcessos(dados) {
        const resposta = await fetch(API_ACESSOS_PROFESSORES, {
            method: "POST",
            body: dados,
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Erro ao processar acessos.");
        }

        return resultado;
    }

    // =====================================================
    // CARREGAR ACESSOS
    // =====================================================

    async function carregarAcessos() {
        if (!lista) return;

        const dados = new FormData();
        dados.set("acao", "listar");

        try {
            const resultado = await requisitarAcessos(dados);
            const acessos = resultado.acessos || [];

            lista.replaceChildren();

            if (mensagemVazia) {
                mensagemVazia.hidden = acessos.length > 0;
            }

            acessos.forEach(acesso => {
                const ativo = Number(acesso.ativo) === 1;

                const item = document.createElement("article");
                item.className = "gestao-acesso-card";

                // CABEÇALHO
                const cabecalho = document.createElement("div");
                cabecalho.className = "gestao-acesso-cabecalho";

                const nome = document.createElement("h3");
                nome.className = "gestao-acesso-nome";
                nome.textContent = acesso.nome || "Professor";

                const status = document.createElement("span");
                status.className = ativo
                    ? "gestao-acesso-status ativo"
                    : "gestao-acesso-status inativo";

                status.textContent = ativo ? "Acesso ativo" : "Acesso inativo";

                cabecalho.append(nome, status);

                // DETALHES
                const detalhes = document.createElement("div");
                detalhes.className = "gestao-acesso-detalhes";

                const matricula = document.createElement("div");

                const tituloMatricula = document.createElement("strong");
                tituloMatricula.textContent = "Matrícula";

                const valorMatricula = document.createElement("span");
                valorMatricula.textContent = acesso.matricula || "Não informada";

                matricula.append(tituloMatricula, valorMatricula);

                const email = document.createElement("div");

                const tituloEmail = document.createElement("strong");
                tituloEmail.textContent = "E-mail institucional";

                const valorEmail = document.createElement("span");
                valorEmail.textContent =
                    acesso.email_institucional || "Não informado";

                email.append(tituloEmail, valorEmail);

                detalhes.append(matricula, email);

                // AÇÕES
                const acoes = document.createElement("div");
                acoes.className = "gestao-acesso-acoes";

                const botaoStatus = document.createElement("button");
                botaoStatus.type = "button";

                if (ativo) {
                    botaoStatus.textContent = "Desativar";
                    botaoStatus.dataset.acaoAcesso = "desativar";
                } else {
                    botaoStatus.textContent = "Reativar";
                    botaoStatus.dataset.acaoAcesso = "reativar";
                }

                botaoStatus.dataset.idAcesso = acesso.id;

                const botaoExcluir = document.createElement("button");
                botaoExcluir.type = "button";
                botaoExcluir.textContent = "Excluir";
                botaoExcluir.dataset.acaoAcesso = "excluir";
                botaoExcluir.dataset.idAcesso = acesso.id;

                acoes.append(botaoStatus, botaoExcluir);

                item.append(cabecalho, detalhes, acoes);
                lista.appendChild(item);
            });

        } catch (erro) {
            console.error("Erro ao carregar acessos:", erro);
            lista.textContent = erro.message;

            if (mensagemVazia) {
                mensagemVazia.hidden = true;
            }
        }
    }

    // =====================================================
    // CADASTRAR ACESSO
    // =====================================================

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

        const dados = new FormData(formulario);
        dados.set("acao", "cadastrar");

        try {
            const resultado = await requisitarAcessos(dados);

            mostrarAviso(resultado.mensagem);
            formulario.reset();

            await carregarAcessos();

        } catch (erro) {
            mostrarAviso(erro.message);
        }
    });

    // =====================================================
    // DESATIVAR, REATIVAR E EXCLUIR
    // =====================================================

    if (lista) {
        lista.addEventListener("click", async evento => {
            const alvo = evento.target;

            if (!(alvo instanceof Element)) return;

            const botao = alvo.closest("[data-acao-acesso]");

            if (!botao) return;

            const acao = botao.dataset.acaoAcesso;
            const id = botao.dataset.idAcesso;

            if (!id || !["desativar", "reativar", "excluir"].includes(acao)) {
                return;
            }

            const mensagens = {
                desativar: "Deseja desativar o acesso deste professor?",
                reativar: "Deseja reativar o acesso deste professor?",
                excluir: "Deseja excluir definitivamente este acesso? O cadastro do professor será preservado."
            };

            if (!window.confirm(mensagens[acao])) return;

            botao.disabled = true;

            try {
                const dados = new FormData();
                dados.set("acao", acao);
                dados.set("id", id);

                const resultado = await requisitarAcessos(dados);

                mostrarAviso(resultado.mensagem);

                await carregarAcessos();

            } catch (erro) {
                console.error("Erro ao gerenciar acesso:", erro);
                mostrarAviso(erro.message);

            } finally {
                if (botao.isConnected) {
                    botao.disabled = false;
                }
            }
        });
    }

    await Promise.all([
        carregarProfessoresDisponiveis(),
        carregarAcessos()
    ]);
}



    function inicializarFormulario() {
        if (!conteudo) return;

        conteudo.querySelectorAll(
    'form[data-demo]:not([action*="gerenciar-tccs.php"])'
).forEach(formulario => {
            if (formulario.dataset.inicializado === "true") return;

            formulario.dataset.inicializado = "true";

            formulario.addEventListener("submit", evento => {
                evento.preventDefault();

                if (!formulario.reportValidity()) return;

                mostrarAviso(
                    "Formulário validado. Esta seção ainda precisa ser integrada ao banco de dados."
                );
            });
        });

        conteudo.querySelectorAll("[data-remover]").forEach(botao => {
            if (botao.dataset.inicializado === "true") return;

            botao.dataset.inicializado = "true";

            botao.addEventListener("click", () => {
                const item = botao.closest("[data-item]");

                if (!item) return;

                if (confirm("Deseja remover este item da lista exibida?")) {
                    item.remove();

                    mostrarAviso(
                        "Item removido apenas da visualização."
                    );
                }
            });
        });

        conteudo.querySelectorAll("[data-preview]").forEach(input => {
            if (input.dataset.inicializado === "true") return;

            input.dataset.inicializado = "true";

            input.addEventListener("change", () => {
                const arquivo = input.files && input.files[0];

                const saida = conteudo.querySelector(
                    `[data-preview-output="${input.dataset.preview}"]`
                );

                if (saida) {
                    saida.textContent = arquivo
                        ? arquivo.name
                        : "Nenhum arquivo selecionado.";
                }
            });
        });

                inicializarFormularioDisciplinas();
        inicializarFormularioProfessores();
        inicializarAcessosProfessores();
        inicializarFormularioNormas();
        inicializarFormularioInfraestrutura();
        inicializarFormularioInstitucional();
        inicializarFormularioTCC();
        inicializarGradesGestao();
        inicializarFormularioGradeCurricular();
    }

    // =====================================================
    // CADASTRO DE GRADES CURRICULARES
    // =====================================================

    function inicializarFormularioGradeCurricular() {
    const formulario = conteudo.querySelector("#formGradeCurricular");

    if (!formulario || formulario.dataset.inicializado === "true") {
        return;
    }

    formulario.dataset.inicializado = "true";

    const botao = formulario.querySelector('button[type="submit"]');

    if (!botao) return;

    const textoOriginal = botao.innerHTML;

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        if (!formulario.reportValidity()) return;

const seriesSelecionadas = formulario.querySelectorAll(
    'input[name="series[]"]:checked'
);

if (seriesSelecionadas.length === 0) {
    mostrarAviso("Selecione pelo menos uma série para o material.");
    return;
}

const idGrade = formulario.querySelector(
    '[name="id_grade"]'
).value;

        botao.disabled = true;

        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            ${idGrade ? "Substituindo..." : "Enviando..."}
        `;

        try {
            const resposta = await fetch(formulario.action, {
                method: "POST",
                body: new FormData(formulario),
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            });

            let dados;

            try {
                dados = await resposta.json();
            } catch {
                throw new Error(
                    "O servidor não retornou uma resposta válida."
                );
            }

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem ||
                    "Não foi possível salvar o material."
                );
            }

            formulario.reset();

            // Limpa o identificador do material em edição.
            formulario.querySelector('[name="id_grade"]').value = "";

            // Restaura o botão de cadastro.
            botao.innerHTML = textoOriginal;

            const preview = formulario.querySelector(
                '[data-preview-output="aprofundamento"]'
            );

            if (preview) {
                preview.textContent = "Nenhum PDF selecionado.";
            }

            await carregarGradesGestao();

            mostrarAviso(
                dados.mensagem || "Material salvo com sucesso!"
            );

        } catch (erro) {
            console.error("Erro ao salvar grade curricular:", erro);

            mostrarAviso(
                erro.message || "Não foi possível salvar o material."
            );

        } finally {
            botao.disabled = false;

            // Mantém o texto adequado mesmo em caso de erro.
            if (
                formulario.querySelector('[name="id_grade"]').value
            ) {
                botao.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';
            } else {
                botao.innerHTML = textoOriginal;
            }
        }
    });
}


    // =====================================================
    // NAVEGAÇÃO ENTRE AS SEÇÕES DA GESTÃO
    // =====================================================

    async function abrirPagina(arquivo) {
        if (
            !conteudo ||
            !Object.prototype.hasOwnProperty.call(arquivos, arquivo)
        ) {
            return;
        }

        marcarAtivo(arquivo);

        if (arquivo === "painel") {
            conteudo.innerHTML = painelInicialHTML;
            conteudo.removeAttribute("aria-busy");

            history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );

            inicializarFormulario();
            fecharMenuMobile();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            return;
        }

        try {
            conteudo.setAttribute("aria-busy", "true");

            const resposta = await fetch(arquivos[arquivo], {
                headers: {
                    "X-Requested-With": "fetch"
                },
                cache: "no-store"
            });

            if (!resposta.ok) {
                throw new Error(`Erro HTTP ${resposta.status}`);
            }

            conteudo.innerHTML = await resposta.text();
            window.location.hash = arquivo;

            inicializarFormulario();
            fecharMenuMobile();

            conteudo.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        } catch (erro) {
            console.error("Erro ao abrir a seção:", erro);

            mostrarAviso(
                "Não foi possível abrir esta seção. Confira se o arquivo existe e se o projeto está sendo executado em um servidor."
            );
        } finally {
            conteudo.removeAttribute("aria-busy");
        }
    }

    document.addEventListener("click", evento => {
        const alvo = evento.target;

        if (!(alvo instanceof Element)) return;

        const botao = alvo.closest("[data-arquivo]");

        if (!botao) return;

        const arquivo = botao.dataset.arquivo;

        if (!arquivo) return;

        if (botao.tagName === "A") {
            evento.preventDefault();
        }

        abrirPagina(arquivo);
    });

    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("gestao-sidebar-aberta");
        });
    }

    if (grupo) {
        grupo.addEventListener("click", () => {
            const container = grupo.closest(".gestao-grupo");

            if (!container) return;

            const fechado = container.classList.toggle("fechado");

            grupo.setAttribute("aria-expanded", String(!fechado));
        });
    }

    // =====================================================
    // SAÍDA DA ÁREA DA GESTÃO
    // =====================================================

    if (btnSair && modalSair) {
        btnSair.addEventListener("click", () => {
            modalSair.hidden = false;
            document.body.style.overflow = "hidden";

            if (cancelarSaida) cancelarSaida.focus();
        });
    }

    function fecharModalSair() {
        if (!modalSair) return;

        modalSair.hidden = true;
        document.body.style.overflow = "";
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

    document.addEventListener("keydown", evento => {
        if (
            evento.key === "Escape" &&
            modalSair &&
            !modalSair.hidden
        ) {
            fecharModalSair();
        }
    });

    
if (confirmarSaida) {
    confirmarSaida.addEventListener("click", () => {
        window.location.href = "../php/sair-gestao.php";
    });
}


    // =====================================================
    // ABERTURA INICIAL
    // =====================================================

    const paginaInicial = window.location.hash.replace("#", "");

    if (
        paginaInicial &&
        Object.prototype.hasOwnProperty.call(arquivos, paginaInicial)
    ) {
        abrirPagina(paginaInicial);
    } else {
        marcarAtivo("painel");
        inicializarFormulario();
    }
});


