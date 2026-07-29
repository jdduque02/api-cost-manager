export const getSwaggerCustomCss = (): string => `
  .swagger-header {
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    color: #fff;
    padding: 24px 32px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,.12);
  }
  .swagger-header img {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #fff;
    padding: 4px;
  }
  .swagger-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }
  .swagger-header p {
    margin: 2px 0 0;
    opacity: .85;
    font-size: .9rem;
    color: #fff;
  }
  .topbar { display: none !important; }
`;

export const getSwaggerCustomJs = (logoBase64: string): string => `
(function() {
  var header = document.createElement('div');
  header.className = 'swagger-header';
  header.innerHTML =
    '<img src="data:image/svg+xml;base64,${logoBase64}" alt="Cost Manager" />' +
    '<div>' +
      '<h1>Cost Manager API</h1>' +
      '<p>Documentación interactiva &mdash; explora y prueba los endpoints en vivo</p>' +
    '</div>';
  var ui = document.getElementById('swagger-ui');
  if (ui) ui.parentNode.insertBefore(header, ui);
})();
`;
