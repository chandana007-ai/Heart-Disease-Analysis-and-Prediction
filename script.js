let genderChart, smokingChart;

const dataset = [
  {gender:"Female", smoking:"No", risk:1},
  {gender:"Male", smoking:"Yes", risk:1},
  {gender:"Female", smoking:"Yes", risk:0},
  {gender:"Male", smoking:"No", risk:1},
  {gender:"Female", smoking:"No", risk:0},
  {gender:"Male", smoking:"Yes", risk:0}
];

function applyFilters() {

  const gender = document.getElementById("genderFilter").value;
  const smoking = document.getElementById("smokingFilter").value;

  let filtered = dataset.filter(d =>
    (gender === "All" || d.gender === gender) &&
    (smoking === "All" || d.smoking === smoking)
  );

  updateKPIs(filtered);
  updateCharts(filtered);
}

function updateKPIs(data){
  let total = data.length;
  let risk = data.filter(d => d.risk === 1).length;

  document.getElementById("totalPatients").innerText = total;
  document.getElementById("riskCases").innerText = risk;
}

function updateCharts(data){

  if(genderChart) genderChart.destroy();
  if(smokingChart) smokingChart.destroy();

  let female = data.filter(d => d.gender==="Female").length;
  let male = data.filter(d => d.gender==="Male").length;

  genderChart = new Chart(document.getElementById("genderChart"), {
    type:'bar',
    data:{
      labels:["Female","Male"],
      datasets:[{
        data:[female,male],
        backgroundColor:["#3b82f6","#f59e0b"]
      }]
    }
  });

  let smokeYes = data.filter(d => d.smoking==="Yes").length;
  let smokeNo = data.filter(d => d.smoking==="No").length;

  smokingChart = new Chart(document.getElementById("smokingChart"), {
    type:'doughnut',
    data:{
      labels:["Smoking Yes","Smoking No"],
      datasets:[{
        data:[smokeYes, smokeNo],
        backgroundColor:["#ef4444","#10b981"]
      }]
    }
  });
}

async function generateAI() {

  const total = document.getElementById("totalPatients").innerText;
  const risk = document.getElementById("riskCases").innerText;

  const response = await fetch("http://127.0.0.1:5000/generate", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          total: total,
          risk: risk
      })
  });

  const data = await response.json();
  document.getElementById("aiText").innerText = data.insight;
}

applyFilters();