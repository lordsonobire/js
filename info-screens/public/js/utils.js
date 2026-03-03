/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this whenever inserting user-supplied data into innerHTML.
 */
function escapeHTML(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
