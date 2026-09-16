// overview.js - Tables Touched page
var Overview = (function () {

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function opBadge(op) {
    var cls = {
      'SELECT': 'op-select',
      'INSERT': 'op-insert',
      'UPDATE': 'op-update',
      'DELETE': 'op-delete'
    }[op] || 'op-select';
    return '<span class="op-badge ' + cls + '">' + esc(op) + '</span>';
  }

  function statusClass(code) {
    if (code >= 200 && code < 300) return 'status-ok';
    if (code >= 400 && code < 500) return 'status-warn';
    return 'status-danger';
  }

  function open(trace) {
    $('#ov-method').text(trace.method).attr('class', 'method-badge method-' + trace.method);
    $('#ov-uri').text(trace.uri);
    $('#ov-meta').text('trace ' + trace.traceId + '   request ' + trace.durationMs + 'ms');

    var flagsHtml = '';
    if (trace.hasNPlusOne)   flagsHtml += '<span class="itag itag-nplus1">N+1 DETECTED</span>';
    if (trace.hasDuplicates) flagsHtml += '<span class="itag itag-dup">DUPLICATES</span>';
    $('#ov-flags').html(flagsHtml);

    // stat cards
    $('#ov-stat-queries').text(trace.queryCount);
    $('#ov-stat-duration').text(trace.durationMs + ' ms');
    $('#ov-stat-tables').text((trace.tables || []).length);
    var sc = trace.statusCode;
    $('#ov-stat-status').text(sc + ' ' + httpLabel(sc))
      .attr('class', 'ov-stat-val ' + statusClass(sc));

    // tables list
    var $tbody = $('#ov-table-body').empty();
    (trace.tables || []).forEach(function (t) {
      var ops = (t.operations || []).map(opBadge).join('');
      var row = '<tr class="ov-table-row" style="cursor:pointer" data-table="' + esc(t.table) + '">' +
        '<td><strong>' + esc(t.table) + '</strong></td>' +
        '<td>' + ops + '</td>' +
        '<td>' + t.count + '</td>' +
        '<td>' + t.durationMs + 'ms</td>' +
      '</tr>';
      $tbody.append(row);
    });

    // table row click -> flow tab
    $('#ov-table-body').off('click', '.ov-table-row').on('click', '.ov-table-row', function () {
      $('.detail-tab[data-tab="flow"]').trigger('click');
    });

    // quick insight
    var tables = trace.tables || [];
    var topTable = tables.length ? tables.reduce(function(a,b){ return a.count >= b.count ? a : b; }) : null;
    var insight = 'This request touched ' + tables.length + ' tables and executed ' + trace.queryCount + ' queries.';
    if (topTable) insight += ' The most active table was <code>' + esc(topTable.table) + '</code> (' + topTable.count + ' queries).';
    $('#ov-insight').html(insight);
  }

  function httpLabel(code) {
    var labels = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
                   401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Server Error' };
    return labels[code] || '';
  }

  return { open: open };
})();
