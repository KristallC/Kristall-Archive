let articlesIndex = [];

const categoryNames = {
    info: "📌 База знаний и FAQ",
    dev: "💻 Технический раздел",
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
        setupMobileMenu();

        initTheme();
    } catch (error) {
        console.error('Ошибка инициализации архива:', error);
    }
}

// Построение сгруппированного сайдбара
function buildGroupedSidebar() {
    const sidebarLinksContainer = document.getElementById('sidebar-links');
    sidebarLinksContainer.innerHTML = '';

    for (const [catKey, catName] of Object.entries(categoryNames)) {
        const catArticles = articlesIndex.filter(a => a.category === catKey);
        
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
                link.title = article.title;
                
                // При клике на ссылку на мобилке — закрываем шторку
                link.addEventListener('click', closeMobileMenu);
                
                groupDiv.appendChild(link);
            });

            sidebarLinksContainer.appendChild(groupDiv);
        }
    }
}

// Роутер страниц с контролем мобильных кнопок
async function route() {
    const hash = window.location.hash.replace('#', '');
    const homeScreen = document.getElementById('home-screen');
    const contentScreen = document.getElementById('content-screen');
    const articleHolder = document.getElementById('article-holder');
    const menuToggleBtn = document.getElementById('mobile-menu-toggle');

    document.querySelectorAll('.sidebar-links a').forEach(a => a.classList.remove('active'));

    if (!hash || hash === 'welcome') {
        homeScreen.classList.remove('hidden');
        contentScreen.classList.add('hidden');
        menuToggleBtn.classList.add('hidden'); // Прячем кнопку меню на главном экране
        
        homeScreen.classList.remove('fade-in');
        void homeScreen.offsetWidth; 
        homeScreen.classList.add('fade-in');
        
        document.title = "Kristall Archive";
    } else {
        const article = articlesIndex.find(a => a.id === hash);
        
        if (article) {
            homeScreen.classList.add('hidden');
            contentScreen.classList.remove('hidden');
            menuToggleBtn.classList.remove('hidden'); // Показываем кнопку меню внутри статьи
            
            articleHolder.innerHTML = '<p>Загрузка контента...</p>';
            
            const activeLink = document.getElementById(`side-${article.id}`);
            if (activeLink) activeLink.classList.add('active');

            try {
                const res = await fetch(article.file);
                if (!res.ok) throw new Error();
                const htmlContent = await res.text();
    
                articleHolder.innerHTML = htmlContent;
                articleHolder.classList.remove('fade-in');
                void articleHolder.offsetWidth; 
                articleHolder.classList.add('fade-in');
    
                highlightAndSetupCode(articleHolder);
                document.title = `${article.title} | Kristall Archive`;
            } catch (err) {
                articleHolder.innerHTML = `<h2>⚠️ Ошибка</h2><p>Не удалось получить файл статьи.</p>`;
            }
        } else {
            homeScreen.classList.add('hidden');
            contentScreen.classList.remove('hidden');
            menuToggleBtn.classList.add('hidden');
            articleHolder.innerHTML = `<h2>404</h2><p>Такой статьи не существует.</p>`;
        }
    }
}

// Управление шторкой мобильного меню
function setupMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');

    // Открыть меню
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
    });

    // Закрыть меню по крестику или клику на темный фон
    sidebarClose.addEventListener('click', closeMobileMenu);
    overlay.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
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
        closeMobileMenu(); // Закрываем меню, если ушли на главную
    });
}

// Добавление кнопок копирования кода
function highlightAndSetupCode(container) {
    const preBlocks = container.querySelectorAll('pre');

    preBlocks.forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        if (pre.parentNode.className === 'code-wrapper') return; 

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

// Логика переключения темной и светлой темы
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    // 1. Проверяем, какая тема была сохранена ранее
    const savedTheme = localStorage.getItem('kristall-theme');

    // Если сохранена светлая тема — включаем её сразу
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '☀️'; // Меняем иконку на Солнце
    } else {
        themeToggleBtn.textContent = '🌙'; // Иначе оставляем Луну (темная тема по умолчанию)
    }

    // 2. Слушаем клик по кнопке переключения
    themeToggleBtn.addEventListener('click', () => {
        // Переключаем класс на теге body
        document.body.classList.toggle('light-theme');

        // Проверяем, включилась ли в итоге светлая тема
        if (document.body.classList.contains('light-theme')) {
            themeToggleBtn.textContent = '☀️';
            localStorage.setItem('kristall-theme', 'light'); // Запоминаем выбор
        } else {
            themeToggleBtn.textContent = '🌙';
            localStorage.setItem('kristall-theme', 'dark');  // Запоминаем выбор
        }
    });
}

initArchive();
