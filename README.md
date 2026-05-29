# Humrine Site

The central hub and landing page for Humrine's suite of innovative management solutions.

## Overview

Humrine Site is a Django-powered web application that serves as the primary gateway to other specialized applications like the **Badminton Court Management System** and **PaySol Payroll Solutions**. It is designed with a modern, responsive aesthetic featuring glassmorphism and smooth animations.

## Key Features

- **Modern Landing Page**: A visually appealing homepage built with custom CSS gradients and glassmorphism effects.
- **Application Hub**: Direct, streamlined access to the Humrine ecosystem:
  - [Badminton Court Management](/badminton_court)
  - [PaySol Payroll Solutions](/pay-sol)
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop using Bootstrap 5.
- **Unified Configuration**: Uses environment-driven settings via `.env` files for seamless management across development, staging, and production environments.

## Technology Stack

- **Backend**: Django 6.x (Python)
- **Frontend**: Bootstrap 5, Custom Vanilla CSS
- **Environment Management**: python-dotenv
- **Database**: SQLite (Development) / PostgreSQL (Production ready)

## Getting Started

### Prerequisites

- Python 3.12+
- pip

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/xmione/humrine_site.git
   cd humrine_site
   ```

2. **Set up virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment**:
   - Create a `.env` file based on the appropriate template (e.g., `.env.dev.template`).
   - Fill in all required environment variables, including `SECRET_KEY` and database credentials.

5. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Start the server**:
   ```bash
   python manage.py runserver
   ```

## Project Structure

- `home/`: Main application logic and views.
- `humrine_site/settings/`: Unified settings in `base.py`.
- `templates/`: Global and app-specific templates.
- `Docs/`: Project documentation and plans.

## License

Private Repository - © 2026 Humrine.
