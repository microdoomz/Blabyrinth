const themes = [
    {
        name: "Midnight Shadows",
        colors: {
            "--background": "#1a1a1a",
            "--container-bg": "#2b2b2b",
            "--text-color": "#d3d3d3",
            "--primary-color": "#a30000",
            "--secondary-color": "#4a773c",
            "--input-bg": "#333",
            "--chat-box-bg": "#222",
            "--sender-bubble": "#a30000",
            "--receiver-bubble": "#444",
            "--button-bg": "#a30000",
            "--button-hover": "#c70000"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Ocean Breeze",
        colors: {
            "--background": "#0d1b2a",
            "--container-bg": "#1b263b",
            "--text-color": "#e0e1dd",
            "--primary-color": "#778da9",
            "--secondary-color": "#415a77",
            "--input-bg": "#1b263b",
            "--chat-box-bg": "#0d1b2a",
            "--sender-bubble": "#778da9",
            "--receiver-bubble": "#415a77",
            "--button-bg": "#778da9",
            "--button-hover": "#9ab0c9"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Forest Whisper",
        colors: {
            "--background": "#1b2631",
            "--container-bg": "#263238",
            "--text-color": "#eceff1",
            "--primary-color": "#4caf50",
            "--secondary-color": "#2e7d32",
            "--input-bg": "#37474f",
            "--chat-box-bg": "#1b2631",
            "--sender-bubble": "#4caf50",
            "--receiver-bubble": "#2e7d32",
            "--button-bg": "#4caf50",
            "--button-hover": "#66bb6a"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Sunset Glow",
        colors: {
            "--background": "#ff6f61",
            "--container-bg": "#ff8a65",
            "--text-color": "#fff",
            "--primary-color": "#ffca28",
            "--secondary-color": "#ff8a65",
            "--input-bg": "#ffab91",
            "--chat-box-bg": "#ff6f61",
            "--sender-bubble": "#ffca28",
            "--receiver-bubble": "#ff8a65",
            "--button-bg": "#ffca28",
            "--button-hover": "#ffd54f"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Purple Haze",
        colors: {
            "--background": "#2c1b47",
            "--container-bg": "#3e2c5e",
            "--text-color": "#e1bee7",
            "--primary-color": "#ab47bc",
            "--secondary-color": "#7b1fa2",
            "--input-bg": "#4a3670",
            "--chat-box-bg": "#2c1b47",
            "--sender-bubble": "#ab47bc",
            "--receiver-bubble": "#7b1fa2",
            "--button-bg": "#ab47bc",
            "--button-hover": "#ba68c8"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1559825481-12a05cc00344?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Golden Sands",
        colors: {
            "--background": "#d4a017",
            "--container-bg": "#e0c878",
            "--text-color": "#3e2723",
            "--primary-color": "#ffca28",
            "--secondary-color": "#ffb300",
            "--input-bg": "#e0c878",
            "--chat-box-bg": "#d4a017",
            "--sender-bubble": "#ffca28",
            "--receiver-bubble": "#ffb300",
            "--button-bg": "#ffca28",
            "--button-hover": "#ffd54f"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Crimson Night",
        colors: {
            "--background": "#3e0b0b",
            "--container-bg": "#5c0f0f",
            "--text-color": "#ef9a9a",
            "--primary-color": "#d32f2f",
            "--secondary-color": "#b71c1c",
            "--input-bg": "#6d1a1a",
            "--chat-box-bg": "#3e0b0b",
            "--sender-bubble": "#d32f2f",
            "--receiver-bubble": "#b71c1c",
            "--button-bg": "#d32f2f",
            "--button-hover": "#ef5350"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Aqua Dream",
        colors: {
            "--background": "#006064",
            "--container-bg": "#00838f",
            "--text-color": "#e0f7fa",
            "--primary-color": "#00e5ff",
            "--secondary-color": "#00acc1",
            "--input-bg": "#006064",
            "--chat-box-bg": "#006064",
            "--sender-bubble": "#00e5ff",
            "--receiver-bubble": "#00acc1",
            "--button-bg": "#00e5ff",
            "--button-hover": "#4dffff"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Lime Light",
        colors: {
            "--background": "#1b5e20",
            "--container-bg": "#2e7d32",
            "--text-color": "#c8e6c9",
            "--primary-color": "#76ff03",
            "--secondary-color": "#64dd17",
            "--input-bg": "#388e3c",
            "--chat-box-bg": "#1b5e20",
            "--sender-bubble": "#76ff03",
            "--receiver-bubble": "#64dd17",
            "--button-bg": "#76ff03",
            "--button-hover": "#9cff57"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    },
    {
        name: "Silver Moon",
        colors: {
            "--background": "#263238",
            "--container-bg": "#37474f",
            "--text-color": "#b0bec5",
            "--primary-color": "#90a4ae",
            "--secondary-color": "#607d8b",
            "--input-bg": "#455a64",
            "--chat-box-bg": "#263238",
            "--sender-bubble": "#90a4ae",
            "--receiver-bubble": "#607d8b",
            "--button-bg": "#90a4ae",
            "--button-hover": "#b0bec5"
        },
        backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')"
    }
];

function applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
    root.style.setProperty('--background-image', theme.backgroundImage);
    localStorage.setItem('selectedTheme', theme.name);
}

function loadTheme() {
    const selectedThemeName = localStorage.getItem('selectedTheme') || themes[0].name;
    const selectedTheme = themes.find(theme => theme.name === selectedThemeName) || themes[0];
    applyTheme(selectedTheme);
}
