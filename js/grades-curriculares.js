
document.addEventListener("DOMContentLoaded", () => {
    const botoesCurso = document.querySelectorAll(".btn-curso-grade");
    const listaGrades = document.getElementById("listaGradesCurriculares");
    const visualizador = document.getElementById("visualizadorGradeCurricular");
    const iframe = document.getElementById("iframeGradeCurricular");
    const tituloVisualizador = document.getElementById("tituloGradeCurricular");

    function abrirPdf(grade) {
        tituloVisualizador.textContent = grade.titulo;

        iframe.src = `/php/visualizar-grade-curricular.php?id=${encodeURIComponent(grade.id_grade)}`;

        visualizador.hidden = false;

        visualizador.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function agruparGrades(grades) {
        const agrupadas = new Map();

        grades.forEach((grade) => {
            const id = String(grade.id_grade);

            if (!agrupadas.has(id)) {
                agrupadas.set(id, {
                    ...grade,
                    series: []
                });
            }

            const material = agrupadas.get(id);

            if (!material.series.includes(Number(grade.serie))) {
                material.series.push(Number(grade.serie));
            }
        });

        return Array.from(agrupadas.values()).map((grade) => {
            grade.series.sort((a, b) => a - b);
            return grade;
        });
    }

    function formatarSeries(series) {
        const identificacoes = series.map((serie) => `${serie}ª`);

        if (identificacoes.length === 1) {
            return `${identificacoes[0]} série`;
        }

        if (identificacoes.length === 2) {
            return `${identificacoes[0]} e ${identificacoes[1]} séries`;
        }

        return `${identificacoes.slice(0, -1).join(", ")} e ${identificacoes.at(-1)} séries`;
    }

    botoesCurso.forEach((botao) => {
        botao.addEventListener("click", async () => {
            const curso = botao.dataset.curso;

            listaGrades.replaceChildren();
            visualizador.hidden = true;
            iframe.src = "";

            const carregando = document.createElement("p");
            carregando.className = "mensagem-carregamento-grade";
            carregando.textContent = "Carregando grades curriculares...";

            listaGrades.appendChild(carregando);

            try {
                const resposta = await fetch(
                    `/php/listar-grades-curriculares.php?curso=${encodeURIComponent(curso)}`
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {
                    throw new Error(
                        dados.mensagem || "Não foi possível carregar as grades."
                    );
                }

                const grades = agruparGrades(dados.grades || []);

                listaGrades.replaceChildren();

                if (grades.length === 0) {
                    const mensagem = document.createElement("p");
                    mensagem.className = "mensagem-vazia-grade";
                    mensagem.textContent =
                        "Ainda não há grades curriculares cadastradas para este curso.";

                    listaGrades.appendChild(mensagem);
                    return;
                }

                // Com apenas um material, abre o PDF diretamente.
                if (grades.length === 1) {
                    abrirPdf(grades[0]);
                    return;
                }

                const subtitulo = document.createElement("h2");
                subtitulo.className = "titulo-opcoes-grades";
                subtitulo.textContent =
                    "Selecione a turma ou modelo de carga horária";

                listaGrades.appendChild(subtitulo);

                const container = document.createElement("div");
                container.className = "lista-opcoes-grades";

                grades.forEach((grade) => {
                    const opcao = document.createElement("button");

                    opcao.type = "button";
                    opcao.className = "opcao-grade-curricular";

                    const serie = document.createElement("span");
                    serie.className = "opcao-grade-serie";
                    serie.textContent = formatarSeries(grade.series);

                    const titulo = document.createElement("span");
                    titulo.className = "opcao-grade-titulo";
                    titulo.textContent = grade.titulo;

                    const icone = document.createElement("i");
                    icone.className = "fa-solid fa-file-pdf";
                    icone.setAttribute("aria-hidden", "true");

                    opcao.append(icone, serie, titulo);

                    opcao.addEventListener("click", () => {
                        abrirPdf(grade);
                    });

                    container.appendChild(opcao);
                });

                listaGrades.appendChild(container);

            } catch (erro) {
                listaGrades.replaceChildren();

                const mensagem = document.createElement("p");
                mensagem.className = "mensagem-erro-grade";
                mensagem.textContent =
                    erro.message || "Ocorreu um erro ao carregar as grades.";

                listaGrades.appendChild(mensagem);
            }
        });
    });
});
