/* ============================================================
   DU PIXEL CODE - CHART ENGINE (Chart.js Integration)
   Renders Radar 360° Charts and Grouped Bar Charts with Cyber Aesthetic
   ============================================================ */

let radarChartInstance = null;
let barChartInstance = null;
let instChartInstance = null;

window.chartEngine = {
  renderRadarChart: function(canvasId, labels, dataAuto, dataExt) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (radarChartInstance) {
      radarChartInstance.destroy();
    }

    radarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Promedio Externo 360°',
            data: dataExt,
            backgroundColor: 'rgba(0, 210, 255, 0.25)',
            borderColor: '#00D2FF',
            pointBackgroundColor: '#00D2FF',
            pointBorderColor: '#FFF',
            borderWidth: 2
          },
          {
            label: 'Autoevaluación',
            data: dataAuto,
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderColor: '#10B981',
            pointBackgroundColor: '#10B981',
            pointBorderColor: '#FFF',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            pointLabels: {
              color: '#94A3B8',
              font: { family: 'Poppins', size: 11 }
            },
            ticks: {
              color: '#64748B',
              backdropColor: 'transparent',
              stepSize: 1,
              suggestedMin: 0,
              suggestedMax: 5
            }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#E2E8F0', font: { family: 'Lato', size: 12 } }
          }
        }
      }
    });
  },

  renderBarChart: function(canvasId, labels, datasetsMap) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (barChartInstance) {
      barChartInstance.destroy();
    }

    const colorMap = {
      'Jefe': '#00D2FF',
      'Par': '#A855F7',
      'Subordinado': '#FFD700',
      'Autoevaluación': '#10B981'
    };

    const datasets = [];
    for (let key in datasetsMap) {
      datasets.push({
        label: key,
        data: datasetsMap[key],
        backgroundColor: colorMap[key] || '#3B82F6',
        borderRadius: 6
      });
    }

    barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94A3B8', font: { family: 'Poppins', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#64748B', stepSize: 1 },
            min: 0,
            max: 5
          }
        },
        plugins: {
          legend: {
            labels: { color: '#E2E8F0', font: { family: 'Lato', size: 12 } }
          }
        }
      }
    });
  },

  renderInstitutionalChart: function(canvasId, labels, dataValues) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (instChartInstance) {
      instChartInstance.destroy();
    }

    instChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Promedio Institucional Global',
          data: dataValues,
          backgroundColor: [
            '#00D2FF', '#10B981', '#A855F7', '#FFD700', '#F43F5E'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#64748B' },
            min: 0,
            max: 5
          },
          y: {
            grid: { display: false },
            ticks: { color: '#E2E8F0', font: { family: 'Poppins', size: 11 } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
};
