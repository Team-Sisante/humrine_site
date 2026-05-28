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
- **Modular Architecture**: Built with a scalable Django settings structure for easy transition between development and production environments.

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
   *(Note: Generate requirements.txt if not already present using `pip freeze > requirements.txt`)*

4. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Start the server**:
   ```bash
   python manage.py runserver
   ```

## Project Structure

- `home/`: Main application logic and views.
- `humrine_site/settings/`: Modular settings (base.py, dev.py).
- `templates/`: Global and app-specific templates.
- `Docs/`: Project documentation and plans.

## License

Private Repository - © 2026 Humrine.
