import PanelHTML from "url:./panels/index.html";

console.log("[GdUE] devtoolsコードはアクティブです");

chrome.devtools.panels.create(
    "GdUE",
    null,
    PanelHTML.split("/").pop()
);