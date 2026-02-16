// ==UserScript==
// @name         Neptun: Auto Clear Notifications Legacy version
// @namespace    neptun-auto-clear-final
// @version      2.5
// @description  Legacy version
// @include      *://neptunweb.semmelweis.hu/hallgato/login-task/system-messages*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ================= SESSION LOCK ================= */

  if (sessionStorage.getItem('neptun_auto_clear_ran')) {
    return;
  }
  sessionStorage.setItem('neptun_auto_clear_ran', '1');

  /* ================= HELPERS ================= */

  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  function normalizeText(text) {
    if (!text) return '';
    text = text.toLowerCase();
    text = text.split('\n').join(' ');
    text = text.split('\t').join(' ');
    while (text.indexOf('  ') !== -1) {
      text = text.replace('  ', ' ');
    }
    return text.trim();
  }

  function waitFor(fn, timeout) {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      (function check() {
        if (fn()) return resolve();
        if (Date.now() - start > timeout) return reject();
        setTimeout(check, 150);
      })();
    });
  }

  /* ================= UI ================= */

  var box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.bottom = '24px';
  box.style.right = '24px';
  box.style.width = '260px';
  box.style.padding = '12px';
  box.style.borderRadius = '10px';
  box.style.background = 'linear-gradient(135deg, #1f2f4a, #1e5bff)';
  box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
  box.style.zIndex = '99999';
  box.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial';

  var label = document.createElement('div');
  label.textContent = 'Clearing notifications…';
  label.style.color = '#fff';
  label.style.marginBottom = '8px';
  label.style.fontSize = '14px';
  label.style.fontWeight = '600';

  var barBg = document.createElement('div');
  barBg.style.width = '100%';
  barBg.style.height = '8px';
  barBg.style.background = 'rgba(255,255,255,0.25)';
  barBg.style.borderRadius = '4px';
  barBg.style.overflow = 'hidden';

  var bar = document.createElement('div');
  bar.style.height = '100%';
  bar.style.width = '0%';
  bar.style.background = '#ffffff';
  bar.style.transition = 'width 0.3s ease';

  barBg.appendChild(bar);
  box.appendChild(label);
  box.appendChild(barBg);
  document.body.appendChild(box);

  function setProgress(pct) {
    bar.style.width = pct + '%';
  }

  /* ================= DOM ================= */

  function getNotifications() {
    return document.querySelectorAll('neptun-card[test-id="message"]');
  }

  function findConfirmButton() {
    var forbidden = [
      'mégse', 'megse', 'vissza', 'kijelentkez',
      'cancel', 'back', 'logout', 'log out', 'sign out',
      'abbrechen', 'zurück', 'zurueck', 'abmelden', 'ausloggen'
    ];

    var positive = [
      'elolvastam',
      'tudomásul',
      'confirm',
      'accept',
      'acknowledge',
      'ok',
      'bestät'
    ];

    var buttons = document.querySelectorAll('button');

    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (!b || b.disabled || !b.offsetParent) continue;

      var text = normalizeText(b.innerText || b.textContent);

      var blocked = false;
      for (var j = 0; j < forbidden.length; j++) {
        if (text.indexOf(forbidden[j]) !== -1) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (var k = 0; k < positive.length; k++) {
        if (text.indexOf(positive[k]) !== -1) {
          return b;
        }
      }
    }
    return null;
  }

  /* ================= CORE ================= */

  (async function run() {
    try {
      await waitFor(function () {
        return getNotifications().length > 0;
      }, 12000);

      var total = getNotifications().length;
      var cleared = 0;

      while (true) {
        var notifications = getNotifications();
        if (!notifications.length) break;

        setProgress(Math.round((cleared / total) * 100));

        notifications[0].click();
        await sleep(700);

        var confirm = null;
        var start = Date.now();

        while (!confirm && Date.now() - start < 6000) {
          confirm = findConfirmButton();
          await sleep(200);
        }

        if (!confirm) {
          label.textContent = 'Manual confirmation needed';
          throw new Error('Confirm button not found');
        }

        confirm.click();
        await sleep(900);

        cleared++;
      }

      setProgress(100);
      label.textContent = 'All notifications cleared';

      setTimeout(function () {
        box.remove();
      }, 1500);

    } catch (e) {
      label.textContent = 'Auto failed – manual reload';

      var manual = document.createElement('button');
      manual.textContent = 'Retry';
      manual.style.marginTop = '10px';
      manual.style.padding = '8px 12px';
      manual.style.border = 'none';
      manual.style.borderRadius = '6px';
      manual.style.cursor = 'pointer';
      manual.style.fontWeight = '600';

      manual.onclick = function () {
        sessionStorage.removeItem('neptun_auto_clear_ran');
        location.reload();
      };

      box.appendChild(manual);
    }
  })();
})();
