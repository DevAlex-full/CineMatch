// ✨ CONFIGURAÇÕES
const CONFIG = {
    TOKEN: "6af30508f3e232b90ff7da87313ee5e3",
    WEBHOOK_URL: "https://devalex-full.app.n8n.cloud/webhook/cinematch",
    AUTH_HEADER: "authorization",
    MAX_MOVIES: 6
};

// 🎯 ELEMENTOS DOM
const elements = {
    moodTextArea: document.getElementById("mood-textarea"),
    searchButton: document.getElementById("search-button"),
    results: document.getElementById("results"),
    moviesGrid: document.getElementById("movies-grid")
};

// 🚀 INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    setupEventListeners();
    // Descomente para debug automático
    // setTimeout(debugConnection, 2000);
}

function setupEventListeners() {
    const { moodTextArea, searchButton } = elements;

    moodTextArea.addEventListener("keypress", handleKeyPress);
    searchButton.addEventListener("click", handleSearch);
}

function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSearch();
    }
}

// 🔍 BUSCA PRINCIPAL
async function handleSearch() {
    const mood = elements.moodTextArea.value.trim();

    if (!mood) {
        showAlert("Por favor, descreva como você está se sentindo ou que tipo de filme quer assistir!");
        return;
    }

    toggleSearchButton(true);
    console.log("🎬 Iniciando busca para:", mood);

    try {
        const movieData = await makeRequest(mood);
        
        if (movieData) {
            processMovieData(movieData);
        } else {
            throw new Error("Não foi possível conectar com o servidor. Verifique se o workflow N8N está ativo.");
        }
        
    } catch (error) {
        console.error("🚨 Erro na busca:", error);
        showError(`Erro ao buscar filmes: ${error.message}`);
    } finally {
        toggleSearchButton(false);
    }
}

function toggleSearchButton(isLoading) {
    const { searchButton } = elements;
    
    if (isLoading) {
        searchButton.disabled = true;
        searchButton.innerHTML = "🔍 Buscando o filme perfeito...";
    } else {
        searchButton.disabled = false;
        searchButton.innerHTML = '<span class="play-icon">&#9654;</span> Encontrar Filmes Perfeitos';
    }
}

// 🌐 REQUISIÇÕES HTTP
async function makeRequest(mood) {
    console.log("🔍 Fazendo requisição com Header Auth...");
    
    const requestBody = { 
        userPrompt: mood,
        timestamp: new Date().toISOString(),
        source: "cinematch-web"
    };

    // Tentativa com autenticação
    const authResult = await attemptRequest(requestBody, true);
    if (authResult) return authResult;

    // Fallback sem autenticação
    console.log("🔓 Tentativa fallback: sem autenticação...");
    return await attemptRequest(requestBody, false);
}

async function attemptRequest(body, useAuth = false) {
    try {
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        if (useAuth) {
            headers[CONFIG.AUTH_HEADER] = CONFIG.TOKEN;
            console.log(`📡 Usando header: ${CONFIG.AUTH_HEADER}: ${CONFIG.TOKEN.substring(0, 8)}...`);
        }

        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        console.log(`Status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(useAuth ? "✅ SUCESSO com Header Auth!" : "✅ Funciona SEM autenticação!");
            console.log("📊 Dados recebidos:", data);
            return data;
        } else {
            const errorText = await response.text();
            console.log(`❌ Falha ${useAuth ? 'com auth' : 'sem auth'}:`, errorText.substring(0, 100));
        }
        
    } catch (error) {
        console.log(`💥 Erro de rede: ${error.message}`);
    }
    
    return null;
}

// 🎭 PROCESSAMENTO DE DADOS
function processMovieData(data) {
    console.log("🎭 Processando dados dos filmes:", data);

    const movies = extractMovies(data);

    if (movies?.length > 0) {
        console.log(`🎬 Encontrados ${movies.length} filmes válidos`);
        displayMovies(movies);
    } else {
        console.log("❌ Nenhum filme encontrado na resposta:", data);
        showError("Nenhum filme encontrado para essa descrição. Tente ser mais específico ou use termos diferentes!");
    }
}

function extractMovies(data) {
    // Estruturas possíveis de resposta do TMDB via N8N
    const possiblePaths = [
        () => data?.results,
        () => Array.isArray(data) ? data : null,
        () => data?.body?.results,
        () => data?.data,
        () => data?.json?.results,
        () => data?.[0]?.json?.results
    ];

    for (const path of possiblePaths) {
        const movies = path();
        if (Array.isArray(movies) && movies.length > 0) {
            return movies;
        }
    }

    return null;
}

// 🎨 INTERFACE DE USUÁRIO
function displayMovies(movies) {
    const { results, moviesGrid } = elements;

    if (!results || !moviesGrid) {
        console.error("❌ Elementos da interface não encontrados");
        return;
    }

    const validMovies = movies
        .filter(movie => movie.title && movie.overview)
        .slice(0, CONFIG.MAX_MOVIES);
    
    if (validMovies.length === 0) {
        showError("Os filmes encontrados não têm informações completas. Tente outra descrição!");
        return;
    }

    console.log(`🎯 Exibindo ${validMovies.length} filmes`);

    moviesGrid.innerHTML = validMovies.map(createMovieCard).join('');
    showResults();
}

function createMovieCard(movie) {
    const posterUrl = movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null;

    const title = movie.title || "Título não disponível";
    const overview = movie.overview || "Descrição não disponível.";
    const rating = movie.vote_average ? Number(movie.vote_average).toFixed(1) : "N/A";
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "";

    return `
        <div class="movie-card">
            <div class="movie-poster">
                ${posterUrl 
                    ? `<img src="${posterUrl}" alt="${title}" onerror="this.parentElement.innerHTML='<div class=&quot;no-poster&quot;>🎬<br>Poster<br>indisponível</div>'" loading="lazy" />`
                    : `<div class="no-poster">🎬<br>Poster<br>indisponível</div>`
                }
            </div>
            <div class="movie-info">
                <div class="movie-title">
                    ${title}
                    ${releaseYear ? ` (${releaseYear})` : ""}
                </div>
                <div class="movie-overview">${overview}</div>
                <div class="movie-rating">
                    ⭐ ${rating}/10
                </div>
            </div>
        </div>
    `;
}

function showResults() {
    const { results } = elements;
    results.classList.add("show");
    
    setTimeout(() => {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// 🚨 TRATAMENTO DE ERROS
function showError(message) {
    console.error("💥 Exibindo erro:", message);
    
    const { results, moviesGrid } = elements;
    
    if (results && moviesGrid) {
        moviesGrid.innerHTML = createErrorTemplate(message);
        results.classList.add("show");
    }
}

function createErrorTemplate(message) {
    return `
        <div style="
            grid-column: 1 / -1; 
            text-align: center; 
            padding: 40px 20px; 
            color: #a855f7; 
            background: rgba(168, 85, 247, 0.1); 
            border-radius: 16px; 
            border: 1px solid rgba(168, 85, 247, 0.3);
            max-width: 600px;
            margin: 0 auto;
        ">
            <h3 style="margin-bottom: 16px; font-size: 24px; color: #c084fc;">😔 Algo deu errado</h3>
            <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">${message}</p>
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <p style="font-weight: 600; margin-bottom: 12px; text-align: center; color: #c084fc;">💡 Dicas para melhorar a busca:</p>
                <ul style="margin-left: 20px; line-height: 1.8; text-align: left; list-style: none;">
                    <li style="position: relative; padding-left: 20px;">
                        <span style="position: absolute; left: 0; color: #8b5cf6;">•</span>
                        Use termos específicos: "filme de ação dos anos 90"
                    </li>
                    <li style="position: relative; padding-left: 20px;">
                        <span style="position: absolute; left: 0; color: #8b5cf6;">•</span>
                        Descreva o gênero: "comédia romântica"
                    </li>
                    <li style="position: relative; padding-left: 20px;">
                        <span style="position: absolute; left: 0; color: #8b5cf6;">•</span>
                        Mencione o humor: "algo engraçado para relaxar"
                    </li>
                    <li style="position: relative; padding-left: 20px;">
                        <span style="position: absolute; left: 0; color: #8b5cf6;">•</span>
                        Seja específico: "thriller psicológico"
                    </li>
                </ul>
            </div>
        </div>
    `;
}

function showAlert(message) {
    // Usando alert nativo por simplicidade, mas pode ser substituído por modal customizado
    alert(message);
}

// 🧪 DEBUG (OTIMIZADO)
async function debugConnection() {
    console.group("🧪 DEBUG HEADER AUTH");
    console.log("🔗 URL:", CONFIG.WEBHOOK_URL);
    console.log("🔑 Token:", CONFIG.TOKEN);
    console.log("📋 Header:", CONFIG.AUTH_HEADER);
    console.log("📅 Timestamp:", new Date().toISOString());
    
    const testPayload = { 
        userPrompt: "filme de ação teste",
        debug: true,
        headerUsed: CONFIG.AUTH_HEADER
    };

    // Teste com autenticação
    console.group("📋 Testando com autenticação");
    await testEndpoint(testPayload, true);
    console.groupEnd();

    // Teste sem autenticação
    console.group("🔓 Testando sem autenticação");
    await testEndpoint({ ...testPayload, userPrompt: "teste sem auth" }, false);
    console.groupEnd();
    
    console.groupEnd();
}

async function testEndpoint(payload, useAuth) {
    try {
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        if (useAuth) {
            headers[CONFIG.AUTH_HEADER] = CONFIG.TOKEN;
        }

        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        
        const text = await response.text();
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📄 Resposta (${text.length} chars):`, text.substring(0, 200));
        
        if (response.ok) {
            console.log(`✅ ${useAuth ? 'Header Auth' : 'Sem auth'} funcionando!`);
            
            try {
                const data = JSON.parse(text);
                if (data.results?.length > 0) {
                    console.log(`🎯 ${data.results.length} filmes encontrados`);
                }
            } catch (e) {
                console.log(`⚠️ Resposta não é JSON válido: ${e.message}`);
            }
        } else {
            console.log(`❌ Falhou com status ${response.status}`);
        }
        
    } catch (error) {
        console.log(`💥 Erro: ${error.message}`);
    }
}

// 🎮 FUNCIONALIDADES DE DEBUG PARA CONSOLE
window.CineMatchDebug = {
    test: debugConnection,
    config: CONFIG,
    elements
};

// Para debug automático (descomente):
// window.addEventListener('load', () => setTimeout(debugConnection, 1000));