// CineMatch - Engine de Recomendação de Filmes
// Configuração da API do TMDB
const API_KEY = '6af30508f3e232b90ff7da87313ee5e3'; // Substitua pela sua chave da API do TMDB
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Mapeamento de sentimentos para gêneros de filmes
const MOOD_TO_GENRES = {
    // Comédia e diversão
    'engraçado': [35], // Comedy
    'comédia': [35],
    'diversão': [35],
    'alegre': [35],
    'feliz': [35],
    'relaxar': [35],
    'rir': [35],
    
    // Romance
    'romântico': [10749], // Romance
    'romance': [10749],
    'amor': [10749],
    'namorada': [10749],
    'casal': [10749],
    'paixão': [10749],
    
    // Ação e aventura
    'ação': [28], // Action
    'aventura': [12], // Adventure
    'adrenalina': [28],
    'empolgante': [28, 12],
    'energético': [28],
    
    // Suspense e thriller
    'suspense': [53], // Thriller
    'thriller': [53],
    'tensão': [53],
    'mistério': [9648], // Mystery
    'medo': [27], // Horror
    'terror': [27],
    
    // Drama
    'drama': [18], // Drama
    'emocional': [18],
    'reflexivo': [18],
    'profundo': [18],
    'chorar': [18],
    
    // Ficção científica
    'ficção científica': [878], // Science Fiction
    'sci-fi': [878],
    'futurista': [878],
    'tecnologia': [878],
    
    // Fantasia
    'fantasia': [14], // Fantasy
    'mágico': [14],
    'épico': [14],
    
    // Documentário
    'documentário': [99], // Documentary
    'aprender': [99],
    'educativo': [99],
    
    // Animação
    'animação': [16], // Animation
    'desenho': [16],
    'família': [10751] // Family
};

// Palavras-chave para diferentes tipos de busca
const MOOD_KEYWORDS = {
    'trabalho': ['comédia', 'relaxar'],
    'estressado': ['comédia', 'relaxar'],
    'cansado': ['comédia', 'drama'],
    'sozinho': ['drama', 'romance'],
    'amigos': ['comédia', 'ação'],
    'família': ['família', 'animação'],
    'noite': ['thriller', 'terror'],
    'fim de semana': ['ação', 'aventura'],
    'chuva': ['drama', 'romance'],
    'nostalgia': ['drama', 'romance']
};

class CineMatch {
    constructor() {
        this.searchButton = document.getElementById('search-button');
        this.moodTextarea = document.getElementById('mood-textarea');
        this.resultsSection = document.getElementById('results');
        this.moviesGrid = document.getElementById('movies-grid');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.searchButton.addEventListener('click', () => this.handleSearch());
        
        this.moodTextarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSearch();
            }
        });

        // Adiciona exemplos clicáveis
        document.querySelectorAll('.examples-list li').forEach(li => {
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                this.moodTextarea.value = li.textContent;
                this.handleSearch();
            });
        });
    }

    async handleSearch() {
        const mood = this.moodTextarea.value.trim().toLowerCase();
        
        if (!mood) {
            this.showError('Por favor, descreva como você está se sentindo ou o que gostaria de assistir.');
            return;
        }

        this.showLoading();
        
        try {
            const genres = this.analyzeMovieMood(mood);
            const movies = await this.searchMovies(genres, mood);
            
            if (movies && movies.length > 0) {
                this.displayResults(movies);
            } else {
                this.showError('Não encontramos filmes para esse humor. Tente descrever de forma diferente.');
            }
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showError('Ocorreu um erro na busca. Tente novamente.');
        }
    }

    analyzeMovieMood(mood) {
        let genres = [];
        
        // Verifica palavras-chave diretas
        for (const [key, genreIds] of Object.entries(MOOD_TO_GENRES)) {
            if (mood.includes(key)) {
                genres = [...genres, ...genreIds];
            }
        }

        // Verifica contextos mais amplos
        for (const [context, keywords] of Object.entries(MOOD_KEYWORDS)) {
            if (mood.includes(context)) {
                keywords.forEach(keyword => {
                    if (MOOD_TO_GENRES[keyword]) {
                        genres = [...genres, ...MOOD_TO_GENRES[keyword]];
                    }
                });
            }
        }

        // Se não encontrou gêneros específicos, usa padrões baseados em palavras-chave gerais
        if (genres.length === 0) {
            if (mood.includes('triste') || mood.includes('melancol')) {
                genres = [18]; // Drama
            } else if (mood.includes('energy') || mood.includes('anima')) {
                genres = [28]; // Action
            } else {
                genres = [35, 18, 28]; // Mix de comédia, drama e ação
            }
        }

        // Remove duplicatas
        return [...new Set(genres)];
    }

    async searchMovies(genres, mood) {
        // Se não tiver API key, usa dados mockados
        if (!API_KEY || API_KEY === '6af30508f3e232b90ff7da87313ee5e3') {
            return this.getMockMovies(genres);
        }

        try {
            const genreQuery = genres.join(',');
            const response = await fetch(
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreQuery}&sort_by=vote_average.desc&vote_count.gte=100&language=pt-BR&page=1`
            );
            
            if (!response.ok) throw new Error('Erro na API');
            
            const data = await response.json();
            return data.results.slice(0, 6); // Limita a 6 filmes
        } catch (error) {
            console.error('Erro na API:', error);
            return this.getMockMovies(genres);
        }
    }

    getMockMovies(genres) {
        const mockMovies = [
            {
                id: 1,
                title: "Parasita",
                overview: "Uma família pobre se infiltra na vida de uma família rica, mas um segredo ameaça destruir seus planos e suas vidas.",
                vote_average: 8.5,
                poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
            },
            {
                id: 2,
                title: "Interestelar",
                overview: "Um grupo de exploradores espaciais viaja através de um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade.",
                vote_average: 8.6,
                poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
            },
            {
                id: 3,
                title: "Vingadores: Ultimato",
                overview: "Os heróis remanescentes devem encontrar uma forma de reverter as ações de Thanos e restaurar a ordem no universo de uma vez por todas.",
                vote_average: 8.4,
                poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
            },
            {
                id: 4,
                title: "Coringa",
                overview: "Durante a década de 1980, um comediante fracassado é levado à loucura e ao crime após ser rejeitado pela sociedade.",
                vote_average: 8.2,
                poster_path: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"
            },
            {
                id: 5,
                title: "Klaus",
                overview: "Um carteiro egocêntrico e um fabricante de brinquedos recluso formam uma amizade improvável na cidade mais fria do mundo.",
                vote_average: 8.2,
                poster_path: "/4syth8moJdKpbDcKmtfGfFgz7CN.jpg"
            },
            {
                id: 6,
                title: "Cidade de Deus",
                overview: "A história de Buscapé, um jovem fotógrafo que cresce em um bairro violento do Rio de Janeiro.",
                vote_average: 8.6,
                poster_path: "/gCqnQaq8T5WnFGbKzB6XzLBWvMN.jpg"
            }
        ];

        // Filtra por gênero simulado baseado no ID
        return mockMovies.slice(0, 4);
    }

    displayResults(movies) {
        this.moviesGrid.innerHTML = '';

        movies.forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            this.moviesGrid.appendChild(movieCard);
        });

        this.resultsSection.classList.add('show');
        this.resultsSection.style.display = 'block';
        
        // Scroll suave para os resultados
        this.resultsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';

        const posterUrl = movie.poster_path 
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : null;

        const posterHtml = posterUrl
            ? `<img src="${posterUrl}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<div class=\\"no-poster\\">Sem Poster</div>'" />`
            : `<div class="no-poster">Sem Poster Disponível</div>`;

        card.innerHTML = `
            <div class="movie-poster">
                ${posterHtml}
            </div>
            <div class="movie-info">
                <h4 class="movie-title">${movie.title}</h4>
                <div class="movie-overview">${movie.overview || 'Sinopse não disponível.'}</div>
                <p class="movie-rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} / 10</p>
            </div>
        `;

        // Adiciona efeito de hover
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.03)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });

        return card;
    }

    showLoading() {
        this.searchButton.innerHTML = '🔍 Buscando filmes perfeitos...';
        this.searchButton.disabled = true;
        
        this.resultsSection.style.display = 'none';
        this.resultsSection.classList.remove('show');
    }

    showError(message) {
        this.searchButton.innerHTML = '🎬 Encontrar Filmes Perfeitos';
        this.searchButton.disabled = false;
        
        // Cria elemento de erro temporário
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            color: #ff6b6b;
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid rgba(255, 107, 107, 0.3);
            border-radius: 8px;
        `;
        errorDiv.textContent = message;
        
        // Remove erro anterior se existir
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        errorDiv.className = 'error-message';
        this.searchButton.parentElement.appendChild(errorDiv);
        
        // Remove após 5 segundos
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    resetButton() {
        this.searchButton.innerHTML = '▶️ Encontrar Filmes Perfeitos';
        this.searchButton.disabled = false;
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new CineMatch();
});

// Função para demonstração sem API key
function runDemo() {
    const textarea = document.getElementById('mood-textarea');
    textarea.value = 'Quero algo engraçado para relaxar depois do trabalho';
    
    setTimeout(() => {
        document.getElementById('search-button').click();
    }, 500);
}

// Comentário com instruções para obter API key
/*
INSTRUÇÕES PARA CONFIGURAR A API DO TMDB:

1. Acesse https://www.themoviedb.org/
2. Crie uma conta gratuita
3. Vá em Settings > API
4. Solicite uma API key
5. Substitua 'SUA_CHAVE_API_AQUI' pela sua chave real

Sem a API key, o sistema funcionará com dados mockados.
*/