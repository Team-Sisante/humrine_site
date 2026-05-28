# Plan: Create humrine.com Django Application

This plan outlines the creation of a new Django-based web application for the main humrine.com website.

## Objective
Create a professional, modern, and "alive" Django application for the main humrine.com site, serving as the landing page and hub for other applications like Badminton Court and PaySol.

## Key Files & Context
- **Project Name:** `humrine_site`
- **Location:** `/home/solomiosisante/humrine_site`
- **Dependencies:** Django 5.x, django-bootstrap5 (consistent with other projects).
- **Architecture:** Modular settings, standard Django app structure.

## Implementation Steps

### 1. Project Initialization
- Create the directory `/home/solomiosisante/humrine_site`.
- Create a `Docs` directory within `/home/solomiosisante/humrine_site`.
- Create a virtual environment `venv`.
- Install dependencies: `django`, `django-bootstrap5`, `python-dotenv`, `psycopg2-binary`, `pillow`.
- Initialize the Django project `humrine_site`.
- Create a core application named `home`.

### 2. Configuration & Settings
- Implement a modular settings structure in `humrine_site/settings/`:
    - `base.py`: Core Django settings.
    - `dev.py`: Development-specific overrides.
    - `prod.py`: Production-specific overrides (placeholder).
- Configure `STATIC` and `TEMPLATES` paths.
- Add `django-bootstrap5` to `INSTALLED_APPS`.

### 3. Core Application Development
- **Models:** Initially, a simple `ContactMessage` model if needed, but primarily focus on views.
- **Views:** A simple `HomeView` to render the landing page.
- **URLs:** Map the root URL to `HomeView`.
- **Templates:**
    - `base.html`: Common layout with a modern navbar and footer.
    - `home.html`: Homepage content with modern CSS aesthetics (gradients, shapes, smooth transitions).

### 4. Aesthetics & Design
- Use modern CSS techniques for a "polished" feel.
- Implement CSS-only shapes and gradients as placeholders for images.
- Ensure responsiveness for mobile and desktop.
- Add smooth scroll and hover effects.

### 5. Integration
- Add links to `humrine.com/badminton_court` and `humrine.com/pay-sol`.

## Verification & Testing
- Run `python manage.py check` to verify settings.
- Run migrations.
- Start the development server and verify the homepage renders correctly.
- Check mobile responsiveness.

## Migration & Rollback
- Since this is a new project, rollback simply involves deleting the `humrine_site` directory.
