let articlesIndex = [];

// Карта понятных названий категорий
const categoryNames = {
    info: "ℹ️ Информация и Правила",
    dev: "💻 Для разработчиков",
    guides: "🎮 Гайды и туториалы"
};

async function initArchive() {
    try {
        // Подгружаем наш новый переименованный список статей
        const response = await fetch('articles-list.json');
        articlesIndex = await response.json();
        
        window.addEventListener('hashchange', route);
        route();
        setupSearch();
        setupCategories();
        buildSidebar();
    } catch (error) {
        console.error('Ошибка инициализации архива:', error);
    }
}

// Построение ссылок в боковом меню
function buildSidebar() {
    const sidebarLinks = document.getElementById('sidebar-links');
    sidebarLinks.innerHTML = '';
    
    articlesIndex.forEach(article => {
        const link = document.createElement('a');
        link.href = `#${article.id}`;
        link.id = `side-${article.id}`;
        link.textContent = article.title;
        sidebarLinks.appendChild(link);
    });
}

// Роутер страниц
async function route() {
    const hash = window.location.hash.replace('#', '');
    const homeScreen = document.getElementById('home-screen');
    const contentScreen = document.getElementById('content-screen');
    const articleHolder = document.getElementById('article-holder');

    // Снимаем класс active со всех ссылок в сайдбаре
    document.querySelectorAll('.sidebar-links a').forEach(a => a.classList.remove('active'));

    if (!hash || hash === 'welcome') {
        homeScreen.classList.remove('hidden');
        contentScreen.classList.add('hidden');
        document.title = "Kristall Archive";
    } else {
        const article = articlesIndex.find(a => a.id === hash);
        
        if (article) {
            homeScreen.classList.add('hidden');
            contentScreen.classList.remove('hidden');
            articleHolder.innerHTML = '<p>Загрузка контента...</p>';
            
            // Подсвечиваем текущую статью в сайдбаре
            const activeLink = document.getElementById(`side-${article.id}`);
            if (activeLink) activeLink.classList.add('active');

            try {
                const res = await fetch(article.file);
                if (!res.ok) throw new Error();
                const htmlContent = await res.text();
    
                articleHolder.innerHTML = htmlContent;
    
                // Сканируем статью на наличие кода и добавляем кнопки копирования
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

// Логика работы категорий в стиле Reddit
function setupCategories() {
    const cards = document.querySelectorAll('.category-card');
    const catSection = document.getElementById('category-articles-section');
    const catTitle = document.getElementById('selected-category-title');
    const catList = document.getElementById('category-articles-list');
    const closeBtn = document.getElementById('close-category-btn');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const catKey = card.getAttribute('data-cat');
            
            // Фильтруем статьи
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
            // Плавно прокручиваем к списку статей
            catSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    closeBtn.addEventListener('click', () => {
        catSection.classList.add('hidden');
    });
}

// Логика поиска
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

    // Кнопка домой из сайдбара
    document.getElementById('back-to-home').addEventListener('click', () => {
        window.location.hash = 'welcome';
    });
}

// Функция автоматического добавления кнопок копирования
function highlightAndSetupCode(container) {
    // Находим все теги <pre>, внутри которых есть <code>
    const preBlocks = container.querySelectorAll('pre');

    preBlocks.forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;

        // 1. Создаем обертку .code-wrapper вокруг <pre>
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // 2. Создаем саму кнопку
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.textContent = 'Копировать';

        // 3. Логика копирования при клике
        copyBtn.addEventListener('click', async () => {
            const textToCopy = code.innerText;
            try {
                // Используем современное API браузера для копирования
                await navigator.clipboard.writeText(textToCopy);
                
                // Визуальный отклик: меняем текст на кнопке
                copyBtn.textContent = 'Скопировано!';
                copyBtn.style.background = '#2ecc71'; // Зеленый цвет
                copyBtn.style.borderColor = '#2ecc71';
                
                // Возвращаем как было через 2 секунды
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.style.background = '';
                    copyBtn.style.borderColor = '';
                }, 2000);
            } catch (err) {
                copyBtn.textContent = 'Ошибка';
                console.error('Не удалось скопировать текст: ', err);
            }
        });

        // Вставляем кнопку внутрь обертки
        wrapper.appendChild(copyBtn);
    });
}

initArchive();
