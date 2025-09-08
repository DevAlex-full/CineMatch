const moodTextArea = document.getElementById("mood-textarea");
const searchButton = document.getElementById("search-button");

// 🔑 CONFIGURAÇÃO FINAL PARA HEADER AUTH
// Baseado no seu N8N: Header Auth com nome "authorization"
const TOKEN = "6af30508f3e232b90ff7da87313ee5e3";
const WEBHOOK_URL = "https://devalex-full.app.n8n.cloud/webhook-test/cinematch";
const AUTH_HEADER = "authorization";  // Nome exato do seu header no N8N

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    
    // Descomente para debug automático
    // setTimeout(debugConnection, 2000);
});

function setupEventListeners() {
    moodTextArea.addEventListener("keypress", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSearch();
        }
    });

    searchButton.addEventListener("click", handleSearch);
}

async function handleSearch() {
    const mood = moodTextArea.value.trim();

    if (!mood) {
        alert("Por favor, descreva como você está se sentindo ou que tipo de filme quer assistir!");
        return;
    }

    // Desabilita o botão durante a busca
    searchButton.disabled = true;
    searchButton.innerHTML = "🔍 Buscando o filme perfeito...";

    try {
        console.log("🎬 Iniciando busca para:", mood);
        
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
        // Reabilita o botão
        searchButton.disabled = false;
        searchButton.innerHTML = '<span class="play-icon">&#9654;</span> Encontrar Filmes Perfeitos';
    }
}

async function makeRequest(mood) {
    console.log("🔍 Fazendo requisição com Header Auth...");
    
    try {
        console.log(`📡 Usando header: ${AUTH_HEADER}: ${TOKEN.substring(0, 8)}...`);
        
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                [AUTH_HEADER]: TOKEN,
            },
            body: JSON.stringify({ 
                userPrompt: mood,
                timestamp: new Date().toISOString(),
                source: "cinematch-web"
            }),
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
            console.log(`✅ SUCESSO com Header Auth!`);
            const data = await response.json();
            console.log("📊 Dados recebidos:", data);
            return data;
        } else {
            const errorText = await response.text();
            console.log(`   ❌ Falha Header Auth: ${errorText.substring(0, 100)}`);
        }
        
    } catch (error) {
        console.log(`   💥 Erro de rede: ${error.message}`);
    }
    
    // Fallback: tenta sem autenticação
    console.log("🔓 Tentativa fallback: sem autenticação...");
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ 
                userPrompt: mood,
                timestamp: new Date().toISOString(),
                source: "cinematch-web"
            }),
        });
        
        if (response.ok) {
            console.log("✅ Funciona SEM autenticação!");
            const data = await response.json();
            return data;
        } else {
            const errorText = await response.text();
            console.log("❌ Falhou sem auth:", errorText.substring(0, 100));
        }
    } catch (error) {
        console.log("💥 Erro final:", error.message);
    }
    
    return null;
}

function processMovieData(data) {
    console.log("🎭 Processando dados dos filmes:", data);

    // O N8N pode retornar diferentes estruturas dependendo do nó
    let movies = null;
    
    // Tenta diferentes estruturas possíveis de resposta do TMDB via N8N
    if (data && data.results && Array.isArray(data.results)) {
        // Resposta direta do TMDB
        movies = data.results;
    } else if (Array.isArray(data)) {
        // Array direto
        movies = data;
    } else if (data.body && data.body.results) {
        // Resposta encapsulada
        movies = data.body.results;
    } else if (data.data && Array.isArray(data.data)) {
        // Outra estrutura comum
        movies = data.data;
    } else if (data.json && data.json.results) {
        // N8N às vezes encapsula em 'json'
        movies = data.json.results;
    } else if (data[0] && data[0].json && data[0].json.results) {
        // Estrutura do N8N com array de execuções
        movies = data[0].json.results;
    }

    if (movies && movies.length > 0) {
        console.log(`🎬 Encontrados ${movies.length} filmes válidos`);
        displayMovies(movies);
    } else {
        console.log("❌ Nenhum filme encontrado na resposta:", data);
        showError("Nenhum filme encontrado para essa descrição. Tente ser mais específico ou use termos diferentes!");
    }
}

function displayMovies(movies) {
    const resultsDiv = document.getElementById("results");
    const moviesGrid = document.getElementById("movies-grid");

    if (!resultsDiv || !moviesGrid) {
        console.error("❌ Elementos da interface não encontrados");
        return;
    }

    // Filtra filmes válidos (com título e descrição)
    const validMovies = movies
        .filter(movie => movie.title && movie.overview)
        .slice(0, 6); // Limita a 6 filmes
    
    if (validMovies.length === 0) {
        showError("Os filmes encontrados não têm informações completas. Tente outra descrição!");
        return;
    }

    console.log(`🎯 Exibindo ${validMovies.length} filmes`);

    // Cria os cards dos filmes
    moviesGrid.innerHTML = validMovies.map(movie => {
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
    }).join('');

    // Mostra os resultados e faz scroll suave
    resultsDiv.classList.add("show");
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function showError(message) {
    console.error("💥 Exibindo erro:", message);
    
    const resultsDiv = document.getElementById("results");
    const moviesGrid = document.getElementById("movies-grid");
    
    if (resultsDiv && moviesGrid) {
        moviesGrid.innerHTML = `
            <div style="
                grid-column: 1 / -1; 
                text-align: center; 
                padding: 40px 20px; 
                color: #ff6b6b; 
                background: rgba(255, 107, 107, 0.1); 
                border-radius: 12px; 
                border: 1px solid rgba(255, 107, 107, 0.3);
                max-width: 600px;
                margin: 0 auto;
            ">
                <h3 style="margin-bottom: 16px; font-size: 24px;">😔 Algo deu errado</h3>
                <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">${message}</p>
                <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <p style="font-weight: 600; margin-bottom: 12px; text-align: center;">💡 Dicas para melhorar a busca:</p>
                    <ul style="margin-left: 20px; line-height: 1.8; text-align: left;">
                        <li>Use termos específicos: "filme de ação dos anos 90"</li>
                        <li>Descreva o gênero: "comédia romântica"</li>
                        <li>Mencione o humor: "algo engraçado para relaxar"</li>
                        <li>Seja específico: "thriller psicológico"</li>
                    </ul>
                </div>
            </div>
        `;
        resultsDiv.classList.add("show");
    }
}

// 🧪 FUNÇÃO DE DEBUG PARA SEU HEADER ESPECÍFICO
async function debugConnection() {
    console.log("🧪 === DEBUG HEADER AUTH ESPECÍFICO ===");
    console.log("🔗 URL:", WEBHOOK_URL);
    console.log("🔑 Token:", TOKEN);
    console.log("📋 Header:", AUTH_HEADER);
    console.log("📅 Timestamp:", new Date().toISOString());
    
    console.log("\n📋 === Testando sua configuração exata ===");
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                [AUTH_HEADER]: TOKEN,
            },
            body: JSON.stringify({ 
                userPrompt: "filme de ação teste",
                debug: true,
                headerUsed: AUTH_HEADER
            }),
        });
        
        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        console.log(`   📤 Header enviado: ${AUTH_HEADER}: ${TOKEN}`);
        
        const text = await response.text();
        console.log(`   📄 Resposta (${text.length} chars):`, text);
        
        if (response.ok) {
            console.log(`   ✅ HEADER AUTH FUNCIONANDO!`);
            
            try {
                const data = JSON.parse(text);
                console.log(`   🎬 Dados parseados:`, data);
                
                if (data.results && data.results.length > 0) {
                    console.log(`   🎯 Encontrados ${data.results.length} filmes!`);
                    console.log(`   🎬 Primeiro filme:`, data.results[0].title);
                } else {
                    console.log(`   📋 Estrutura da resposta:`, Object.keys(data));
                }
            } catch (e) {
                console.log(`   ⚠️  Resposta não é JSON válido:`, e.message);
            }
            
        } else {
            console.log(`   ❌ Header Auth falhou com status ${response.status}`);
            console.log(`   📄 Erro completo:`, text);
        }
        
    } catch (error) {
        console.log(`   💥 Erro de rede: ${error.message}`);
    }
    
    console.log("\n🔓 === Testando sem autenticação ===");
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ 
                userPrompt: "teste sem auth",
                debug: true 
            }),
        });
        
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Resposta: ${text.substring(0, 200)}`);
        
        if (response.ok) {
            console.log("✅ Funciona sem autenticação!");
        }
    } catch (error) {
        console.error("💥 Erro sem auth:", error);
    }
    
    console.log("\n🏁 === FIM DO DEBUG ===");
}

// Para executar o debug manualmente no console:
// debugConnection()

// Para debug automático (descomente):
// window.addEventListener('load', () => setTimeout(debugConnection, 1000));