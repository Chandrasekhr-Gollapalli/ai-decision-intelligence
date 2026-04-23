const API_KEY = "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";

let chart = null;

// ================= ANALYZE =================
async function analyze() {
  const input = document.getElementById("inputText").value.trim();
  const type = document.getElementById("type").value;

  if (!input) return alert("Enter decision");

  document.getElementById("loader").classList.remove("hidden");

  const prompt = `
Analyze this ${type} decision:

"${input}"

STRICT FORMAT:

Pros:
- ...

Cons:
- ...

Risks:
- ...

Recommendation:
...

Confidence:
Score: XX%
Explanation: ...

Final Decision:
YES / CAUTION / NO with reason
`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.choices[0].message.content;

    parseAndRender(text);
    saveHistory(input);

  } catch (err) {
    alert("API Error");
  }

  document.getElementById("loader").classList.add("hidden");
}

// ================= PARSE =================
function parseAndRender(text) {
  let sections = {
    pros: [],
    cons: [],
    risks: [],
    recommendation: "",
    confidence: "",
    decision: ""
  };

  let current = "";

  text.split("\n").forEach(line => {
    const l = line.toLowerCase();

    if (l.includes("pros")) current = "pros";
    else if (l.includes("cons")) current = "cons";
    else if (l.includes("risks")) current = "risks";
    else if (l.includes("recommendation")) current = "recommendation";
    else if (l.includes("confidence")) current = "confidence";
    else if (l.includes("final decision")) current = "decision";
    else {
      if (current === "pros") sections.pros.push(clean(line));
      else if (current === "cons") sections.cons.push(clean(line));
      else if (current === "risks") sections.risks.push(clean(line));
      else if (current === "recommendation") sections.recommendation += line + " ";
      else if (current === "confidence") sections.confidence += line + " ";
      else if (current === "decision") sections.decision += line + " ";
    }
  });

  // ===== FALLBACKS =====
  if (!sections.recommendation)
    sections.recommendation = "Proceed carefully with proper planning.";

  if (!sections.confidence)
    sections.confidence = "Score: 70% - Moderate confidence.";

  const p = sections.pros.length;
  const c = sections.cons.length;
  const r = sections.risks.length;

  const score = calculateScore(p, c, r);

  if (!sections.decision) {
    if (score > 70) sections.decision = "YES — strong positive indicators.";
    else if (score > 50) sections.decision = "CAUTION — balanced but risky.";
    else sections.decision = "NO — risks outweigh benefits.";
  }

  document.getElementById("output").innerHTML = `
    ${renderList("✔ Pros", sections.pros, "green")}
    ${renderList("❌ Cons", sections.cons, "red")}
    ${renderList("⚠ Risks", sections.risks, "yellow")}

    <div class="section blue"><b>💡 Recommendation</b><br>${sections.recommendation}</div>
    <div class="section blue"><b>📊 Confidence</b><br>${sections.confidence}</div>
    <div class="section blue"><b>🎯 Final Decision</b><br>${sections.decision}</div>

    <button onclick="copyResult()">📋 Copy Result</button>
  `;

  updateScore(score);
  drawChart(p, c, r);
}

// ================= HELPERS =================
function clean(line) {
  return line.replace(/[-•]/g, "").trim();
}

function renderList(title, items, color) {
  let html = `<div class="section ${color}"><b>${title}</b><br>`;
  items.forEach((i, idx) => {
    if (i) html += (idx + 1) + ". " + i + "<br>";
  });
  html += "</div>";
  return html;
}

// ================= SCORE =================
function calculateScore(p, c, r) {
  return Math.max(10, Math.min(100, (p * 2 - c - r + 50)));
}

function updateScore(score) {
  document.getElementById("scoreBox").classList.remove("hidden");
  document.getElementById("progressBar").style.width = score + "%";
  document.getElementById("scoreText").innerText = "Score: " + score + "%";
}

// ================= CHART =================
function drawChart(p, c, r) {
  const ctx = document.getElementById("chart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Pros", "Cons", "Risks"],
      datasets: [{
        label: "Decision Analysis (%)",
        data: [p * 10, c * 10, r * 10]
      }]
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 100
        }
      }
    }
  });
}

// ================= CLEAR =================
function clearAll() {
  document.getElementById("inputText").value = "";
  document.getElementById("output").innerHTML = "";
  document.getElementById("scoreBox").classList.add("hidden");

  // ✅ RESET DROPDOWN TO CAREER
  document.getElementById("type").value = "Career";

  if (chart) {
    chart.destroy();
    chart = null;
  }
}

// ================= COPY =================
function copyResult() {
  const text = document.getElementById("output").innerText;
  navigator.clipboard.writeText(text);
  alert("Copied!");
}

// ================= HISTORY =================
function saveHistory(input) {
  let history = JSON.parse(localStorage.getItem("history")) || [];
  history.unshift(input);
  localStorage.setItem("history", JSON.stringify(history));
  loadHistory();
}

function loadHistory() {
  const list = document.getElementById("historyList");
  let history = JSON.parse(localStorage.getItem("history")) || [];

  list.innerHTML = "";

  history.slice(0, 5).forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    li.onclick = () => document.getElementById("inputText").value = item;
    list.appendChild(li);
  });
}

loadHistory();