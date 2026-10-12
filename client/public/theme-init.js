// 첫 렌더 전에 테마 클래스를 붙여 깜빡임을 막는다(CSP 때문에 인라인 대신 외부 파일).
(function () {
  try {
    var p = localStorage.getItem("logos.theme");
    var dark = p === "dark" || ((!p || p === "system") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    var l = localStorage.getItem("logos.locale");
    if (l === "en" || l === "ko") document.documentElement.lang = l;
  } catch (e) {}
})();
