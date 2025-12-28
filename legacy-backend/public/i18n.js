// i18n.js - Internationalization for GΛRO VIBE
// Default: Spanish (Mexico)

const translations = {
    es: {
        // Navigation
        nav_share: "Compartir",
        nav_leaderboard: "Clasificación",
        nav_story: "Historia",
        nav_downloads: "Descargas",
        nav_capture: "Capturar",

        // Dashboard
        dashboard_title: "Tu Colección",
        dashboard_empty: "Tu colección está vacía",
        dashboard_empty_sub: "¡Captura tu primer recuerdo en un evento!",
        dashboard_xp: "XP",
        dashboard_level: "Nivel",
        dashboard_streak: "Racha",
        dashboard_proofs: "Pruebas",
        dashboard_progress: "Progreso",

        // NFT Types
        nft_proof: "Prueba",
        nft_soul: "Alma",
        nft_badge: "Insignia",
        nft_gem: "Gema",
        nft_entry: "Entrada",

        // Levels
        level_1: "Novato",
        level_2: "Raver",
        level_3: "Regular",
        level_4: "Leyenda",
        level_5: "Círculo Interno",

        // Actions
        action_login: "Iniciar Sesión",
        action_logout: "Cerrar Sesión",
        action_download: "Descargar",
        action_share_twitter: "Compartir en X",
        action_copy_link: "Copiar Link",
        action_capture: "Capturar Recuerdo",

        // Messages
        msg_welcome: "Bienvenido al underground",
        msg_login_required: "Inicia sesión para acceder",
        msg_capture_success: "¡Recuerdo capturado!",
        msg_evolution: "¡Tu ALMA evolucionó!",
        msg_badge_earned: "¡Nueva insignia desbloqueada!",

        // Leaderboard
        leaderboard_title: "Los Más Activos",
        leaderboard_rank: "Posición",
        leaderboard_proofs: "Pruebas",

        // Downloads
        downloads_locked: "Bloqueado",
        downloads_unlocked: "Desbloqueado",
        downloads_need: "necesitas",

        // Onboarding
        onboarding_title: "Entra al Rave",
        onboarding_subtitle: "Colecciona momentos. Desbloquea experiencias.",
        onboarding_cta: "Entrar",

        // Errors
        error_connection: "Error de conexión",
        error_try_again: "Intenta de nuevo"
    },
    en: {
        // Navigation
        nav_share: "Share",
        nav_leaderboard: "Leaderboard",
        nav_story: "Story",
        nav_downloads: "Downloads",
        nav_capture: "Capture",

        // Dashboard
        dashboard_title: "Your Collection",
        dashboard_empty: "Your collection is empty",
        dashboard_empty_sub: "Capture your first memory at an event!",
        dashboard_xp: "XP",
        dashboard_level: "Level",
        dashboard_streak: "Streak",
        dashboard_proofs: "Proofs",
        dashboard_progress: "Progress",

        // NFT Types
        nft_proof: "Proof",
        nft_soul: "Soul",
        nft_badge: "Badge",
        nft_gem: "Gem",
        nft_entry: "Entry",

        // Levels
        level_1: "Newcomer",
        level_2: "Raver",
        level_3: "Regular",
        level_4: "Legend",
        level_5: "Inner Circle",

        // Actions
        action_login: "Sign In",
        action_logout: "Sign Out",
        action_download: "Download",
        action_share_twitter: "Share on X",
        action_copy_link: "Copy Link",
        action_capture: "Capture Memory",

        // Messages
        msg_welcome: "Welcome to the underground",
        msg_login_required: "Sign in to access",
        msg_capture_success: "Memory captured!",
        msg_evolution: "Your SOUL evolved!",
        msg_badge_earned: "New badge unlocked!",

        // Leaderboard
        leaderboard_title: "Top Collectors",
        leaderboard_rank: "Rank",
        leaderboard_proofs: "Proofs",

        // Downloads
        downloads_locked: "Locked",
        downloads_unlocked: "Unlocked",
        downloads_need: "need",

        // Onboarding
        onboarding_title: "Enter The Rave",
        onboarding_subtitle: "Collect moments. Unlock experiences.",
        onboarding_cta: "Enter",

        // Errors
        error_connection: "Connection error",
        error_try_again: "Try again"
    }
};

// Get current language (default: Spanish)
function getLang() {
    return localStorage.getItem('garo_lang') || 'es';
}

// Set language
function setLang(lang) {
    localStorage.setItem('garo_lang', lang);
    location.reload();
}

// Get translation
function t(key) {
    const lang = getLang();
    return translations[lang]?.[key] || translations['es'][key] || key;
}

// Export for module usage
if (typeof module !== 'undefined') {
    module.exports = { translations, getLang, setLang, t };
}
