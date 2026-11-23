
document.addEventListener("DOMContentLoaded", async () => {
    const areas = {
        "1": document.getElementById("disciplinas-informatica"),
        "2": document.getElementById("disciplinas-redes")
    };

    function escolherIcone(nome) {
        const texto = nome.toLowerCase();

        if (texto.includes("banco de dados")) {
            return "fa-database";
        }

        if (texto.includes("segurança")) {
            return "fa-shield-halved";
        }

        if (texto.includes("rede")) {
            return "fa-network-wired";
        }

        if (texto.includes("programação") || texto.includes("algoritmos")) {
            return "fa-code";
        }

        if (texto.includes("computadores") || texto.includes("computação")) {
            return "fa-microchip";
        }

        if (texto.includes("sistemas operacionais")) {
            return "fa-desktop";
        }

        if (texto.includes("eletricidade")) {
            return "fa-bolt";
        }

        if (texto.includes("cabeamento")) {
            return "fa-ethernet";
        }

        if (texto.includes("servidores") || texto.includes("administração")) {
            return "fa-server";
        }

        return "fa-book-open";
    }

    function mostrarDisciplinas(idCurso, disciplinas) {
        const area = areas[String(idCurso)];

        if (!area) return;

        area.replaceChildren();

        if (!disciplinas.length) {
            const mensagem = document.createElement("p");
            mensagem.textContent = "Nenhuma disciplina cadastrada neste curso.";
            area.appendChild(mensagem);
            return;
        }

        disciplinas.forEach((disciplina, indice) => {
            const item = document.createElement("div");
            item.className = "subject";

            const numero = document.createElement("span");
            numero.textContent = String(indice + 1).padStart(2, "0");

            const icone = document.createElement("i");
            icone.className = `fa-solid ${escolherIcone(disciplina.nome)}`;
            icone.setAttribute("aria-hidden", "true");

            const nome = document.createElement("strong");
            nome.textContent = disciplina.nome;

            item.append(numero, icone, nome);
            area.appendChild(item);
        });
    }

    try {
        const resposta = await fetch("../php/cursos-publicos.php", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Falha ao consultar o servidor.");
        }

        const dados = await resposta.json();

        if (!dados.sucesso || !Array.isArray(dados.cursos)) {
            throw new Error(dados.mensagem || "Resposta inválida do servidor.");
        }

        dados.cursos.forEach(curso => {
            mostrarDisciplinas(curso.id_curso, curso.disciplinas || []);
        });

        Object.entries(areas).forEach(([idCurso, area]) => {
            if (!area) return;

            const cursoExiste = dados.cursos.some(
                curso => String(curso.id_curso) === idCurso
            );

            if (!cursoExiste) {
                area.replaceChildren();

                const mensagem = document.createElement("p");
                mensagem.textContent = "Curso não cadastrado ou inativo.";
                area.appendChild(mensagem);
            }
        });
    } catch (erro) {
        console.error("Erro ao carregar cursos:", erro);

        Object.values(areas).forEach(area => {
            if (!area) return;

            area.replaceChildren();

            const mensagem = document.createElement("p");
            mensagem.textContent =
                "Não foi possível carregar as disciplinas. Tente atualizar a página.";

            area.appendChild(mensagem);
        });
    }
});
