// history.js - latency history tab
var History = (function () {

  var chartInstance = null;

  // Her HTTP method ucun sabit reng
  var METHOD_COLORS = {
    'GET':    { border: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    'POST':   { border: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    'PUT':    { border: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    'PATCH':  { border: '#f97316', bg: 'rgba(249,115,22,0.15)' },
    'DELETE': { border: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
  };

  function colorFor(method) {
    return METHOD_COLORS[method] || { border: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
  }

  function fmt(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
           ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function open(trace) {
    var uri = trace.uri;

    // topbar
    $('#hist-method').text(trace.method).attr('class', 'method-badge method-' + trace.method);
    $('#hist-uri').text(uri);

    // tabs: mark history active
    $('.detail-tab').removeClass('active');
    $('.detail-tab[data-tab="history"]').addClass('active');

    Api.getHistory(uri, function (data) {
      var points = data.history;

      // group by method
      var byMethod = {};
      points.forEach(function (p) {
        if (!byMethod[p.method]) byMethod[p.method] = [];
        byMethod[p.method].push(p);
      });

      // all timestamps sorted for x-axis labels (union across methods)
      var allTs = [];
      points.forEach(function (p) { allTs.push(p.timestamp); });
      allTs = allTs.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });

      var labels = allTs.map(fmt);

      // Build datasets: one line per method
      var datasets = Object.keys(byMethod).map(function (method) {
        var c = colorFor(method);
        // align values to allTs (null for missing timestamps)
        var tsMap = {};
        byMethod[method].forEach(function (p) { tsMap[p.timestamp] = p; });

        var latencyData = allTs.map(function (ts) {
          return tsMap[ts] ? tsMap[ts].durationMs : null;
        });
        var queryData = allTs.map(function (ts) {
          return tsMap[ts] ? tsMap[ts].queryCount : null;
        });

        return {
          method: method,
          latency: latencyData,
          queries: queryData,
          border: c.border,
          bg: c.bg
        };
      });

      renderChart(labels, datasets, allTs, byMethod);
      renderTable(points);
    });
  }

  function renderChart(labels, datasets, allTs, byMethod) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    var ctx = document.getElementById('hist-chart').getContext('2d');

    var chartDatasets = datasets.map(function (ds) {
      return {
        label: ds.method + ' - Latency (ms)',
        data: ds.latency,
        borderColor: ds.border,
        backgroundColor: ds.bg,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        spanGaps: false,
        yAxisID: 'yLatency'
      };
    });

    // Secondary dataset: SQL query count (dashed, right axis)
    datasets.forEach(function (ds) {
      chartDatasets.push({
        label: ds.method + ' - SQL Count',
        data: ds.queries,
        borderColor: ds.border,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        spanGaps: false,
        yAxisID: 'yQueries'
      });
    });

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                if (v === null) return null;
                return ctx.dataset.label + ': ' + v + (ctx.dataset.yAxisID === 'yLatency' ? 'ms' : '');
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, maxRotation: 30 },
            grid:  { color: 'rgba(255,255,255,0.05)' }
          },
          yLatency: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Latency (ms)', color: '#94a3b8' },
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
            grid:  { color: 'rgba(255,255,255,0.07)' }
          },
          yQueries: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'SQL Queries', color: '#94a3b8' },
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, stepSize: 1 },
            grid:  { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function renderTable(points) {
    var $tbody = $('#hist-table-body').empty();
    if (!points.length) {
      $tbody.append('<tr><td colspan="5" style="text-align:center;color:#64748b;padding:16px">No history for this endpoint</td></tr>');
      return;
    }
    // newest first in table
    var sorted = points.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
    sorted.forEach(function (p) {
      var durColor = p.durationMs < 200 ? 'var(--ok)' : p.durationMs < 600 ? 'var(--warn)' : 'var(--danger)';
      $tbody.append(
        '<tr>' +
          '<td><span class="method-badge method-' + p.method + '">' + p.method + '</span></td>' +
          '<td>' + fmt(p.timestamp) + '</td>' +
          '<td style="color:' + durColor + ';font-weight:600">' + p.durationMs + 'ms</td>' +
          '<td>' + p.queryCount + '</td>' +
          '<td><span style="color:#94a3b8;font-family:var(--font-mono);font-size:11px">' + p.traceId.substring(0,8) + '...</span></td>' +
        '</tr>'
      );
    });
  }

  return { open: open };
})();
