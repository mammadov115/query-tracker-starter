// list.js - request list page
var List = (function () {

  var allTraces   = [];
  var sortByIssue = false;

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

  function issueScore(t) {
    return (t.hasNPlusOne ? 2 : 0) + (t.hasDuplicates ? 1 : 0);
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

  function render(traces) {
    allTraces = traces;
    update();
  }

  function update() {
    var search    = $('#search').val().toLowerCase();
    var nplus1Only = $('#filter-nplus1').is(':checked');

    var filtered = allTraces.filter(function (t) {
      if (nplus1Only && !t.hasNPlusOne) return false;
      if (search && t.uri.toLowerCase().indexOf(search) === -1 &&
          t.method.toLowerCase().indexOf(search) === -1) return false;
      return true;
    });

    if (sortByIssue) {
      filtered = filtered.slice().sort(function (a, b) {
        return issueScore(b) - issueScore(a);
      });
    }

    var total    = allTraces.length;
    var np1count = allTraces.filter(function(t){ return t.hasNPlusOne; }).length;
    var dupcount = allTraces.filter(function(t){ return t.hasDuplicates; }).length;
    var totalQ   = allTraces.reduce(function(s,t){ return s + t.queryCount; }, 0);
    var totalDur = allTraces.reduce(function(s,t){ return s + t.durationMs; }, 0);

    $('#stat-total').text(filtered.length);
    $('#stat-queries').text(totalQ);
    $('#stat-nplus1').text(np1count);
    $('#stat-total-dur').text(totalDur + 'ms');
    $('#list-subtitle').text(filtered.length + ' of ' + total + ' requests');

    if (np1count > 0) { $('#badge-nplus1').text(np1count + ' N+1').removeClass('hidden'); }
    else               { $('#badge-nplus1').addClass('hidden'); }
    if (dupcount > 0) { $('#badge-dup').text(dupcount + ' DUPLICATE').removeClass('hidden'); }
    else               { $('#badge-dup').addClass('hidden'); }

    var maxMs = filtered.length ? Math.max.apply(null, filtered.map(function(t){ return t.durationMs; })) : 0;

    var $tbody = $('#req-tbody');
    $tbody.empty();

    if (filtered.length === 0) {
      $('#empty-state').removeClass('hidden');
      return;
    }
    $('#empty-state').addClass('hidden');

    filtered.forEach(function (t) {
      var dc    = durClass(t.durationMs);
      var width = durWidth(t.durationMs, maxMs);
      var dbMs  = t.queries ? t.queries.reduce(function(s,q){ return s+q.durationMs; }, 0) : 0;

      var row = '<tr class="req-row" data-id="' + esc(t.traceId) + '">' +
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

    // store for lookup
    window._tracesById = {};
    allTraces.forEach(function(t){ window._tracesById[t.traceId] = t; });
  }

  function init() {
    $('#search').on('input', update);
    $('#filter-nplus1').on('change', update);
    $('#th-issues').on('click', function () {
      sortByIssue = !sortByIssue;
      update();
    });

    $(document).on('click', '.btn-inspect', function (e) {
      e.stopPropagation();
      var id = $(this).data('id');
      var trace = window._tracesById[id];
      if (trace) Inspect.open(trace);
    });
  }

  return { render: render, init: init };
})();
