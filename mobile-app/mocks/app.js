// Initialize Interactive Pills
document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
        // Toggle selected state for multiple selection
        pill.classList.toggle('selected');
    });
});

// Optional: specific exclusive pill groups
document.querySelectorAll('#onboarding-goals .pill').forEach(pill => {
    pill.addEventListener('click', () => {
        // Currently toggles all
    });
});
