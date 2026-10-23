"""
wsgi.py — Production entry point for Gunicorn / Render
"""
from app import app

if __name__ == '__main__':
    app.run()
