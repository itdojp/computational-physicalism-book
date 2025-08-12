/**
 * Search functionality for book site
 */

(function() {
    let searchIndex = [];
    let searchInput = null;
    let searchResults = null;
    
    // Initialize search
    function initSearch() {
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;
        
        // Load search index
        loadSearchIndex();
        
        // Setup event listeners
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('focus', showResults);
        searchInput.addEventListener('blur', hideResultsDelayed);
        
        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-container')) {
                hideResults();
            }
        });
        
        // Handle keyboard navigation
        searchInput.addEventListener('keydown', handleKeyNavigation);
    }
    
    // Load search index from pages
    function loadSearchIndex() {
        // In a real implementation, this would load from a generated JSON file
        // For now, we'll create a simple index from the current page
        const pages = [
            { title: 'はじめに', url: '/introduction/', content: '計算論的物理主義の概要' },
            { title: '計算論的物理主義の基礎', url: '/chapters/chapter01/', content: '理論的基盤の解説' },
            { title: '計算可能性理論による厳密な証明', url: '/chapters/chapter02/', content: '数学的証明' },
            { title: '既存AI研究との比較分析', url: '/chapters/chapter03/', content: 'AI研究の比較' },
            { title: '実装への道筋', url: '/chapters/chapter04/', content: '実装方法論' },
            { title: '倫理的・社会的含意', url: '/chapters/chapter05/', content: '社会への影響' },
            { title: 'あとがき', url: '/afterword/', content: '著者からのメッセージ' }
        ];
        
        searchIndex = pages.map(page => ({
            ...page,
            searchText: `${page.title} ${page.content}`.toLowerCase()
        }));
    }
    
    // Handle search input
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (!query) {
            hideResults();
            return;
        }
        
        const results = searchIndex.filter(page => 
            page.searchText.includes(query)
        );
        
        displayResults(results, query);
    }
    
    // Display search results
    function displayResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">検索結果が見つかりませんでした</div>';
        } else {
            const html = results.map((result, index) => `
                <a href="${result.url}" class="search-result-item" data-index="${index}">
                    <div class="search-result-title">${highlightText(result.title, query)}</div>
                    <div class="search-result-content">${highlightText(result.content, query)}</div>
                </a>
            `).join('');
            
            searchResults.innerHTML = html;
        }
        
        showResults();
    }
    
    // Highlight matching text
    function highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    // Escape regex special characters
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Show search results
    function showResults() {
        if (searchResults && searchInput.value.trim()) {
            searchResults.style.display = 'block';
        }
    }
    
    // Hide search results
    function hideResults() {
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
    
    // Hide results with delay (for blur event)
    function hideResultsDelayed() {
        setTimeout(hideResults, 200);
    }
    
    // Handle keyboard navigation in search results
    function handleKeyNavigation(e) {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (!items.length) return;
        
        let currentIndex = -1;
        const activeItem = searchResults.querySelector('.search-result-item.active');
        if (activeItem) {
            currentIndex = parseInt(activeItem.dataset.index);
        }
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    window.location.href = items[currentIndex].href;
                }
                return;
            case 'Escape':
                e.preventDefault();
                searchInput.blur();
                hideResults();
                return;
            default:
                return;
        }
        
        // Update active state
        items.forEach((item, index) => {
            if (index === currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Export initialization function
    window.initSearch = initSearch;
    
    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();