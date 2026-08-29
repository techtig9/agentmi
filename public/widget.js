(function () {
  var script = document.currentScript;
  var widgetId = script.getAttribute("data-widget-id");
  var apiBase = script.getAttribute("data-api-base") || (script.src ? new URL(script.src).origin : "");

  if (!widgetId) {
    console.error("Agentmi widget: missing data-widget-id attribute on the script tag.");
    return;
  }

  var THEME_COLORS = {
    cyber_neon: { accent: "#00F0FF", bg: "#0A0A0F", text: "#F4F6FB" },
    minimal_light: { accent: "#3B82F6", bg: "#FFFFFF", text: "#111111" },
    corporate_blue: { accent: "#3B82F6", bg: "#0F1E3A", text: "#F4F6FB" },
    dark_glass: { accent: "#9AA0B4", bg: "#121218", text: "#F4F6FB" },
  };

  var state = { open: false, config: null, messages: [] };

  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;" +
    "border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);z-index:999999;" +
    "display:flex;align-items:center;justify-content:center;font-size:24px;transition:transform 0.2s;";
  bubble.innerHTML = "&#128172;";
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.08)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:340px;max-width:90vw;height:460px;max-height:70vh;" +
    "border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.3);z-index:999999;display:none;" +
    "flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;";

  var header = document.createElement("div");
  header.style.cssText = "padding:14px 16px;font-weight:600;font-size:14px;";

  var messagesEl = document.createElement("div");
  messagesEl.style.cssText = "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;";

  var inputRow = document.createElement("div");
  inputRow.style.cssText = "display:flex;gap:8px;padding:12px;border-top:1px solid rgba(128,128,128,0.2);";

  var input = document.createElement("input");
  input.placeholder = "Type a message…";
  input.style.cssText =
    "flex:1;border-radius:8px;border:1px solid rgba(128,128,128,0.3);padding:8px 10px;font-size:13px;outline:none;";

  var sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = "border:none;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;font-weight:600;";

  var brandingEl = document.createElement("div");
  brandingEl.style.cssText = "text-align:center;font-size:10px;padding:4px;opacity:0.6;";
  brandingEl.textContent = "Powered by Agentmi";

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputRow);

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  function applyTheme(themeName) {
    var colors = THEME_COLORS[themeName] || THEME_COLORS.cyber_neon;
    bubble.style.background = colors.accent;
    bubble.style.color = colors.bg;
    panel.style.background = colors.bg;
    panel.style.color = colors.text;
    header.style.borderBottom = "1px solid " + colors.accent + "33";
    sendBtn.style.background = colors.accent;
    sendBtn.style.color = colors.bg;
    input.style.background = colors.bg;
    input.style.color = colors.text;
  }

  function addMessage(role, text) {
    var bubble = document.createElement("div");
    var isUser = role === "user";
    bubble.style.cssText =
      "max-width:80%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;" +
      "align-self:" + (isUser ? "flex-end" : "flex-start") + ";" +
      "background:" + (isUser ? "rgba(0,240,255,0.15)" : "rgba(128,128,128,0.15)") + ";";
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function loadConfig() {
    fetch(apiBase + "/api/widget/" + widgetId + "/chat")
      .then(function (r) { return r.json(); })
      .then(function (config) {
        state.config = config;
        header.textContent = config.name || "Chat";
        applyTheme(config.theme);
        if (config.show_branding === false) brandingEl.style.display = "none";
        else panel.appendChild(brandingEl);
      })
      .catch(function () {
        header.textContent = "Chat";
        applyTheme("cyber_neon");
      });
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    sendBtn.disabled = true;

    fetch(apiBase + "/api/widget/" + widgetId + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        addMessage("assistant", data.reply || data.error || "Sorry, something went wrong.");
      })
      .catch(function () {
        addMessage("assistant", "Sorry, something went wrong.");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  }

  sendBtn.onclick = sendMessage;
  input.onkeydown = function (e) {
    if (e.key === "Enter") sendMessage();
  };

  bubble.onclick = function () {
    state.open = !state.open;
    panel.style.display = state.open ? "flex" : "none";
    if (state.open && !state.config) loadConfig();
  };
})();
