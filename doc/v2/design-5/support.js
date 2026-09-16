// Minimal support for x-dc web component
class XDC extends HTMLElement {
  connectedCallback() {
    // Process helmet (title, styles, meta)
    const helmet = this.querySelector('helmet');
    if (helmet) {
      helmet.querySelectorAll('title').forEach(el => {
        document.title = el.textContent;
      });
      helmet.querySelectorAll('link').forEach(el => {
        const link = document.createElement('link');
        link.rel = el.rel;
        link.href = el.href;
        document.head.appendChild(link);
      });
      helmet.querySelectorAll('style').forEach(el => {
        const style = document.createElement('style');
        style.textContent = el.textContent;
        document.head.appendChild(style);
      });
    }
  }
}

customElements.define('x-dc', XDC);
