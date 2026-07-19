/**
 * Waypoint University — Markdown render & helpers.
 * Supports headings, lists, checklists, code, tables, quotes, callouts, links, images.
 * Math: architecture-ready (left as .wu-math spans).
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(text) {
    var s = esc(text);
    // code
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    // images ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy"/>');
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
    // bold / italic
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    // math placeholders
    s = s.replace(/\$\$([^$]+)\$\$/g, '<span class="wu-math wu-math--block">$1</span>');
    s = s.replace(/\$([^$]+)\$/g, '<span class="wu-math">$1</span>');
    return s;
  }

  function render(md) {
    var lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var i = 0;
    var inCode = false;
    var codeLang = "";
    var codeBuf = [];
    var inList = null; // ul | ol | check

    function closeList() {
      if (inList === "check") html.push("</ul>");
      else if (inList === "ul") html.push("</ul>");
      else if (inList === "ol") html.push("</ol>");
      inList = null;
    }

    while (i < lines.length) {
      var line = lines[i];

      if (inCode) {
        if (/^```/.test(line)) {
          html.push(
            '<pre class="wu-code"><code class="language-' +
              esc(codeLang || "text") +
              '">' +
              esc(codeBuf.join("\n")) +
              "</code></pre>"
          );
          inCode = false;
          codeBuf = [];
          codeLang = "";
          i++;
          continue;
        }
        codeBuf.push(line);
        i++;
        continue;
      }

      var fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        closeList();
        inCode = true;
        codeLang = fence[1] || "text";
        codeBuf = [];
        i++;
        continue;
      }

      // table
      if (/^\|(.+)\|$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1])) {
        closeList();
        var header = line.split("|").slice(1, -1).map(function (c) {
          return c.trim();
        });
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|(.+)\|$/.test(lines[i])) {
          rows.push(
            lines[i].split("|").slice(1, -1).map(function (c) {
              return c.trim();
            })
          );
          i++;
        }
        html.push("<table class=\"wu-table\"><thead><tr>");
        header.forEach(function (h) {
          html.push("<th>" + inline(h) + "</th>");
        });
        html.push("</tr></thead><tbody>");
        rows.forEach(function (r) {
          html.push("<tr>");
          r.forEach(function (c) {
            html.push("<td>" + inline(c) + "</td>");
          });
          html.push("</tr>");
        });
        html.push("</tbody></table>");
        continue;
      }

      // callouts > [!NOTE] or ::: note
      var callout = line.match(/^>\s*\[!(NOTE|TIP|WARN|WARNING|IMPORTANT)\]\s*(.*)$/i);
      if (callout) {
        closeList();
        var kind = callout[1].toUpperCase();
        if (kind === "WARNING") kind = "WARN";
        var body = callout[2] || "";
        i++;
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          body += (body ? "\n" : "") + lines[i].replace(/^>\s?/, "");
          i++;
        }
        html.push(
          '<aside class="wu-callout wu-callout--' +
            esc(kind.toLowerCase()) +
            '" data-callout="' +
            esc(kind) +
            '"><p>' +
            inline(body).replace(/\n/g, "<br/>") +
            "</p></aside>"
        );
        continue;
      }

      if (/^#\s+/.test(line)) {
        closeList();
        html.push("<h1>" + inline(line.replace(/^#\s+/, "")) + "</h1>");
        i++;
        continue;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        html.push("<h2>" + inline(line.replace(/^##\s+/, "")) + "</h2>");
        i++;
        continue;
      }
      if (/^###\s+/.test(line)) {
        closeList();
        html.push("<h3>" + inline(line.replace(/^###\s+/, "")) + "</h3>");
        i++;
        continue;
      }
      if (/^####\s+/.test(line)) {
        closeList();
        html.push("<h4>" + inline(line.replace(/^####\s+/, "")) + "</h4>");
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeList();
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        html.push("<blockquote>" + inline(q.join("\n")).replace(/\n/g, "<br/>") + "</blockquote>");
        continue;
      }

      var check = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (check) {
        if (inList !== "check") {
          closeList();
          html.push('<ul class="wu-checklist">');
          inList = "check";
        }
        html.push(
          "<li" +
            (check[1] !== " " ? ' class="is-done"' : "") +
            ">" +
            inline(check[2]) +
            "</li>"
        );
        i++;
        continue;
      }

      var bullet = line.match(/^\s*[-*]\s+(.*)$/);
      if (bullet) {
        if (inList !== "ul") {
          closeList();
          html.push("<ul>");
          inList = "ul";
        }
        html.push("<li>" + inline(bullet[1]) + "</li>");
        i++;
        continue;
      }

      var numbered = line.match(/^\s*\d+\.\s+(.*)$/);
      if (numbered) {
        if (inList !== "ol") {
          closeList();
          html.push("<ol>");
          inList = "ol";
        }
        html.push("<li>" + inline(numbered[1]) + "</li>");
        i++;
        continue;
      }

      if (/^\s*$/.test(line)) {
        closeList();
        i++;
        continue;
      }

      closeList();
      html.push("<p>" + inline(line) + "</p>");
      i++;
    }
    closeList();
    if (inCode) {
      html.push("<pre class=\"wu-code\"><code>" + esc(codeBuf.join("\n")) + "</code></pre>");
    }
    return html.join("\n");
  }

  global.WU = global.WU || {};
  global.WU.Markdown = {
    esc: esc,
    inline: inline,
    render: render
  };
})(typeof window !== "undefined" ? window : globalThis);
