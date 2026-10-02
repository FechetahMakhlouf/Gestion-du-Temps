# Architecture rules

- Mount only the navigation shell required by the active viewport, because CSS-hidden duplicate interfaces still increase DOM and style work.
- Render one active schedule day on mobile and the complete active week on desktop, because schedule DOM size is the main responsive cost.