let articlesIndex = [];

// Карта понятных названий категорий
const categoryNames = {
    info: "📌 База знаний и FAQ",
    dev: "💻 Технический хаб",
    guides: "🎮 Гайды и туториалы",
    changelogs: "📜 Обновления проекта"
};

async function initArchive() {
    try {
        const response = await fetch('articles-list.json');
        articlesIndex = await response.json();
        
        window.addEventListener('hashchange', route);
        route();
        setupSearch();
        setupCategories();
        buildGroupedSidebar();
    } catch (error) {
        console.error('Ошибка инициализации архива:', error);
    }
}

// Умное построение сайдбара: группируем статьи по их разделам
function buildGroupedSidebar() {
    const sidebarLinksContainer = document.getElementById('sidebar-links');
    sidebarLinksContainer.innerHTML = '';

    // Создаем блоки под каждую категорию, которая есть в манифесте
    for (const [catKey, catName] of Object.entries(categoryNames)) {
        const catArticles = articlesIndex.filter(a => a.category === catKey);
        
        // Если в категории есть статьи, выводим её группу
        if (catArticles.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'sidebar-group';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'sidebar-group-title';
            groupTitle.textContent = catName;
            groupDiv.appendChild(groupTitle);

            catArticles.forEach(article => {
                const link = document.createElement('a');
                link.href = `#${article.id}`;
                link.id = `side-${article.id}`;
                link.textContent = article.title;
                link.title = article.title; // Подсказка при наведении
                groupDiv.appendChild(link);
            });

            sidebarLinksContainer.appendChild(groupDiv);
        }
    }
}

// Роутер страниц с поддержкой анимаций
async function route() {
    const hash = window.location.hash.replace('#', '');
    const homeScreen = document.getElementById('home-screen');
    const contentScreen = document.getElementById('content-screen');
    const articleHolder = document.getElementById('article-holder');

    document.querySelectorAll('.sidebar-links a').forEach(a => a.classList.remove('active'));

    if (!hash || hash === 'welcome') {
        homeScreen.classList.remove('hidden');
        contentScreen.classList.add('hidden');
        // Добавляем плавное появление главному экрану
        homeScreen.classList.remove('fade-in');
        void homeScreen.offsetWidth; // Трюк для перезапуска CSS-анимации
        homeScreen.classList.add('fade-in');
        
        document.title = "Kristall Archive";
    } else {
        const article = articlesIndex.find(a => a.id === hash);
        
        if (article) {
            homeScreen.classList.add('hidden');
            contentScreen.classList.remove('hidden');
            articleHolder.innerHTML = '<p>Загрузка контента...</p>';
            
            const activeLink = document.getElementById(`side-${article.id}`);
            if (activeLink) activeLink.classList.add('active');

            try {
                const res = await fetch(article.file);
                if (!res.ok) throw new Error();
                const htmlContent = await res.text();
    
                // Вставляем контент и запускаем анимацию проявления
                articleHolder.innerHTML = htmlContent;
                articleHolder.classList.remove('fade-in');
                void articleHolder.offsetWidth; // Перезапуск анимации текста
                articleHolder.classList.add('fade-in');
    
                highlightAndSetupCode(articleHolder);
                document.title = `${article.title} | Kristall Archive`;
            } catch (err) {
                articleHolder.innerHTML = `<h2>⚠️ Ошибка</h2><p>Не удалось получить файл статьи.</p>`;
            }
        } else {
            homeScreen.classList.add('hidden');
            contentScreen.classList.remove('hidden');
            articleHolder.innerHTML = `<h2>404</h2><p>Такой статьи не существует.</p>`;
        }
    }
}

// Логика разделов Реддита
function setupCategories() {
    const cards = document.querySelectorAll('.category-card');
    const catSection = document.getElementById('category-articles-section');
    const catTitle = document.getElementById('selected-category-title');
    const catList = document.getElementById('category-articles-list');
    const closeBtn = document.getElementById('close-category-btn');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const catKey = card.getAttribute('data-cat');
            const filtered = articlesIndex.filter(a => a.category === catKey);
            
            catList.innerHTML = '';
            catTitle.textContent = categoryNames[catKey] || "Статьи";

            if (filtered.length > 0) {
                filtered.forEach(art => {
                    const item = document.createElement('a');
                    item.href = `#${art.id}`;
                    item.className = 'article-preview-card';
                    item.innerHTML = `
                        <h4>${art.title}</h4>
                        <p>${art.description}</p>
                    `;
                    catList.appendChild(item);
                });
            } else {
                catList.innerHTML = '<p class="no-results">В этом разделе пока нет статей.</p>';
            }

            catSection.classList.remove('hidden');
            catSection.classList.remove('fade-in');
            void catSection.offsetWidth;
            catSection.classList.add('fade-in');
            
            catSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    closeBtn.addEventListener('click', () => {
        catSection.classList.add('hidden');
    });
}

// Логика живого поиска
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (!query) {
            searchResults.style.display = 'none';
            return;
        }

        const filtered = articlesIndex.filter(article => {
            return article.title.toLowerCase().includes(query) || 
                   article.description.toLowerCase().includes(query) ||
                   article.tags.some(tag => tag.toLowerCase().includes(query));
        });

        if (filtered.length > 0) {
            filtered.forEach(article => {
                const item = document.createElement('a');
                item.href = `#${article.id}`;
                item.className = 'search-item';
                item.innerHTML = `
                    <div class="search-item-title">${article.title}</div>
                    <div class="search-item-desc">${article.description}</div>
                `;
                item.addEventListener('click', () => {
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });
                searchResults.appendChild(item);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="no-results">Ничего не найдено</div>';
            searchResults.style.display = 'block';
        }
    });

    document.getElementById('back-to-home').addEventListener('click', () => {
        window.location.hash = 'welcome';
    });
}

// Функция добавления кнопок копирования кода
function highlightAndSetupCode(container) {
    const preBlocks = container.querySelectorAll('pre');

    preBlocks.forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        if (pre.parentNode.className === 'code-wrapper') return; // Защита от дублирования

        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.textContent = 'Копировать';

        copyBtn.addEventListener('click', async () => {
            const textToCopy = code.innerText;
            try {
                await navigator.clipboard.writeText(textToCopy);
                copyBtn.textContent = 'Скопировано!';
                copyBtn.style.background = '#2ecc71';
                copyBtn.style.borderColor = '#2ecc71';
                
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.style.background = '';
                    copyBtn.style.borderColor = '';
                }, 2000);
            } catch (err) {
                copyBtn.textContent = 'Ошибка';
            }
        });

        wrapper.appendChild(copyBtn);
    });
}

initArchive();
