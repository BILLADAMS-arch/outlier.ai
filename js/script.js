document.addEventListener("DOMContentLoaded", function() {
    // Redirect to Tasks Page
    const tasksLink = document.getElementById("tasks-link");
    if (tasksLink) {
        tasksLink.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default link behavior
            window.location.href = "tasks.html";
        });
    }

    // Mark Task as Done
    const completeButtons = document.querySelectorAll(".complete-task");
    completeButtons.forEach(button => {
        button.addEventListener("click", function() {
            this.parentElement.style.opacity = "0.5"; // Make task look faded
            this.textContent = "Completed"; // Change button text
            this.disabled = true; // Disable button
        });
    });
});
// Function to switch tabs
function openTab(event, tabName) {
    // Hide all tab content
    let tabContent = document.querySelectorAll(".tab-content");
    tabContent.forEach((content) => content.classList.remove("active"));

    // Remove active class from all tab links
    let tabLinks = document.querySelectorAll(".tab-link");
    tabLinks.forEach((link) => link.classList.remove("active"));

    // Show the selected tab content
    document.getElementById(tabName).classList.add("active");
    event.currentTarget.classList.add("active");
}
