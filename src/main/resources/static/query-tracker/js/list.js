// list.js - request list page
var List = (function () {

  var currentPage = 0;
  var totalPages  = 1;

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function durClass(ms) {
    if (ms < 200) return '';
    if (ms < 800) return 'medium';
    return 'slow';
  }

  function durColor(ms) {
    if (ms < 200) return 'var(--ok)';
    if (ms < 800) return 'var(--warn)';
    return 'var(--danger)';
  }

  function durWidth(ms, maxMs) {
    if (!maxMs) return 0;
    return Math.max(3, Math.round((ms / maxMs) * 100));
  }

  function issueTags(t) {
    var h = '';
    if (t.hasNPlusOne)   h += '<span class="itag itag-nplus1">N+1</span>';
    if (t.hasDuplicates) h += '<span class="itag itag-dup">DUP</span>';
    if (!t.hasNPlusOne && !t.hasDuplicates) h += '<span class="itag itag-clear">CLEAR</span>';
    return h;
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var date = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
    var time = d.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
    return date + '<br>' + time;
  }

  function fmtTraceId(id) {
    return id ? id.substring(0, 8) + '...' : '';
  }

  function renderSummary(summary, pagination) {
    var total = pagination.totalElements;
    var from  = total === 0 ? 0 : pagination.page * pagination.size + 1;
    var to    = Math.min((pagination.page + 1) * pagination.size, total);
    var range = total === 0 ? '0' : from + '-' + to;

    $('#stat-total').text(summary.totalRequests);
    $('#stat-queries').text(summary.totalQueries);
    $('#stat-nplus1').text(summary.nPlusOneCount);
    $('#stat-total-dur').text(summary.totalDurationMs + 'ms');
    $('#list-subtitle').text(range + ' of ' + total + ' requests');

    if (summary.nPlusOneCount > 0) {
      $('#badge-nplus1').text(summary.nPlusOneCount + ' N+1').removeClass('hidden');
    } else {
      $('#badge-nplus1').addClass('hidden');
    }
    if (summary.duplicateCount > 0) {
      $('#badge-dup').text(summary.duplicateCount + ' DUPLICATE').removeClass('hidden');
    } else {
      $('#badge-dup').addClass('hidden');
    }
  }

  function renderRows(traces) {
    var $tbody = $('#req-tbody');
    $tbody.empty();

    if (traces.length === 0) {
      $('#empty-state').removeClass('hidden');
      return;
    }
    $('#empty-state').addClass('hidden');

    var maxMs = Math.max.apply(null, traces.map(function(t){ return t.durationMs; }));

    traces.forEach(function (t) {
      var dc    = durClass(t.durationMs);
      var width = durWidth(t.durationMs, maxMs);
      var dbMs  = t.queries ? t.queries.reduce(function(s,q){ return s+q.durationMs; }, 0) : 0;

      var row = '<tr class="req-row" style="cursor:pointer" data-id="' + esc(t.traceId) + '">' +
        '<td>' +
          '<div class="cell-request">' +
            '<div class="req-top">' +
              '<span class="method-badge method-' + t.method + '">' + t.method + '</span>' +
              '<span class="req-uri">' + esc(t.uri) + '</span>' +
            '</div>' +
            '<div class="req-trace">' + fmtTraceId(t.traceId) + '</div>' +
          '</div>' +
        '</td>' +
        '<td style="color:var(--muted);font-size:11px;white-space:nowrap">' + fmtTime(t.timestamp) + '</td>' +
        '<td>' +
          '<div class="qcell">' + t.queryCount + '</div>' +
          '<div class="qcell-sub">SQL</div>' +
        '</td>' +
        '<td>' +
          '<div class="dur-cell">' +
            '<div style="flex:1">' +
              '<div class="dur-bar-bg"><div class="dur-bar-fill ' + dc + '" style="width:' + width + '%"></div></div>' +
              '<div class="dur-db">DB ' + dbMs + 'ms</div>' +
            '</div>' +
            '<div class="dur-val" style="color:' + durColor(t.durationMs) + '">' + t.durationMs + 'ms</div>' +
          '</div>' +
        '</td>' +
        '<td><div class="issue-tags">' + issueTags(t) + '</div></td>' +
        '<td><button class="btn-inspect" data-id="' + esc(t.traceId) + '">INSPECT</button></td>' +
      '</tr>';

      $tbody.append(row);
    });

    // store current page traces for inspect navigation
    window._tracesById = {};
    traces.forEach(function(t){ window._tracesById[t.traceId] = t; });
  }

  function renderPagination() {
    var $pg = $('#pagination');
    $pg.empty();

    if (totalPages <= 1) return;

    var prevDisabled = currentPage === 0 ? 'disabled' : '';
    var nextDisabled = currentPage >= totalPages - 1 ? 'disabled' : '';

    $pg.html(
      '<button class="pg-btn" id="pg-prev" ' + prevDisabled + '>&laquo; Prev</button>' +
      '<span class="pg-info">' + (currentPage + 1) + ' / ' + totalPages + '</span>' +
      '<button class="pg-btn" id="pg-next" ' + nextDisabled + '>Next &raquo;</button>'
    );

    $('#pg-prev').on('click', function () {
      if (currentPage > 0) loadPage(currentPage - 1);
    });
    $('#pg-next').on('click', function () {
      if (currentPage < totalPages - 1) loadPage(currentPage + 1);
    });
  }

  function loadPage(page) {
    currentPage = page;
    Api.getTraces(page, function (data) {
      totalPages = data.pagination.totalPages;
      renderSummary(data.summary, data.pagination);
      renderRows(data.traces);
      renderPagination();
    });
  }

  function init() {
    // search and filter always reset to page 0
    $('#search').on('input', function () { loadPage(0); });
    $('#filter-nplus1').on('change', function () { loadPage(0); });
  }

  function getCurrentPage() {
    return currentPage;
  }

  return { loadPage: loadPage, init: init, getCurrentPage: getCurrentPage };
})();
