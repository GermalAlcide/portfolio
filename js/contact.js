/*
 * Contact form. GitHub Pages can't run server code, so messages are posted to
 * a Google Apps Script web app that saves them to a Google Sheet and emails
 * you (see google-apps-script.gs). With no endpoint set it runs in demo mode.
 */
(() => {
  const cfg = Site.config;
  const form = document.getElementById("contact-form");
  const msg = document.getElementById("form-msg");
  const submit = document.getElementById("submit");

  // Optional email row
  if (cfg.contactEmail) {
    const row = document.createElement("div");
    row.className = "contact__row";
    row.innerHTML = '<dt>Email</dt><dd><a></a></dd>';
    const a = row.querySelector("a");
    a.href = `mailto:${cfg.contactEmail}`;
    a.textContent = cfg.contactEmail;
    document.getElementById("rows").prepend(row);
  }

  function say(text, kind = "") {
    msg.textContent = text;
    msg.className = "form__msg label" + (kind ? ` is-${kind}` : "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      const bad = form.querySelector(":invalid");
      bad?.focus();
      if (bad?.id === "email") say("That email doesn't look quite right.", "err");
      else say("Please fill in your name, email and a message.", "err");
      return;
    }

    const data = new FormData(form);
    if (data.get("website")) return; // bot

    submit.disabled = true;
    say("Sending…");
    try {
      if (!cfg.formEndpoint) {
        await new Promise((r) => setTimeout(r, 600));
        console.info("[contact] Demo mode — would have sent:", Object.fromEntries(data));
      } else {
        // Apps Script doesn't send CORS headers for POST, so use no-cors.
        await fetch(cfg.formEndpoint, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) });
      }
      form.reset();
      say("Thanks — your message is on its way.", "ok");
    } catch (err) {
      console.error(err);
      say("Something went wrong — please try again in a moment.", "err");
    } finally {
      submit.disabled = false;
    }
  });
})();
