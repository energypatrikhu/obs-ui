const scopeNames = document.querySelectorAll("td:first-child");

const scopes = Array.from(scopeNames)
  .map((td) => td.textContent.trim())
  .filter((name) => name);

console.log([...new Set(scopes)].sort());
