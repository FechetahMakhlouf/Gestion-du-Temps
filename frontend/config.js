window.API_BASE = 'https://jadwal-backend-n52u.onrender.com';

window.apiCall = async (endpoint, options = {}) => {
    const url = window.API_BASE + endpoint;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
    });

    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error('Réponse invalide du serveur');
    }

    if (!res.ok) {
        throw new Error(data.message || 'Erreur ' + res.status);
    }

    return data.data !== undefined ? data.data : data;
};