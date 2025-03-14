document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScript Loaded!");

    function setupNavigation(linkId, targetPage) {
        const link = document.getElementById(linkId);
        if (link) {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                console.log(linkId + " clicked");
                window.location.href = targetPage;
            });
        } else {
            console.warn("Navigation link not found: " + linkId);
        }
    }

    // Setup navigation for all sidebar links
    setupNavigation("home-link", "index.html");
    setupNavigation("tasks-link", "tasks.html");
    setupNavigation("completed-tasks-link", "completed-tasks.html");
    setupNavigation("earnings-link", "earnings.html");
    setupNavigation("learn-skills-link", "learn-skills.html");

    // Tab switching functionality
    function openTab(tabName) {
        console.log("Switching to tab: " + tabName);

        // Hide all tab contents
        document.querySelectorAll(".tab-content").forEach(tab => {
            tab.style.display = "none"; // Hide all tab content
        });

        // Remove active class from all buttons
        document.querySelectorAll(".tab-link").forEach(link => {
            link.classList.remove("active");
        });

        // Show the selected tab and highlight the button
        const activeTab = document.getElementById(tabName);
        if (activeTab) {
            activeTab.style.display = "block";
        }

        // Find the button that corresponds to this tab and set it active
        document.querySelector(`.tab-link[data-tab='${tabName}']`).classList.add("active");
    }

    // Attach click events to tab buttons
    document.querySelectorAll(".tab-link").forEach(button => {
        button.addEventListener("click", function () {
            openTab(this.getAttribute("data-tab"));
        });
    });

    // Set the default active tab on page load
    openTab("current-projects");
});
