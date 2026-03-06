<div align="center">

<h1>
  <br>
  <img src="https://img.shields.io/badge/جدول-Jadwal-b8960c?style=for-the-badge&labelColor=1e293b" alt="Jadwal Logo"/>
  <br>
  Jadwal — Gestionnaire d'emploi du temps
  <br>
</h1>

<p align="center">
  <strong>Organisez votre temps, maîtrisez votre semaine.</strong><br>
  Application web full-stack de planification hebdomadaire avec génération automatique de planning.
</p>

<p align="center">
  <a href="https://fechetahmakhlouf.github.io/Gestion-du-Temps/">
    <img src="https://img.shields.io/badge/🌐 Live Demo-Jadwal.io-b8960c?style=flat-square" alt="Live Demo"/>
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white" alt="Flask"/>
  &nbsp;
  <img src="https://img.shields.io/badge/PostgreSQL-Compatible-4169e1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="License"/>
</p>

---

</div>

## 🌟 Aperçu

**Jadwal** (جدول — "tableau" en arabe) est une application web de gestion d'emploi du temps hebdomadaire. Elle permet à chaque utilisateur de créer son planning personnalisé, de définir ses matières, ses créneaux horaires, et de générer automatiquement un emploi du temps optimisé semaine par semaine.

> 🔗 **Demo live :** [fechetahmakhlouf.github.io](https://fechetahmakhlouf.github.io/Gestion-du-Temps/)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔐 **Authentification** | Inscription / connexion par email + mot de passe, sessions persistantes |
| 📧 **Réinitialisation de MDP** | Envoi d'un lien sécurisé par email (valide 1h) via Gmail SMTP |
| 📚 **Gestion des taches** | Créer, modifier, supprimer des taches avec couleur et type personnalisés |
| 🕐 **Créneaux horaires** | Définir des plages horaires avec jours actifs, détection de chevauchements |
| 📅 **Emploi du temps interactif** | Vue semaine avec navigation par offset, assignation drag-and-drop |
| ⚡ **Génération automatique** | Répartition intelligente des matières selon un volume horaire cible |
| 🗓️ **Multi-semaine** | Planning différent par semaine grâce au système `weekOffset` |
| 📤 **Export & partage** | Export facile de l'emploi du temps |


## 🛠️ Stack technique

### Backend
- **[Flask](https://flask.palletsprojects.com/)** — framework web Python
- **[Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)** — ORM (SQLite dev / PostgreSQL prod)
- **[Flask-Login](https://flask-login.readthedocs.io/)** — gestion des sessions utilisateur
- **[Flask-CORS](https://flask-cors.readthedocs.io/)** — cross-origin requests (GitHub Pages ↔ Render)
- **[Flask-Mail](https://pythonhosted.org/Flask-Mail/)** — envoi d'emails via Gmail SMTP

### Frontend
- **HTML5 / CSS3 / Vanilla JavaScript** — sans framework frontend
- **Google Fonts** — Amiri, DM Sans, JetBrains Mono

## 🤝 Contribuer

Les contributions sont les bienvenues !

```bash
# Fork le dépôt, puis :
git checkout -b feature/ma-nouvelle-fonctionnalite
git commit -m "feat: description de la fonctionnalité"
git push origin feature/ma-nouvelle-fonctionnalite
# Ouvrir une Pull Request
```

---

<div align="center">

Fait par **Fechetah Makhlouf**

</div>
