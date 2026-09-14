// render.js - DOM construction

var Render = (function () {

  function methodClass(method) {
    return 'method-' + method.toLowerCase();
  }

  function statusClass(code) {
    if (code >= 500) return 'status-5xx';
    if (code >= 400) return 'status-4xx';
    if (code >= 300) return 'status-3xx';
    return 'status-2xx';
  }

  function durClass(ms) {
    if (ms < 100) return 'dur-fast';
    if (ms < 500) return 'dur-medium';
    return 'dur-slow';
  }

  function formatTime(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour12: false }) +
           '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function flags(trace) {
    var html = '';
    if (trace.hasNPlusOne)  html += '<span class="flag flag-nplus1">N+1</span> ';
    if (trace.hasDuplicates) html += '<span class="flag flag-dup">DUP</span>';
    return html || '<span class="text-muted">-</span>';
  }

  function queryPanel(traceId, queries) {
    if (!queries || queries.length === 0) {
      return '<tr class="query-panel" id="panel-' + traceId + '">' +
             '<td colspan="7"><div class="px-10 py-4 text-muted font-mono text-xs">no queries recorded</div></td>' +
             '</tr>';
    }
    var rows = queries.map(function (q, i) {
      return '<div class="query-entry">' +
             '<span class="text-muted">#' + (i + 1) + ' </span>' +
             '<span class="' + durClass(q.durationMs) + '">' + q.durationMs + 'ms</span>' +
             '\n' + escHtml(q.sql) +
             '</div>';
    }).join('');
    return '<tr class="query-panel" id="panel-' + traceId + '">' +
           '<td colspan="7"><div class="px-10 py-3">' + rows + '</div></td>' +
           '</tr>';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function traceRow(trace) {
    var rowHtml =
      '<tr class="trace-row" data-id="' + trace.traceId + '">' +
        '<td class="px-6 py-3 font-mono font-medium ' + methodClass(trace.method) + '">' + trace.method + '</td>' +
        '<td class="px-6 py-3 font-mono text-text truncate max-w-xs" title="' + trace.uri + '">' + escHtml(trace.uri) + '</td>' +
        '<td class="px-6 py-3 font-mono ' + statusClass(trace.statusCode) + '">' + trace.statusCode + '</td>' +
        '<td class="px-6 py-3 font-mono text-right ' + durClass(trace.durationMs) + '">' + trace.durationMs + 'ms</td>' +
        '<td class="px-6 py-3 font-mono text-right text-muted">' + trace.queryCount + '</td>' +
        '<td class="px-6 py-3">' + flags(trace) + '</td>' +
        '<td class="px-6 py-3 font-mono text-muted text-xs">' + formatTime(trace.timestamp) + '</td>' +
      '</tr>';
    return rowHtml + queryPanel(trace.traceId, trace.queries);
  }

  function stats(traces) {
    var total   = traces.length;
    var nplus1  = traces.filter(function (t) { return t.hasNPlusOne; }).length;
    var dups    = traces.filter(function (t) { return t.hasDuplicates; }).length;
    var avgDur  = total === 0 ? 0 :
      Math.round(traces.reduce(function (s, t) { return s + t.durationMs; }, 0) / total);

    $('#stat-total').text(total);
    $('#stat-avg-duration').text(avgDur + 'ms');
    $('#stat-nplus1').text(nplus1);
    $('#stat-duplicates').text(dups);
    $('#trace-count').text(total + ' trace' + (total !== 1 ? 's' : ''));
  }

  function table(traces) {
    var $tbody = $('#trace-tbody');
    $tbody.empty();

    if (traces.length === 0) {
      $tbody.html('<tr><td colspan="7" class="px-6 py-16 text-center text-muted font-mono text-sm">no traces yet - make some requests</td></tr>');
      return;
    }

    traces.forEach(function (trace) {
      $tbody.append(traceRow(trace));
    });

    // toggle query panel on row click
    $tbody.off('click', '.trace-row').on('click', '.trace-row', function () {
      var id    = $(this).data('id');
      var panel = $('#panel-' + id);
      $(this).toggleClass('expanded');
      panel.toggleClass('open');
    });
  }

  return { stats: stats, table: table };

})();
