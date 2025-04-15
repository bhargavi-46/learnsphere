// --- Mobile Menu Toggle ---
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
    // Close menu if a link inside is clicked (optional, good for SPA feel)
    navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.classList.contains('nav-link')) { // Check if it's a nav link
             // Check if it has a data-page attribute (used in demo, not strictly needed here)
             // or if it's just a standard href link like /auth/logout
            if (e.target.dataset.page || e.target.getAttribute('href').startsWith('/')) {
                navLinks.classList.remove('active');
            }
        }
    });
}

// --- Scroll Animation Trigger ---
const scrollElements = document.querySelectorAll('.animate-on-scroll');

const observerCallback = (entries) => {
     entries.forEach(entry => {
         if (entry.isIntersecting) {
             entry.target.classList.add('is-visible');
             // Optional: Stop observing after animation to save resources
             // elementObserver.unobserve(entry.target);
         }
         // Optional: Hide element again when it scrolls out of view
         // else {
         //     entry.target.classList.remove('is-visible');
         // }
     });
 };

// Check if IntersectionObserver is supported
if ('IntersectionObserver' in window) {
    const elementObserver = new IntersectionObserver(observerCallback, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });
    scrollElements.forEach(el => elementObserver.observe(el));
} else {
    // Fallback for older browsers: make elements visible immediately
    console.warn("IntersectionObserver not supported. Scroll animations disabled.");
    scrollElements.forEach(el => el.classList.add('is-visible'));
}


console.log("Main JS loaded.");

// Note: The demo's single-page navigation simulation JS is REMOVED.
// Navigation is now handled by standard links and server-side routing.